import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch complete user info from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    
    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    const name = clerkUser.firstName 
      ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ''}`
      : clerkUser.username || email.split('@')[0] || 'Anonymous';
    const imageUrl = clerkUser.imageUrl || '';

    // Update user record with complete info
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
      },
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Failed to sync user", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
