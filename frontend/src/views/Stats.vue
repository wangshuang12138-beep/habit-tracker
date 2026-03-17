<template>
  <div class="stats-page" v-if="habit">
    <!-- Header -->
    <div class="detail-header">
      <button class="back-btn" @click="$router.push(`/habit/${habit.id}`)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回
      </button>
      
      <h2 class="page-title">统计</h2>
      
      <div class="period-selector">
        <button 
          v-for="p in periods" 
          :key="p.value"
          class="period-btn"
          :class="{ active: period === p.value }"
          @click="period = p.value"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Main Stats Cards -->
    <div class="stats-grid">
      <!-- Streak Card -->
      <div class="stat-card streak-card">
        <div class="stat-header">
          <span class="stat-label">连续打卡</span>
          <span class="trend" :class="{ up: stats?.currentStreak > 7 }">
            {{ stats?.currentStreak > 7 ? '🔥 很棒' : '继续加油' }}
          </span>
        </div>
        <div class="stat-value-large">
          {{ stats?.currentStreak || 0 }}
          <span class="unit">天</span>
        </div>
        <div class="progress-ring">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="42" />
            <circle 
              class="ring-progress" 
              cx="50" 
              cy="50" 
              r="42"
              :style="{ strokeDashoffset: 264 - (264 * Math.min(stats?.currentStreak || 0, 30) / 30) }"
            />
          </svg>
          <div class="ring-icon">🔥</div>
        </div>
      </div>

      <!-- Total Checkins -->
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">总打卡</span>
        </div>
        <div class="stat-value-large" :style="{ color: habit.color }">
          {{ stats?.total || 0 }}
          <span class="unit">次</span>
        </div>
        <div class="stat-sub">最高连续 {{ stats?.maxStreak || 0 }} 天</div>
      </div>

      <!-- This Period -->
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">{{ periodLabel }}</span>
        </div>
        <div class="stat-value-large" :style="{ color: habit.color }">
          {{ periodCount }}
          <span class="unit">次</span>
        </div>
        <div class="stat-sub">
          完成率 {{ completionRate }}%
        </div>
      </div>

      <!-- Completion Rate Ring -->
      <div class="stat-card ring-card">
        <div class="stat-header">
          <span class="stat-label">完成率</span>
        </div>
        <div class="progress-ring large">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="42" />
            <circle 
              class="ring-progress" 
              cx="50" 
              cy="50" 
              r="42"
              :style="{ 
                stroke: habit.color,
                strokeDashoffset: 264 - (264 * completionRate / 100) 
              }"
            />
          </svg>
          <div class="ring-text">{{ completionRate }}%</div>
        </div>
      </div>
    </div>

    <!-- Activity Trend Chart -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>打卡趋势</h3>
        <span class="chart-subtitle">{{ chartDateRange }}</span>
      </div>
      <div class="trend-chart">
        <div 
          v-for="(item, idx) in trendData" 
          :key="idx"
          class="trend-bar"
          :style="{ 
            height: `${Math.max(item.count * 100 / maxTrendCount, 4)}%`,
            background: habit.color
          }"
          :title="`${item.label}: ${item.count}次`"
        />
      </div>
      <div class="trend-labels">
        <span v-for="(item, idx) in trendLabels" :key="idx">{{ item }}</span>
      </div>
    </div>

    <!-- Calendar Heatmap -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>打卡日历</h3>
        <div class="heatmap-legend">
          <span>少</span>
          <div class="legend-dots">
            <div v-for="i in 4" :key="i" class="legend-dot" :class="`level-${i}`" />
          </div>
          <span>多</span>
        </div>
      </div>
      
      <div class="heatmap">
        <div v-for="(month, mIdx) in heatmapData" :key="mIdx" class="heatmap-month">
          <div class="month-label">{{ month.label }}</div>
          <div class="month-days">
            <div 
              v-for="(day, dIdx) in month.days" 
              :key="dIdx"
              class="heatmap-day"
              :class="{ 
                empty: !day,
                [`level-${day?.level}`]: day 
              }"
              :style="day ? { background: getHeatColor(day.level) } : {}"
              :title="day ? `${day.date}: ${day.count}次` : ''"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Records -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>最近记录</h3>
      </div>
      <div class="records-list">
        <div 
          v-for="record in recentRecords" 
          :key="record.id"
          class="record-item"
        >
          <div class="record-dot" :style="{ background: habit.color }" />
          <div class="record-info">
            <div class="record-date">{{ formatDate(record.checkin_date) }}</div>
            <div class="record-content" v-if="record.content">
              {{ record.content }}
            </div>
          </div>
          <div v-if="record.image_path" class="record-image">
            <img :src="getImageUrl(record.image_path)" />
          </div>
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
const stats = computed(() => habitStore.stats)
const checkins = computed(() => habitStore.checkins)

const period = ref('week')
const periods = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' }
]

const periodLabel = computed(() => {
  if (period.value === 'week') return '本周打卡'
  if (period.value === 'month') return '本月打卡'
  return '今年打卡'
})

const periodCount = computed(() => {
  if (!stats.value) return 0
  if (period.value === 'week') return stats.value.thisWeek
  if (period.value === 'month') return stats.value.thisMonth
  return stats.value.total
})

const completionRate = computed(() => {
  if (!stats.value?.checkinDates?.length) return 0
  
  const now = dayjs()
  let totalDays = 0
  
  if (period.value === 'week') {
    totalDays = 7
  } else if (period.value === 'month') {
    totalDays = now.daysInMonth()
  } else {
    totalDays = now.dayOfYear()
  }
  
  // Count checkins in period
  const checkinsInPeriod = stats.value.checkinDates.filter(date => {
    const d = dayjs(date)
    if (period.value === 'week') {
      return d.isAfter(now.subtract(7, 'day'))
    } else if (period.value === 'month') {
      return d.month() === now.month() && d.year() === now.year()
    }
    return d.year() === now.year()
  })
  
  return Math.round((checkinsInPeriod.length / totalDays) * 100)
})

// Trend chart data
const trendData = computed(() => {
  const data = []
  const now = dayjs()
  
  if (period.value === 'week') {
    for (let i = 6; i >= 0; i--) {
      const date = now.subtract(i, 'day')
      const dateStr = date.format('YYYY-MM-DD')
      const count = stats.value?.checkinDates?.filter(d => d === dateStr).length || 0
      data.push({
        label: date.format('ddd'),
        count
      })
    }
  } else if (period.value === 'month') {
    for (let i = 3; i >= 0; i--) {
      const start = now.subtract((i + 1) * 7, 'day')
      const end = now.subtract(i * 7, 'day')
      const count = stats.value?.checkinDates?.filter(d => {
        const date = dayjs(d)
        return date.isAfter(start) && date.isBefore(end)
      }).length || 0
      data.push({
        label: `第${4 - i}周`,
        count
      })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const month = now.subtract(i, 'month')
      const count = stats.value?.checkinDates?.filter(d => {
        const date = dayjs(d)
        return date.month() === month.month() && date.year() === month.year()
      }).length || 0
      data.push({
        label: month.format('M月'),
        count
      })
    }
  }
  
  return data
})

const maxTrendCount = computed(() => {
  return Math.max(...trendData.value.map(d => d.count), 1)
})

const trendLabels = computed(() => trendData.value.map(d => d.label))

const chartDateRange = computed(() => {
  const now = dayjs()
  if (period.value === 'week') {
    return now.subtract(6, 'day').format('M月D日') + ' - ' + now.format('M月D日')
  } else if (period.value === 'month') {
    return now.format('M月')
  }
  return now.format('YYYY年')
})

// Heatmap data - last 12 months
const heatmapData = computed(() => {
  const months = []
  const now = dayjs()
  
  for (let m = 11; m >= 0; m--) {
    const monthStart = now.subtract(m, 'month').startOf('month')
    const monthEnd = now.subtract(m, 'month').endOf('month')
    const daysInMonth = monthEnd.date()
    
    const days = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date = monthStart.add(d - 1, 'day')
      const dateStr = date.format('YYYY-MM-DD')
      const hasCheckin = stats.value?.checkinDates?.includes(dateStr)
      
      if (date.isAfter(now)) {
        days.push(null)
      } else if (hasCheckin) {
        days.push({
          date: dateStr,
          count: 1,
          level: 3
        })
      } else {
        days.push({
          date: dateStr,
          count: 0,
          level: 0
        })
      }
    }
    
    months.push({
      label: monthStart.format('M月'),
      days
    })
  }
  
  return months
})

const getHeatColor = (level) => {
  const baseColor = habit.value?.color || '#007AFF'
  const opacity = level === 0 ? 0.1 : level === 1 ? 0.3 : level === 2 ? 0.6 : 1
  return baseColor + Math.round(opacity * 255).toString(16).padStart(2, '0')
}

const recentRecords = computed(() => {
  return [...checkins.value]
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
    .slice(0, 10)
})

const formatDate = (date) => {
  return dayjs(date).format('M月D日 dddd')
}

const getImageUrl = (path) => {
  return `http://localhost:3001${path}`
}

onMounted(() => {
  if (habit.value) {
    const start = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
    const end = dayjs().format('YYYY-MM-DD')
    habitStore.loadCheckins(habit.value.id, start, end)
    habitStore.loadStats(habit.value.id)
  }
})

watch(() => route.params.id, (newId) => {
  if (newId) {
    const start = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
    const end = dayjs().format('YYYY-MM-DD')
    habitStore.loadCheckins(newId, start, end)
    habitStore.loadStats(newId)
  }
})
</script>

<style scoped>
.stats-page {
  max-width: 800px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
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

.page-title {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  text-align: center;
}

.period-selector {
  display: flex;
  background: var(--bg);
  border-radius: 20px;
  padding: 4px;
}

.period-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 16px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.period-btn.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}

.streak-card {
  display: flex;
  flex-direction: column;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trend {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 10px;
  background: var(--bg);
  color: var(--text-secondary);
}

.trend.up {
  background: #E8F5E9;
  color: #2E7D32;
}

.stat-value-large {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
}

.stat-value-large .unit {
  font-size: 20px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 4px;
}

.stat-sub {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Progress Ring */
.progress-ring {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  height: 64px;
}

.progress-ring.large {
  position: relative;
  right: auto;
  top: auto;
  transform: none;
  width: 80px;
  height: 80px;
  margin: 8px auto 0;
}

.progress-ring svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.ring-bg {
  fill: none;
  stroke: var(--bg);
  stroke-width: 8;
}

.ring-progress {
  fill: none;
  stroke: #FF9500;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 264;
  transition: stroke-dashoffset 0.5s ease;
}

.ring-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
}

.ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  font-weight: 600;
}

.ring-card {
  display: flex;
  flex-direction: column;
}

.ring-card .stat-header {
  margin-bottom: 0;
}

/* Chart Card */
.chart-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.chart-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Trend Chart */
.trend-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 120px;
  gap: 8px;
  padding: 0 4px;
}

.trend-bar {
  flex: 1;
  min-width: 24px;
  max-width: 48px;
  border-radius: 6px 6px 0 0;
  transition: all 0.3s ease;
  opacity: 0.8;
}

.trend-bar:hover {
  opacity: 1;
}

.trend-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 4px;
}

.trend-labels span {
  flex: 1;
  text-align: center;
  font-size: 11px;
  color: var(--text-secondary);
}

/* Heatmap */
.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.legend-dots {
  display: flex;
  gap: 3px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-dot.level-1 { background: #E0E0E0; }
.legend-dot.level-2 { background: #BDBDBD; }
.legend-dot.level-3 { background: #757575; }
.legend-dot.level-4 { background: #424242; }

.heatmap {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.heatmap-month {
  flex: 1;
  min-width: 200px;
}

.month-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.month-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.heatmap-day {
  aspect-ratio: 1;
  border-radius: 3px;
  background: var(--bg);
  transition: all 0.2s;
}

.heatmap-day:not(.empty):hover {
  transform: scale(1.2);
  z-index: 1;
}

/* Records */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--bg);
  border-radius: var(--radius);
}

.record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.record-info {
  flex: 1;
}

.record-date {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.record-content {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.record-image img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-page {
    padding: 0 12px;
  }
  
  .detail-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .period-selector {
    width: 100%;
    justify-content: center;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .stat-value-large {
    font-size: 32px;
  }
  
  .progress-ring {
    width: 48px;
    height: 48px;
  }
  
  .chart-card {
    padding: 16px;
  }
  
  .trend-chart {
    height: 100px;
  }
  
  .heatmap {
    gap: 16px;
  }
  
  .heatmap-month {
    min-width: 100%;
  }
  
  .month-days {
    gap: 2px;
  }
  
  .heatmap-day {
    border-radius: 2px;
  }
}
</style>
