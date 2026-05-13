import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bcrypt from 'bcryptjs'
import { pool } from '../db/database.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../services/localUser.js'
import { 
  adminLoginValidation, 
  profileValidation, 
  userValidation, 
  listUsersValidation 
} from '../middleware/validation.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const router = express.Router()

// Public: Login page
router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin')
  res.render('admin-login')
})

// Public: Login action
router.post('/login', adminLoginValidation, async (req, res) => {
  const { username, password } = req.body
  const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username])
  const admin = result.rows[0]
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' })
  }
  req.session.adminId = admin.id
  req.session.adminUsername = admin.username
  return res.json({ success: true })
})

// Public: Logout
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err)
    }
    return res.json({ success: true })
  })
})

// Protected: semua route di bawah ini pakai requireAdminAuth
router.use(requireAdminAuth)

// Dashboard
router.get('/', (req, res) => res.render('admin-dashboard', { path: '/admin' }))
router.get('/dashboard', (req, res) => res.render('admin-dashboard', { path: '/admin' }))

// User Management
router.get('/users', (req, res) => res.render('admin-users', { path: '/admin/users' }))

// Profile Page
router.get('/profile', (req, res) => res.render('admin-profile', { path: '/admin/profile' }))

// API: dashboard stats
router.get('/api/stats', async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM local_users')
    const activeUsersCount = await pool.query('SELECT COUNT(*) FROM local_users WHERE is_active = TRUE')
    const adminsCount = await pool.query('SELECT COUNT(*) FROM admin_users')
    
    // Recent users (last 5)
    const recentUsers = await pool.query('SELECT username, full_name, created_at FROM local_users ORDER BY created_at DESC LIMIT 5')

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(usersCount.rows[0].count),
        activeUsers: parseInt(activeUsersCount.rows[0].count),
        totalAdmins: parseInt(adminsCount.rows[0].count)
      },
      recentUsers: recentUsers.rows
    })
  } catch (err) {
    next(err)
  }
})

// API: current admin info
router.get('/api/me', (req, res) => {
  res.json({ success: true, data: { username: req.session.adminUsername } })
})

// API: update admin profile (password)
router.put('/api/profile', profileValidation, async (req, res) => {
  const { password } = req.body

  try {
    const hashed = bcrypt.hashSync(password, 10)
    await pool.query('UPDATE admin_users SET password = $1 WHERE id = $2', [hashed, req.session.adminId])
    return res.json({ success: true, message: 'Password berhasil diperbarui' })
  } catch (err) {
    next(err)
  }
})

// API: get all local users (paginated & searchable)
router.get('/api/users', listUsersValidation, async (req, res) => {
  const { search, page, limit } = req.query
  try {
    const result = await getUsers({ search, page, limit })
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

// API: create user
router.post('/api/users', userValidation, async (req, res) => {
  const { username, password, fullName } = req.body
  try {
    const result = await createUser({ username, password, fullName })
    if (!result.success) return res.status(400).json(result)
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

// API: update user
router.put('/api/users/:id', userValidation, async (req, res) => {
  const { username, password, fullName, isActive } = req.body
  try {
    const result = await updateUser(req.params.id, { username, password, fullName, isActive })
    if (!result.success) return res.status(400).json(result)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

// API: delete user
router.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await deleteUser(req.params.id)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

// API: client-side error logging
router.post('/api/logs/client', (req, res) => {
  const { error, info } = req.body
  const errObj = new Error(error || 'Client-side error')
  errObj.stack = info || 'No stack trace'
  
  // Reuse our logError utility
  import('../middleware/logger.js').then(({ logError }) => {
    logError(errObj, req)
  })
  
  res.status(204).end()
})

export default router
