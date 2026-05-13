import winston from 'winston'
import 'winston-daily-rotate-file'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const logDir = join(__dirname, '../../logs')

// Configure Winston Logger with Rotation
const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Rotation for Error Logs
    new winston.transports.DailyRotateFile({
      filename: join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // Compress old logs
      maxSize: '20m',      // Max size per file
      maxFiles: '14d',     // Keep logs for 14 days
      level: 'error',
    }),
    // Rotation for Combined Logs
    new winston.transports.DailyRotateFile({
      filename: join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
})

// If we're not in production then log to the `console` with simple format
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }))
}

/**
 * Request Logger Middleware
 */
function logger(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    const mac = req.query.id || '-'
    const duration = Date.now() - start
    const meta = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      mac: mac,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    }

    if (res.statusCode >= 400) {
      winstonLogger.warn(`Request Failed`, meta)
    } else {
      winstonLogger.info(`Request Success`, meta)
    }
  })
  next()
}

/**
 * Error Logging Utility
 */
export function logError(err, req) {
  const meta = {
    stack: err.stack,
    method: req ? req.method : 'N/A',
    url: req ? req.url : 'N/A',
    ip: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'N/A',
    params: req ? req.params : {},
    query: req ? req.query : {}
  }

  winstonLogger.error(err.message, meta)
}

export default logger
