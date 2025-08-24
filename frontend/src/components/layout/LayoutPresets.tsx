'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, 
  Terminal, 
  MessageSquare, 
  Video, 
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutConfig {
  editor: { width: number; height: number };
  output: { width: number; height: number };
  chat: { width: number; height: number };
  video: { width: number; height: number };
}

interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  layout: LayoutConfig;
  category: 'workflow' | 'device';
}

interface LayoutPresetsProps {
  currentLayout: LayoutConfig;
  onLayoutChange: (layout: LayoutConfig) => void;
  onLoadPreset?: (preset: LayoutPreset) => void;
}

const DEFAULT_PRESETS: LayoutPreset[] = [
  // Workflow Presets
  {
    id: 'coding-focus',
    name: 'Coding Focus',
    description: 'Maximize editor space for intensive coding',
    icon: <Code2 className="w-4 h-4" />,
    layout: {
      editor: { width: 80, height: 70 },
      output: { width: 20, height: 50 },
      chat: { width: 20, height: 25 },
      video: { width: 20, height: 25 }
    },
    category: 'workflow'
  },
  {
    id: 'debugging',
    name: 'Debugging',
    description: 'Large output panel for debugging and logs',
    icon: <Terminal className="w-4 h-4" />,
    layout: {
      editor: { width: 65, height: 60 },
      output: { width: 35, height: 60 },
      chat: { width: 35, height: 20 },
      video: { width: 35, height: 20 }
    },
    category: 'workflow'
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    description: 'Balanced layout for team coding',
    icon: <MessageSquare className="w-4 h-4" />,
    layout: {
      editor: { width: 70, height: 60 },
      output: { width: 30, height: 40 },
      chat: { width: 30, height: 30 },
      video: { width: 30, height: 30 }
    },
    category: 'workflow'
  },
  {
    id: 'presentation',
    name: 'Presentation',
    description: 'Large video panel for screen sharing',
    icon: <Video className="w-4 h-4" />,
    layout: {
      editor: { width: 60, height: 50 },
      output: { width: 40, height: 30 },
      chat: { width: 40, height: 20 },
      video: { width: 40, height: 50 }
    },
    category: 'workflow'
  },

  // Device Presets
  {
    id: 'desktop',
    name: 'Desktop',
    description: 'Optimized for large screens',
    icon: <Monitor className="w-4 h-4" />,
    layout: {
      editor: { width: 70, height: 60 },
      output: { width: 30, height: 40 },
      chat: { width: 30, height: 30 },
      video: { width: 30, height: 30 }
    },
    category: 'device'
  },
  {
    id: 'tablet',
    name: 'Tablet',
    description: 'Optimized for medium screens',
    icon: <Tablet className="w-4 h-4" />,
    layout: {
      editor: { width: 75, height: 65 },
      output: { width: 25, height: 45 },
      chat: { width: 25, height: 25 },
      video: { width: 25, height: 30 }
    },
    category: 'device'
  },
  {
    id: 'mobile',
    name: 'Mobile',
    description: 'Optimized for small screens',
    icon: <Smartphone className="w-4 h-4" />,
    layout: {
      editor: { width: 85, height: 70 },
      output: { width: 15, height: 50 },
      chat: { width: 15, height: 25 },
      video: { width: 15, height: 25 }
    },
    category: 'device'
  }
];

export function LayoutPresets({ currentLayout, onLayoutChange, onLoadPreset }: LayoutPresetsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'workflow' | 'device'>('all');

  const handleLoadPreset = (preset: LayoutPreset) => {
    onLayoutChange(preset.layout);
    onLoadPreset?.(preset);
    setIsOpen(false);
  };

  // Filter presets by category
  const filteredPresets = DEFAULT_PRESETS.filter(preset => 
    selectedCategory === 'all' || preset.category === selectedCategory
  );

  const categories = [
    { id: 'all', name: 'All', count: DEFAULT_PRESETS.length },
    { id: 'workflow', name: 'Workflow', count: DEFAULT_PRESETS.filter(p => p.category === 'workflow').length },
    { id: 'device', name: 'Device', count: DEFAULT_PRESETS.filter(p => p.category === 'device').length }
  ];

  return (
    <div className="relative">
      {/* Preset Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
      >
        <Settings className="w-4 h-4 mr-2" />
        Layout Presets
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Preset Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50"
          >
            {/* Header */}
            <div className="p-3 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Layout Presets</h3>
                <span className="text-xs text-gray-400">Quick layout switching</span>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-gray-600">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id as any)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {category.name} ({category.count})
                </button>
              ))}
            </div>

            {/* Preset List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredPresets.map(preset => (
                <div
                  key={preset.id}
                  className="p-3 hover:bg-gray-700 transition-colors duration-150 cursor-pointer border-b border-gray-600 last:border-b-0"
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-400">
                      {preset.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{preset.name}</h4>
                      <p className="text-xs text-gray-400">{preset.description}</p>
                    </div>
                  </div>
                  
                  {/* Layout Preview */}
                  <div className="mt-2 flex space-x-1">
                    <div 
                      className="h-2 bg-blue-500 rounded"
                      style={{ width: `${preset.layout.editor.width}%` }}
                      title={`Editor: ${preset.layout.editor.width}% × ${preset.layout.editor.height}%`}
                    />
                    <div 
                      className="h-2 bg-green-500 rounded"
                      style={{ width: `${preset.layout.output.width}%` }}
                      title={`Output: ${preset.layout.output.width}% × ${preset.layout.output.height}%`}
                    />
                    <div 
                      className="h-2 bg-purple-500 rounded"
                      style={{ width: `${preset.layout.chat.width}%` }}
                      title={`Chat: ${preset.layout.chat.width}% × ${preset.layout.chat.height}%`}
                    />
                    <div 
                      className="h-2 bg-orange-500 rounded"
                      style={{ width: `${preset.layout.video.width}%` }}
                      title={`Video: ${preset.layout.video.width}% × ${preset.layout.video.height}%`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
