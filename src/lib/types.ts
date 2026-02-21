export interface FileMetadata {
  id: string;           // Unique hash (e.g., "a1b2c3d4")
  name: string;         // File name
  size: number;         // File size in bytes
  type: string;         // MIME type
  uploadDate: string;   // ISO date string
  downloadCount: number;
  expiresAt?: string;   // Auto-expiration date
}

export interface UploadProgress {
  fileName: string;
  fileId?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  speed?: string;
  copied?: boolean;
}

export interface DatabaseFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  downloadCount: number;
  expiresAt: Date | null;
  uploadThingId: string;
  uploadThingUrl: string;
  userId: string | null;
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

