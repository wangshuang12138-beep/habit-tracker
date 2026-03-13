<template>
  <div class="home">
    <div v-if="!currentUser" class="empty-state">
      <div class="empty-icon">👋</div>
      <h2>欢迎使用打卡</h2>
      <p>点击右上角 + 创建你的第一个用户，开始记录习惯</p>
    </div>

    <template v-else>
      <div class="section-header">
        <h2>{{ currentUser.name }}的习惯</h2>
        <button class="btn btn-primary btn-sm" @click="showAddHabit = true">
          + 新建习惯
        </button>
      </div>

      <div v-if="habits.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>还没有习惯</h3>
        <p>创建一个习惯，开始每日打卡</p>
      </div>

      <div v-else class="habits-grid">
        <div 
          v-for="habit in habits" 
          :key="habit.id"
          class="habit-card"
          :style="{ '--habit-color': habit.color }"
          @click="$router.push(`/habit/${habit.id}`)"
        >
          <div class="habit-header">
            <div class="habit-icon" :style="{ background: habit.color }">
              {{ habit.icon }}
            </div>
            <div class="habit-info">
              <h3>{{ habit.name }}</h3>
              <p v-if="habit.description">{{ habit.description }}</p>
            </div>
            
            <div class="habit-stats">
              <span class="streak" v-if="habitStats[habit.id]?.currentStreak">
                🔥 {{ habitStats[habit.id].currentStreak }}
              </span>
            </div>
          </div>

          <div class="habit-calendar">
            <div 
              v-for="day in last7Days" 
              :key="day.date"
              class="day-dot"
              :class="{ 
                checked: isCheckedIn(habit.id, day.date),
                today: day.isToday 
              }"
              :title="day.label"
            />
          </div>

          <div class="habit-footer">
            <span class="cycle-badge">
              {{ formatCycle(habit.cycle_type, habit.cycle_days) }}
            </span>
            <button 
              class="check-btn"
              :class="{ checked: isCheckedIn(habit.id, today) }"
              @click.stop="quickCheckin(habit)"
            >
              {{ isCheckedIn(habit.id, today) ? '已打卡' : '打卡' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Add Habit Modal -->
    <div v-if="showAddHabit" class="modal-overlay" @click.self="showAddHabit = false">
      <div class="modal">
        <h3>新建习惯</h3>
        
        <div class="form-group">
          <label>名称</label>
          <input v-model="newHabit.name" placeholder="例如：英语口语练习" class="input" />
        </div>

        <div class="form-group">
          <label>描述（可选）</label>
          <input v-model="newHabit.description" placeholder="简单描述这个习惯" class="input" />
        </div>

        <div class="form-group">
          <label>打卡周期</label>
          <div class="cycle-options">
            <button 
              v-for="opt in cycleOptions" 
              :key="opt.value"
              class="cycle-btn"
              :class="{ active: newHabit.cycle_type === opt.value }"
              @click="newHabit.cycle_type = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>颜色</label>
          <div class="color-options">
            <button 
              v-for="color in colors" 
              :key="color"
              class="color-btn"
              :style="{ background: color }"
              :class="{ active: newHabit.color === color }"
              @click="newHabit.color = color"
            />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showAddHabit = false">取消</button>
          <button class="btn btn-primary" @click="createHabit" :disabled="!newHabit.name">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { useHabitStore } from '../stores/habit'
import dayjs from 'dayjs'

const userStore = useUserStore()
const habitStore = useHabitStore()

const currentUser = computed(() => userStore.currentUser)
const habits = computed(() => habitStore.habits)

const showAddHabit = ref(false)
const newHabit = ref({
  name: '',
  description: '',
  color: '#007AFF',
  cycle_type: 'daily',
  cycle_days: 1
})

const habitStats = ref({})
const checkinMap = ref({})

const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA']

const cycleOptions = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'custom', label: '自定义' }
]

const today = computed(() => dayjs().format('YYYY-MM-DD'))

const last7Days = computed(() => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day')
    days.push({
      date: date.format('YYYY-MM-DD'),
      label: date.format('M月D日'),
      isToday: i === 0
    })
  }
  return days
})

const formatCycle = (type, days) => {
  if (type === 'daily') return '每天'
  if (type === 'weekly') return '每周'
  return `${days}天`
}

const isCheckedIn = (habitId, date) => {
  return checkinMap.value[`${habitId}-${date}`] || false
}

const loadAllCheckins = async () => {
  const start = dayjs().subtract(6, 'day').format('YYYY-MM-DD')
  const end = dayjs().format('YYYY-MM-DD')
  
  for (const habit of habits.value) {
    try {
      const checkins = await habitStore.loadCheckins(habit.id, start, end)
      checkins.forEach(c => {
        checkinMap.value[`${habit.id}-${c.checkin_date}`] = true
      })
      
      const stats = await habitStore.loadStats(habit.id)
      habitStats.value[habit.id] = stats
    } catch (e) {
      console.error('Failed to load data for habit:', habit.id)
    }
  }
}

const quickCheckin = async (habit) => {
  if (isCheckedIn(habit.id, today.value)) return
  
  await habitStore.checkin(habit.id, {
    checkin_date: today.value,
    content: ''
  })
  
  checkinMap.value[`${habit.id}-${today.value}`] = true
  
  // Refresh stats
  const stats = await habitStore.loadStats(habit.id)
  habitStats.value[habit.id] = stats
}

const createHabit = async () => {
  if (!newHabit.value.name || !currentUser.value) return
  
  await habitStore.createHabit(currentUser.value.id, {
    name: newHabit.value.name,
    description: newHabit.value.description,
    color: newHabit.value.color,
    cycle_type: newHabit.value.cycle_type,
    cycle_days: newHabit.value.cycle_days
  })
  
  newHabit.value = {
    name: '',
    description: '',
    color: '#007AFF',
    cycle_type: 'daily',
    cycle_days: 1
  }
  showAddHabit.value = false
}

watch(() => currentUser.value?.id, (newId) => {
  if (newId) {
    habitStore.loadHabits(newId).then(loadAllCheckins)
  }
}, { immediate: true })

onMounted(() => {
  if (currentUser.value) {
    habitStore.loadHabits(currentUser.value.id).then(loadAllCheckins)
  }
})
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h2, .empty-state h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 15px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
}

.habits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.habit-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow);
}

.habit-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.habit-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.habit-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.habit-info {
  flex: 1;
}

.habit-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
}

.habit-info p {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.habit-stats {
  display: flex;
  gap: 8px;
}

.streak {
  background: #FFF3E0;
  color: #E65100;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.habit-calendar {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.day-dot {
  flex: 1;
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  transition: all 0.2s;
}

.day-dot.checked {
  background: var(--habit-color);
}

.day-dot.today {
  box-shadow: 0 0 0 2px var(--habit-color);
}

.habit-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cycle-badge {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg);
  padding: 4px 10px;
  border-radius: 10px;
}

.check-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  background: var(--habit-color);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.check-btn:hover:not(.checked) {
  opacity: 0.9;
}

.check-btn.checked {
  background: var(--bg);
  color: var(--text-secondary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.cycle-options {
  display: flex;
  gap: 8px;
}

.cycle-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cycle-btn.active {
  border-color: var(--primary);
  background: rgba(0, 122, 255, 0.1);
  color: var(--primary);
}

.color-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-btn.active {
  border-color: var(--text);
  transform: scale(1.1);
}

@media (max-width: 640px) {
  .empty-state {
    padding: 60px 20px;
  }
  
  .empty-icon {
    font-size: 48px;
  }
  
  .section-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .habits-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .habit-card {
    padding: 16px;
  }
  
  .habit-header {
    margin-bottom: 12px;
  }
  
  .habit-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  
  .habit-info h3 {
    font-size: 15px;
  }
  
  .habit-calendar {
    gap: 4px;
    margin-bottom: 12px;
  }
  
  .day-dot {
    height: 6px;
  }
  
  .modal {
    padding: 20px;
    margin: 16px;
  }
}
</style>
