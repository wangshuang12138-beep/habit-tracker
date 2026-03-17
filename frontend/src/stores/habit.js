import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGistStore } from './gist'

const STORAGE_KEY = 'habit-tracker-data'

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : { users: [], habits: [], checkins: [] }
  } catch {
    return { users: [], habits: [], checkins: [] }
  }
}

const saveToStorage = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const scheduleGistSync = () => {
  try {
    const gistStore = useGistStore()
    gistStore.scheduleSync()
  } catch (e) {
    // Gist store might not be initialized yet
  }
}

export const useHabitStore = defineStore('habit', () => {
  const habits = ref([])
  const currentHabit = ref(null)
  const checkins = ref([])
  const stats = ref(null)
  const loading = ref(false)

  const loadHabits = async (userId) => {
    loading.value = true
    const data = loadFromStorage()
    habits.value = (data.habits || []).filter(h => h.user_id === userId).reverse()
    loading.value = false
  }

  const createHabit = async (userId, habitData) => {
    const newHabit = {
      id: Date.now().toString(),
      user_id: userId,
      name: habitData.name,
      description: habitData.description || '',
      color: habitData.color || '#007AFF',
      icon: habitData.icon || '📝',
      cycle_type: habitData.cycle_type || 'daily',
      cycle_days: habitData.cycle_days || 1,
      created_at: new Date().toISOString()
    }
    const data = loadFromStorage()
    data.habits = data.habits || []
    data.habits.unshift(newHabit)
    saveToStorage(data)
    habits.value.unshift(newHabit)
    scheduleGistSync()
    return newHabit
  }

  const updateHabit = async (habitId, habitData) => {
    const data = loadFromStorage()
    const idx = data.habits.findIndex(h => h.id === habitId)
    if (idx >= 0) {
      data.habits[idx] = { ...data.habits[idx], ...habitData }
      saveToStorage(data)
      const localIdx = habits.value.findIndex(h => h.id === habitId)
      if (localIdx >= 0) habits.value[localIdx] = { ...habits.value[localIdx], ...habitData }
    }
    scheduleGistSync()
  }

  const deleteHabit = async (habitId) => {
    const data = loadFromStorage()
    data.habits = data.habits.filter(h => h.id !== habitId)
    data.checkins = data.checkins.filter(c => c.habit_id !== habitId)
    saveToStorage(data)
    habits.value = habits.value.filter(h => h.id !== habitId)
    checkins.value = checkins.value.filter(c => c.habit_id !== habitId)
    scheduleGistSync()
  }

  const loadCheckins = async (habitId, start, end) => {
    const data = loadFromStorage()
    let result = (data.checkins || []).filter(c => c.habit_id === habitId)
    if (start && end) {
      result = result.filter(c => c.checkin_date >= start && c.checkin_date <= end)
    }
    checkins.value = result.sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
    return checkins.value
  }

  const checkin = async (habitId, data, imageFile) => {
    const storageData = loadFromStorage()
    storageData.checkins = storageData.checkins || []
    
    const existingIndex = storageData.checkins.findIndex(
      c => c.habit_id === habitId && c.checkin_date === data.checkin_date
    )
    
    let checkinData
    if (existingIndex >= 0) {
      storageData.checkins[existingIndex].content = data.content || ''
      checkinData = storageData.checkins[existingIndex]
    } else {
      checkinData = {
        id: Date.now().toString(),
        habit_id: habitId,
        checkin_date: data.checkin_date,
        content: data.content || '',
        image_path: null,
        created_at: new Date().toISOString()
      }
      storageData.checkins.push(checkinData)
    }
    
    saveToStorage(storageData)
    
    const idx = checkins.value.findIndex(c => c.checkin_date === data.checkin_date)
    if (idx >= 0) {
      checkins.value[idx] = checkinData
    } else {
      checkins.value.unshift(checkinData)
    }
    scheduleGistSync()
    return checkinData
  }

  const deleteCheckin = async (checkinId) => {
    const data = loadFromStorage()
    data.checkins = data.checkins.filter(c => c.id !== checkinId)
    saveToStorage(data)
    checkins.value = checkins.value.filter(c => c.id !== checkinId)
    scheduleGistSync()
  }

  const loadStats = async (habitId) => {
    const data = loadFromStorage()
    const habitCheckins = (data.checkins || []).filter(c => c.habit_id === habitId)
    const dates = habitCheckins.map(c => c.checkin_date).sort()
    
    // Calculate streak
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0
    
    if (dates.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const lastCheckin = dates[dates.length - 1]
      const daysSinceLast = Math.floor((new Date(today) - new Date(lastCheckin)) / (1000 * 60 * 60 * 24))
      const isActive = daysSinceLast <= 1
      
      if (isActive) {
        currentStreak = 1
        for (let i = dates.length - 2; i >= 0; i--) {
          const diff = Math.floor((new Date(dates[i + 1]) - new Date(dates[i])) / (1000 * 60 * 60 * 24))
          if (diff === 1) currentStreak++
          else break
        }
      }
      
      tempStreak = 1
      maxStreak = 1
      for (let i = 1; i < dates.length; i++) {
        const diff = Math.floor((new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24))
        if (diff === 1) {
          tempStreak++
          maxStreak = Math.max(maxStreak, tempStreak)
        } else {
          tempStreak = 1
        }
      }
    }
    
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthStart = new Date().toISOString().slice(0, 7) + '-01'
    
    stats.value = {
      total: habitCheckins.length,
      currentStreak,
      maxStreak,
      thisWeek: habitCheckins.filter(c => c.checkin_date >= weekStart).length,
      thisMonth: habitCheckins.filter(c => c.checkin_date >= monthStart).length,
      checkinDates: dates
    }
    return stats.value
  }

  return {
    habits,
    currentHabit,
    checkins,
    stats,
    loading,
    loadHabits,
    createHabit,
    updateHabit,
    deleteHabit,
    loadCheckins,
    checkin,
    deleteCheckin,
    loadStats
  }
})
