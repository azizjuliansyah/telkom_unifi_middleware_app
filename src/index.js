import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import morgan from 'morgan'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initDatabase } from './db/database.js'
import logger, { logError } from './middleware/logger.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import pgSession from 'connect-pg-simple'
import { pool } from './db/database.js'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

const PostgresStore = pgSession(session)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Trust proxy for secure cookies in production (Nginx, Heroku, etc)
app.set('trust proxy', 1)

// Initialize database
await initDatabase()

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.' },
  handler: (req, res, next, options) => {
    const statusCode = options?.statusCode || 429
    let errorMsg = 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.'
    if (options?.message?.message) {
      errorMsg = options.message.message
    } else if (typeof options?.message === 'string') {
      errorMsg = options.message
    }
    
    const responseObj = typeof options?.message === 'object' && options?.message !== null ? options.message : { success: false, message: errorMsg }
    
    if ((req.headers.accept && req.headers.accept.includes('application/json')) || req.xhr || req.path.includes('/login') || req.path.includes('/config') || req.path.includes('/health') || req.path.includes('/api')) {
      return res.status(statusCode).json(responseObj)
    }
    res.status(statusCode).render('error', {
      title: 'Terlalu Banyak Permintaan',
      message: errorMsg
    })
  }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10, // Stricter limit for login/auth routes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit.' },
  handler: (req, res, next, options) => {
    const statusCode = options?.statusCode || 429
    let errorMsg = 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit.'
    if (options?.message?.message) {
      errorMsg = options.message.message
    } else if (typeof options?.message === 'string') {
      errorMsg = options.message
    }
    
    const responseObj = typeof options?.message === 'object' && options?.message !== null ? options.message : { success: false, message: errorMsg }
    
    if ((req.headers.accept && req.headers.accept.includes('application/json')) || req.xhr || req.path.includes('/login') || req.path.includes('/config') || req.path.includes('/health') || req.path.includes('/api')) {
      return res.status(statusCode).json(responseObj)
    }
    res.status(statusCode).render('error', {
      title: 'Akses Dibatasi',
      message: errorMsg
    })
  }
})

// Middleware (urutan penting)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"], // Tailwind CDN and inline scripts
      "script-src-attr": ["'unsafe-inline'"], // Allow inline event handlers like onclick
      "img-src": ["'self'", "data:", "https://*"],
    },
  },
}))
app.use(generalLimiter)
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(session({
  store: new PostgresStore({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    secure: process.env.NODE_ENV === 'production'
  }
}))
app.use(logger)
app.use(express.static(join(__dirname, 'public')))

// View engine setup
app.set('view engine', 'ejs')
app.set('views', join(__dirname, 'views'))



// Mount routes
app.use('/guest', authLimiter, authRoutes)
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

// Central Error Handler (Fail Securely)
app.use((err, req, res, next) => {
  // Log detailed error to system logs
  logError(err, req)

  // Handle AJAX/API requests
  if (req.headers.accept && req.headers.accept.includes('application/json') || req.xhr) {
    return res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan internal pada server. Silakan hubungi administrator.' 
    })
  }

  // Handle Page load requests
  res.status(500).render('error', { 
    title: '500 - Kesalahan Server',
    message: 'Maaf, terjadi kesalahan internal pada server kami. Tim teknis telah diberitahu.' 
  })
})

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`)
  console.log(`[Server] Guest portal: http://localhost:${PORT}/guest/s/default/`)
  console.log(`[Server] Admin panel: http://localhost:${PORT}/admin`)
})

// Process-level Error Handlers (Unreachable errors)
process.on('unhandledRejection', (reason, promise) => {
  logError(new Error(`Unhandled Rejection: ${reason}`), null)
  // Biarkan server tetap jalan atau restart jika kritikal
})

process.on('uncaughtException', (err) => {
  logError(err, null)
  // Restart server jika error tidak terduga terjadi
  process.exit(1)
})
