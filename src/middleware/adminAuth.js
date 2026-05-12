function requireAdminAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    res.locals.admin = {
      username: req.session.adminUsername,
      initials: (req.session.adminUsername || 'A').charAt(0).toUpperCase()
    }
    return next()
  }
  // Jika request adalah API (Accept: application/json) → return 401 JSON
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  return res.redirect('/admin/login')
}

export { requireAdminAuth }
