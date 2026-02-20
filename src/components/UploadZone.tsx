'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, CheckCircle2, AlertCircle, Link as LinkIcon, Loader2 } from 'lucide-react';
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
const GUEST_LIMITS = {
  maxFileSize: '16MB',
  maxFileCount: 2,
  expirationHours: 24,
};

const AUTH_LIMITS = {
  maxFileSize: '64MB',
  maxFileCount: 8,
  expirationHours: 48,
};

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  
  // Use different endpoints based on auth status
  const { startUpload, isUploading } = useUploadThing(
    isSignedIn ? 'fileUploader' : 'guestUploader',
    {
      onClientUploadComplete: async (res) => {
        console.log('Upload completed:', res);
        
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
        toast.error('Upload failed. Please try again.');
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
        }
      );
      return;
    }

    acceptedFiles.forEach(file => {
      // Check file size
      if (file.size > parseSize(limits.maxFileSize)) {
        toast.error(
          `File ${file.name} is too large! Maximum ${limits.maxFileSize} for ${isSignedIn ? 'authenticated users' : 'guests'}.`,
          {
            description: !isSignedIn ? 'Sign in for higher limits.' : undefined,
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

  return (
    <div className="w-full space-y-4">
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
          <h3 className="text-sm font-medium">Upload Progress</h3>
          {uploads.map((upload, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-4 p-4 rounded-lg border',
                'transition-all duration-200',
                upload.status === 'completed' ? 'bg-green-500/10 border-green-500/20' :
                upload.status === 'error' ? 'bg-red-500/10 border-red-500/20' :
                'bg-muted/50 border-primary/20'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full',
                'transition-all duration-300',
                upload.status === 'completed' ? 'bg-green-500 text-white' :
                upload.status === 'error' ? 'bg-red-500 text-white' :
                'bg-primary/20 text-primary relative'
              )}>
                {upload.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : upload.status === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{upload.fileName}</p>
                  <div className="flex items-center gap-2">
                    {upload.status === 'completed' && upload.fileId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 hover:bg-green-500/20"
                        onClick={() => copyLink(upload.fileId!)}
                      >
                        <LinkIcon className="w-3 h-3" />
                        Copy Link
                      </Button>
                    ) : upload.status === 'error' ? (
                      <span className="text-xs font-medium text-red-500">Failed</span>
                    ) : (
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        upload.status === 'uploading' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      )}>
                        {upload.status === 'uploading' ? 'Uploading...' : 'Preparing...'}
                      </span>
                    )}
                  </div>
                </div>
                {upload.status === 'uploading' || upload.status === 'pending' ? (
                  <div className="relative">
                    <Progress 
                      value={upload.progress} 
                      className={cn(
                        'h-2 transition-all duration-300',
                        upload.progress > 0 && 'bg-primary/20'
                      )} 
                    />
                    {upload.progress > 0 && (
                      <span className="absolute -right-12 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                        {Math.round(upload.progress)}%
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {upload.status === 'completed' || upload.status === 'error' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:bg-muted"
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
