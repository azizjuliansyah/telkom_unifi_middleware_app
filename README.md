# Unifi Captive Portal Middleware

Aplikasi middleware untuk Unifi Captive Portal dengan fitur local user management dan admin panel. Aplikasi ini memungkinkan user WiFi untuk login menggunakan kredensial lokal (PostgreSQL) atau fallback ke Verify API eksternal.

## Fitur Utama

- **Login via Local Users** — User dapat login menggunakan kredensial yang tersimpan di database PostgreSQL (prioritas pertama)
- **Fallback ke Verify API** — Jika user tidak ditemukan di database lokal, sistem akan memverifikasi ke API eksternal
- **Admin Panel** — Dashboard web untuk mengelola local users (Create, Read, Update, Delete)
- **Auto-authorize ke Unifi** — Setelah verifikasi berhasil, user otomatis di-authorize ke jaringan Unifi

## Cara Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Konfigurasi Environment Variables

Copy file `.env.example` ke `.env` dan sesuaikan isinya:

```bash
cp .env.example .env
```

Edit file `.env` sesuai kebutuhan Anda:

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

# Verify API dari client (opsional)
VERIFY_API_URL=https://your-client-api.com/verify

# Unifi Network Controller
UNIFI_URL=https://your-unifi-controller:44301
UNIFI_API_KEY=your-unifi-api-key-here

# Site ID Unifi
UNIFI_SITE_ID=default
```

### 3. Buat Database PostgreSQL

Buat database secara manual sebelum menjalankan aplikasi:

```sql
CREATE DATABASE captive_portal;
```

Tabel akan dibuat otomatis oleh aplikasi saat pertama kali dijalankan.

### 4. Jalankan Aplikasi

```bash
# Mode produksi
npm start

# Mode development (auto-restart)
npm run dev
```

## Alur Login

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

## Admin Panel

### Akses

URL: `http://[IP-SERVER]:3000/admin`

### Login Default

- **Username:** `admin`
- **Password:** Nilai dari `ADMIN_DEFAULT_PASSWORD` (default: `admin123`)

### Fitur

- **Tambah User** — Membuat user lokal baru
- **Edit User** — Mengubah username, nama lengkap, password, atau status aktif/nonaktif
- **Nonaktifkan User** — User yang nonaktif tidak bisa login
- **Hapus User** — Menghapus user dari database

### Reset Password Admin

Jika lupa password admin, Anda bisa reset melalui psql CLI:

```bash
psql -U postgres -d captive_portal
```

```sql
-- Lihat admin users
SELECT id, username FROM admin_users;

-- Reset password (contoh dengan bcrypt hash untuk 'admin123')
UPDATE admin_users SET password = '$2a$10$YourBcryptHashHere' WHERE username = 'admin';

-- Atau hapus dan biarkan app create ulang
DELETE FROM admin_users WHERE username = 'admin';
-- Restart app akan membuat admin default baru
```

## Setup Unifi External Portal Server

1. Buka Unifi Network Controller
2. Pilih **Settings** → **Networks**
3. Pilih network WiFi yang ingin di-setup captive portal
4. Scroll ke **Advanced** → **Portal Configuration**
5. Pilih **External Portal Server**
6. Masukkan URL:
   - **Portal URL:** `http://[IP-MIDDLEWARE]:3000/guest/s/default/`
   - **Fallback URL:** `http://[IP-MIDDLEWARE]:3000/guest/s/default/`
7. Save dan Apply

## Environment Variables

| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `PORT` | Port untuk menjalankan server | `3000` |
| `SESSION_SECRET` | Secret key untuk session admin | (wajib diisi) |
| `ADMIN_DEFAULT_PASSWORD` | Password default untuk admin pertama kali | `admin123` |
| `DB_HOST` | Host PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nama database | `captive_portal` |
| `DB_USER` | User PostgreSQL | `postgres` |
| `DB_PASSWORD` | Password PostgreSQL | (wajib diisi) |
| `VERIFY_API_URL` | URL Verify API eksternal (opsional) | - |
| `UNIFI_URL` | URL Unifi Network Controller | (wajib diisi) |
| `UNIFI_API_KEY` | API Key untuk Unifi Controller | (wajib diisi) |
| `UNIFI_SITE_ID` | Site ID Unifi | `default` |

## Troubleshooting

### SSL Certificate Error (Self-signed Cert)

Jika Unifi Controller menggunakan self-signed certificate, aplikasi sudah dikonfigurasi untuk mengizinkannya (`rejectUnauthorized: false`).

### Session Expired

Jika muncul error "Session expired", pastikan:
- User mengakses portal melalui redirect dari Unifi (bukan direct URL)
- Parameter `?id=` (MAC address) ada di URL

### MAC Address Tidak Terdeteksi

Error: "MAC address tidak ditemukan dalam request"

Pastikan konfigurasi Unifi Portal sudah benar dan user di-redirect ke URL dengan parameter `?id=AA:BB:CC:DD:EE:FF`.

### VERIFY_API_URL Kosong

Jika `VERIFY_API_URL` tidak di-set, sistem akan:
- Log warning: `[VerifyAPI] VERIFY_API_URL not set, skipping external verify`
- Hanya memeriksa local users
- Return false untuk external verify

## Struktur Folder

```
unifi-middleware-app/
├── src/
│   ├── index.js           # Entry point aplikasi
│   ├── routes/
│   │   ├── auth.js        # Captive portal login flow
│   │   └── admin.js       # Admin panel routes
│   ├── services/
│   │   ├── verifyUser.js  # Verify API client (fallback)
│   │   ├── localUser.js   # CRUD local users
│   │   └── unifi.js       # Unifi authorize API
│   ├── middleware/
│   │   ├── logger.js      # Request logger
│   │   └── adminAuth.js   # Protect admin routes
│   ├── db/
│   │   └── database.js    # PostgreSQL setup & init
│   └── views/
│       ├── login.html     # Captive portal login page
│       ├── admin-login.html # Admin login page
│       └── admin.html     # Admin dashboard
├── .env.example           # Template environment variables
├── .gitignore
├── package.json
└── README.md
```

## License

ISC
