'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Code2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBoilerplate, getSupportedLanguages } from '@/lib/codeBoilerplates';

interface CleanEditorToolbarProps {
  language: string;
  onLanguageChange: (language: string) => void;
  code: string;
}

export function CleanEditorToolbar({
  language,
  onLanguageChange,
  code
}: CleanEditorToolbarProps) {
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);

  useEffect(() => {
    // Get supported languages from boilerplates
    const languages = getSupportedLanguages();
    setSupportedLanguages(languages);
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    onLanguageChange(newLanguage);
    setShowLanguageDropdown(false);
  };

  const currentLanguageInfo = getBoilerplate(language);
  const lineCount = code.split('\n').length;
  const charCount = code.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800 border-b border-gray-700 px-4 py-3"
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Language Selection */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500"
            >
              <Code2 className="w-4 h-4 mr-2" />
              <span>{currentLanguageInfo?.name || language}</span>
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </Button>

            {/* Language Dropdown */}
            {showLanguageDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50"
              >
                <div className="py-1">
                  {supportedLanguages.map((lang) => {
                    const langInfo = getBoilerplate(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-600 transition-colors duration-150 ${
                          language === lang ? 'text-blue-400 bg-gray-600' : 'text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Code2 className="w-4 h-4" />
                          <span>{langInfo?.name || lang}</span>
                          {language === lang && (
                            <span className="ml-auto text-blue-400">✓</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Code Statistics */}
          <div className="flex items-center space-x-4 text-sm text-gray-300">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>{lineCount} lines</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>{charCount} characters</span>
            </span>
          </div>
        </div>

        {/* Right Section - Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Ready to Code</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
