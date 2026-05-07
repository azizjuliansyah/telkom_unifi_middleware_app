# Unifi Captive Portal Middleware App

Buatkan aplikasi Node.js + Express yang berfungsi sebagai middleware untuk Unifi Captive Portal dengan fitur local user management dan admin panel. Ikuti semua instruksi di bawah ini secara lengkap dan detail.

---

## Konteks Sistem

Alur verifikasi login (prioritas lokal dulu):
1. User konek ke WiFi Unifi → Unifi redirect browser ke middleware
2. Middleware tampilkan login page
3. User submit username + password
4. **Cek local users terlebih dahulu** (dari PostgreSQL database)
5. Jika ditemukan dan password cocok → langsung authorize ke Unifi
6. Jika tidak ada di local → **fallback ke Verify API milik client**
7. Jika Verify API return true → authorize ke Unifi
8. Jika keduanya gagal → tampilkan error

Admin panel terpisah untuk manage local users (CRUD), dilindungi session login admin.

---

## Struktur Project

```
unifi-captive-middleware/
├── src/
│   ├── index.js
│   ├── routes/
│   │   ├── auth.js           → captive portal login flow
│   │   └── admin.js          → admin panel routes
│   ├── services/
│   │   ├── verifyUser.js     → hit verify API client (fallback)
│   │   ├── localUser.js      → CRUD local users di PostgreSQL
│   │   └── unifi.js          → hit Unifi authorize-guest API
│   ├── middleware/
│   │   ├── logger.js         → request logger
│   │   └── adminAuth.js      → protect admin routes
│   ├── db/
│   │   └── database.js       → PostgreSQL pool setup & init
│   └── views/
│       ├── login.html        → captive portal login page
│       ├── admin-login.html  → halaman login admin
│       └── admin.html        → admin dashboard (user management)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Dependencies

```json
{
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "cookie-parser": "^1.4.6",
    "morgan": "^1.10.0",
    "pg": "^8.11.3",
    "bcryptjs": "^2.4.3",
    "express-session": "^1.17.3",
    "uuid": "^9.0.0"
  }
}
```

---

## Detail Implementasi

### `src/db/database.js`

Setup koneksi PostgreSQL menggunakan `pg` (node-postgres) dengan connection pool.

Buat dan export:
- `pool` — instance `new Pool({...})` terhubung ke PostgreSQL via env vars
- `query(text, params)` — wrapper async: `return pool.query(text, params)`
- `initDatabase()` — async function untuk membuat tabel dan seed data awal

**Konfigurasi pool:**
```js
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'captive_portal',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

**`initDatabase()` langkah-langkah:**

1. Test koneksi: `await pool.query('SELECT NOW()')` — log `[DB] Connected to PostgreSQL` jika berhasil

2. Buat tabel `local_users`:
```sql
CREATE TABLE IF NOT EXISTS local_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(100) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  full_name   VARCHAR(200),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
)
```

3. Buat tabel `admin_users`:
```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(100) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

4. Seed default admin jika tabel kosong:
```js
const result = await query('SELECT COUNT(*) FROM admin_users')
if (parseInt(result.rows[0].count) === 0) {
  const plainPass = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
  const hashed = bcrypt.hashSync(plainPass, 10)
  await query(
    'INSERT INTO admin_users (username, password) VALUES ($1, $2)',
    ['admin', hashed]
  )
  console.log(`[DB] Default admin created: username=admin password=${plainPass}`)
}
```

5. Log `[DB] Database initialized successfully`

Export named: `export { pool, query, initDatabase }`
File ini juga mengimport `bcryptjs` untuk keperluan seed (sudah di-import di atas).

---

### `src/index.js`

- Gunakan ESM imports. Load dotenv dengan:
  ```js
  import 'dotenv/config'
  ```
- Import dan jalankan `initDatabase()` dari `./db/database`
- Setup express dengan middleware berikut (urutan penting):
  1. `morgan('dev')`
  2. `express.json()`
  3. `express.urlencoded({ extended: true })`
  4. `cookieParser()`
  5. `session({ secret, resave: false, saveUninitialized: false, cookie: { maxAge: 2 * 60 * 60 * 1000 } })`
- Import semua modul dengan `import` syntax (ESM)
- Import `__dirname` equivalent:
  ```js
  import { fileURLToPath } from 'url'
  import { dirname } from 'path'
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  ```
- Mount routes:
  - `/guest` → `./routes/auth.js`
  - `/admin` → `./routes/admin.js`
- `GET /health` → `{ status: 'ok', timestamp: new Date().toISOString() }`
- Listen di `process.env.PORT || 3000`

---

### `src/services/localUser.js`

Import dengan ESM syntax:
```js
import { query } from '../db/database.js'
import bcrypt from 'bcryptjs'
```

Semua fungsi adalah **async** karena PostgreSQL menggunakan async/await.
Gunakan parameterized query dengan `$1, $2, ...` (bukan `?`).

```js
async function verifyLocalUser(username, password)
// Query: SELECT * FROM local_users WHERE username = $1 AND is_active = TRUE
// Jika rows kosong → return null
// bcrypt.compareSync(password, user.password)
// Jika cocok → return { id, username, full_name, is_active, created_at } (TANPA field password)
// Jika tidak cocok → return null

async function getAllUsers()
// SELECT id, username, full_name, is_active, created_at, updated_at FROM local_users ORDER BY created_at DESC
// Return rows array

async function getUserById(id)
// SELECT id, username, full_name, is_active, created_at FROM local_users WHERE id = $1
// Return rows[0] atau null

async function createUser({ username, password, fullName })
// Hash password: bcrypt.hashSync(password, 10)
// INSERT INTO local_users (username, password, full_name) VALUES ($1, $2, $3) RETURNING id, username, full_name, is_active, created_at
// Catch error dengan code '23505' (unique violation) → return { success: false, message: 'Username sudah digunakan' }
// Return { success: true, user: rows[0] }

async function updateUser(id, { username, password, fullName, isActive })
// Build SET clause secara dinamis — hanya update field yang dikirim (tidak undefined)
// Selalu update updated_at = NOW()
// Gunakan $1, $2, ... sesuai jumlah field yang diupdate, $N terakhir = id
// Jika password diisi → hash dulu dengan bcrypt
// isActive adalah boolean (true/false), bukan integer
// Return { success: true } atau { success: false, message }

async function deleteUser(id)
// DELETE FROM local_users WHERE id = $1
// Return { success: true }
```

---

### `src/services/verifyUser.js`

```js
import axios from 'axios'

async function verifyUser(username, password) {
  // Jika VERIFY_API_URL tidak di-set → log warning dan return false
  if (!process.env.VERIFY_API_URL) {
    console.warn('[VerifyAPI] VERIFY_API_URL not set, skipping external verify')
    return false
  }

  console.log(`[VerifyAPI] Checking user: ${username}`)

  try {
    const res = await axios.post(process.env.VERIFY_API_URL, { username, password }, { timeout: 10000 })
    // HTTP 2xx = valid
    return res.status >= 200 && res.status < 300
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      return false
    }
    throw err
  }
}

export { verifyUser }
```

---

### `src/services/unifi.js`

```js
import axios from 'axios'
import https from 'https'

const agent = new https.Agent({ rejectUnauthorized: false })

async function authorizeGuest(mac) {
  console.log(`[Unifi] Authorizing MAC: ${mac}`)
  const res = await axios.post(
    `${process.env.UNIFI_URL}/proxy/network/api/s/default/cmd/stamgr`,
    { cmd: 'authorize-guest', mac },
    { headers: { 'X-API-KEY': process.env.UNIFI_API_KEY }, httpsAgent: agent, timeout: 15000 }
  )
  return res.data?.meta?.rc === 'ok'
}

export { authorizeGuest }
```

---

### `src/middleware/adminAuth.js`

```js
function requireAdminAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next()
  }
  // Jika request adalah API (Accept: application/json) → return 401 JSON
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  return res.redirect('/admin/login')
}

export { requireAdminAuth }
```

---

### `src/middleware/logger.js`

```js
function logger(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    const mac = req.query.id || '-'
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | mac: ${mac} | status: ${res.statusCode} | ${duration}ms`)
  })
  next()
}

export default logger
```

---

### `src/routes/auth.js`

```js
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { verifyLocalUser } from '../services/localUser.js'
import { verifyUser } from '../services/verifyUser.js'
import { authorizeGuest } from '../services/unifi.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const router = express.Router()

// GET /guest/s/:siteId/
router.get('/s/:siteId/', (req, res) => {
  const mac = req.query.id
  if (!mac) {
    return res.status(400).send('<h3>Error: MAC address tidak ditemukan dalam request</h3>')
  }
  res.cookie('portal_mac', mac, { httpOnly: true, maxAge: 10 * 60 * 1000 })
  res.cookie('portal_redirect', req.query.url || '', { httpOnly: true, maxAge: 10 * 60 * 1000 })
  res.sendFile(path.join(__dirname, '../views/login.html'))
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
```

---

### `src/routes/admin.js`

```js
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
  res.sendFile(path.join(__dirname, '../views/admin-login.html'))
})

// Public: Login action
router.post('/login', (req, res) => {
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
  req.session.destroy()
  return res.json({ success: true })
})

// Protected: semua route di bawah ini pakai requireAdminAuth
router.use(requireAdminAuth)

// Dashboard
router.get('/', (req, res) => res.sendFile(path.join(__dirname, '../views/admin.html')))
router.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../views/admin.html')))

// API: current admin info
router.get('/api/me', (req, res) => {
  res.json({ success: true, data: { username: req.session.adminUsername } })
})

// API: get all local users
router.get('/api/users', (req, res) => {
  const users = getAllUsers()
  res.json({ success: true, data: users })
})

// API: create user
router.post('/api/users', (req, res) => {
  const { username, password, fullName } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' })
  }
  const result = createUser({ username, password, fullName })
  if (!result.success) return res.status(400).json(result)
  return res.status(201).json(result)
})

// API: update user
router.put('/api/users/:id', (req, res) => {
  const { username, password, fullName, isActive } = req.body
  const result = updateUser(req.params.id, { username, password, fullName, isActive })
  if (!result.success) return res.status(400).json(result)
  return res.json(result)
})

// API: delete user
router.delete('/api/users/:id', (req, res) => {
  const result = deleteUser(req.params.id)
  return res.json(result)
})

export default router
```

---

### `src/views/login.html`

Halaman login captive portal. **Modern, dark theme.**

Buat HTML lengkap dengan spesifikasi berikut:

**Visual:**
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- Full-page background: CSS gradient `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`
- Flexbox center vertical + horizontal
- Card: background `rgba(30, 41, 59, 0.95)`, border `1px solid rgba(255,255,255,0.1)`, border-radius `16px`, padding `40px`, width `100%`, max-width `400px`, box-shadow `0 25px 50px rgba(0,0,0,0.5)`
- SVG WiFi icon di atas form (buat inline SVG sederhana, warna `#3b82f6`)
- `<h1>` Masuk ke Jaringan
- `<p>` subtitle abu-abu: "Masukkan kredensial Anda untuk mengakses internet"
- Input styling: background `rgba(15,23,42,0.8)`, border `1px solid rgba(255,255,255,0.15)`, color putih, border-radius `8px`, padding `12px 16px`, focus border `#3b82f6`
- Label di atas input, teks abu-abu terang
- Button: background `#3b82f6`, border none, color putih, padding `14px`, border-radius `8px`, width `100%`, font-size `16px`, cursor pointer, transition hover ke `#2563eb`
- Alert error: hidden by default, background `rgba(239,68,68,0.15)`, border `1px solid rgba(239,68,68,0.5)`, color `#fca5a5`, border-radius `8px`, padding `12px`
- Alert sukses: hidden, background `rgba(16,185,129,0.15)`, border `1px solid rgba(16,185,129,0.5)`, color `#6ee7b7`

**JavaScript (di dalam tag `<script>` di akhir body):**
```js
document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault()
  
  const btn = document.getElementById('submit-btn')
  const errorEl = document.getElementById('error-msg')
  const successEl = document.getElementById('success-msg')
  
  // Reset state
  errorEl.style.display = 'none'
  successEl.style.display = 'none'
  btn.disabled = true
  btn.textContent = 'Memverifikasi...'
  
  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value
  
  // Construct POST URL dari path saat ini
  const loginUrl = window.location.pathname.replace(/\/$/, '') + '/login'
  
  try {
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    
    if (data.success) {
      successEl.textContent = 'Akses diberikan! Mengalihkan ke internet...'
      successEl.style.display = 'block'
      setTimeout(() => { window.location.href = data.redirect }, 1500)
    } else {
      errorEl.textContent = data.message || 'Login gagal'
      errorEl.style.display = 'block'
      btn.disabled = false
      btn.textContent = 'Masuk'
    }
  } catch (err) {
    errorEl.textContent = 'Terjadi kesalahan koneksi, coba lagi'
    errorEl.style.display = 'block'
    btn.disabled = false
    btn.textContent = 'Masuk'
  }
})
```

---

### `src/views/admin-login.html`

Halaman login admin. **Berbeda visual dari captive portal — nuansa indigo/purple.**

**Visual:**
- Background gradient: `linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)`
- Card dengan border `1px solid rgba(99,102,241,0.3)`
- Badge kecil di atas: `ADMIN PANEL` dengan background `rgba(99,102,241,0.2)`, color `#a5b4fc`, border-radius `20px`, font-size `11px`, letter-spacing `2px`
- Icon gembok SVG inline (warna indigo)
- `<h1>` Admin Login
- `<p>` Unifi Captive Portal Management
- Button: background `#6366f1`, hover `#4f46e5`
- Link di bawah: "← Kembali ke halaman login" → `/guest/s/default/`
- Alert error styling sama tapi disesuaikan

**JavaScript:**
```js
// Submit ke POST /admin/login
// Jika success → window.location.href = '/admin'
// Jika gagal → tampilkan error
```

---

### `src/views/admin.html`

Admin dashboard SPA (Single Page, vanilla JS). **Layout sidebar + main content.**

**HTML Structure:**
```html
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-brand">
      <!-- icon + "Captive Portal" -->
    </div>
    <nav class="sidebar-nav">
      <a class="nav-item active">
        <!-- icon users + "Local Users" -->
      </a>
    </nav>
    <div class="sidebar-footer">
      <span id="admin-username">...</span>
      <button id="logout-btn">Logout</button>
    </div>
  </aside>
  <main class="main-content">
    <div class="page-header">
      <div>
        <h1>Local Users</h1>
        <p>Kelola user lokal yang dapat login tanpa Verify API eksternal</p>
      </div>
      <button id="add-user-btn">+ Tambah User</button>
    </div>
    <div class="table-container">
      <table id="users-table">
        <thead>
          <tr>
            <th>No</th><th>Username</th><th>Nama Lengkap</th>
            <th>Status</th><th>Dibuat</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <!-- diisi via JS -->
        </tbody>
      </table>
      <div id="empty-state" style="display:none">
        <!-- ilustrasi + teks kosong -->
      </div>
      <div id="loading-state">Memuat data...</div>
    </div>
  </main>
</div>

<!-- Modal Add/Edit User -->
<div id="modal-overlay" style="display:none">
  <div class="modal">
    <div class="modal-header">
      <h2 id="modal-title">Tambah User</h2>
      <button id="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="user-id">
      <div class="form-group">
        <label>Username *</label>
        <input type="text" id="field-username" placeholder="username">
      </div>
      <div class="form-group">
        <label>Nama Lengkap</label>
        <input type="text" id="field-fullname" placeholder="Nama lengkap (opsional)">
      </div>
      <div class="form-group">
        <label>Password *</label>
        <input type="password" id="field-password" placeholder="Password">
        <small id="password-hint" style="display:none;color:#6b7280">Kosongkan jika tidak ingin mengubah password</small>
      </div>
      <div class="form-group" id="status-group" style="display:none">
        <label>Status</label>
        <select id="field-status">
          <option value="1">Aktif</option>
          <option value="0">Nonaktif</option>
        </select>
      </div>
      <div id="modal-error" style="display:none"></div>
    </div>
    <div class="modal-footer">
      <button id="modal-cancel">Batal</button>
      <button id="modal-save">Simpan</button>
    </div>
  </div>
</div>

<!-- Modal Konfirmasi Hapus -->
<div id="delete-overlay" style="display:none">
  <div class="modal modal-sm">
    <div class="modal-header">
      <h2>Hapus User</h2>
    </div>
    <div class="modal-body">
      <p id="delete-confirm-text"></p>
    </div>
    <div class="modal-footer">
      <button id="delete-cancel">Batal</button>
      <button id="delete-confirm" class="btn-danger">Hapus</button>
    </div>
  </div>
</div>
```

**CSS (di dalam `<style>` di `<head>`):**
- Layout: sidebar fixed 240px lebar, main content `margin-left: 240px`
- Sidebar: background `#1e293b`, full height, teks putih
- Main: background `#f8fafc`, padding `32px`
- Table: background putih, border-radius `12px`, box-shadow `0 1px 3px rgba(0,0,0,0.1)`
- Table th: background `#f1f5f9`, font-weight 600, text-align left
- Table tr hover: background `#f8fafc`
- Badge aktif: background `#d1fae5`, color `#065f46`, border-radius `20px`, padding `2px 10px`, font-size `12px`
- Badge nonaktif: background `#e5e7eb`, color `#374151`
- Modal overlay: `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.5)`, `display: flex`, `align-items: center`, `justify-content: center`, `z-index: 1000`
- Modal: background putih, border-radius `12px`, width `480px`, max-width `90vw`
- Button primary: background `#6366f1`, color putih
- Button danger: background `#ef4444`, color putih
- Input: border `1px solid #d1d5db`, border-radius `8px`, padding `10px 14px`, width `100%`
- Responsive: di bawah 768px sidebar `transform: translateX(-100%)` (atau hide saja)

**JavaScript (di dalam `<script>` di akhir body):**

```js
let currentDeleteId = null
let isEditMode = false

// Init
async function init() {
  // Fetch admin username
  const meRes = await fetch('/admin/api/me')
  if (meRes.status === 401) return window.location.href = '/admin/login'
  const me = await meRes.json()
  document.getElementById('admin-username').textContent = me.data.username

  // Load users
  loadUsers()
}

async function loadUsers() {
  document.getElementById('loading-state').style.display = 'block'
  document.getElementById('users-tbody').innerHTML = ''
  document.getElementById('empty-state').style.display = 'none'

  const res = await fetch('/admin/api/users')
  const data = await res.json()
  
  document.getElementById('loading-state').style.display = 'none'

  if (!data.data || data.data.length === 0) {
    document.getElementById('empty-state').style.display = 'block'
    return
  }

  const tbody = document.getElementById('users-tbody')
  data.data.forEach((user, i) => {
    const tr = document.createElement('tr')
    const date = new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    const statusBadge = user.is_active
      ? '<span class="badge badge-active">Aktif</span>'
      : '<span class="badge badge-inactive">Nonaktif</span>'
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><strong>${user.username}</strong></td>
      <td>${user.full_name || '-'}</td>
      <td>${statusBadge}</td>
      <td>${date}</td>
      <td>
        <button class="btn-icon btn-edit" onclick="openEditModal('${user.id}', '${user.username}', '${user.full_name || ''}', ${user.is_active})" title="Edit">✏️</button>
        <button class="btn-icon btn-delete" onclick="openDeleteModal('${user.id}', '${user.username}')" title="Hapus">🗑️</button>
      </td>
    `
    tbody.appendChild(tr)
  })
}

// Open modal Tambah
document.getElementById('add-user-btn').onclick = () => {
  isEditMode = false
  document.getElementById('modal-title').textContent = 'Tambah User'
  document.getElementById('user-id').value = ''
  document.getElementById('field-username').value = ''
  document.getElementById('field-fullname').value = ''
  document.getElementById('field-password').value = ''
  document.getElementById('field-password').placeholder = 'Password'
  document.getElementById('password-hint').style.display = 'none'
  document.getElementById('status-group').style.display = 'none'
  document.getElementById('modal-error').style.display = 'none'
  document.getElementById('modal-overlay').style.display = 'flex'
}

// Open modal Edit
function openEditModal(id, username, fullName, isActive) {
  isEditMode = true
  document.getElementById('modal-title').textContent = 'Edit User'
  document.getElementById('user-id').value = id
  document.getElementById('field-username').value = username
  document.getElementById('field-fullname').value = fullName
  document.getElementById('field-password').value = ''
  document.getElementById('field-password').placeholder = 'Kosongkan jika tidak diubah'
  document.getElementById('password-hint').style.display = 'block'
  document.getElementById('status-group').style.display = 'block'
  document.getElementById('field-status').value = isActive ? '1' : '0'
  document.getElementById('modal-error').style.display = 'none'
  document.getElementById('modal-overlay').style.display = 'flex'
}

// Close modal
document.getElementById('modal-close').onclick = closeModal
document.getElementById('modal-cancel').onclick = closeModal
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none'
}

// Save user
document.getElementById('modal-save').onclick = async () => {
  const id = document.getElementById('user-id').value
  const username = document.getElementById('field-username').value.trim()
  const fullName = document.getElementById('field-fullname').value.trim()
  const password = document.getElementById('field-password').value
  const isActive = document.getElementById('field-status').value

  const errorEl = document.getElementById('modal-error')
  errorEl.style.display = 'none'

  if (!username) return showModalError('Username wajib diisi')
  if (!isEditMode && !password) return showModalError('Password wajib diisi')

  const saveBtn = document.getElementById('modal-save')
  saveBtn.disabled = true
  saveBtn.textContent = 'Menyimpan...'

  try {
    const url = isEditMode ? `/admin/api/users/${id}` : '/admin/api/users'
    const method = isEditMode ? 'PUT' : 'POST'
    const body = { username, fullName }
    if (password) body.password = password
    if (isEditMode) body.isActive = parseInt(isActive)

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()

    if (data.success) {
      closeModal()
      loadUsers()
    } else {
      showModalError(data.message || 'Terjadi kesalahan')
    }
  } catch (err) {
    showModalError('Terjadi kesalahan koneksi')
  } finally {
    saveBtn.disabled = false
    saveBtn.textContent = 'Simpan'
  }
}

function showModalError(msg) {
  const el = document.getElementById('modal-error')
  el.textContent = msg
  el.style.display = 'block'
}

// Delete modal
function openDeleteModal(id, username) {
  currentDeleteId = id
  document.getElementById('delete-confirm-text').textContent =
    `Hapus user "${username}"? Tindakan ini tidak dapat dibatalkan.`
  document.getElementById('delete-overlay').style.display = 'flex'
}

document.getElementById('delete-cancel').onclick = () => {
  document.getElementById('delete-overlay').style.display = 'none'
}

document.getElementById('delete-confirm').onclick = async () => {
  if (!currentDeleteId) return
  await fetch(`/admin/api/users/${currentDeleteId}`, { method: 'DELETE' })
  document.getElementById('delete-overlay').style.display = 'none'
  loadUsers()
}

// Logout
document.getElementById('logout-btn').onclick = async () => {
  await fetch('/admin/logout', { method: 'POST' })
  window.location.href = '/admin/login'
}

// Start
init()
```

---

### `.env.example`

```env
# Server
PORT=3000
SESSION_SECRET=ganti-dengan-string-random-yang-panjang

# Default password untuk admin pertama kali
ADMIN_DEFAULT_PASSWORD=admin123

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=captive_portal
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Verify API dari client (opsional — jika kosong, hanya local users yang dipakai)
VERIFY_API_URL=https://your-client-api.com/verify

# Unifi Network Controller
UNIFI_URL=https://your-unifi-controller:44301
UNIFI_API_KEY=your-unifi-api-key-here

# Site ID Unifi
UNIFI_SITE_ID=default
```

### `.gitignore`

```
node_modules/
.env
*.log
.DS_Store
```

### `package.json`

Sertakan scripts:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  }
}
```

### `README.md`

Tulis README lengkap Bahasa Indonesia berisi:

1. **Deskripsi** — middleware Unifi captive portal dengan local user management
2. **Fitur utama:**
   - Login via local users (PostgreSQL) — prioritas pertama
   - Fallback ke Verify API eksternal jika user tidak ada di lokal
   - Admin panel untuk manage local users (CRUD)
   - Auto-authorize ke Unifi Network setelah verifikasi berhasil
3. **Cara setup:** npm install, copy .env, isi vars, npm start
4. **Alur login (ASCII diagram):**
   ```
   User submit login
        ↓
   Cek local users (PostgreSQL)
        ├─ ✓ Cocok → Authorize Unifi → Akses internet
        └─ ✗ Tidak ada
               ↓
          Verify API (eksternal)
               ├─ ✓ Valid → Authorize Unifi → Akses internet
               └─ ✗ Invalid → Error: Username atau password salah
   ```
5. **Admin Panel:**
   - URL: `http://[IP]:3000/admin`
   - Login default: `admin` / nilai `ADMIN_DEFAULT_PASSWORD` (default: `admin123`)
   - Fitur: tambah, edit, nonaktifkan, hapus local user
   - Cara reset password admin via psql CLI
6. **Setup Unifi External Portal Server**
7. **Env vars** — penjelasan tiap variable
8. **Troubleshooting** — SSL cert, session expired, MAC tidak ada, VERIFY_API_URL kosong
9. **Struktur folder** dengan keterangan tiap file

---

## Catatan Penting

- **ESM (`"type": "module"`)** sudah di-set di `package.json` — semua file `.js` otomatis diperlakukan sebagai ES Module. Gunakan `import/export`, bukan `require/module.exports`
- **Import path harus eksplisit** — selalu sertakan ekstensi `.js` saat import file lokal: `import x from './foo.js'` bukan `'./foo'`
- **`__dirname` tidak tersedia** di ESM — gunakan pattern `fileURLToPath(import.meta.url)` di setiap file yang butuh path absolut
- **`dotenv`** di ESM: gunakan `import 'dotenv/config'` di baris pertama `index.js` (bukan `require('dotenv').config()`)
- **PostgreSQL** harus sudah running dan database `captive_portal` (atau sesuai `DB_NAME`) sudah dibuat sebelum app dijalankan
- **Buat database dulu** secara manual: `CREATE DATABASE captive_portal;` — tabel dibuat otomatis oleh app
- **Semua fungsi di `localUser.js` adalah async** — selalu gunakan `await` saat memanggilnya di routes
- **Parameterized query PostgreSQL** pakai `$1, $2, ...` bukan `?`
- **UUID** di PostgreSQL pakai `gen_random_uuid()` (tersedia di PostgreSQL 13+) — tidak perlu library uuid di Node untuk generate ID
- **bcryptjs** (bukan bcrypt native) — lebih mudah install di semua platform
- **Local user check harus prioritas pertama** — jika cocok, Verify API tidak dipanggil
- **Session** untuk admin auth, **cookie** untuk menyimpan MAC captive portal
- **`?id=`** adalah query param MAC dari Unifi, bukan `?mac=`
- **`VERIFY_API_URL`** boleh kosong — jika kosong, skip external verify (hanya local user)
- **Semua view** harus berupa HTML lengkap yang bisa langsung dipakai browser

---

Buat **semua file tersebut sekarang secara lengkap**. Jangan skip satupun. Pastikan semua import path benar dan semua file saling terhubung dengan benar.