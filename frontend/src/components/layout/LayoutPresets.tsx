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
  Save,
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
  category: 'workflow' | 'device' | 'custom';
}

interface LayoutPresetsProps {
  currentLayout: LayoutConfig;
  onLayoutChange: (layout: LayoutConfig) => void;
  onSavePreset?: (preset: LayoutPreset) => void;
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
    description: 'Full desktop layout with all panels',
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
    description: 'Optimized for tablet screens',
    icon: <Tablet className="w-4 h-4" />,
    layout: {
      editor: { width: 75, height: 65 },
      output: { width: 25, height: 45 },
      chat: { width: 25, height: 27.5 },
      video: { width: 25, height: 27.5 }
    },
    category: 'device'
  },
  {
    id: 'mobile',
    name: 'Mobile',
    description: 'Mobile-optimized layout',
    icon: <Smartphone className="w-4 h-4" />,
    layout: {
      editor: { width: 100, height: 80 },
      output: { width: 100, height: 20 },
      chat: { width: 100, height: 0 },
      video: { width: 100, height: 0 }
    },
    category: 'device'
  }
];

export function LayoutPresets({
  currentLayout,
  onLayoutChange,
  onSavePreset,
  onLoadPreset
}: LayoutPresetsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'workflow' | 'device' | 'custom'>('all');
  const [customPresets, setCustomPresets] = useState<LayoutPreset[]>([]);

  // Load custom presets from localStorage
  useState(() => {
    try {
      const saved = localStorage.getItem('codemitra-custom-presets');
      if (saved) {
        setCustomPresets(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load custom presets:', error);
    }
  });

  // Save custom preset
  const handleSaveCustomPreset = () => {
    const presetName = prompt('Enter preset name:');
    if (!presetName) return;

    const newPreset: LayoutPreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      description: 'Custom layout configuration',
      icon: <Save className="w-4 h-4" />,
      layout: currentLayout,
      category: 'custom'
    };

    const updatedPresets = [...customPresets, newPreset];
    setCustomPresets(updatedPresets);
    
    try {
      localStorage.setItem('codemitra-custom-presets', JSON.stringify(updatedPresets));
    } catch (error) {
      console.warn('Failed to save custom preset:', error);
    }

    onSavePreset?.(newPreset);
  };

  // Load preset
  const handleLoadPreset = (preset: LayoutPreset) => {
    onLayoutChange(preset.layout);
    onLoadPreset?.(preset);
    setIsOpen(false);
  };

  // Delete custom preset
  const handleDeleteCustomPreset = (presetId: string) => {
    const updatedPresets = customPresets.filter(p => p.id !== presetId);
    setCustomPresets(updatedPresets);
    
    try {
      localStorage.setItem('codemitra-custom-presets', JSON.stringify(updatedPresets));
    } catch (error) {
      console.warn('Failed to delete custom preset:', error);
    }
  };

  // Filter presets by category
  const filteredPresets = [...DEFAULT_PRESETS, ...customPresets].filter(preset => 
    selectedCategory === 'all' || preset.category === selectedCategory
  );

  const categories = [
    { id: 'all', name: 'All', count: DEFAULT_PRESETS.length + customPresets.length },
    { id: 'workflow', name: 'Workflow', count: DEFAULT_PRESETS.filter(p => p.category === 'workflow').length },
    { id: 'device', name: 'Device', count: DEFAULT_PRESETS.filter(p => p.category === 'device').length },
    { id: 'custom', name: 'Custom', count: customPresets.length }
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveCustomPreset}
                  className="h-6 px-2 bg-blue-600 border-blue-500 text-white hover:bg-blue-700 text-xs"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save Current
                </Button>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-400">
                        {preset.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">{preset.name}</h4>
                        <p className="text-xs text-gray-400">{preset.description}</p>
                      </div>
                    </div>
                    
                    {preset.category === 'custom' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomPreset(preset.id);
                        }}
                        className="h-6 px-2 bg-red-600 border-red-500 text-white hover:bg-red-700 text-xs"
                      >
                        ×
                      </Button>
                    )}
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
