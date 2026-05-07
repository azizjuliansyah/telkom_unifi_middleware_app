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
