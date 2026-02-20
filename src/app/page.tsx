'use client';

import { useState, useEffect } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { FileList } from '@/components/FileList';
import { UploadCloud, Zap, Shield, Globe, UserCheck } from 'lucide-react';
import { DatabaseFile } from '@/lib/types';

export default function Home() {
  const [recentFiles, setRecentFiles] = useState<DatabaseFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentFiles = async () => {
      try {
        const response = await fetch('/api/public-files?limit=3&sortBy=date');
        if (!response.ok) throw new Error('Failed to fetch files');
        const data = await response.json();
        setRecentFiles(data);
      } catch (error) {
        console.error('Error fetching recent files:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentFiles();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/10 text-primary">
          <UploadCloud className="w-4 h-4" />
          <span className="text-sm font-medium">No Account Required</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          Share Files in{' '}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Seconds
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-8">
          Upload any file up to 100MB and share it with a unique link.
          No account required. Files auto-expire after 24-48 hours.
        </p>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Lightning Fast</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-green-500" />
            <span>Secure Transfer</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Share Anywhere</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCheck className="w-4 h-4 text-purple-500" />
            <span>Sign In for More</span>
          </div>
        </div>

        {/* Upload Limits Info */}
        <div className="max-w-xl mx-auto mb-8 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Guest:</strong> 16MB max, 2 files, 24h storage | 
            <strong className="text-foreground ml-2">Sign In:</strong> 64MB max, 8 files, 48h storage
          </p>
        </div>
      </section>

      {/* Upload Section */}
      <section className="max-w-2xl mx-auto mb-16">
        <UploadZone />
      </section>

      {/* Recent Files Section */}
      <section className="max-w-4xl mx-auto">
        <FileList 
          files={recentFiles} 
          title="Recent Uploads" 
          loading={loading}
        />
      </section>

      {/* CTA Section */}
      <section className="text-center py-12 mt-16 border-t">
        <h2 className="text-2xl font-bold mb-4">Ready to share your files?</h2>
        <p className="text-muted-foreground mb-6">
          Join thousands of users sharing files securely with LiteShare
        </p>
      </section>
    </div>
  );
}
