'use client';

import { DatabaseFile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  File as FileIcon,
  FileText,
  Image,
  Video,
  AudioLines,
  FileArchive,
  FileSpreadsheet,
  Presentation,
  Download,
  Copy,
  Share2,
  Clock,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface FileCardProps {
  file: DatabaseFile;
  variant?: 'default' | 'compact';
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return AudioLines;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return FileArchive;
  if (mimeType.includes('word')) return FileText;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileSpreadsheet;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
  return FileIcon;
};

const getFileColor = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'text-blue-500 bg-blue-500/10';
  if (mimeType.startsWith('video/')) return 'text-purple-500 bg-purple-500/10';
  if (mimeType.startsWith('audio/')) return 'text-pink-500 bg-pink-500/10';
  if (mimeType.includes('pdf')) return 'text-red-500 bg-red-500/10';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'text-amber-500 bg-amber-500/10';
  if (mimeType.includes('word')) return 'text-blue-500 bg-blue-500/10';
  if (mimeType.includes('excel')) return 'text-green-500 bg-green-500/10';
  if (mimeType.includes('presentation')) return 'text-orange-500 bg-orange-500/10';
  return 'text-muted-foreground bg-muted';
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: Date | string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function FileCard({ file, variant = 'default' }: FileCardProps) {
  const router = useRouter();
  const IconComponent = getFileIcon(file.type);
  const iconColor = getFileColor(file.type);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/f/${file.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleShare = () => {
    const url = `${window.location.origin}/f/${file.id}`;
    if (navigator.share) {
      navigator.share({
        title: file.name,
        text: `Download ${file.name}`,
        url,
      });
    } else {
      handleCopyLink();
    }
  };

  const handleDownload = async () => {
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
  };

  if (variant === 'compact') {
    return (
      <Card className="group hover:border-primary/50 transition-all duration-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconColor}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm font-medium truncate cursor-pointer hover:underline"
                onClick={() => router.push(`/f/${file.id}`)}
              >
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} • {formatDate(file.uploadDate)}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => router.push(`/f/${file.id}`)}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconColor}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={handleShare}
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={handleCopyLink}
                title="Copy link"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <h3 
              className="font-medium truncate group-hover:text-primary transition-colors cursor-pointer hover:underline"
              onClick={() => router.push(`/f/${file.id}`)}
            >
              {file.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatFileSize(file.size)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(file.uploadDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {file.downloadCount} downloads
            </span>
            <Button
              size="sm"
              onClick={handleDownload}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
