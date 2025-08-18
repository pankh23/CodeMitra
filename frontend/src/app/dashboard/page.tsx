'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RoomManager from '@/components/room/RoomManager';
import { 
  Users, 
  Code2, 
  MessageSquare, 
  Activity, 
  Settings,
  LogOut,
  User
} from 'lucide-react';

interface DashboardStats {
  totalRooms: number;
  joinedRooms: number;
  messagesCount: number;
  executionsCount: number;
}

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    joinedRooms: 0,
    messagesCount: 0,
    executionsCount: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const fetchUserStats = useCallback(async () => {
    if (!user?.id || isLoadingStats) return;
    
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      
      const response = await fetch('/api/users/activity', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStats({
            totalRooms: data.data.totalRooms || 0,
            joinedRooms: data.data.joinedRooms || 0,
            messagesCount: data.data.messagesCount || 0,
            executionsCount: data.data.executionsCount || 0
          });
        } else {
          throw new Error(data.error || 'Failed to load statistics');
        }
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
      setStatsError(error.message || 'Failed to load statistics');
      
      // Set fallback data to prevent infinite loops
      setStats({
        totalRooms: 0,
        joinedRooms: 0,
        messagesCount: 0,
        executionsCount: 0
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [user?.id, isLoadingStats]);

  // Initialize stats with fallback data for new users
  useEffect(() => {
    if (user?.id && !isLoadingStats && stats.totalRooms === 0 && stats.joinedRooms === 0) {
      setStats({
        totalRooms: 0,
        joinedRooms: 0,
        messagesCount: 0,
        executionsCount: 0
      });
    }
  }, [user?.id, isLoadingStats, stats.totalRooms, stats.joinedRooms]);

  useEffect(() => {
    if (user?.id && !isLoadingStats) {
      fetchUserStats();
    }
  }, [user?.id, fetchUserStats]);

  // Listen for room creation events to refresh stats
  useEffect(() => {
    const handleRoomCreated = () => {
      fetchUserStats();
    };

    window.addEventListener('roomCreated', handleRoomCreated);
    return () => {
      window.removeEventListener('roomCreated', handleRoomCreated);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CodeMitra
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <User className="w-4 h-4" />
                <span>Welcome, {user.name}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your coding rooms and collaborate with your team
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Rooms
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {isLoadingStats ? '...' : (statsError ? '0' : stats.totalRooms)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Joined Rooms
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {isLoadingStats ? '...' : (statsError ? '0' : stats.joinedRooms)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Messages
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {isLoadingStats ? '...' : (statsError ? '0' : stats.messagesCount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <Code2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Code Executions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {isLoadingStats ? '...' : (statsError ? '0' : stats.executionsCount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Manager Section */}
        <div className="w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Room Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoomManager />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
