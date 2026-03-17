import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'habit-tracker-data'
const GIST_CONFIG_KEY = 'habit-tracker-gist-config'

// LocalStorage functions
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

// Gist functions
const loadGistConfig = () => {
  try {
    const config = localStorage.getItem(GIST_CONFIG_KEY)
    return config ? JSON.parse(config) : { token: '', gistId: '' }
  } catch {
    return { token: '', gistId: '' }
  }
}

const saveGistConfig = (config) => {
  localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify(config))
}

export const useGistStore = defineStore('gist', () => {
  const config = ref(loadGistConfig())
  const syncing = ref(false)
  const lastSync = ref(null)
  const syncError = ref(null)

  // Watch config changes and save to localStorage
  watch(config, (newConfig) => {
    saveGistConfig(newConfig)
  }, { deep: true })

  const setConfig = (token, gistId) => {
    config.value = { token, gistId }
  }

  const createGist = async () => {
    if (!config.value.token) return null
    
    try {
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${config.value.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: 'Habit Tracker Data',
          public: false,
          files: {
            'habit-tracker-data.json': {
              content: JSON.stringify(loadFromStorage(), null, 2)
            }
          }
        })
      })
      
      if (!response.ok) throw new Error('Failed to create gist')
      
      const data = await response.json()
      config.value.gistId = data.id
      return data.id
    } catch (err) {
      syncError.value = err.message
      throw err
    }
  }

  const syncToGist = async () => {
    if (!config.value.token || !config.value.gistId) return false
    
    syncing.value = true
    syncError.value = null
    
    try {
      const response = await fetch(`https://api.github.com/gists/${config.value.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${config.value.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'habit-tracker-data.json': {
              content: JSON.stringify(loadFromStorage(), null, 2)
            }
          }
        })
      })
      
      if (!response.ok) throw new Error('Failed to sync to gist')
      
      lastSync.value = new Date()
      return true
    } catch (err) {
      syncError.value = err.message
      throw err
    } finally {
      syncing.value = false
    }
  }

  const syncFromGist = async () => {
    if (!config.value.token || !config.value.gistId) return false
    
    syncing.value = true
    syncError.value = null
    
    try {
      const response = await fetch(`https://api.github.com/gists/${config.value.gistId}`, {
        headers: {
          'Authorization': `token ${config.value.token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch from gist')
      
      const data = await response.json()
      const content = data.files['habit-tracker-data.json']?.content
      
      if (content) {
        const parsedData = JSON.parse(content)
        saveToStorage(parsedData)
        lastSync.value = new Date()
        return true
      }
      return false
    } catch (err) {
      syncError.value = err.message
      throw err
    } finally {
      syncing.value = false
    }
  }

  // Auto sync when data changes
  let syncTimeout = null
  const scheduleSync = () => {
    if (!config.value.token || !config.value.gistId) return
    
    if (syncTimeout) clearTimeout(syncTimeout)
    syncTimeout = setTimeout(() => {
      syncToGist().catch(console.error)
    }, 3000) // Sync 3 seconds after last change
  }

  return {
    config,
    syncing,
    lastSync,
    syncError,
    setConfig,
    createGist,
    syncToGist,
    syncFromGist,
    scheduleSync
  }
})
