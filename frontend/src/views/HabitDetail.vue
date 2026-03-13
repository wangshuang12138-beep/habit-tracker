<template>
  <div class="habit-detail" v-if="habit">
    <!-- Header -->
    <div class="detail-header">
      <button class="back-btn" @click="$router.push('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回
      </button>
      
      <div class="header-actions">
        <router-link :to="`/stats/${habit.id}`" class="btn btn-secondary btn-sm">
          统计
        </router-link>
        <button class="btn btn-primary btn-sm" @click="showCheckin = true">
          打卡
        </button>
      </div>
    </div>

    <!-- Habit Info -->
    <div class="habit-hero">
      <div class="habit-icon-large" :style="{ background: habit.color }">
        {{ habit.icon || '📝' }}
      </div>
      <div class="habit-meta">
        <h1>{{ habit.name }}</h1>
        <p v-if="habit.description">{{ habit.description }}</p>
        <div class="habit-badges">
          <span class="badge" :style="{ background: habit.color + '20', color: habit.color }">
            {{ formatCycle(habit.cycle_type, habit.cycle_days) }}
          </span>
          <span v-if="stats?.currentStreak" class="badge streak">
            🔥 连续 {{ stats.currentStreak }} 天
          </span>
        </div>
      </div>
    </div>

    <!-- Calendar -->
    <div class="calendar-section">
      <div class="calendar-header">
        <button class="icon-btn" @click="prevMonth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span class="month-label">{{ currentMonthLabel }}</span>
        
        <button class="icon-btn" @click="nextMonth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div class="calendar-grid">
        <div class="weekday-header" v-for="day in weekdays" :key="day">
          {{ day }}
        </div>
        
        <div 
          v-for="(date, idx) in calendarDays" 
          :key="idx"
          class="calendar-day"
          :class="{ 
            'other-month': !date.isCurrentMonth,
            'is-today': date.isToday,
            'is-checked': isCheckedIn(date.date)
          }"
          :style="isCheckedIn(date.date) ? { '--check-color': habit.color } : {}"
          @click="date.isCurrentMonth && selectDate(date)"
        >
          <span class="day-number">{{ date.day }}</span>
          <div v-if="isCheckedIn(date.date)" class="check-mark" />
        </div>
      </div>
    </div>

    <!-- Recent Checkins -->
    <div class="checkins-section">
      <h3>最近打卡</h3>
      
      <div v-if="recentCheckins.length === 0" class="empty-checkins">
        还没有打卡记录，点击"打卡"开始记录
      </div>
      
      <div v-else class="checkin-list">
        <div 
          v-for="checkin in recentCheckins" 
          :key="checkin.id"
          class="checkin-item"
          @click="viewCheckin(checkin)"
        >
          <div class="checkin-date">
            <span class="date-day">{{ formatDay(checkin.checkin_date) }}</span>
            <span class="date-full">{{ formatFullDate(checkin.checkin_date) }}</span>
          </div>
          
          <div class="checkin-content" v-if="checkin.content">
            {{ checkin.content }}
          </div>
          
          <div v-if="checkin.image_path" class="checkin-image">
            <img :src="getImageUrl(checkin.image_path)" alt="打卡图片" />
          </div>
        </div>
      </div>
    </div>

    <!-- Checkin Modal -->
    <div v-if="showCheckin" class="modal-overlay" @click.self="closeCheckin">
      <div class="modal checkin-modal">
        <div class="checkin-modal-header">
          <h3>{{ isEdit ? '编辑打卡' : '打卡' }}</h3>
          <input 
            type="date" 
            v-model="checkinForm.date"
            class="date-input"
            :max="today"
          />
        </div>
        
        <textarea 
          v-model="checkinForm.content"
          placeholder="今天练习了什么？记录下你的进步..."
          class="textarea"
          rows="4"
        />
        
        <div class="image-upload">
          <div v-if="checkinForm.imagePreview" class="image-preview">
            <img :src="checkinForm.imagePreview" />
            <button class="remove-image" @click="removeImage">×</button>
          </div>
          
          <label v-else class="upload-btn">
            <input 
              type="file" 
              accept="image/*"
              @change="handleImageSelect"
              hidden
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>添加截图</span>
          </label>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeCheckin">取消</button>
          <button 
            class="btn btn-primary" 
            @click="submitCheckin"
            :disabled="submitting"
          >
            {{ submitting ? '保存中...' : (isEdit ? '更新' : '打卡') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHabitStore } from '../stores/habit'
import dayjs from 'dayjs'

const route = useRoute()
const habitStore = useHabitStore()

const habit = computed(() => 
  habitStore.habits.find(h => h.id === route.params.id)
)
const checkins = computed(() => habitStore.checkins)
const stats = computed(() => habitStore.stats)

const today = dayjs().format('YYYY-MM-DD')
const currentMonth = ref(dayjs())
const showCheckin = ref(false)
const isEdit = ref(false)
const submitting = ref(false)

const checkinForm = ref({
  date: today,
  content: '',
  imageFile: null,
  imagePreview: null,
  existingId: null
})

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const currentMonthLabel = computed(() => {
  return currentMonth.value.format('YYYY年M月')
})

const calendarDays = computed(() => {
  const days = []
  const startOfMonth = currentMonth.value.startOf('month')
  const endOfMonth = currentMonth.value.endOf('month')
  const startDay = startOfMonth.day()
  
  // Previous month padding
  for (let i = 0; i < startDay; i++) {
    const date = startOfMonth.subtract(startDay - i, 'day')
    days.push({
      date: date.format('YYYY-MM-DD'),
      day: date.date(),
      isCurrentMonth: false,
      isToday: false
    })
  }
  
  // Current month
  for (let i = 1; i <= endOfMonth.date(); i++) {
    const date = startOfMonth.add(i - 1, 'day')
    days.push({
      date: date.format('YYYY-MM-DD'),
      day: i,
      isCurrentMonth: true,
      isToday: date.format('YYYY-MM-DD') === today
    })
  }
  
  // Next month padding to fill 6 rows
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const date = endOfMonth.add(i, 'day')
    days.push({
      date: date.format('YYYY-MM-DD'),
      day: date.date(),
      isCurrentMonth: false,
      isToday: false
    })
  }
  
  return days
})

const checkinMap = computed(() => {
  const map = {}
  checkins.value.forEach(c => {
    map[c.checkin_date] = c
  })
  return map
})

const recentCheckins = computed(() => {
  return [...checkins.value].sort((a, b) => 
    b.checkin_date.localeCompare(a.checkin_date)
  ).slice(0, 10)
})

const isCheckedIn = (date) => {
  return !!checkinMap.value[date]
}

const formatCycle = (type, days) => {
  if (type === 'daily') return '每天'
  if (type === 'weekly') return '每周'
  return `${days}天`
}

const formatDay = (date) => {
  return dayjs(date).date()
}

const formatFullDate = (date) => {
  return dayjs(date).format('M月D日')
}

const getImageUrl = (path) => {
  return `http://localhost:3001${path}`
}

const prevMonth = () => {
  currentMonth.value = currentMonth.value.subtract(1, 'month')
  loadMonthData()
}

const nextMonth = () => {
  currentMonth.value = currentMonth.value.add(1, 'month')
  loadMonthData()
}

const loadMonthData = () => {
  if (!habit.value) return
  const start = currentMonth.value.startOf('month').format('YYYY-MM-DD')
  const end = currentMonth.value.endOf('month').format('YYYY-MM-DD')
  habitStore.loadCheckins(habit.value.id, start, end)
}

const selectDate = (date) => {
  const existing = checkinMap.value[date.date]
  if (existing) {
    // Edit existing
    checkinForm.value = {
      date: date.date,
      content: existing.content || '',
      imageFile: null,
      imagePreview: existing.image_path ? getImageUrl(existing.image_path) : null,
      existingId: existing.id
    }
    isEdit.value = true
  } else {
    // New checkin
    checkinForm.value = {
      date: date.date,
      content: '',
      imageFile: null,
      imagePreview: null,
      existingId: null
    }
    isEdit.value = false
  }
  showCheckin.value = true
}

const closeCheckin = () => {
  showCheckin.value = false
  checkinForm.value = {
    date: today,
    content: '',
    imageFile: null,
    imagePreview: null,
    existingId: null
  }
  isEdit.value = false
}

const handleImageSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  checkinForm.value.imageFile = file
  
  const reader = new FileReader()
  reader.onload = (e) => {
    checkinForm.value.imagePreview = e.target.result
  }
  reader.readAsDataURL(file)
}

const removeImage = () => {
  checkinForm.value.imageFile = null
  checkinForm.value.imagePreview = null
}

const submitCheckin = async () => {
  if (!habit.value) return
  
  submitting.value = true
  try {
    await habitStore.checkin(habit.value.id, {
      checkin_date: checkinForm.value.date,
      content: checkinForm.value.content
    }, checkinForm.value.imageFile)
    
    await habitStore.loadStats(habit.value.id)
    closeCheckin()
  } finally {
    submitting.value = false
  }
}

const viewCheckin = (checkin) => {
  selectDate({ date: checkin.checkin_date })
}

onMounted(() => {
  if (habit.value) {
    loadMonthData()
    habitStore.loadStats(habit.value.id)
  }
})

watch(() => route.params.id, (newId) => {
  if (newId) {
    loadMonthData()
    habitStore.loadStats(newId)
  }
})
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: var(--bg);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #E5E5EA;
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.habit-hero {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 32px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: var(--shadow);
}

.habit-icon-large {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: white;
  flex-shrink: 0;
}

.habit-meta h1 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 6px;
}

.habit-meta p {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.habit-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.badge.streak {
  background: #FFF3E0;
  color: #E65100;
}

.calendar-section {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.month-label {
  font-size: 16px;
  font-weight: 600;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #E5E5EA;
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.weekday-header {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 8px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.calendar-day:hover {
  background: var(--bg);
}

.calendar-day.other-month {
  color: var(--text-secondary);
  opacity: 0.5;
}

.calendar-day.is-today .day-number {
  background: var(--text);
  color: white;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.calendar-day.is-checked {
  background: var(--check-color);
  color: white;
}

.calendar-day.is-checked:hover {
  opacity: 0.9;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
}

.checkins-section {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow);
}

.checkins-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.empty-checkins {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
  font-size: 14px;
}

.checkin-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkin-item {
  padding: 16px;
  background: var(--bg);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.checkin-item:hover {
  background: #E5E5EA;
}

.checkin-date {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.date-day {
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
}

.date-full {
  font-size: 13px;
  color: var(--text-secondary);
}

.checkin-content {
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
  margin-bottom: 12px;
}

.checkin-image img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
}

.checkin-modal {
  max-width: 480px;
}

.checkin-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.checkin-modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  font-family: inherit;
}

.textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 16px;
}

.textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.image-upload {
  margin-bottom: 20px;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.upload-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.upload-btn svg {
  width: 32px;
  height: 32px;
}

.image-preview {
  position: relative;
  display: inline-block;
}

.image-preview img {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--radius);
}

.remove-image {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: #FF3B30;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 640px) {
  .habit-hero {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }
  
  .habit-badges {
    justify-content: center;
  }
}
</style>
