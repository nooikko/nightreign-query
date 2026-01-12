/**
 * Lightweight Logger for Scraper Application
 *
 * Provides structured logging with:
 * - Log levels (debug, info, warn, error)
 * - Timestamps
 * - Context/metadata support
 * - Optional file output
 * - Colored console output
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log level numeric values for filtering
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  metadata?: Record<string, unknown>
  error?: {
    message: string
    stack?: string
  }
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel
  /** Optional file path for persistent logs */
  logFile?: string
  /** Whether to use colors in console output */
  colors: boolean
  /** Context prefix for all logs from this logger */
  context?: string
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  colors: true,
}

/**
 * Logger class with configurable output
 */
export class Logger {
  private config: LoggerConfig
  private logFileInitialized = false

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const childConfig = { ...this.config }
    childConfig.context = this.config.context
      ? `${this.config.context}:${context}`
      : context
    return new Logger(childConfig)
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * Set the log file path
   */
  setLogFile(filePath: string): void {
    this.config.logFile = filePath
    this.logFileInitialized = false
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata)
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata)
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata)
  }

  /**
   * Log an error message
   */
  error(
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    const errorInfo = this.extractError(error)
    this.log('error', message, metadata, errorInfo)
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: { message: string; stack?: string },
  ): void {
    // Check if this level should be logged
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.config.level]) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.config.context,
      metadata:
        metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
      error,
    }

    // Console output
    this.writeToConsole(entry)

    // File output
    if (this.config.logFile) {
      this.writeToFile(entry)
    }
  }

  /**
   * Format and write to console
   */
  private writeToConsole(entry: LogEntry): void {
    const { colors } = this.config
    const c = colors
      ? COLORS
      : {
          reset: '',
          dim: '',
          red: '',
          yellow: '',
          blue: '',
          cyan: '',
          gray: '',
        }

    // Format timestamp
    const time = entry.timestamp.split('T')[1]?.slice(0, 8) || entry.timestamp

    // Format level with color
    let levelStr: string
    switch (entry.level) {
      case 'debug':
        levelStr = `${c.gray}DEBUG${c.reset}`
        break
      case 'info':
        levelStr = `${c.blue}INFO${c.reset} `
        break
      case 'warn':
        levelStr = `${c.yellow}WARN${c.reset} `
        break
      case 'error':
        levelStr = `${c.red}ERROR${c.reset}`
        break
    }

    // Format context
    const contextStr = entry.context
      ? `${c.cyan}[${entry.context}]${c.reset} `
      : ''

    // Format message
    const messageStr =
      entry.level === 'error'
        ? `${c.red}${entry.message}${c.reset}`
        : entry.message

    // Build output line
    let output = `${c.dim}${time}${c.reset} ${levelStr} ${contextStr}${messageStr}`

    // Add metadata if present
    if (entry.metadata) {
      const metaStr = Object.entries(entry.metadata)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ')
      output += ` ${c.gray}${metaStr}${c.reset}`
    }

    // Output to console
    if (entry.level === 'error') {
      console.error(output)
      if (entry.error?.stack) {
        console.error(`${c.gray}${entry.error.stack}${c.reset}`)
      }
    } else if (entry.level === 'warn') {
      console.warn(output)
    } else {
      console.log(output)
    }
  }

  /**
   * Write to log file as JSON lines
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.config.logFile) return

    try {
      // Ensure directory exists on first write
      if (!this.logFileInitialized) {
        const dir = dirname(this.config.logFile)
        mkdirSync(dir, { recursive: true })
        this.logFileInitialized = true
      }

      // Write as JSON line
      const line = `${JSON.stringify(entry)}\n`
      appendFileSync(this.config.logFile, line)
    } catch (err) {
      // Fallback to console if file write fails
      console.error(`Failed to write to log file: ${err}`)
    }
  }

  /**
   * Extract error information from unknown error type
   */
  private extractError(
    error: unknown,
  ): { message: string; stack?: string } | undefined {
    if (!error) return undefined

    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      }
    }

    if (typeof error === 'string') {
      return { message: error }
    }

    return { message: String(error) }
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null

/**
 * Get or create the global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger()
  }
  return globalLogger
}

/**
 * Configure the global logger
 */
export function configureLogger(config: Partial<LoggerConfig>): Logger {
  globalLogger = new Logger(config)
  return globalLogger
}

/**
 * Create a child logger with context
 */
export function createLogger(context: string): Logger {
  return getLogger().child(context)
}

/**
 * Get the default log file path for the scraper
 */
export function getDefaultLogPath(): string {
  const timestamp = new Date().toISOString().split('T')[0]
  return join(process.cwd(), 'logs', `scraper-${timestamp}.log`)
}
