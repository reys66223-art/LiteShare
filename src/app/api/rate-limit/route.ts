import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { getRateLimitStatus, getRateLimitKey, formatResetTime, formatBytes } from "@/lib/rate-limit";

// Define the actual limits - Reset every 24 hours
const GUEST_LIMITS = {
  hourlyUploads: 10,
  hourlyBytes: 32 * 1024 * 1024, // 32MB (2 files × 16MB)
  expirationHours: 24,  // 24 hours storage
};

const AUTH_LIMITS = {
  hourlyUploads: 100,
  hourlyBytes: 512 * 1024 * 1024, // 512MB (8 files × 64MB)
  expirationHours: 72,  // 72 hours (3 days) storage
};

/**
 * GET /api/rate-limit
 * Returns current rate limit status for the user
 */
export async function GET() {
  try {
    const { userId } = await auth();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
               headersList.get("x-real-ip") || 
               "unknown";

    const isAuthenticated = !!userId;
    const key = getRateLimitKey(userId, ip);
    const status = getRateLimitStatus(key, isAuthenticated);

    // Get the correct limits based on auth status
    const limits = isAuthenticated ? AUTH_LIMITS : GUEST_LIMITS;

    return NextResponse.json({
      success: true,
      data: {
        remaining: status.remaining,
        limit: limits.hourlyUploads,
        remainingBytes: status.remainingBytes,
        totalBytes: status.totalBytes,
        maxBytes: limits.hourlyBytes,
        resetIn: formatResetTime(status.resetAt),
        resetAt: status.resetAt,
        percentageUsed: status.percentageUsed,
        isAuthenticated,
        // Calculate percentage based on correct max values
        uploadPercentageUsed: ((limits.hourlyUploads - status.remaining) / limits.hourlyUploads) * 100,
        storagePercentageUsed: (status.totalBytes / limits.hourlyBytes) * 100,
      },
    });
  } catch (error) {
    console.error("Error fetching rate limit status:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate limit status" },
      { status: 500 }
    );
  }
}
