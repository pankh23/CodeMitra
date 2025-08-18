'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            We encountered an error while loading your dashboard. Please try again.
          </p>
          
          {error.message && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 font-mono">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={reset}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
