import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json([]);
    }

    // Only return files uploaded by this authenticated user (not guest uploads)
    const files = await prisma.file.findMany({
      where: { 
        userId,
        isGuest: false,
      },
      orderBy: { uploadDate: 'desc' },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching dashboard files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
