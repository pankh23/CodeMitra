'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripHorizontal, GripVertical, Maximize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResizablePanelProps {
  children: React.ReactNode;
  title?: string;
  minSize?: number;
  maxSize?: number;
  defaultSize?: number;
  direction?: 'horizontal' | 'vertical';
  onResize?: (newSize: number) => void;
  className?: string;
  headerContent?: React.ReactNode;
}

export function ResizablePanel({
  children,
  title,
  minSize = 15,
  maxSize = 85,
  defaultSize = 30,
  direction = 'vertical',
  onResize,
  className = '',
  headerContent
}: ResizablePanelProps) {
  const [size, setSize] = useState(defaultSize);
  const [isResizing, setIsResizing] = useState(false);
  const [startSize, setStartSize] = useState(0);
  const [startPos, setStartPos] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartSize(size);
    setStartPos(direction === 'horizontal' ? e.clientX : e.clientY);
  }, [size, direction]);

  // Handle resize during drag
  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return;

    const container = panelRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    
    let newSize: number;
    
    if (direction === 'horizontal') {
      const deltaPercent = (delta / containerRect.width) * 100;
      newSize = Math.max(minSize, Math.min(maxSize, startSize + deltaPercent));
    } else {
      const deltaPercent = (delta / containerRect.height) * 100;
      newSize = Math.max(minSize, Math.min(maxSize, startSize + deltaPercent));
    }

    setSize(newSize);
    onResize?.(newSize);
  }, [isResizing, startPos, startSize, direction, minSize, maxSize, onResize]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Reset to default size
  const resetSize = useCallback(() => {
    setSize(defaultSize);
    onResize?.(defaultSize);
  }, [defaultSize, onResize]);

  // Maximize panel
  const maximizePanel = useCallback(() => {
    setSize(maxSize);
    onResize?.(maxSize);
  }, [maxSize, onResize]);

  // Set up resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  const isHorizontal = direction === 'horizontal';
  const sizeStyle = isHorizontal ? { width: `${size}%` } : { height: `${size}%` };

  return (
    <motion.div
      ref={panelRef}
      className={`relative bg-gray-800 border border-gray-700 ${className}`}
      style={sizeStyle}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Panel Header */}
      {(title || headerContent) && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-700 border-b border-gray-600">
          <div className="flex items-center space-x-2">
            {title && (
              <h3 className="text-sm font-medium text-white">{title}</h3>
            )}
            {headerContent}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={resetSize}
              className="h-6 px-2 bg-gray-600 border-gray-500 text-white hover:bg-gray-500 text-xs"
              title="Reset Size"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={maximizePanel}
              className="h-6 px-2 bg-gray-600 border-gray-500 text-white hover:bg-gray-500 text-xs"
              title="Maximize"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Panel Content */}
      <div className="h-full overflow-hidden">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className={`absolute bg-gray-600 hover:bg-blue-500 cursor-${isHorizontal ? 'ew-resize' : 'ns-resize'} group transition-colors duration-200 ${
          isHorizontal 
            ? 'w-1 h-full right-0 top-0' 
            : 'h-1 w-full bottom-0 left-0'
        }`}
        onMouseDown={handleResizeStart}
      >
        <div className={`absolute inset-0 flex items-center justify-center ${
          isHorizontal ? 'justify-center' : 'justify-center'
        }`}>
          {isHorizontal ? (
            <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : (
            <GripHorizontal className="w-4 h-4 text-gray-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Resize Overlay */}
      {isResizing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-20 z-40 pointer-events-none"
        />
      )}
    </motion.div>
  );
}
