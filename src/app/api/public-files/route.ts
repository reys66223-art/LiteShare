import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "date";

    // Build where clause for non-expired files only
    const now = new Date();
    
    // Build order clause
    let orderBy: any = { uploadDate: 'desc' as const };
    if (sortBy === 'size') {
      orderBy = { size: 'desc' as const };
    } else if (sortBy === 'name') {
      orderBy = { name: 'asc' as const };
    }

    // Build where clause
    const where: any = {
      expiresAt: {
        gte: now, // Only show non-expired files
      },
    };

    // Add search filter if provided
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const files = await prisma.file.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        name: true,
        size: true,
        type: true,
        uploadDate: true,
        downloadCount: true,
        expiresAt: true,
        isGuest: true,
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

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching public files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
