import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getRateLimitStatus, getRateLimitKey, formatResetTime } from "@/lib/rate-limit";

// Define the actual limits - This represents the STORAGE QUOTA
const GUEST_LIMITS = {
  maxUploads: 10,
  maxBytes: 32 * 1024 * 1024, // 32MB (2 files × 16MB)
  expirationHours: 24,  // 24 hours storage
};

const AUTH_LIMITS = {
  maxUploads: 100,
  maxBytes: 512 * 1024 * 1024, // 512MB (8 files × 64MB)
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
    const cookieStore = await cookies();
    const guestId = cookieStore.get("guestId")?.value;

    const ip = headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";

    const isAuthenticated = !!userId;
    const key = getRateLimitKey(userId, ip);

    // Get rate limit info from memory for velocity checks (if needed)
    const status = getRateLimitStatus(key, isAuthenticated);

    // Get the correct limits based on auth status
    const limits = isAuthenticated ? AUTH_LIMITS : GUEST_LIMITS;

    // QUERY DATABASE for actual storage usage
    // This ensures data doesn't "disappear" after upload until explicitly deleted
    let dbUsedCount = 0;
    let dbUsedBytes = 0;

    if (isAuthenticated) {
      const userFiles = await prisma.file.findMany({
        where: { userId: userId },
        select: { size: true }
      });
      dbUsedCount = userFiles.length;
      dbUsedBytes = userFiles.reduce((acc, file) => acc + file.size, 0);
    } else if (guestId) {
      const guestFiles = await prisma.file.findMany({
        where: { guestId: guestId, isGuest: true },
        select: { size: true }
      });
      dbUsedCount = guestFiles.length;
      dbUsedBytes = guestFiles.reduce((acc, file) => acc + file.size, 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        remaining: Math.max(0, limits.maxUploads - dbUsedCount),
        limit: limits.maxUploads,
        remainingBytes: Math.max(0, limits.maxBytes - dbUsedBytes),
        totalBytes: dbUsedBytes,
        maxBytes: limits.maxBytes,
        resetIn: formatResetTime(status.resetAt), // This still shows rate limit window reset
        resetAt: status.resetAt,
        percentageUsed: (dbUsedBytes / limits.maxBytes) * 100,
        isAuthenticated,
        // Calculate percentage based on database values
        uploadPercentageUsed: (dbUsedCount / limits.maxUploads) * 100,
        storagePercentageUsed: (dbUsedBytes / limits.maxBytes) * 100,
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
