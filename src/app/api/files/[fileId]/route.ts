import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

// Increment download count
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
