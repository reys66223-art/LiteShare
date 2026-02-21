import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { UTApi } from "uploadthing/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    // Verify the file belongs to the user
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Delete from database
    await prisma.file.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
