import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import HabitDetail from './views/HabitDetail.vue'
import Stats from './views/Stats.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/habit/:id', name: 'HabitDetail', component: HabitDetail },
  { path: '/stats/:id', name: 'Stats', component: Stats }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
