'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, 
  Users, 
  ChevronDown,
  Play,
  LogOut,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';
import toast from 'react-hot-toast';

interface CleanNavbarProps {
  onRunCode: () => void;
  isExecuting?: boolean;
}

export function CleanNavbar({ onRunCode, isExecuting = false }: CleanNavbarProps) {
  const { user, logout } = useAuth();
  const { currentRoom } = useRoom();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
  };

  const copyRoomId = async () => {
    if (currentRoom?.id) {
      try {
        await navigator.clipboard.writeText(currentRoom.id);
        setCopiedRoomId(true);
        toast.success('Room ID copied to clipboard!');
        setTimeout(() => setCopiedRoomId(false), 2000);
      } catch (error) {
        toast.error('Failed to copy room ID');
      }
    }
  };

  const userCount = currentRoom?.users?.length || 0;
  const isPublic = currentRoom?.isPublic || false;

  return (
    <motion.header 
      className="fixed top-0 left-0 right-0 bg-gray-900 shadow-lg border-b border-gray-700 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Left Section - Logo + Room Info */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                CodeMitra
              </span>
            </div>

            {/* Room Info */}
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-white">
                {currentRoom?.name || 'Loading Room...'}
              </h1>
              <div className="flex items-center space-x-3">
                <p className="text-sm text-gray-300">
                  {isPublic ? 'Public Room' : 'Private Room'} • {userCount} users
                </p>
                <span className="text-xs text-gray-400">ID: {currentRoom?.id || '...'}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyRoomId}
                  className="h-6 px-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
                >
                  {copiedRoomId ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Center Section - RUN Button */}
          <div className="flex items-center">
            <Button
              onClick={onRunCode}
              disabled={isExecuting}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-3 h-12 text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
            >
              {isExecuting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              ) : (
                <Play className="w-5 h-5 mr-3" />
              )}
              {isExecuting ? 'Running...' : '▶ RUN CODE'}
            </Button>
          </div>

          {/* Right Section - User Management */}
          <div className="flex items-center space-x-4">
            {/* User Count with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
              >
                <Users className="w-4 h-4 mr-2" />
                <span>{userCount} users</span>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
              </Button>

              {/* User Dropdown */}
              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50"
                  >
                    <div className="p-3 border-b border-gray-600">
                      <h3 className="text-sm font-medium text-white">Connected Users</h3>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto">
                      {currentRoom?.users && currentRoom.users.length > 0 ? (
                        currentRoom.users.map((roomUser) => (
                          <div
                            key={roomUser.id}
                            className="flex items-center space-x-3 p-3 hover:bg-gray-700 transition-colors duration-150"
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {roomUser.user.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {roomUser.user.name || 'Anonymous User'}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {roomUser.user.email || 'No email'}
                              </p>
                            </div>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-400">
                          <p className="text-sm">No users connected</p>
                        </div>
                      )}
                    </div>

                    {/* Logout Section */}
                    {user && (
                      <>
                        <div className="border-t border-gray-600"></div>
                        <div className="p-3">
                          <div className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded-md transition-colors duration-150">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {user.name || 'You'}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {user.email || 'No email'}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={handleLogout}
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 bg-red-600 border-red-500 text-white hover:bg-red-700 hover:border-red-600"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                          </Button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
