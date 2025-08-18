'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedChatInterface } from '@/components/chat/EnhancedChatInterface';
import { EnhancedVideoCall } from '@/components/video/EnhancedVideoCall';
import { CodeExecutionPanel } from '@/components/editor/CodeExecutionPanel';

interface RightPanelProps {
  roomId: string;
  activePanels: {
    chat: boolean;
    video: boolean;
    execution: boolean;
  };
  layoutMode: string;
}

export function RightPanel({ roomId, activePanels, layoutMode }: RightPanelProps) {
  const [panelHeights, setPanelHeights] = useState({
    chat: 300,
    video: 300,
    execution: 400
  });

  // Reset panel heights when layout mode changes
  useEffect(() => {
    if (layoutMode === 'coding') {
      setPanelHeights({ chat: 0, video: 0, execution: 400 });
    } else if (layoutMode === 'collaboration') {
      setPanelHeights({ chat: 300, video: 300, execution: 0 });
    } else {
      setPanelHeights({ chat: 300, video: 300, execution: 400 });
    }
  }, [layoutMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset panel heights when component unmounts
      setPanelHeights({ chat: 300, video: 300, execution: 400 });
    };
  }, []);

  return (
    <div className="space-y-4 h-full overflow-y-auto custom-scrollbar">
      {/* Code Execution Panel */}
      <AnimatePresence>
        {activePanels.execution && (
          <motion.div
            key="execution"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: panelHeights.execution }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            style={{ height: panelHeights.execution }}
          >
            <CodeExecutionPanel
              isExecuting={false}
              output=""
              error={null}
              executionTime={null}
              memoryUsed={null}
              onRunCode={() => {}}
              onStopExecution={() => {}}
              onClearOutput={() => {}}
              onInputChange={() => {}}
              input=""
              language="javascript"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface - Simplified */}
      <AnimatePresence>
        {activePanels.chat && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: panelHeights.chat }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            style={{ height: panelHeights.chat }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Chat
                </h3>
              </div>
              <div className="h-[calc(100%-60px)]">
                <EnhancedChatInterface roomId={roomId} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Call Interface - Simplified */}
      <AnimatePresence>
        {activePanels.video && (
          <motion.div
            key="video"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: panelHeights.video }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            style={{ height: panelHeights.video }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Video Call
                </h3>
              </div>
              <div className="h-[calc(100%-60px)]">
                <EnhancedVideoCall roomId={roomId} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
