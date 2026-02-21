'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Download, File, Clock, HardDrive, User, ArrowLeft, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  downloadCount: number;
  expiresAt: string | null;
  uploadThingUrl: string;
  isGuest: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    imageUrl: string | null;
  } | null;
  isOwner?: boolean;
}

export default function FilePage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const response = await fetch(`/api/files/${fileId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch file');
        }

        setFile(data);

        // Sync current user's info if they're the owner
        if (user && data.user && user.id === data.user.id) {
          await fetch('/api/sync-user', { method: 'POST' });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [fileId, user]);

  const handleDownload = async () => {
    if (file?.uploadThingUrl) {
      // Increment download count
      try {
        await fetch(`/api/files/${file.id}`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to increment download count:', error);
      }

      // Direct download by creating a temporary link
      const link = document.createElement('a');
      link.href = file.uploadThingUrl;
      link.setAttribute('download', file.name);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started');
    }
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteFile = async () => {
    setIsDeleting(true);
    try {
      // Use the new unified delete endpoint that supports both auth and guest
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete file');
      }

      setShowDeleteDialog(false);
      toast.success('File deleted successfully');
      router.push('/');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileType = (type: string) => {
    // Get the subtype (e.g., "pdf" from "application/pdf")
    const subtype = type.split('/')[1];
    if (!subtype) return type;

    // Clean up and format common types
    const cleanType = subtype.replace('x-', '').toUpperCase();

    // Special cases for better display
    if (cleanType.includes('JPEG') || cleanType.includes('JPG')) return 'JPG';
    if (cleanType.includes('PNG')) return 'PNG';
    if (cleanType.includes('GIF')) return 'GIF';
    if (cleanType.includes('MP4')) return 'MP4';
    if (cleanType.includes('MP3')) return 'MP3';
    if (cleanType.includes('PDF')) return 'PDF';
    if (cleanType.includes('ZIP')) return 'ZIP';
    if (cleanType.includes('RAR')) return 'RAR';
    if (cleanType.includes('DOC')) return 'DOC';
    if (cleanType.includes('DOCX')) return 'DOCX';
    if (cleanType.includes('XLS')) return 'XLS';
    if (cleanType.includes('XLSX')) return 'XLSX';
    if (cleanType.includes('PPT')) return 'PPT';
    if (cleanType.includes('PPTX')) return 'PPTX';
    if (cleanType.includes('TXT')) return 'TXT';
    if (cleanType.includes('HTML') || cleanType.includes('HTM')) return 'HTML';
    if (cleanType.includes('JSON')) return 'JSON';
    if (cleanType.includes('XML')) return 'XML';
    if (cleanType.includes('CSV')) return 'CSV';

    return cleanType;
  };

  const getUploaderName = (fileData: FileData) => {
    if (!fileData.user) return 'Guest User';
    if (fileData.user.name) return fileData.user.name;
    if (fileData.user.email) {
      const emailPrefix = fileData.user.email.split('@')[0];
      // Convert dots and underscores to spaces and capitalize
      return emailPrefix.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'Anonymous';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    if (type.includes('text') || type.includes('document')) return '📝';
    return '📁';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">File Not Found</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'The file you\'re looking for doesn\'t exist or has been deleted.'}
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/">
        <Button variant="ghost" className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </Link>

      <div className="bg-card border rounded-xl p-6 space-y-6">
        {/* File Header */}
        <div className="flex items-start gap-4">
          <div className="text-5xl flex-shrink-0">{getFileIcon(file.type)}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold break-words hyphens-auto">
              {file.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {file.user?.imageUrl ? (
                <img
                  src={file.user.imageUrl}
                  alt="Uploader"
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Uploaded by <span className="font-medium text-foreground">{getUploaderName(file)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* File Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Size:</span>
            <span className="font-medium">{formatFileSize(file.size)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <File className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">{formatFileType(file.type)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Uploaded:</span>
            <span className="font-medium">{formatDate(file.uploadDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Download className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Downloads:</span>
            <span className="font-medium">{file.downloadCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={handleDownload}
            size="lg"
            className="flex-1 gap-2"
          >
            <Download className="w-5 h-5" />
            Download Now
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={copyLink}
            className="gap-2"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          {file.isOwner ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2 text-destructive hover:text-destructive"
              title={!user ? "Only the person who uploaded this file can delete it" : undefined}
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </Button>
          ) : null}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Delete File?
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="mt-2 space-y-2">
                  <div>
                    Are you sure you want to delete <span className="font-semibold text-foreground">"{file?.name}"</span>?
                  </div>
                  <div className="text-amber-600 dark:text-amber-400">
                    This action cannot be undone. The file will be permanently deleted from our servers.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteFile}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Additional Info */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Files are automatically deleted after 48 hours to manage storage costs.</p>
      </div>
    </div>
  );
}
