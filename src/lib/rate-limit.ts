/**
 * Rate Limiting Utility for LiteShare
 * Tracks upload attempts and enforces limits per user/IP
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  totalBytes: number;
}

interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds (24 hours)
  maxRequests: number;     // Max requests per window
  maxBytes: number;        // Max total bytes per window
}

// In-memory store (for production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations - Reset every 24 hours (1 day)
const GUEST_RATE_LIMIT: RateLimitConfig = {
  windowMs: 24 * 60 * 60 * 1000,    // 24 hours (1 day)
  maxRequests: 10,                   // 10 uploads per day
  maxBytes: 32 * 1024 * 1024,       // 32MB total per day (2 files × 16MB)
};

const AUTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 24 * 60 * 60 * 1000,    // 24 hours (1 day)
  maxRequests: 100,                  // 100 uploads per day
  maxBytes: 512 * 1024 * 1024,      // 512MB total per day (8 files × 64MB)
};

const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,           // 1 minute
  maxRequests: 5,                 // 5 uploads per minute (burst protection)
  maxBytes: 100 * 1024 * 1024,   // 100MB per minute
};

/**
 * Get rate limit config based on user type
 */
function getConfig(isAuthenticated: boolean): RateLimitConfig {
  return isAuthenticated ? AUTH_RATE_LIMIT : GUEST_RATE_LIMIT;
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstAttempt > GUEST_RATE_LIMIT.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);

/**
 * Generate a rate limit key based on user ID or IP
 */
export function getRateLimitKey(userId: string | null, ip: string): string {
  return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Check and update rate limit
 * @returns Object with success status and limit info
 */
export function checkRateLimit(
  key: string,
  fileSize: number,
  isAuthenticated: boolean = false
): {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  remainingBytes: number;
  totalBytes: number;
  retryAfter?: number;
  reason?: string;
} {
  const config = getConfig(isAuthenticated);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or expired, create new one
  if (!entry || now - entry.firstAttempt > config.windowMs) {
    entry = {
      count: 0,
      firstAttempt: now,
      totalBytes: 0,
    };
  }

  const windowEnd = entry.firstAttempt + config.windowMs;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const remainingBytes = Math.max(0, config.maxBytes - entry.totalBytes);
  const resetAt = windowEnd;

  // Check if this request would exceed limits
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt,
      limit: config.maxRequests,
      remainingBytes: 0,
      totalBytes: entry.totalBytes,
      retryAfter: Math.ceil((windowEnd - now) / 1000),
      reason: 'rate_limit_requests',
    };
  }

  if (entry.totalBytes + fileSize > config.maxBytes) {
    return {
      success: false,
      remaining,
      resetAt,
      limit: config.maxRequests,
      remainingBytes,
      totalBytes: entry.totalBytes,
      retryAfter: Math.ceil((windowEnd - now) / 1000),
      reason: 'rate_limit_bytes',
    };
  }

  // Update the entry
  entry.count += 1;
  entry.totalBytes += fileSize;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    remaining: remaining - 1,
    resetAt,
    limit: config.maxRequests,
    remainingBytes: remainingBytes - fileSize,
    totalBytes: entry.totalBytes,
  };
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  key: string,
  isAuthenticated: boolean = false
): {
  remaining: number;
  resetAt: number;
  limit: number;
  remainingBytes: number;
  totalBytes: number;
  percentageUsed: number;
} {
  const config = getConfig(isAuthenticated);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or expired, return full limits
  if (!entry || now - entry.firstAttempt > config.windowMs) {
    return {
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
      remainingBytes: config.maxBytes,
      totalBytes: 0,
      percentageUsed: 0,
    };
  }

  const windowEnd = entry.firstAttempt + config.windowMs;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const remainingBytes = Math.max(0, config.maxBytes - entry.totalBytes);

  return {
    remaining,
    resetAt: windowEnd,
    limit: config.maxRequests,
    remainingBytes,
    totalBytes: entry.totalBytes,
    percentageUsed: (entry.totalBytes / config.maxBytes) * 100,
  };
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Release rate limit usage (called when file is deleted)
 */
export function releaseRateLimit(key: string, fileSize: number): void {
  const entry = rateLimitStore.get(key);
  if (entry) {
    // Decrease count but not below 0
    entry.count = Math.max(0, entry.count - 1);
    // Decrease total bytes but not below 0
    entry.totalBytes = Math.max(0, entry.totalBytes - fileSize);
    rateLimitStore.set(key, entry);
  }
}

/**
 * Get formatted time until reset
 */
export function formatResetTime(resetAt: number): string {
  const now = Date.now();
  const diffMs = resetAt - now;

  if (diffMs <= 0) return 'Now';

  const diffSeconds = Math.ceil(diffMs / 1000);
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffSeconds < 60) return `${diffSeconds}s`;
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
