'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Save, 
  Download, 
  Upload, 
  Copy, 
  Settings, 
  FileText,
  Share2,
  Code2,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableLanguages, getBoilerplate } from '@/lib/codeBoilerplates';

interface EditorToolbarProps {
  language: string;
  theme: 'light' | 'dark';
  onLanguageChange: (language: string) => void;
  onThemeToggle: () => void;
  onRunCode: () => void;
  onSaveCode: () => void;
  onCopyCode: () => void;
  onDownloadCode: () => void;
  onUploadCode: () => void;
  onShareCode: () => void;
  onLoadBoilerplate?: (code: string) => void;
  isExecuting: boolean;
  hasUnsavedChanges: boolean;
}

const SUPPORTED_LANGUAGES = getAvailableLanguages().map(lang => ({
  value: lang.id,
  label: lang.name,
  icon: getLanguageIcon(lang.id),
  description: lang.description
}));

function getLanguageIcon(languageId: string): string {
  const icons: { [key: string]: string } = {
    javascript: '⚡',
    python: '🐍',
    java: '☕',
    cpp: '⚙️'
  };
  return icons[languageId] || '📝';
}

export function EditorToolbar({
  language,
  theme,
  onLanguageChange,
  onThemeToggle,
  onRunCode,
  onSaveCode,
  onCopyCode,
  onDownloadCode,
  onUploadCode,
  onShareCode,
  onLoadBoilerplate,
  isExecuting,
  hasUnsavedChanges
}: EditorToolbarProps) {
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const currentLanguage = SUPPORTED_LANGUAGES.find((lang: { value: string; label: string; icon: string; description: string }) => lang.value === language);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    onLanguageChange(newLanguage);
    
    // Load boilerplate code for the new language
    if (onLoadBoilerplate) {
      const boilerplate = getBoilerplate(newLanguage);
      if (boilerplate) {
        onLoadBoilerplate(boilerplate.code);
      }
    }
    
    setShowLanguageDropdown(false);
  }, [onLanguageChange, onLoadBoilerplate]);

  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Language & Theme */}
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center space-x-2 min-w-[140px] justify-between"
            >
              <span className="flex items-center space-x-2">
                <span className="text-lg">{currentLanguage?.icon}</span>
                <span>{currentLanguage?.label}</span>
              </span>
              <motion.div
                animate={{ rotate: showLanguageDropdown ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </Button>

            <AnimatePresence>
              {showLanguageDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                >
                  <div className="py-2 max-h-64 overflow-y-auto">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                                                            onClick={() => handleLanguageChange(lang.value)}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                          language === lang.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        <span className="text-lg">{lang.icon}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

                                {/* Theme Toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onThemeToggle}
                        className="flex items-center space-x-2"
                      >
                        {theme === 'dark' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                      </Button>

                      {/* Load Boilerplate */}
                      {onLoadBoilerplate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const boilerplate = getBoilerplate(language);
                            if (boilerplate) {
                              onLoadBoilerplate(boilerplate.code);
                            }
                          }}
                          className="flex items-center space-x-2"
                          title="Load language boilerplate code"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Template</span>
                        </Button>
                      )}
        </div>

        {/* Center Section - Main Actions */}
        <div className="flex items-center space-x-2">
          {/* Run Code Button */}
          <Button
            onClick={onRunCode}
            disabled={isExecuting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex items-center space-x-2"
            size="sm"
          >
            <motion.div
              animate={isExecuting ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: isExecuting ? Infinity : 0 }}
            >
              <Play className="w-4 h-4" />
            </motion.div>
            <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
          </Button>

          {/* Save Button */}
          <Button
            onClick={onSaveCode}
            variant="outline"
            size="sm"
            className={`flex items-center space-x-2 ${
              hasUnsavedChanges ? 'border-orange-500 text-orange-600' : ''
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
            {hasUnsavedChanges && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-2 h-2 bg-orange-500 rounded-full"
              />
            )}
          </Button>

          {/* Copy Button */}
          <Button
            onClick={onCopyCode}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </Button>
        </div>

        {/* Right Section - File Operations */}
        <div className="flex items-center space-x-2">
          {/* File Menu */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>File</span>
            </Button>

            <AnimatePresence>
              {showFileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                >
                  <div className="py-2">
                    <button
                      onClick={() => {
                        onUploadCode();
                        setShowFileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload File</span>
                    </button>
                    <button
                      onClick={() => {
                        onDownloadCode();
                        setShowFileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => {
                        onShareCode();
                        setShowFileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Code</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-2">
            <Code2 className="w-3 h-3" />
            <span>{currentLanguage?.label}</span>
          </span>
          {hasUnsavedChanges && (
            <span className="flex items-center space-x-2 text-orange-500">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span>Unsaved changes</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Auto-save enabled</span>
          <span>UTF-8</span>
        </div>
      </div>
    </motion.div>
  );
}
