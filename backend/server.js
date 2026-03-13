const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Data file path
const DATA_FILE = path.join(__dirname, 'data.json');

// In-memory data
let data = {
  users: [],
  habits: [],
  checkins: []
};

// Load data from file
async function loadData() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    data = JSON.parse(content);
  } catch (err) {
    // File doesn't exist, use default empty data
    data = { users: [], habits: [], checkins: [] };
  }
}

// Save data to file
async function saveData() {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// ===== USERS API =====

app.get('/api/users', async (req, res) => {
  res.json(data.users);
});

app.post('/api/users', async (req, res) => {
  const { name, avatar } = req.body;
  const user = {
    id: uuidv4(),
    name,
    avatar: avatar || null,
    created_at: new Date().toISOString()
  };
  data.users.push(user);
  await saveData();
  res.json(user);
});

app.delete('/api/users/:id', async (req, res) => {
  data.users = data.users.filter(u => u.id !== req.params.id);
  data.habits = data.habits.filter(h => h.user_id !== req.params.id);
  data.checkins = data.checkins.filter(c => {
    const habit = data.habits.find(h => h.id === c.habit_id);
    return habit;
  });
  await saveData();
  res.json({ success: true });
});

// ===== HABITS API =====

app.get('/api/users/:userId/habits', async (req, res) => {
  const habits = data.habits.filter(h => h.user_id === req.params.userId).reverse();
  res.json(habits);
});

app.post('/api/users/:userId/habits', async (req, res) => {
  const { name, description, color, icon, cycle_type, cycle_days } = req.body;
  const habit = {
    id: uuidv4(),
    user_id: req.params.userId,
    name,
    description: description || '',
    color: color || '#007AFF',
    icon: icon || '📝',
    cycle_type: cycle_type || 'daily',
    cycle_days: cycle_days || 1,
    created_at: new Date().toISOString()
  };
  data.habits.push(habit);
  await saveData();
  res.json(habit);
});

app.put('/api/habits/:id', async (req, res) => {
  const { name, description, color, icon, cycle_type, cycle_days } = req.body;
  const habit = data.habits.find(h => h.id === req.params.id);
  if (habit) {
    habit.name = name;
    habit.description = description;
    habit.color = color;
    habit.icon = icon;
    habit.cycle_type = cycle_type;
    habit.cycle_days = cycle_days;
    await saveData();
  }
  res.json({ success: true });
});

app.delete('/api/habits/:id', async (req, res) => {
  data.habits = data.habits.filter(h => h.id !== req.params.id);
  data.checkins = data.checkins.filter(c => c.habit_id !== req.params.id);
  await saveData();
  res.json({ success: true });
});

// ===== CHECKINS API =====

app.get('/api/habits/:habitId/checkins', async (req, res) => {
  const { start, end } = req.query;
  let checkins = data.checkins.filter(c => c.habit_id === req.params.habitId);
  
  if (start && end) {
    checkins = checkins.filter(c => c.checkin_date >= start && c.checkin_date <= end);
  }
  
  checkins.sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
  res.json(checkins);
});

app.post('/api/habits/:habitId/checkins', upload.single('image'), async (req, res) => {
  const { checkin_date, content } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  
  const existingIndex = data.checkins.findIndex(
    c => c.habit_id === req.params.habitId && c.checkin_date === checkin_date
  );
  
  if (existingIndex >= 0) {
    // Update
    data.checkins[existingIndex].content = content || '';
    if (imagePath) {
      data.checkins[existingIndex].image_path = imagePath;
    }
    await saveData();
    res.json(data.checkins[existingIndex]);
  } else {
    // Create
    const checkin = {
      id: uuidv4(),
      habit_id: req.params.habitId,
      checkin_date,
      content: content || '',
      image_path: imagePath,
      created_at: new Date().toISOString()
    };
    data.checkins.push(checkin);
    await saveData();
    res.json(checkin);
  }
});

app.delete('/api/checkins/:id', async (req, res) => {
  data.checkins = data.checkins.filter(c => c.id !== req.params.id);
  await saveData();
  res.json({ success: true });
});

// ===== STATS API =====

app.get('/api/habits/:habitId/stats', async (req, res) => {
  const habit = data.habits.find(h => h.id === req.params.habitId);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  
  const checkins = data.checkins.filter(c => c.habit_id === req.params.habitId);
  const dates = checkins.map(c => c.checkin_date).sort();
  
  // Calculate streak
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  
  if (dates.length > 0) {
    const today = dayjs().format('YYYY-MM-DD');
    const lastCheckin = dates[dates.length - 1];
    const daysSinceLast = dayjs(today).diff(dayjs(lastCheckin), 'day');
    const isActive = daysSinceLast <= 1;
    
    if (isActive) {
      currentStreak = 1;
      for (let i = dates.length - 2; i >= 0; i--) {
        const diff = dayjs(dates[i + 1]).diff(dayjs(dates[i]), 'day');
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    tempStreak = 1;
    maxStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = dayjs(dates[i]).diff(dayjs(dates[i - 1]), 'day');
      if (diff === 1) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
  }
  
  const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
  const weekCheckins = checkins.filter(c => c.checkin_date >= weekStart);
  
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const monthCheckins = checkins.filter(c => c.checkin_date >= monthStart);
  
  res.json({
    total: checkins.length,
    currentStreak,
    maxStreak,
    thisWeek: weekCheckins.length,
    thisMonth: monthCheckins.length,
    checkinDates: dates
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start server
async function start() {
  await loadData();
  app.listen(PORT, () => {
    console.log(`Habit Tracker API running on port ${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
  });
}

start().catch(console.error);
