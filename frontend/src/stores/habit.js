import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export const useHabitStore = defineStore('habit', () => {
  const habits = ref([])
  const currentHabit = ref(null)
  const checkins = ref([])
  const stats = ref(null)
  const loading = ref(false)

  // Load habits for user
  const loadHabits = async (userId) => {
    loading.value = true
    try {
      const res = await axios.get(`${API_URL}/api/users/${userId}/habits`)
      habits.value = res.data
    } catch (err) {
      console.error('Failed to load habits:', err)
    } finally {
      loading.value = false
    }
  }

  // Create habit
  const createHabit = async (userId, data) => {
    const res = await axios.post(`${API_URL}/api/users/${userId}/habits`, data)
    habits.value.unshift(res.data)
    return res.data
  }

  // Update habit
  const updateHabit = async (habitId, data) => {
    await axios.put(`${API_URL}/api/habits/${habitId}`, data)
    const idx = habits.value.findIndex(h => h.id === habitId)
    if (idx >= 0) {
      habits.value[idx] = { ...habits.value[idx], ...data }
    }
  }

  // Delete habit
  const deleteHabit = async (habitId) => {
    await axios.delete(`${API_URL}/api/habits/${habitId}`)
    habits.value = habits.value.filter(h => h.id !== habitId)
  }

  // Load checkins
  const loadCheckins = async (habitId, start, end) => {
    const params = {}
    if (start) params.start = start
    if (end) params.end = end
    const res = await axios.get(`${API_URL}/api/habits/${habitId}/checkins`, { params })
    checkins.value = res.data
    return res.data
  }

  // Checkin
  const checkin = async (habitId, data, imageFile) => {
    const formData = new FormData()
    formData.append('checkin_date', data.checkin_date)
    formData.append('content', data.content || '')
    if (imageFile) {
      formData.append('image', imageFile)
    }
    
    const res = await axios.post(`${API_URL}/api/habits/${habitId}/checkins`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    const idx = checkins.value.findIndex(c => c.checkin_date === data.checkin_date)
    if (idx >= 0) {
      checkins.value[idx] = res.data
    } else {
      checkins.value.unshift(res.data)
    }
    return res.data
  }

  // Delete checkin
  const deleteCheckin = async (checkinId) => {
    await axios.delete(`${API_URL}/api/checkins/${checkinId}`)
    checkins.value = checkins.value.filter(c => c.id !== checkinId)
  }

  // Load stats
  const loadStats = async (habitId) => {
    const res = await axios.get(`${API_URL}/api/habits/${habitId}/stats`)
    stats.value = res.data
    return res.data
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
