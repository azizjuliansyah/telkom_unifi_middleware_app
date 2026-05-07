import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { verifyLocalUser } from '../services/localUser.js'
import { verifyUser } from '../services/verifyUser.js'
import { authorizeGuest } from '../services/unifi.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const router = express.Router()

// GET /guest/config
router.get('/config', (req, res) => {
  res.json({
    forgotPasswordUrl: process.env.FORGOT_PASSWORD_URL || '#'
  })
})

// GET /guest/s/:siteId/
router.get('/s/:siteId/', (req, res) => {
  const mac = req.query.id
  if (!mac) {
    return res.status(400).render('error', { 
      message: 'ID Perangkat (MAC Address) tidak ditemukan. Pastikan Anda mengakses halaman ini melalui jaringan WiFi yang tersedia.' 
    })
  }
  res.cookie('portal_mac', mac, { httpOnly: true, maxAge: 10 * 60 * 1000 })
  res.cookie('portal_redirect', req.query.url || '', { httpOnly: true, maxAge: 10 * 60 * 1000 })
  res.render('login')
})

// GET /guest/success
router.get('/success', (req, res) => {
  const redirectUrl = req.query.url || req.cookies.portal_redirect
  res.render('success', { redirectUrl })
})

// POST /guest/s/:siteId/login
router.post('/s/:siteId/login', async (req, res) => {
  const { username, password } = req.body
  const mac = req.cookies.portal_mac
  const redirectUrl = req.cookies.portal_redirect

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' })
  }
  if (!mac) {
    return res.status(400).json({ success: false, message: 'Session expired. Silakan konek ulang ke WiFi.' })
  }

  try {
    // 1. Cek local user dulu
    const localUser = await verifyLocalUser(username, password)

    if (localUser) {
      console.log(`[Auth] Local user matched: ${username}`)
    } else {
      // 2. Fallback ke Verify API
      console.log(`[Auth] Local user not found, trying Verify API for: ${username}`)
      const isValid = await verifyUser(username, password)
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Username atau password salah' })
      }
      console.log(`[Auth] Verify API success for: ${username}`)
    }

    // 3. Authorize ke Unifi
    const authorized = await authorizeGuest(mac)
    if (!authorized) {
      return res.status(500).json({ success: false, message: 'Gagal authorize ke jaringan. Hubungi administrator.' })
    }

    return res.json({ success: true, redirect: redirectUrl || 'http://www.google.com' })

  } catch (err) {
    console.error('[Auth] Error:', err.message)
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server. Coba lagi.' })
  }
})

export default router
