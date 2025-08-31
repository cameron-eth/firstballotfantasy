// Logger utility for consistent logging across the application

export const logger = {
  // Debug logging - only in development
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data || '')
    }
  },

  // Info logging - always shown
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || '')
  },

  // Warning logging - always shown
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '')
  },

  // Error logging - always shown
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '')
  },

  // Group related logs
  group: (label: string, fn: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(label)
      fn()
      console.groupEnd()
    }
  },

  // Time operations
  time: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(label)
    }
  },

  timeEnd: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(label)
    }
  }
} 