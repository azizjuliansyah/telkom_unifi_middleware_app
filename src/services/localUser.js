import { query } from '../db/database.js'
import bcrypt from 'bcryptjs'

async function verifyLocalUser(username, password) {
  const result = await query(
    'SELECT * FROM local_users WHERE username = $1 AND is_active = TRUE',
    [username]
  )

  if (result.rows.length === 0) {
    return null
  }

  const user = result.rows[0]
  if (bcrypt.compareSync(password, user.password)) {
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      is_active: user.is_active,
      created_at: user.created_at
    }
  }

  return null
}

async function getAllUsers() {
  const result = await query(
    'SELECT id, username, full_name, is_active, created_at, updated_at FROM local_users ORDER BY created_at DESC'
  )
  return result.rows
}

async function getUserById(id) {
  const result = await query(
    'SELECT id, username, full_name, is_active, created_at FROM local_users WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

async function createUser({ username, password, fullName }) {
  try {
    const hashedPassword = bcrypt.hashSync(password, 10)
    const result = await query(
      'INSERT INTO local_users (username, password, full_name) VALUES ($1, $2, $3) RETURNING id, username, full_name, is_active, created_at',
      [username, hashedPassword, fullName || null]
    )
    return { success: true, user: result.rows[0] }
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, message: 'Username sudah digunakan' }
    }
    throw err
  }
}

async function updateUser(id, { username, password, fullName, isActive }) {
  try {
    const updates = []
    const values = []
    let paramIndex = 1

    if (username !== undefined) {
      updates.push(`username = $${paramIndex}`)
      values.push(username)
      paramIndex++
    }

    if (password !== undefined && password !== '') {
      updates.push(`password = $${paramIndex}`)
      values.push(bcrypt.hashSync(password, 10))
      paramIndex++
    }

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex}`)
      values.push(fullName || null)
      paramIndex++
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`)
      values.push(isActive)
      paramIndex++
    }

    updates.push(`updated_at = NOW()`)

    values.push(id)

    await query(
      `UPDATE local_users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return { success: true }
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, message: 'Username sudah digunakan' }
    }
    return { success: false, message: err.message }
  }
}

async function deleteUser(id) {
  await query('DELETE FROM local_users WHERE id = $1', [id])
  return { success: true }
}

export {
  verifyLocalUser,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
}
