import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bcrypt from 'bcryptjs'
import { pool } from '../db/database.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../services/localUser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const router = express.Router()

// Public: Login page
router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin')
  res.render('admin-login')
})

// Public: Login action
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' })
  }
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
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Logout] Error:', err)
      return res.status(500).json({ success: false, message: 'Gagal logout' })
    }
    return res.json({ success: true })
  })
})

// Protected: semua route di bawah ini pakai requireAdminAuth
router.use(requireAdminAuth)

// Dashboard
router.get('/', (req, res) => res.render('admin'))
router.get('/dashboard', (req, res) => res.render('admin'))

// API: current admin info
router.get('/api/me', (req, res) => {
  res.json({ success: true, data: { username: req.session.adminUsername } })
})

// API: get all local users
router.get('/api/users', async (req, res) => {
  try {
    const users = await getAllUsers()
    res.json({ success: true, data: users })
  } catch (err) {
    console.error('[API] Error fetching users:', err.message)
    res.status(500).json({ success: false, message: 'Gagal mengambil data users' })
  }
})

// API: create user
router.post('/api/users', async (req, res) => {
  const { username, password, fullName } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' })
  }
  try {
    const result = await createUser({ username, password, fullName })
    if (!result.success) return res.status(400).json(result)
    return res.status(201).json(result)
  } catch (err) {
    console.error('[API] Error creating user:', err.message)
    res.status(500).json({ success: false, message: 'Gagal membuat user' })
  }
})

// API: update user
router.put('/api/users/:id', async (req, res) => {
  const { username, password, fullName, isActive } = req.body
  try {
    const result = await updateUser(req.params.id, { username, password, fullName, isActive })
    if (!result.success) return res.status(400).json(result)
    return res.json(result)
  } catch (err) {
    console.error('[API] Error updating user:', err.message)
    res.status(500).json({ success: false, message: 'Gagal mengupdate user' })
  }
})

// API: delete user
router.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await deleteUser(req.params.id)
    return res.json(result)
  } catch (err) {
    console.error('[API] Error deleting user:', err.message)
    res.status(500).json({ success: false, message: 'Gagal menghapus user' })
  }
})

export default router
