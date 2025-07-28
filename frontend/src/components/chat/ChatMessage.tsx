'use client';

import { useState } from 'react';
import { User } from '../../lib/auth';
import { formatDistanceToNow } from 'date-fns';

export interface ChatMessageProps {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  isOwn?: boolean;
  isSystem?: boolean;
}

export default function ChatMessage({
  id,
  content,
  userId,
  userName,
  userAvatar,
  timestamp,
  isOwn = false,
  isSystem = false,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Just now';
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-3 py-1 rounded-full">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 py-1 rounded-lg transition-colors`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[80%] space-x-2`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isOwn ? 'ml-2' : 'mr-2'}`}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* User Name & Timestamp */}
          <div className={`flex items-center space-x-2 mb-1 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {userName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(timestamp)}
            </span>
          </div>

          {/* Message Bubble */}
          <div
            className={`relative px-4 py-2 rounded-lg max-w-md break-words ${
              isOwn
                ? 'bg-blue-500 text-white rounded-br-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
        </div>

        {/* Message Actions */}
        {showActions && (
          <div className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'mr-2' : 'ml-2'}`}>
            <button
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title="Reply"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title="React"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title="Copy"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
