'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';
import { EnhancedCollaborativeLayout } from '@/components/layout/EnhancedCollaborativeLayout';
import { getBoilerplate } from '@/lib/codeBoilerplates';

export default function RoomEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { currentRoom, joinRoom, isLoading: roomLoading } = useRoom();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Editor state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');

  const roomId = params.roomId as string;

  // Handle room joining
  const handleJoinRoom = useCallback(async () => {
    if (!user || !roomId) return;
    
    try {
      setIsJoining(true);
      setError(null);
      
      await joinRoom(roomId, '', router);
      
      // Load default boilerplate code
      const boilerplate = getBoilerplate(language);
      if (boilerplate) {
        setCode(boilerplate.code);
      }
      
    } catch (error: unknown) {
      console.error('Failed to join room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room';
      setError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  }, [user, roomId, joinRoom, router, language]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    if (user && roomId && !currentRoom) {
      handleJoinRoom();
    }
  }, [user, isLoading, roomId, currentRoom, router, handleJoinRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset all state when component unmounts
      setCode('');
      setLanguage('javascript');
    };
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setLanguage(newLanguage);
  }, []);

  // Loading state
  if (isLoading || roomLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading collaborative environment...</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!user) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Joining Room</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleJoinRoom}
              disabled={isJoining}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : 'Retry'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Room not found state
  if (!currentRoom || currentRoom.id !== roomId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">Joining Room...</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Attempting to join room...</p>
          <button
            onClick={handleJoinRoom}
            disabled={isJoining}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <EnhancedCollaborativeLayout
        roomId={currentRoom.id}
        initialLanguage={language}
        initialCode={code}
        onCodeChange={handleCodeChange}
        onLanguageChange={handleLanguageChange}
      />
    </div>
  );
}
