'use client';

import { motion } from 'framer-motion';
import { EnhancedCodeExecutionPanel } from '@/components/editor/EnhancedCodeExecutionPanel';
import { EnhancedChatInterface } from '@/components/chat/EnhancedChatInterface';
import { EnhancedVideoCall } from '@/components/video/EnhancedVideoCall';

interface StructuredRightSidebarProps {
  roomId: string;
  code: string;
  language: string;
  onExecutionStart: () => void;
  onExecutionComplete: (result: unknown) => void;
}

export function StructuredRightSidebar({
  roomId,
  code,
  language,
  onExecutionStart,
  onExecutionComplete
}: StructuredRightSidebarProps) {
  return (
    <div className="w-1/4 h-full bg-gray-900 border-l border-gray-700 flex flex-col">
      
      {/* Output Box - Top 1/3 of sidebar */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="h-1/3 min-h-0 border-b border-gray-700"
      >
        <div className="h-full flex flex-col">
          {/* Output Header */}
          <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
            <h3 className="text-sm font-medium text-white flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Code Output
            </h3>
          </div>
          
          {/* Output Content */}
          <div className="flex-1 overflow-hidden">
            <EnhancedCodeExecutionPanel
              code={code}
              language={language}
              roomId={roomId}
              onExecutionStart={onExecutionStart}
              onExecutionComplete={onExecutionComplete}
            />
          </div>
        </div>
      </motion.div>

      {/* Chat Box - Middle section */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="h-1/3 min-h-0 border-b border-gray-700"
      >
        <div className="h-full flex flex-col">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
            <h3 className="text-sm font-medium text-white flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Real-time Chat
            </h3>
          </div>
          
          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            <EnhancedChatInterface roomId={roomId} />
          </div>
        </div>
      </motion.div>

      {/* Video Call Box - Bottom section */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="h-1/3 min-h-0"
      >
        <div className="h-full flex flex-col">
          {/* Video Header */}
          <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
            <h3 className="text-sm font-medium text-white flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Video Call
            </h3>
          </div>
          
          {/* Video Content */}
          <div className="flex-1 overflow-hidden">
            <EnhancedVideoCall />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
