/* eslint-disable no-console */
/**
 * Simple Logging Middleware
 */

export const requestLogger = (req, res, next) => {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const { method, url } = req
    const { statusCode } = res
    const emoji = statusCode >= 500 ? '💥' : statusCode >= 400 ? '⚠️' : '✅'
    console.log(`${emoji} ${method} ${url} - ${statusCode} - ${duration}ms`)
  })

  next()
}

export const errorLogger = (err, req, res, next) => {
  console.error(`Error: ${err.message}`)
  next(err)
}

export const notFoundLogger = (req, res, next) => {
  res.status(404).json({ message: 'Route not found' })
}
