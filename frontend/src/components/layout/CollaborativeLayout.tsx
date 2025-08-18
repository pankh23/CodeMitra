'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PanelRightClose, 
  PanelRightOpen,
  Maximize2,
  Minimize2,
  Code2,
  Users,
  MessageSquare,
  Video,
  FileText,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface CollaborativeLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  topPanel?: React.ReactNode;
  onLayoutChange?: (mode: string) => void;
}

export function CollaborativeLayout({
  children,
  rightPanel,
  topPanel,
  onLayoutChange
}: CollaborativeLayoutProps) {
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanels, setActivePanels] = useState({
    chat: true,
    video: true,
    execution: false
  });

  // Toggle right panel visibility
  const toggleRightPanel = useCallback(() => {
    setShowRightPanel(prev => !prev);
  }, []);

  // Toggle specific panels
  const toggleSpecificPanel = useCallback((panel: keyof typeof activePanels) => {
    setActivePanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset layout state when component unmounts
      setShowRightPanel(true);
      setActivePanels({ chat: true, video: true, execution: false });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <motion.header 
        className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Section - Room Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Collaborative Editor
                  </span>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>1/10</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Code2 className="w-3 h-3" />
                      <span>Ready to Code</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Center Section - Panel Controls */}
            <div className="flex items-center space-x-3">
              {/* Panel Toggle Controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSpecificPanel('chat')}
                className={activePanels.chat ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="ml-2">Chat</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSpecificPanel('video')}
                className={activePanels.video ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}
              >
                <Video className="w-4 h-4" />
                <span className="ml-2">Video</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSpecificPanel('execution')}
                className={activePanels.execution ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}
              >
                <FileText className="w-4 h-4" />
                <span className="ml-2">Output</span>
              </Button>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRightPanel}
                className="flex items-center gap-2"
              >
                {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                {showRightPanel ? 'Hide' : 'Show'} Sidebar
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area - Split-Pane Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          
          {/* Main Content Area - Code Editor (70-80% width) */}
          <div className="lg:col-span-9 space-y-4 min-h-0">
            {/* Top Panel - Editor Toolbar */}
            {topPanel && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {topPanel}
              </motion.div>
            )}

            {/* Main Code Editor - Takes up most of the space */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 h-full"
            >
              {children}
            </motion.div>
          </div>

          {/* Right Sidebar - Chat/Video (20-30% width) */}
          <AnimatePresence>
            {showRightPanel && (
              <motion.div
                initial={{ opacity: 0, x: 100, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 'auto' }}
                exit={{ opacity: 0, x: 100, width: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-3 space-y-4 min-h-0"
              >
                {rightPanel}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
