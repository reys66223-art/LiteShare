'use client';

import { DatabaseFile } from '@/lib/types';
import { FileCard } from './FileCard';
import { Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FileListProps {
  files: DatabaseFile[];
  title?: string;
  loading?: boolean;
}

export function FileList({ files, title, loading = false }: FileListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (loading) {
    return (
      <div className="space-y-4">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        <div className={cn(
          'gap-4',
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className={cn(
        'gap-4',
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'flex flex-col'
      )}>
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            variant={viewMode === 'list' ? 'compact' : 'default'}
          />
        ))}
      </div>
    </div>
  );
}
