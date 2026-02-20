import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function DELETE() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, delete all files associated with the user
    await prisma.file.deleteMany({
      where: { userId: clerkUserId },
    });

    // Then delete the user from our database
    await prisma.user.delete({
      where: { id: clerkUserId },
    });

    // Finally, delete the user from Clerk
    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);

    return NextResponse.json({ 
      success: true,
      message: "Account deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
