'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, CheckCircle2, AlertCircle, Link as LinkIcon, Loader2, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/mockData';
import { UploadProgress } from '@/lib/types';
import { useUploadThing } from '@/lib/uploadthing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface UploadZoneProps {
  onUploadComplete?: (fileId: string) => void;
}

// Upload limits
// Guest: 16MB max, 2 files, 24h storage
// Auth: 64MB max, 8 files, 72h (3 days) storage
const GUEST_LIMITS = {
  maxFileSize: '16MB',
  maxFileCount: 2,
  expirationHours: 24,  // 24 hours
  hourlyUploads: 10,
  hourlyBytes: 32 * 1024 * 1024, // 32MB (2 files × 16MB)
};

const AUTH_LIMITS = {
  maxFileSize: '64MB',
  maxFileCount: 8,
  expirationHours: 72,  // 72 hours (3 days)
  hourlyUploads: 100,
  hourlyBytes: 512 * 1024 * 1024, // 512MB (8 files × 64MB)
};

interface RateLimitStatus {
  remaining: number;
  limit: number;
  remainingBytes: number;
  totalBytes: number;
  maxBytes: number;
  resetIn: string;
  resetAt: number;
  percentageUsed: number;
  uploadPercentageUsed: number;
  storagePercentageUsed: number;
  isAuthenticated: boolean;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const [loadingRateLimit, setLoadingRateLimit] = useState(true);

  // Fetch rate limit status on mount and when auth status changes
  useEffect(() => {
    const fetchRateLimitStatus = async () => {
      try {
        const response = await fetch('/api/rate-limit');
        if (response.ok) {
          const data = await response.json();
          setRateLimitStatus(data.data);
        }
      } catch (error) {
        console.error('Error fetching rate limit status:', error);
      } finally {
        setLoadingRateLimit(false);
      }
    };

    fetchRateLimitStatus();
  }, [isSignedIn]);

  // Use different endpoints based on auth status
  const { startUpload, isUploading } = useUploadThing(
    isSignedIn ? 'fileUploader' : 'guestUploader',
    {
      onClientUploadComplete: async (res) => {
        console.log('Upload completed:', res);

        // Refresh rate limit status after upload
        try {
          const response = await fetch('/api/rate-limit');
          if (response.ok) {
            const data = await response.json();
            setRateLimitStatus(data.data);
          }
        } catch (error) {
          console.error('Error refreshing rate limit:', error);
        }

        // Save file metadata to database for each uploaded file
        for (const file of res) {
          try {
            const response = await fetch('/api/files', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                uploadThingId: file.key,
                uploadThingUrl: file.url,
                isGuest: !isSignedIn,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Server error response:', errorData);
              throw new Error(errorData.error || errorData.details || 'Failed to save file metadata');
            }

            const savedFile = await response.json();

            // Update upload status with file ID
            setUploads(prev => prev.map(u =>
              u.fileName === file.name
                ? { ...u, fileId: savedFile.id, status: 'completed' }
                : u
            ));

            const expirationHours = !isSignedIn ? GUEST_LIMITS.expirationHours : AUTH_LIMITS.expirationHours;
            toast.success(
              `File uploaded! ${!isSignedIn ? 'Sign in for longer storage.' : ''}`,
              {
                description: `File will expire in ${expirationHours} hours`,
              }
            );

            if (onUploadComplete) {
              onUploadComplete(savedFile.id);
            }
          } catch (error) {
            console.error('Error saving metadata:', error);
            setUploads(prev => prev.map(u =>
              u.fileName === file.name
                ? { ...u, status: 'error' }
                : u
            ));
            toast.error(`Failed to save metadata for ${file.name}`);
          }
        }
      },
      onUploadError: (error) => {
        console.error('Upload error:', error);
        
        // Parse error message for better display
        let errorMessage = 'Upload failed. Please try again.';
        let errorDescription: string | undefined;
        
        if (error instanceof Error) {
          const errorStr = error.message;
          
          // Check for rate limit errors
          if (errorStr.includes('Rate limit exceeded')) {
            errorMessage = 'Rate Limit Exceeded';
            errorDescription = errorStr;
          } else if (errorStr.includes('Storage limit exceeded')) {
            errorMessage = 'Storage Limit Exceeded';
            errorDescription = errorStr;
          } else if (errorStr.includes('Too many files')) {
            errorMessage = 'Too Many Files';
            errorDescription = errorStr;
          } else if (errorStr.includes('exceeds the')) {
            errorMessage = 'File Too Large';
            errorDescription = errorStr;
          } else if (errorStr.includes('Please sign in')) {
            errorMessage = 'Sign In Required';
            errorDescription = 'Please sign in to upload larger files and more uploads.';
          }
        }
        
        toast.error(errorMessage, {
          description: errorDescription,
          duration: 8000,
        });
        
        setUploads(prev => prev.map(u =>
          u.status === 'uploading'
            ? { ...u, status: 'error' }
            : u
        ));
      },
      onUploadBegin: () => {
        console.log('Upload beginning');
      },
    }
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check file count limits
    const limits = isSignedIn ? AUTH_LIMITS : GUEST_LIMITS;

    if (acceptedFiles.length > limits.maxFileCount) {
      toast.error(
        `Too many files! Maximum ${limits.maxFileCount} files for ${isSignedIn ? 'authenticated users' : 'guests'}.`,
        {
          description: !isSignedIn ? 'Sign in to upload more files.' : undefined,
          duration: 5000,
        }
      );
      return;
    }

    let hasInvalidFile = false;
    acceptedFiles.forEach(file => {
      // Check file size
      if (file.size > parseSize(limits.maxFileSize)) {
        hasInvalidFile = true;
        toast.error(
          `File ${file.name} is too large!`,
          {
            description: `Maximum ${limits.maxFileSize} for ${isSignedIn ? 'authenticated users' : 'guests'}. Your file is ${formatBytes(file.size)}. ${!isSignedIn ? 'Sign in for higher limits.' : ''}`,
            duration: 6000,
          }
        );
        return;
      }

      // Add to pending uploads
      setUploads(prev => [...prev, {
        fileName: file.name,
        progress: 0,
        status: 'pending',
      }]);
    });

    // Filter valid files and start the upload
    const validFiles = acceptedFiles.filter(f => f.size <= parseSize(limits.maxFileSize));
    if (validFiles.length > 0) {
      startUpload(validFiles);
    }
  }, [startUpload, isSignedIn]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: isSignedIn ? 64 * 1024 * 1024 : 16 * 1024 * 1024, // 64MB for auth, 16MB for guests
    disabled: isUploading,
  });

  const removeUpload = (fileName: string) => {
    setUploads(prev => prev.filter(u => u.fileName !== fileName));
  };

  const copyLink = (fileId: string) => {
    const url = `${window.location.origin}/f/${fileId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const limits = isSignedIn ? AUTH_LIMITS : GUEST_LIMITS;

  // Helper to format bytes
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="w-full space-y-4">
      {/* Rate Limit Status */}
      {!loadingRateLimit && rateLimitStatus && (
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Upload Limit Status</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              Resets in {rateLimitStatus.resetIn}
            </span>
          </div>

          <div className="space-y-3">
            {/* Upload Count Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Uploads used</span>
                <span className="font-medium">
                  {rateLimitStatus.limit - rateLimitStatus.remaining} / {rateLimitStatus.limit}
                </span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
                    rateLimitStatus.uploadPercentageUsed > 90 ? 'bg-red-500' :
                    rateLimitStatus.uploadPercentageUsed > 70 ? 'bg-amber-500' :
                    'bg-green-500'
                  )}
                  style={{ width: `${rateLimitStatus.uploadPercentageUsed}%` }}
                />
              </div>
            </div>

            {/* Storage Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Storage used</span>
                <span className="font-medium">
                  {formatBytes(rateLimitStatus.totalBytes)} / {formatBytes(rateLimitStatus.maxBytes)}
                </span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
                    rateLimitStatus.storagePercentageUsed > 90 ? 'bg-red-500' :
                    rateLimitStatus.storagePercentageUsed > 70 ? 'bg-amber-500' :
                    'bg-blue-500'
                  )}
                  style={{ width: `${rateLimitStatus.storagePercentageUsed}%` }}
                />
              </div>
            </div>

            {!isSignedIn && (
              <p className="text-xs text-muted-foreground pt-1">
                💡 Sign in for higher limits: {AUTH_LIMITS.maxFileSize} max, {AUTH_LIMITS.maxFileCount} files, {formatBytes(AUTH_LIMITS.hourlyBytes)}/day
              </p>
            )}
          </div>
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center w-full h-64',
          'border-2 border-dashed rounded-xl',
          'transition-all duration-200 ease-in-out',
          'cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          isUploading && 'opacity-50 pointer-events-none'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4 p-6 text-center">
          <div className={cn(
            'flex items-center justify-center w-16 h-16 rounded-full',
            'transition-colors duration-200',
            isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}>
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select (max {limits.maxFileSize})
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Supported formats: Documents, Images, Videos, Archives
          </p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <span className={cn(
                'flex h-2 w-2 rounded-full',
                uploads.some(u => u.status === 'uploading') ? 'bg-blue-500 animate-pulse' :
                uploads.some(u => u.status === 'error') ? 'bg-red-500' :
                'bg-green-500'
              )} />
              Upload Progress
            </h3>
            <span className="text-xs text-muted-foreground">
              {uploads.filter(u => u.status === 'completed').length} / {uploads.length} completed
            </span>
          </div>
          {uploads.map((upload, index) => (
            <div
              key={index}
              className={cn(
                'group flex items-center gap-4 p-4 rounded-xl border',
                'transition-all duration-300 ease-in-out',
                'hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20',
                upload.status === 'completed' ? 'bg-green-500/5 border-green-500/30' :
                upload.status === 'error' ? 'bg-red-500/5 border-red-500/30' :
                'bg-gradient-to-br from-card to-muted/30 border-primary/20'
              )}
            >
              <div className={cn(
                'relative flex items-center justify-center w-12 h-12 rounded-xl',
                'transition-all duration-500 ease-out',
                'shadow-sm',
                upload.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white scale-110' :
                upload.status === 'error' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' :
                'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'
              )}>
                {upload.status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 animate-in zoom-in duration-300" />
                ) : upload.status === 'error' ? (
                  <AlertCircle className="w-6 h-6 animate-in zoom-in duration-300" />
                ) : (
                  <div className="relative">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <div className="absolute inset-0 rounded-xl border-2 border-primary/20 border-t-primary animate-spin" />
                  </div>
                )}
                {/* Progress ring for uploading state */}
                {(upload.status === 'uploading' || upload.status === 'pending') && upload.progress > 0 && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-primary/10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={276}
                      strokeDashoffset={276 - (upload.progress / 100) * 276}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-300 ease-out"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{upload.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {upload.status === 'error' ? (
                        <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Upload failed
                        </span>
                      ) : upload.status === 'completed' ? (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Upload complete
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {upload.status === 'uploading' ? 'Uploading...' : 'Preparing...'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {upload.status === 'completed' && upload.fileId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 hover:bg-green-500/20 hover:border-green-500/50 transition-colors"
                        onClick={() => copyLink(upload.fileId!)}
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">Copy Link</span>
                      </Button>
                    ) : upload.status === 'error' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 hover:bg-red-500/20 hover:border-red-500/50 transition-colors text-red-600 dark:text-red-400"
                        onClick={() => {
                          setUploads(prev => prev.filter(u => u.fileName !== upload.fileName));
                        }}
                      >
                        <X className="w-3 h-3" />
                        <span className="hidden sm:inline">Dismiss</span>
                      </Button>
                    ) : (
                      <span className={cn(
                        'text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
                        upload.status === 'uploading' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      )}>
                        {upload.status === 'uploading' ? 'Uploading' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
                {(upload.status === 'uploading' || upload.status === 'pending') && (
                  <div className="relative pt-1">
                    <Progress
                      value={upload.progress}
                      className={cn(
                        'h-2.5 transition-all duration-300',
                        'bg-muted/50 overflow-hidden rounded-full'
                      )}
                    />
                    {upload.progress > 0 && (
                      <div className="absolute right-0 top-0 text-xs font-medium text-muted-foreground transition-all">
                        {Math.round(upload.progress)}%
                      </div>
                    )}
                  </div>
                )}
              </div>

              {upload.status === 'completed' || upload.status === 'error' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                  onClick={() => removeUpload(upload.fileName)}
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to parse size strings like "16MB" to bytes
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+)([KMGT]?B)$/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'KB': return value * 1024;
    case 'MB': return value * 1024 * 1024;
    case 'GB': return value * 1024 * 1024 * 1024;
    case 'TB': return value * 1024 * 1024 * 1024 * 1024;
    default: return value;
  }
}
