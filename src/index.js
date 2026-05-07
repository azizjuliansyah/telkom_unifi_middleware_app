import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import morgan from 'morgan'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initDatabase } from './db/database.js'
import logger from './middleware/logger.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Initialize database
await initDatabase()

// Middleware (urutan penting)
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 }
}))
app.use(logger)
app.use(express.static(join(__dirname, 'public')))

// View engine setup
app.set('view engine', 'ejs')
app.set('views', join(__dirname, 'views'))



// Mount routes
app.use('/guest', authRoutes)
app.use('/admin', adminRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 Handler - Catch all undefined routes
app.use((req, res) => {
  res.status(404).render('error', { 
    title: '404 - Tidak Ditemukan',
    message: 'Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.' 
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`)
  console.log(`[Server] Guest portal: http://localhost:${PORT}/guest/s/default/`)
  console.log(`[Server] Admin panel: http://localhost:${PORT}/admin`)
})
