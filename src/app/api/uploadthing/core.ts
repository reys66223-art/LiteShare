import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { checkRateLimit, getRateLimitKey, formatBytes } from "@/lib/rate-limit";

const f = createUploadthing();

// File size limits in bytes for validation
// Guest: 16MB max per file | Auth: 64MB max per file
const FILE_SIZE_LIMITS = {
  guest: {
    image: 16 * 1024 * 1024,   // 16MB
    pdf: 16 * 1024 * 1024,     // 16MB
    text: 16 * 1024 * 1024,    // 16MB
    blob: 16 * 1024 * 1024,    // 16MB
    video: 16 * 1024 * 1024,   // 16MB
    audio: 16 * 1024 * 1024,   // 16MB
  },
  auth: {
    image: 64 * 1024 * 1024,   // 64MB
    pdf: 64 * 1024 * 1024,     // 64MB
    text: 64 * 1024 * 1024,    // 64MB
    blob: 64 * 1024 * 1024,    // 64MB
    video: 64 * 1024 * 1024,   // 64MB
    audio: 64 * 1024 * 1024,   // 64MB
  },
};

// File count limits
// Guest: 2 files max | Auth: 8 files max
const FILE_COUNT_LIMITS = {
  guest: 2,
  auth: 8,
};

/**
 * Validate file size based on type and user status
 */
function validateFileSize(
  file: { name: string; size: number; type: string },
  isGuest: boolean
): { valid: boolean; error?: string; limit: number } {
  const limits = isGuest ? FILE_SIZE_LIMITS.guest : FILE_SIZE_LIMITS.auth;
  const fileType = file.type.split("/")[0] as keyof typeof limits;
  
  // Default to blob limit if type not found
  const limit = limits[fileType] || limits.blob;
  
  if (file.size > limit) {
    return {
      valid: false,
      error: `File "${file.name}" (${formatBytes(file.size)}) exceeds the ${formatBytes(limit)} limit for ${isGuest ? "guest" : "authenticated"} users.`,
      limit,
    };
  }
  
  return { valid: true, limit };
}

/**
 * Validate file count
 */
function validateFileCount(files: ReadonlyArray<{ name: string; size: number; type: string }>, isGuest: boolean): { valid: boolean; error?: string } {
  const limit = isGuest ? FILE_COUNT_LIMITS.guest : FILE_COUNT_LIMITS.auth;
  
  if (files.length > limit) {
    return {
      valid: false,
      error: `Too many files! Maximum ${limit} files allowed for ${isGuest ? "guest" : "authenticated"} users. You tried to upload ${files.length} files.`,
    };
  }
  
  return { valid: true };
}

// FileRouter for your app, can be named anything
export const ourFileRouter = {
  // Guest uploader - 16MB max per file, 2 files max
  guestUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 2 },
    pdf: { maxFileSize: "16MB", maxFileCount: 2 },
    text: { maxFileSize: "16MB", maxFileCount: 2 },
    blob: { maxFileSize: "16MB", maxFileCount: 2 },
    video: { maxFileSize: "16MB", maxFileCount: 2 },
    audio: { maxFileSize: "16MB", maxFileCount: 2 },
  })
    .middleware(async ({ req, files }) => {
      const cookieStore = await cookies();
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for")?.split(",")[0] ||
                 headersList.get("x-real-ip") ||
                 "unknown";

      // Get guest ID from cookie
      let guestId = cookieStore.get("guestId")?.value;
      if (!guestId) {
        // Generate a unique guest ID based on IP and timestamp
        guestId = `guest_${ip}_${Date.now()}`;
      }

      // Validate file count
      const countValidation = validateFileCount(files, true);
      if (!countValidation.valid) {
        throw new UploadThingError(countValidation.error!);
      }

      // Validate each file size
      for (const file of files) {
        const sizeValidation = validateFileSize(file, true);
        if (!sizeValidation.valid) {
          throw new UploadThingError(sizeValidation.error!);
        }
      }

      // Calculate total size for rate limiting
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      // Check rate limit
      const key = getRateLimitKey(null, ip);
      const rateLimitResult = checkRateLimit(key, totalSize, false);

      if (!rateLimitResult.success) {
        if (rateLimitResult.reason === 'rate_limit_requests') {
          throw new UploadThingError(
            `Rate limit exceeded! You've reached the maximum number of uploads (10 per day). Limit resets in ${Math.ceil(rateLimitResult.retryAfter! / (60 * 60))} hours.`
          );
        } else if (rateLimitResult.reason === 'rate_limit_bytes') {
          throw new UploadThingError(
            `Storage limit exceeded! You've used ${formatBytes(rateLimitResult.totalBytes)} out of 32MB daily limit (2 files × 16MB). Remaining: ${formatBytes(rateLimitResult.remainingBytes)}. Limit resets in ${Math.ceil(rateLimitResult.retryAfter! / (60 * 60))} hours.`
          );
        }
      }

      // Guest uploads are allowed without authentication
      return {
        userId: "guest",
        isGuest: true,
        guestId, // Pass guest ID for tracking
        rateLimit: {
          remaining: rateLimitResult.remaining,
          remainingBytes: rateLimitResult.remainingBytes,
          totalBytes: rateLimitResult.totalBytes,
        },
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Guest upload complete:", file.url);
      return {
        uploadedBy: metadata.userId,
        url: file.url,
        key: `${metadata.guestId}_guest_${file.key}`, // Prefix key with guest ID
        isGuest: true,
        guestId: metadata.guestId,
        rateLimit: metadata.rateLimit,
      };
    }),

  // Image uploader for authenticated users - 64MB max, 8 files
  imageUploader: f({ image: { maxFileSize: "64MB", maxFileCount: 8 } })
    .middleware(async ({ req, files }) => {
      const { userId } = await auth();
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
                 headersList.get("x-real-ip") || 
                 "unknown";

      // If no userId, reject
      if (!userId) {
        throw new UploadThingError("Please sign in for higher limits");
      }

      // Validate file count
      const countValidation = validateFileCount(files, false);
      if (!countValidation.valid) {
        throw new UploadThingError(countValidation.error!);
      }
      
      // Validate each file size
      for (const file of files) {
        const sizeValidation = validateFileSize(file, false);
        if (!sizeValidation.valid) {
          throw new UploadThingError(sizeValidation.error!);
        }
      }
      
      // Calculate total size for rate limiting
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      // Check rate limit
      const key = getRateLimitKey(userId, ip);
      const rateLimitResult = checkRateLimit(key, totalSize, true);
      
      if (!rateLimitResult.success) {
        if (rateLimitResult.reason === 'rate_limit_requests') {
          throw new UploadThingError(
            `Rate limit exceeded! You've reached the maximum number of uploads (100 per day). Limit resets in ${Math.ceil(rateLimitResult.retryAfter! / (60 * 60))} hours.`
          );
        } else if (rateLimitResult.reason === 'rate_limit_bytes') {
          throw new UploadThingError(
            `Storage limit exceeded! You've used ${formatBytes(rateLimitResult.totalBytes)} out of 512MB daily limit (8 files × 64MB). Remaining: ${formatBytes(rateLimitResult.remainingBytes)}. Limit resets in ${Math.ceil(rateLimitResult.retryAfter! / (60 * 60))} hours.`
          );
        }
      }

      return { 
        userId, 
        isGuest: false,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          remainingBytes: rateLimitResult.remainingBytes,
          totalBytes: rateLimitResult.totalBytes,
        },
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);

      return {
        uploadedBy: metadata.userId,
        url: file.url,
        key: file.key,
        isGuest: false,
        rateLimit: metadata.rateLimit,
      };
    }),

  // General file uploader for authenticated users - 64MB max, 8 files
  fileUploader: f({
    pdf: { maxFileSize: "64MB", maxFileCount: 8 },
    text: { maxFileSize: "64MB", maxFileCount: 8 },
    blob: { maxFileSize: "64MB", maxFileCount: 8 },
    video: { maxFileSize: "64MB", maxFileCount: 8 },
    audio: { maxFileSize: "64MB", maxFileCount: 8 },
  })
    .middleware(async ({ req, files }) => {
      const { userId } = await auth();
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
                 headersList.get("x-real-ip") || 
                 "unknown";

      const isGuest = !userId;

      // Validate file count
      const countValidation = validateFileCount(files, isGuest);
      if (!countValidation.valid) {
        throw new UploadThingError(countValidation.error!);
      }
      
      // Validate each file size
      for (const file of files) {
        const sizeValidation = validateFileSize(file, isGuest);
        if (!sizeValidation.valid) {
          throw new UploadThingError(sizeValidation.error!);
        }
      }
      
      // Calculate total size for rate limiting
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      // Check rate limit
      const key = getRateLimitKey(userId || null, ip);
      const rateLimitResult = checkRateLimit(key, totalSize, !isGuest);
      
      if (!rateLimitResult.success) {
        if (rateLimitResult.reason === 'rate_limit_requests') {
          throw new UploadThingError(
            `Rate limit exceeded! You've reached the maximum number of uploads (${isGuest ? '10' : '100'} per day). Limit resets in ${Math.ceil(rateLimitResult.retryAfter! / (60 * 60))} hours.`
          );
        } else if (rateLimitResult.reason === 'rate_limit_bytes') {
          throw new UploadThingError(
            `Storage limit exceeded! You've used ${formatBytes(rateLimitResult.totalBytes)} out of ${isGuest ? '32MB (2 files × 16MB)' : '512MB (8 files × 64MB)'} daily limit. Remaining: ${formatBytes(rateLimitResult.remainingBytes)}. Limit resets in ${Math.ceil(rateLimitResult.retryAfter! / (60 * 60))} hours.`
          );
        }
      }

      // Allow guest uploads with limited permissions
      return { 
        userId: userId || "guest", 
        isGuest,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          remainingBytes: rateLimitResult.remainingBytes,
          totalBytes: rateLimitResult.totalBytes,
        },
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);

      return {
        uploadedBy: metadata.userId,
        url: file.url,
        key: file.key,
        isGuest: metadata.isGuest,
        rateLimit: metadata.rateLimit,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
