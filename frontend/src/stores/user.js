import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGistStore } from './gist'

// 本地存储版本 - 无需后端
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

export const useUserStore = defineStore('user', () => {
  const data = loadFromStorage()
  const users = ref(data.users || [])
  const currentUser = ref(null)
  const loading = ref(false)

  const loadUsers = async () => {
    loading.value = true
    users.value = loadFromStorage().users || []
    if (users.value.length > 0 && !currentUser.value) {
      currentUser.value = users.value[0]
    }
    loading.value = false
  }

  const createUser = async (name) => {
    const newUser = {
      id: Date.now().toString(),
      name,
      avatar: null,
      created_at: new Date().toISOString()
    }
    const storageData = loadFromStorage()
    storageData.users.unshift(newUser)
    saveToStorage(storageData)
    users.value.unshift(newUser)
    currentUser.value = newUser
    
    // Trigger gist sync
    try {
      const gistStore = useGistStore()
      gistStore.scheduleSync()
    } catch (e) {
      // Gist store might not be initialized yet
    }
    
    return newUser
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
