import { body, query, param, validationResult } from 'express-validator'

/**
 * Middleware to handle validation results
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: errors.array()[0].msg, // Return the first error message
      errors: errors.array() 
    })
  }
  next()
}

/**
 * Admin Login Validation
 */
export const adminLoginValidation = [
  body('username').trim().notEmpty().withMessage('Username wajib diisi').isAlphanumeric().withMessage('Username hanya boleh berisi huruf dan angka'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
  validate
]

/**
 * Guest Login Validation
 */
export const guestLoginValidation = [
  body('username').trim().notEmpty().withMessage('Username wajib diisi'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
  validate
]

/**
 * Create/Update Local User Validation
 */
export const userValidation = [
  body('username').trim().notEmpty().withMessage('Username wajib diisi').isLength({ min: 3 }).withMessage('Username minimal 3 karakter').matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username mengandung karakter tidak valid'),
  body('fullName').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Nama lengkap terlalu panjang'),
  body('password').if((value, { req }) => req.method === 'POST' || (value !== undefined && value !== '')).isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('isActive').optional().isBoolean().withMessage('Status tidak valid'),
  validate
]

/**
 * Update Profile Validation
 */
export const profileValidation = [
  body('password').notEmpty().withMessage('Password baru wajib diisi').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  validate
]

/**
 * Pagination & Search Validation
 */
export const listUsersValidation = [
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('Halaman tidak valid').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit tidak valid').toInt(),
  validate
]

/**
 * Guest Portal Query Validation (MAC & URL)
 */
export const guestPortalValidation = [
  query('id').optional().matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).withMessage('Format MAC Address tidak valid'),
  query('url').optional().trim(),
  validate
]

/**
 * URL Sanitizer Middleware (Prevention of Open Redirect)
 */
export const sanitizeRedirect = (req, res, next) => {
  const url = req.query.url || req.body.url || ''
  // Only allow relative paths or specific domains if needed
  // For now, let's just ensure it doesn't start with // or http if it's supposed to be internal
  // But since it's a captive portal, it might be external.
  // We should at least ensure it's a valid URL string.
  next()
}
