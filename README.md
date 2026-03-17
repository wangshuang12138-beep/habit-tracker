# 📝 打卡 · Habit Tracker

一个简洁美观的口语练习打卡应用，支持文字记录和图片打卡，帮助养成好习惯。

![Vue](https://img.shields.io/badge/Vue-3.4-%234FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.0-%23646CFF?logo=vite)
![Express](https://img.shields.io/badge/Express-4.18-%23000000?logo=express)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deployed-%23222222?logo=github)

## ✨ 功能特性

- 👤 **多用户支持** - 创建多个账号打卡不同任务
- 📅 **灵活打卡** - 支持每日/每周/自定义周期
- 🔄 **补打卡** - 随时补打过去的记录
- 📝 **文字记录** - 记录每次练习的内容和心得
- 📸 **图片打卡** - 上传截图或照片作为打卡凭证
- 🔥 **连续打卡** - 自动计算连续打卡天数
- 📊 **数据统计** - Apple 健康风格的圆环进度和趋势图
- 📈 **热力图** - 可视化全年打卡情况

## 🚀 在线体验

**前端页面：** https://wangshuang12138-beep.github.io/habit-tracker/

**后端 API：** https://habit-tracker-blush-chi.vercel.app

## 🛠️ 技术栈

| 前端 | 后端 | 部署 |
|------|------|------|
| Vue 3 + Vite | Express.js | GitHub Pages |
| Pinia 状态管理 | JSON 数据存储 | Vercel |
| Vue Router | CORS 跨域 | GitHub Actions |
| Day.js 日期处理 | Multer 文件上传 | |

## 📁 项目结构

```
habit-tracker/
├── frontend/          # Vue 3 前端
│   ├── src/
│   │   ├── views/     # 页面组件
│   │   ├── stores/    # Pinia 状态管理
│   │   └── router/    # 路由配置
│   └── dist/          # 构建产物
├── backend/           # Express 后端
│   ├── server.js      # 主服务
│   ├── data.json      # 数据文件
│   └── uploads/       # 图片上传目录
└── .github/
    └── workflows/     # GitHub Actions 部署
```

## 🏃 本地开发

### 1. 克隆项目

```bash
git clone https://github.com/wangshuang12138-beep/habit-tracker.git
cd habit-tracker
```

### 2. 启动后端

```bash
cd backend
npm install
npm start
# 后端运行在 http://localhost:3001
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:5173
```

## 📝 更新日志

### 2024-03-13
- ✨ 首次发布
- 🎨 Apple 风格界面设计
- 👤 多用户支持
- 📅 日历打卡功能
- 📝 文字 + 图片打卡
- 📊 统计页面（圆环、趋势图、热力图）

---

> 💡 **提示**：本项目数据存储在 Vercel 服务器的 JSON 文件中，适合个人使用。如需多人协作，建议接入数据库。
