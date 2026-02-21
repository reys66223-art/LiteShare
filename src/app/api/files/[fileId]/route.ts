import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { UTApi } from "uploadthing/server";
import { releaseRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { headers } from "next/headers";

/**
 * GET /api/files/[fileId]
 * Get file details
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if file has expired
    if (file.expiresAt && new Date() > file.expiresAt) {
      return NextResponse.json(
        { error: "File has expired" },
        { status: 410 }
      );
    }

    const { userId: clerkUserId } = await auth();
    const cookieStore = await cookies();
    const guestId = cookieStore.get("guestId")?.value;

    let isOwner = false;
    if (clerkUserId && file.userId === clerkUserId) {
      isOwner = true;
    } else if (!clerkUserId && file.isGuest && file.guestId && guestId === file.guestId) {
      isOwner = true;
    }

    return NextResponse.json({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: file.uploadDate,
      downloadCount: file.downloadCount,
      expiresAt: file.expiresAt,
      uploadThingUrl: file.uploadThingUrl,
      isGuest: file.isGuest,
      user: file.user,
      isOwner,
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files/[fileId]
 * Increment download count
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    const file = await prisma.file.update({
      where: { id: fileId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      downloadCount: file.downloadCount,
    });
  } catch (error) {
    console.error("Error incrementing download count:", error);
    return NextResponse.json(
      { error: "Failed to update download count" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[fileId]
 * Delete a file (supports both authenticated users and guests)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    const cookieStore = await cookies();

    // Get guest ID from cookie
    const guestId = cookieStore.get("guestId")?.value;

    const { fileId } = await params;

    // Verify the file exists
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { user: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check authorization
    let isAuthorized = false;

    // Check if user is authenticated and owns the file
    if (clerkUserId && file.userId === clerkUserId) {
      isAuthorized = true;
    }

    // Check if guest owns the file - compare guestId from cookie with stored guestId
    if (!clerkUserId && file.isGuest && file.guestId && guestId) {
      if (file.guestId === guestId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({
        error: "Unauthorized - You can only delete your own files. Each device/browser can only delete files they uploaded."
      }, { status: 401 });
    }

    // Initialize UploadThing API
    const utapi = new UTApi();

    try {
      // Delete from UploadThing
      await utapi.deleteFiles(file.uploadThingId);
      console.log(`Deleted file from UploadThing: ${file.uploadThingId}`);
    } catch (uploadError) {
      console.error("Error deleting from UploadThing:", uploadError);
      // Continue with database deletion even if UploadThing fails
    }

    // Release rate limit usage
    try {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for")?.split(",")[0] ||
        headersList.get("x-real-ip") ||
        "unknown";
      const rateLimitKey = getRateLimitKey(clerkUserId, ip);
      releaseRateLimit(rateLimitKey, file.size);
      console.log(`Released rate limit for ${rateLimitKey}: ${file.size} bytes`);
    } catch (rateLimitError) {
      console.error("Error releasing rate limit:", rateLimitError);
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: fileId },
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
