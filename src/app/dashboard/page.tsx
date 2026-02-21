'use client';

import { useState, useEffect } from 'react';
import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs';
import { File, Download, Trash2, Clock, HardDrive, Copy, Check, ExternalLink, AlertTriangle, LogOut, UserX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface DashboardFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  downloadCount: number;
  expiresAt: string | null;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [files, setFiles] = useState<DashboardFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/dashboard/files');
        if (!response.ok) {
          throw new Error('Failed to fetch files');
        }
        const data = await response.json();
        setFiles(data);
      } catch (error) {
        console.error('Error fetching files:', error);
        toast.error('Failed to load your files');
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchFiles();
    }
  }, [isLoaded, user]);

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
    });
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

  const copyLink = (fileId: string) => {
    const url = `${window.location.origin}/f/${fileId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteFile = async () => {
    if (!fileToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/dashboard/files/${fileToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFiles(prev => prev.filter(f => f.id !== fileToDelete));
      toast.success('File deleted successfully');
      setShowDeleteDialog(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (fileId: string) => {
    setFileToDelete(fileId);
    setShowDeleteDialog(true);
  };

  const deleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');
      setShowDeleteAccountDialog(false);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {user
                ? `Welcome back, ${user.firstName || user.emailAddresses[0]?.emailAddress}! Manage your uploaded files.`
                : 'Sign in to manage your files and access higher upload limits.'}
            </p>
          </div>
          {user && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <SignOutButton>
                <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto justify-center">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </Button>
              </SignOutButton>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteAccountDialog(true)}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto justify-center"
              >
                <UserX className="w-4 h-4" />
                <span className="hidden sm:inline">Delete Account</span>
                <span className="sm:hidden">Delete</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {!user ? (
        <div className="bg-card border rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
          <p className="text-muted-foreground mb-4">
            Please sign in to view and manage your uploaded files.
          </p>
          <SignInButton>
            <Button>Sign In</Button>
          </SignInButton>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <File className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Files</p>
              <p className="text-2xl font-bold">{files.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Download className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Downloads</p>
              <p className="text-2xl font-bold">{files.reduce((acc, f) => acc + f.downloadCount, 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Size</p>
              <p className="text-2xl font-bold">
                {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Your Files</h2>
        </div>

        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-semibold mb-2">No files yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first file to get started
            </p>
            <Link href="/">
              <Button>Upload File</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-semibold">File</th>
                  <th className="text-left p-4 font-semibold">Size</th>
                  <th className="text-left p-4 font-semibold">Downloads</th>
                  <th className="text-left p-4 font-semibold">Expires</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getFileIcon(file.type)}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate max-w-[200px]">{file.name}</h3>
                            <Link href={`/f/${file.id}`} target="_blank">
                              <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary flex-shrink-0" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-sm">
                        <HardDrive className="w-4 h-4 text-muted-foreground" />
                        {formatFileSize(file.size)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-sm">
                        <Download className="w-4 h-4 text-muted-foreground" />
                        {file.downloadCount}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {file.expiresAt ? formatDate(file.expiresAt) : 'No expiry'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(file.id)}
                          title="Copy link"
                          className="h-8 w-8"
                        >
                          {copiedId === file.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Link href={`/f/${file.id}`}>
                          <Button variant="ghost" size="icon" title="View file" className="h-8 w-8">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(file.id)}
                          title="Delete file"
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{files.find(f => f.id === fileToDelete)?.name}"</span>?
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

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-destructive text-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
                <UserX className="w-6 h-6" />
              </div>
              Delete Account?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                This action is PERMANENT and CANNOT be undone!
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">If you delete your account:</p>
              <ul className="space-y-2">
                {[
                  'All your files will be permanently deleted',
                  'Your user profile will be removed',
                  'You will lose access to all uploaded content',
                  'Your account cannot be recovered',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Warning:
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                This will delete your account from both our platform and Clerk authentication system.
              </p>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter className="sm:justify-between gap-2 mt-6">
            <AlertDialogCancel disabled={isDeletingAccount} className="sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              disabled={isDeletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto min-w-[140px]"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4 mr-2" />
                  Delete Account
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}
    </div>
  );
}
