'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { 
  GripVertical, 
  GripHorizontal, 
  Maximize2, 
  RotateCcw,
  Save,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutConfig {
  editor: { width: number; height: number };
  output: { width: number; height: number };
  chat: { width: number; height: number };
  video: { width: number; height: number };
}

interface ResizableLayoutProps {
  children: {
    editor: React.ReactNode;
    output: React.ReactNode;
    chat: React.ReactNode;
    video: React.ReactNode;
  };
  onLayoutChange?: (layout: LayoutConfig) => void;
  initialLayout?: Partial<LayoutConfig>;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  editor: { width: 70, height: 60 },
  output: { width: 30, height: 40 },
  chat: { width: 30, height: 30 },
  video: { width: 30, height: 30 }
};

const MIN_COMPONENT_SIZE = 15; // Minimum 15% of container
const MAX_COMPONENT_SIZE = 85; // Maximum 85% of container

export function ResizableLayout({ 
  children, 
  onLayoutChange,
  initialLayout 
}: ResizableLayoutProps) {
  const [layout, setLayout] = useState<LayoutConfig>({
    ...DEFAULT_LAYOUT,
    ...initialLayout
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Save layout to localStorage
  const saveLayout = useCallback((newLayout: LayoutConfig) => {
    try {
      localStorage.setItem('codemitra-layout', JSON.stringify(newLayout));
    } catch (error) {
      console.warn('Failed to save layout to localStorage:', error);
    }
  }, []);

  // Load layout from localStorage
  const loadLayout = useCallback(() => {
    try {
      const saved = localStorage.getItem('codemitra-layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        setLayout(parsed);
        onLayoutChange?.(parsed);
      }
    } catch (error) {
      console.warn('Failed to load layout from localStorage:', error);
    }
  }, [onLayoutChange]);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    onLayoutChange?.(DEFAULT_LAYOUT);
    saveLayout(DEFAULT_LAYOUT);
  }, [onLayoutChange, saveLayout]);

  // Auto-fit layout
  const autoFitLayout = useCallback(() => {
    const newLayout: LayoutConfig = {
      editor: { width: 70, height: 60 },
      output: { width: 30, height: 40 },
      chat: { width: 30, height: 30 },
      video: { width: 30, height: 30 }
    };
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
    saveLayout(newLayout);
  }, [onLayoutChange, saveLayout]);

  // Handle resize start
  const handleResizeStart = useCallback((direction: 'horizontal' | 'vertical', e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  // Handle resize during drag
  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (resizeDirection === 'horizontal') {
      const deltaWidth = (deltaX / container.width) * 100;
      
      setLayout(prev => {
        const newLayout = { ...prev };
        
        // Adjust editor and right panel widths
        const newEditorWidth = Math.max(MIN_COMPONENT_SIZE, Math.min(MAX_COMPONENT_SIZE, prev.editor.width + deltaWidth));
        const newRightWidth = 100 - newEditorWidth;
        
        newLayout.editor.width = newEditorWidth;
        newLayout.output.width = newRightWidth;
        newLayout.chat.width = newRightWidth;
        newLayout.video.width = newRightWidth;
        
        return newLayout;
      });
    } else if (resizeDirection === 'vertical') {
      const deltaHeight = (deltaY / container.height) * 100;
      
      setLayout(prev => {
        const newLayout = { ...prev };
        
        // Adjust editor height and bottom panel heights
        const newEditorHeight = Math.max(MIN_COMPONENT_SIZE, Math.min(MAX_COMPONENT_SIZE, prev.editor.height + deltaHeight));
        const remainingHeight = 100 - newEditorHeight;
        
        // Distribute remaining height proportionally
        const totalBottomHeight = prev.output.height + prev.chat.height + prev.video.height;
        const ratio = remainingHeight / totalBottomHeight;
        
        newLayout.editor.height = newEditorHeight;
        newLayout.output.height = prev.output.height * ratio;
        newLayout.chat.height = prev.chat.height * ratio;
        newLayout.video.height = prev.video.height * ratio;
        
        return newLayout;
      });
    }
  }, [isResizing, resizeDirection, dragStart]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeDirection(null);
      saveLayout(layout);
      onLayoutChange?.(layout);
    }
  }, [isResizing, layout, saveLayout, onLayoutChange]);

  // Handle right panel height resizing
  const handleRightPanelResize = useCallback((panel: 'output' | 'chat' | 'video', deltaY: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const deltaHeight = (deltaY / container.height) * 100;
    
    setLayout(prev => {
      const newLayout = { ...prev };
      const remainingHeight = 100 - prev.editor.height;
      
      // Calculate new heights for right panels
      const panels = ['output', 'chat', 'video'] as const;
      const currentHeights = panels.map(p => prev[p].height);
      const totalCurrentHeight = currentHeights.reduce((sum, h) => sum + h, 0);
      
      // Adjust the target panel height
      const targetIndex = panels.indexOf(panel);
      const newTargetHeight = Math.max(MIN_COMPONENT_SIZE, Math.min(MAX_COMPONENT_SIZE, currentHeights[targetIndex] + deltaHeight));
      
      // Distribute remaining height proportionally among other panels
      const remainingHeightForOthers = remainingHeight - newTargetHeight;
      const otherPanels = panels.filter((_, i) => i !== targetIndex);
      const otherHeights = otherPanels.map(p => prev[p].height);
      const totalOtherHeight = otherHeights.reduce((sum, h) => sum + h, 0);
      
      if (totalOtherHeight > 0) {
        const ratio = remainingHeightForOthers / totalOtherHeight;
        otherPanels.forEach(p => {
          newLayout[p].height = prev[p].height * ratio;
        });
      }
      
      newLayout[panel].height = newTargetHeight;
      
      return newLayout;
    });
  }, []);

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

  // Load saved layout on mount
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  // Save layout when it changes
  useEffect(() => {
    if (layout !== DEFAULT_LAYOUT) {
      saveLayout(layout);
    }
  }, [layout, saveLayout]);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full bg-gray-900 relative overflow-hidden"
      style={{ cursor: isResizing ? (resizeDirection === 'horizontal' ? 'ew-resize' : 'ns-resize') : 'default' }}
    >
      {/* Layout Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={autoFitLayout}
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          title="Auto-fit Layout"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetLayout}
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          title="Reset to Default"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveLayout(layout)}
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          title="Save Layout"
        >
          <Save className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Layout Grid */}
      <div className="h-full flex">
        {/* Left Section - Code Editor */}
        <div 
          className="bg-gray-800 border-r border-gray-700 relative"
          style={{ width: `${layout.editor.width}%` }}
        >
          {children.editor}
        </div>

        {/* Vertical Resize Handle */}
        <div
          className="w-1 bg-gray-600 hover:bg-blue-500 cursor-ew-resize relative group"
          onMouseDown={(e) => handleResizeStart('horizontal', e)}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Right Section - Panels */}
        <div 
          className="flex-1 flex flex-col"
          style={{ width: `${100 - layout.editor.width}%` }}
        >
          {/* Output Panel */}
          <div 
            className="bg-gray-800 border-b border-gray-700 relative"
            style={{ height: `${layout.output.height}%` }}
          >
            {children.output}
          </div>

          {/* Horizontal Resize Handle */}
          <div
            className="h-1 bg-gray-600 hover:bg-blue-500 cursor-ns-resize relative group"
            onMouseDown={(e) => handleResizeStart('vertical', e)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <GripHorizontal className="w-4 h-4 text-gray-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Chat Panel */}
          <div 
            className="bg-gray-800 border-b border-gray-700 relative"
            style={{ height: `${layout.chat.height}%` }}
          >
            {children.chat}
          </div>

          {/* Horizontal Resize Handle */}
          <div
            className="h-1 bg-gray-600 hover:bg-blue-500 cursor-ns-resize relative group"
            onMouseDown={(e) => handleResizeStart('vertical', e)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <GripHorizontal className="w-4 h-4 text-gray-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Video Panel */}
          <div 
            className="bg-gray-800 flex-1 relative"
            style={{ height: `${layout.video.height}%` }}
          >
            {children.video}
          </div>
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
    </div>
  );
}
