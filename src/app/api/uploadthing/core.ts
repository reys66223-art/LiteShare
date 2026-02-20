import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

// FileRouter for your app, can be named anything
export const ourFileRouter = {
  // Guest uploader - stricter limits, shorter expiration
  guestUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 2 },
    pdf: { maxFileSize: "8MB", maxFileCount: 2 },
    text: { maxFileSize: "4MB", maxFileCount: 2 },
    blob: { maxFileSize: "16MB", maxFileCount: 2 },
  })
    .middleware(async () => {
      // Guest uploads are allowed without authentication
      return { userId: "guest", isGuest: true };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Guest upload complete:", file.url);
      return { 
        uploadedBy: metadata.userId, 
        url: file.url, 
        key: file.key,
        isGuest: true,
      };
    }),

  // Image uploader for authenticated users - higher limits
  imageUploader: f({ image: { maxFileSize: "16MB", maxFileCount: 8 } })
    .middleware(async () => {
      const { userId } = await auth();

      // If no userId, redirect to guest uploader limits
      if (!userId) {
        throw new UploadThingError("Please sign in for higher limits");
      }

      return { userId, isGuest: false };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);

      return { 
        uploadedBy: metadata.userId, 
        url: file.url, 
        key: file.key,
        isGuest: false,
      };
    }),

  // General file uploader for authenticated users - higher limits
  fileUploader: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 8 },
    text: { maxFileSize: "16MB", maxFileCount: 8 },
    blob: { maxFileSize: "64MB", maxFileCount: 8 },
    video: { maxFileSize: "64MB", maxFileCount: 4 },
    audio: { maxFileSize: "64MB", maxFileCount: 8 },
  })
    .middleware(async () => {
      const { userId } = await auth();

      // Allow guest uploads with limited permissions
      if (!userId) {
        return { userId: "guest", isGuest: true };
      }

      return { userId, isGuest: false };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);

      return { 
        uploadedBy: metadata.userId, 
        url: file.url, 
        key: file.key,
        isGuest: metadata.isGuest,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
