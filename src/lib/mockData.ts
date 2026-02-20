import { FileMetadata } from './types';

export const mockFiles: FileMetadata[] = [
  {
    id: 'a1b2c3d4',
    name: 'project-documentation.pdf',
    size: 2458624, // 2.34 MB
    type: 'application/pdf',
    uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    downloadCount: 42,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 22).toISOString(), // 22 hours from now
  },
  {
    id: 'e5f6g7h8',
    name: 'vacation-photos.zip',
    size: 15728640, // 15 MB
    type: 'application/zip',
    uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    downloadCount: 18,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 19).toISOString(),
  },
  {
    id: 'i9j0k1l2',
    name: 'presentation-slides.pptx',
    size: 5242880, // 5 MB
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    downloadCount: 156,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(),
  },
  {
    id: 'm3n4o5p6',
    name: 'demo-video.mp4',
    size: 52428800, // 50 MB
    type: 'video/mp4',
    uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    downloadCount: 89,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'q7r8s9t0',
    name: 'logo-design.png',
    size: 524288, // 512 KB
    type: 'image/png',
    uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    downloadCount: 234,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: 'u1v2w3x4',
    name: 'budget-2024.xlsx',
    size: 1048576, // 1 MB
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadDate: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    downloadCount: 7,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 47).toISOString(),
  },
];

export const getFileById = (id: string): FileMetadata | undefined => {
  return mockFiles.find((file) => file.id === id);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'file-text';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'file-archive';
  if (mimeType.includes('word')) return 'file-word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-spreadsheet';
  if (mimeType.includes('presentation')) return 'file-presentation';
  return 'file';
};
