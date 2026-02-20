Since you are planning to deploy on **Vercel**, this PRD is specifically tailored to a **Serverless Architecture**. It bypasses the common "Server Timeout" issues by using direct-to-storage upload patterns.

---

# PRD: LiteShare (MediaFire Clone)

## 1. Project Overview

**LiteShare** is a high-performance, minimalist file-hosting platform that allows users to upload, manage, and share files via unique URLs. The goal is to replicate the core "Upload & Share" utility of MediaFire using a modern, serverless stack optimized for Vercel.

* **Target Audience:** General users needing quick file transfers and developers looking for a private file-sharing utility.
* **Deployment Target:** Vercel (Production).

---

## 2. Core Features (MVP)

### 2.1. File Upload System

* **Drag-and-Drop Interface:** A clean dropzone for single or multiple file uploads.
* **Direct-to-S3 Uploading:** Files bypass the Vercel Serverless Function (to avoid the 4.5MB/10s timeout limit) and upload directly to a storage provider (UploadThing, AWS S3, or Supabase Storage).
* **Real-time Progress:** Visual feedback showing upload percentage and speed.

### 2.2. File Management & Metadata

* **Unique Hash URLs:** Every file is assigned a non-guessable, unique ID (e.g., `liteshare.io/f/a1b2c3d4`).
* **Metadata Storage:** Database records for File Name, Size, MIME Type, and Upload Date.
* **Auto-Expiration:** (Optional MVP) Files are automatically deleted after 24 or 48 hours to manage storage costs.

### 2.3. Sharing & Downloading

* **Public Landing Page:** A dedicated, SEO-friendly page for each file displaying metadata before the download starts.
* **Direct Download Trigger:** A prominent "Download" button that triggers the browser's save-as dialog.
* **One-Click Copy:** A "Copy Link" button immediately available after a successful upload.

---

## 3. Technical Stack

| Component | Technology |
| --- | --- |
| **Framework** | Next.js 14+ (App Router) |
| **Styling** | Tailwind CSS + Shadcn/UI |
| **File Infrastructure** | **UploadThing** (Recommended for Vercel) or AWS S3 + Presigned URLs |
| **Database** | Prisma ORM with Neon (PostgreSQL) or Supabase |
| **Authentication** | Clerk or NextAuth.js (Optional for MVP) |
| **Deployment** | Vercel |

---

## 4. User Journey

1. **Home Page:** User lands on a clean interface with a central upload box.
2. **Upload:** User selects a file. The system validates the file size and begins the direct upload.
3. **Success State:** Upon completion, the UI updates to show a "Success" message and the generated shareable link.
4. **Recipient Access:** The recipient opens the link, sees the file name/size, and clicks "Download".

---

## 5. Technical Constraints & Solutions (Vercel Specific)

* **Constraint:** Vercel's serverless functions have a body size limit (4.5MB) and execution timeout.
* **Solution:** Use **Client-Side Uploads**. The browser sends the file directly to the storage provider. The Next.js server only handles the "Pre-signed URL" or "Upload Metadata."
* **Constraint:** No local file system persistence.
* **Solution:** Use a dedicated Database (PostgreSQL) to store file references and Cloud Storage (S3/R2) for the actual binary data.

---

## 6. Success Metrics

* **Upload Success Rate:** > 99%.
* **Time to Share:** Under 10 seconds for files < 10MB.
* **Responsiveness:** Zero layout shifts on mobile devices.

---

## 7. Roadmap

* **Phase 1:** Setup Next.js + UploadThing integration.
* **Phase 2:** Database schema design (Prisma) and File Details page.
* **Phase 3:** UI Polishing (Dark Mode, MediaFire-inspired layout).
* **Phase 4:** Vercel Deployment & Environment Variable configuration.

---

### Would you like me to generate the `schema.prisma` file and the `UploadThing` API route to get your coding started?