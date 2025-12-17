/**
 * CORS Configuration - Development Only
 */

export const corsOptions = {
  origin: function (origin, callback) {
    // Development: cho phép tất cả origins
    return callback(null, true)
  },
  optionsSuccessStatus: 200,
  credentials: true
}
