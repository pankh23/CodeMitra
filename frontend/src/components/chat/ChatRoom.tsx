'use client';

import { useState, useEffect, useRef } from 'react';
import ChatMessage, { ChatMessageProps } from './ChatMessage';

interface ChatRoomProps {
  messages: ChatMessageProps[];
  currentUser: string;
  onSendMessage: (content: string) => void;
}

export default function ChatRoom({ messages, currentUser, onSendMessage }: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState('');
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} {...msg} isOwn={msg.userId === currentUser} />
        ))}
        <div ref={messageEndRef} />
      </div>
      <div className="p-4 border-t dark:border-gray-700">
        <textarea
          rows={2}
          className="w-full p-2 rounded-lg border dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Type your message..."
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-500 text-white rounded-lg mt-2 px-4 py-2 hover:bg-blue-600 focus:outline-none"
        >
          Send
        </button>
      </div>
    </div>
  );
}
