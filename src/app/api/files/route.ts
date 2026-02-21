import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    const cookieStore = await cookies();
    
    // Get guest ID from cookie (for guest uploads)
    const guestId = cookieStore.get("guestId")?.value;

    const body = await req.json();
    const { fileName, fileSize, fileType, uploadThingId, uploadThingUrl, isGuest } = body;

    // Validate required fields
    if (!fileName || !fileSize || !fileType || !uploadThingId || !uploadThingUrl) {
      console.error("Missing required fields:", { fileName, fileSize, fileType, uploadThingId, uploadThingUrl });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Determine if this is a guest upload
    const isGuestUpload = isGuest || !clerkUserId;

    // Set expiration: 24 hours for guests, 72 hours (3 days) for authenticated users
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (isGuestUpload ? 24 : 72));

    // Create or update user record FIRST if authenticated (before creating file)
    let userId: string | null = null;

    if (clerkUserId) {
      // Fetch complete user info from Clerk
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkUserId);

      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const name = clerkUser.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ''}`
        : clerkUser.username || email.split('@')[0] || 'Anonymous';
      const imageUrl = clerkUser.imageUrl || '';

      console.log("Clerk user info:", { email, name, imageUrl });

      // Create or update user record with complete info
      const user = await prisma.user.upsert({
        where: { id: clerkUserId },
        update: {
          email,
          name,
          imageUrl,
        },
        create: {
          id: clerkUserId,
          email,
          name,
          imageUrl,
        },
      });

      userId = user.id;
      console.log("User record created/updated:", userId);
    }

    console.log("Creating file record:", {
      name: fileName,
      size: fileSize,
      type: fileType,
      uploadThingId,
      userId: userId,
      guestId: isGuestUpload ? guestId : null,
      isGuest: isGuestUpload,
    });

    const file = await prisma.file.create({
      data: {
        name: fileName,
        size: fileSize,
        type: fileType,
        uploadThingId,
        uploadThingUrl,
        userId: userId, // null for guest uploads
        guestId: isGuestUpload ? guestId : null, // Store guest ID for guest uploads
        isGuest: isGuestUpload,
        expiresAt,
      },
    });

    console.log("File record created successfully:", file.id);

    return NextResponse.json({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: file.uploadDate,
      downloadCount: file.downloadCount,
      expiresAt: file.expiresAt,
      isGuest: file.isGuest,
    });
  } catch (error) {
    console.error("Error saving file metadata:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return NextResponse.json(
      { error: "Failed to save file metadata", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
