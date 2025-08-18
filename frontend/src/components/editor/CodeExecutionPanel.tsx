'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Download, 
  Copy, 
  Terminal,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeExecutionPanelProps {
  isExecuting: boolean;
  output: string;
  error: string | null;
  executionTime: number | null;
  memoryUsed: number | null;
  onRunCode: () => void;
  onStopExecution: () => void;
  onClearOutput: () => void;
  onInputChange: (input: string) => void;
  input: string;
  language: string;
}

export function CodeExecutionPanel({
  isExecuting,
  output,
  error,
  executionTime,
  memoryUsed,
  onRunCode,
  onStopExecution,
  onClearOutput,
  onInputChange,
  input,
  language
}: CodeExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'debug'>('output');

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-${language}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = () => {
    if (isExecuting) return <Clock className="w-4 h-4 text-blue-500" />;
    if (error) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (output) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <Terminal className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (isExecuting) return 'Executing...';
    if (error) return 'Error occurred';
    if (output) return 'Execution completed';
    return 'Ready to run';
  };

  const getStatusColor = () => {
    if (isExecuting) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    if (error) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    if (output) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Terminal className="w-5 h-5" />
            <span>Code Execution</span>
          </CardTitle>
          
          {/* Status Badge */}
          <div className={`${getStatusColor()} flex items-center space-x-2`}>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-3">
          {[
            { id: 'output', label: 'Output', icon: Terminal },
            { id: 'input', label: 'Input', icon: Input },
            { id: 'debug', label: 'Debug', icon: AlertCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'output' | 'input' | 'debug')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={onRunCode}
            disabled={isExecuting}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
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

          {isExecuting && (
            <Button
              onClick={onStopExecution}
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}

          <Button
            onClick={onClearOutput}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear</span>
          </Button>

          {output && (
            <>
              <Button
                onClick={copyOutput}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </Button>

              <Button
                onClick={downloadOutput}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </Button>
            </>
          )}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'output' && (
            <motion.div
              key="output"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Execution Stats */}
              {(executionTime !== null || memoryUsed !== null) && (
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  {executionTime !== null && (
                    <span className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{executionTime}ms</span>
                    </span>
                  )}
                  {memoryUsed !== null && (
                    <span className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span>{memoryUsed}MB</span>
                    </span>
                  )}
                </div>
              )}

              {/* Output Display */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 min-h-[200px] max-h-[400px] overflow-y-auto">
                {isExecuting ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span>Executing code...</span>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-red-600 font-mono text-sm whitespace-pre-wrap">
                    {error}
                  </div>
                ) : output ? (
                  <div className="font-mono text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {output}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center h-full flex items-center justify-center">
                    <div className="text-center">
                      <Terminal className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>Output will appear here after running your code</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Input (stdin)
                </label>
                <textarea
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  placeholder="Enter input for your program..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This input will be passed to your program when you run it
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'debug' && (
            <motion.div
              key="debug"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Debug Information</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  Debug features coming soon! This will include breakpoints, variable inspection, and step-by-step execution.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
