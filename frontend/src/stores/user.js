import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export const useUserStore = defineStore('user', () => {
  const users = ref([])
  const currentUser = ref(null)
  const loading = ref(false)

  const loadUsers = async () => {
    loading.value = true
    try {
      const res = await axios.get(`${API_URL}/api/users`)
      users.value = res.data
      if (res.data.length > 0 && !currentUser.value) {
        currentUser.value = res.data[0]
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      loading.value = false
    }
  }

  const createUser = async (name) => {
    const res = await axios.post(`${API_URL}/api/users`, { name })
    users.value.unshift(res.data)
    currentUser.value = res.data
    return res.data
  }

  const setCurrentUser = (user) => {
    currentUser.value = user
  }

  return {
    users,
    currentUser,
    loading,
    loadUsers,
    createUser,
    setCurrentUser
  }
})
