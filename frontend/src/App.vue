<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <router-link to="/" class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span class="logo-text">打卡</span>
        </router-link>
        
        <div class="user-switcher">
          <button 
            v-for="user in users" 
            :key="user.id"
            class="user-btn"
            :class="{ active: currentUser?.id === user.id }"
            @click="selectUser(user)"
          >
            {{ user.name }}
          </button>
          <button class="user-btn add" @click="showAddUser = true">
            +
          </button>
        </div>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <!-- Add User Modal -->
    <div v-if="showAddUser" class="modal-overlay" @click.self="showAddUser = false">
      <div class="modal">
        <h3>新建用户</h3>
        <input 
          v-model="newUserName" 
          placeholder="输入用户名" 
          class="input"
          @keyup.enter="createUser"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showAddUser = false">取消</button>
          <button class="btn btn-primary" @click="createUser" :disabled="!newUserName.trim()">
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from './stores/user'

const userStore = useUserStore()
const users = computed(() => userStore.users)
const currentUser = computed(() => userStore.currentUser)

const showAddUser = ref(false)
const newUserName = ref('')

const selectUser = (user) => {
  userStore.setCurrentUser(user)
}

const createUser = async () => {
  if (!newUserName.value.trim()) return
  await userStore.createUser(newUserName.value.trim())
  newUserName.value = ''
  showAddUser.value = false
}

onMounted(() => {
  userStore.loadUsers()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #007AFF;
  --primary-hover: #0056CC;
  --bg: #F5F5F7;
  --surface: #FFFFFF;
  --text: #1D1D1F;
  --text-secondary: #6E6E73;
  --border: rgba(0, 0, 0, 0.1);
  --radius: 12px;
  --radius-lg: 20px;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  --shadow-hover: 0 4px 20px rgba(0, 0, 0, 0.12);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
}

.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(20px);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text);
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--primary), #5856D6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-icon svg {
  width: 18px;
  height: 18px;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.user-switcher {
  display: flex;
  gap: 8px;
}

.user-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.user-btn:hover {
  background: #E5E5EA;
}

.user-btn.active {
  background: var(--primary);
  color: white;
}

.user-btn.add {
  width: 36px;
  padding: 0;
  font-size: 20px;
  background: var(--primary);
  color: white;
  font-weight: 600;
}

.user-btn.add:hover {
  background: var(--primary-hover);
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-hover);
}

.modal h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 15px;
  background: var(--bg);
  transition: all 0.2s;
  font-family: inherit;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--bg);
  color: var(--text);
}

.btn-secondary:hover {
  background: #E5E5EA;
}

/* Touch optimization for mobile */
@media (hover: none) {
  .btn-primary:hover:not(:disabled) {
    background: var(--primary);
  }
  
  .btn-primary:active:not(:disabled) {
    background: var(--primary-hover);
    transform: scale(0.98);
  }
  
  .user-btn:hover {
    background: var(--bg);
  }
  
  .user-btn:active {
    background: #E5E5EA;
  }
  
  .user-btn.add:hover {
    background: var(--primary);
  }
  
  .user-btn.add:active {
    background: var(--primary-hover);
  }
}

@media (max-width: 640px) {
  .header-content {
    padding: 10px 12px;
    flex-wrap: nowrap;
  }
  
  .logo-text {
    font-size: 16px;
  }
  
  .logo-icon {
    width: 28px;
    height: 28px;
  }
  
  .user-switcher {
    gap: 6px;
    flex-shrink: 0;
  }
  
  .user-btn {
    padding: 6px 10px;
    font-size: 13px;
    white-space: nowrap;
  }
  
  .user-btn.add {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
  
  .main {
    padding: 16px 12px;
  }
  
  .modal {
    margin: 16px;
    padding: 20px;
  }
}
</style>
