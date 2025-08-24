'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Copy, 
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  FileText,
  Terminal,
  Bug,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { codeExecutionService, CodeExecutionResult, ExecutionStatus } from '@/lib/codeExecution';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';

interface EnhancedCodeExecutionPanelProps {
  code: string;
  language: string;
  roomId: string;
  onExecutionStart?: () => void;
  onExecutionComplete?: (result: CodeExecutionResult) => void;
}

export function EnhancedCodeExecutionPanel({
  code,
  language,
  roomId,
  onExecutionStart,
  onExecutionComplete
}: EnhancedCodeExecutionPanelProps) {
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'debug' | 'history'>('output');
  const [executionHistory, setExecutionHistory] = useState<CodeExecutionResult[]>([]);
  const [showInput, setShowInput] = useState(false);

  const tabs = [
    { id: 'output', label: 'Output', icon: Terminal },
    { id: 'input', label: 'Input', icon: FileText },
    { id: 'debug', label: 'Debug', icon: Bug },
    { id: 'history', label: 'History', icon: RotateCcw }
  ];

  // Check if language requires input
  const inputLanguages = new Set(['python', 'java', 'cpp']);
  const requiresInput = inputLanguages.has(language);

  const handleRunCode = useCallback(async () => {
    if (!user || !currentRoom || !code.trim()) {
      return;
    }

    setIsExecuting(true);
    setExecutionStatus({
      isExecuting: true,
      progress: 0,
      currentStep: 'Validating code...',
      estimatedTime: 5
    });

    onExecutionStart?.();

    try {
      // Validate code syntax first
      const validation = codeExecutionService.validateCodeSyntax(code, language);
      if (!validation.isValid) {
        const result: CodeExecutionResult = {
          success: false,
          error: validation.errors.join('\n'),
          status: 'compilation_error',
          timestamp: new Date(),
          language,
          codeSize: code.length
        };
        
        setExecutionResult(result);
        setExecutionHistory(prev => [result, ...prev.slice(0, 9)]);
        onExecutionComplete?.(result);
        return;
      }

      // Execute code
      const result = await codeExecutionService.executeCode({
        code,
        language,
        input: input.trim(),
        roomId,
        userId: user.id
      });

      setExecutionResult(result);
      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]);
      onExecutionComplete?.(result);

      // Update status during execution
      if (result.status === 'success') {
        setExecutionStatus({
          isExecuting: false,
          progress: 100,
          currentStep: 'Execution completed successfully',
          estimatedTime: 0
        });
      } else {
        setExecutionStatus({
          isExecuting: false,
          progress: 100,
          currentStep: `Execution failed: ${result.status}`,
          estimatedTime: 0
        });
      }

    } catch (error) {
      const result: CodeExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        status: 'system_error',
        timestamp: new Date(),
        language,
        codeSize: code.length
      };
      
      setExecutionResult(result);
      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]);
      onExecutionComplete?.(result);
    } finally {
      setIsExecuting(false);
      setTimeout(() => setExecutionStatus(null), 3000);
    }
  }, [code, language, input, roomId, user, currentRoom, onExecutionStart, onExecutionComplete]);

  const handleStopExecution = useCallback(() => {
    if (currentRoom) {
      codeExecutionService.cancelRoomExecutions(currentRoom.id);
      setIsExecuting(false);
      setExecutionStatus(null);
    }
  }, [currentRoom]);

  const handleClearOutput = useCallback(() => {
    setExecutionResult(null);
    setExecutionHistory([]);
  }, []);

  const handleCopyOutput = useCallback(() => {
    if (executionResult?.output) {
      navigator.clipboard.writeText(executionResult.output);
    }
  }, [executionResult]);

  const handleDownloadOutput = useCallback(() => {
    if (executionResult?.output) {
      const blob = new Blob([executionResult.output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `output-${language}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [executionResult, language]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'compilation_error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'runtime_error':
        return <Bug className="w-4 h-4 text-orange-500" />;
      case 'timeout':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'memory_limit':
        return <HardDrive className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'compilation_error':
        return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'runtime_error':
        return 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'timeout':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'memory_limit':
        return 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Execution Successful';
      case 'compilation_error':
        return 'Compilation Error';
      case 'runtime_error':
        return 'Runtime Error';
      case 'timeout':
        return 'Execution Timeout';
      case 'memory_limit':
        return 'Memory Limit Exceeded';
      default:
        return 'System Error';
    }
  };

  const formatExecutionTime = (time: number) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatMemoryUsage = (memory: number) => {
    if (memory < 1024) return `${memory} KB`;
    return `${(memory / 1024).toFixed(2)} MB`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5" />
            <span>Code Execution</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRunCode}
              disabled={isExecuting || !code.trim()}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-3 h-12 text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
            >
              {isExecuting ? (
                <Loader2 className="w-5 h-5 animate-spin mr-3" />
              ) : (
                <Play className="w-5 h-5 mr-3" />
              )}
              {isExecuting ? 'Running...' : '▶ Run Code'}
            </Button>
            {isExecuting && (
              <Button
                onClick={handleStopExecution}
                variant="outline"
                size="lg"
                className="text-red-600 border-red-200 hover:bg-red-50 h-12 px-6"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Execution Status */}
        <AnimatePresence>
          {executionStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    {executionStatus.currentStep}
                  </span>
                </div>
                {executionStatus.estimatedTime && executionStatus.estimatedTime > 0 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    ~{executionStatus.estimatedTime}s
                  </span>
                )}
              </div>
              {executionStatus.progress !== undefined && (
                <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${executionStatus.progress}%` }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Section */}
        {requiresInput && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Input (stdin)
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInput(!showInput)}
                className="h-6 px-2 text-xs"
              >
                {showInput ? 'Hide' : 'Show'} Input
              </Button>
            </div>
            {showInput && (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input for your program..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none"
                rows={3}
              />
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'output' | 'input' | 'debug' | 'history')}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {/* Output Tab */}
          {activeTab === 'output' && (
            <div className="h-full flex flex-col">
              {executionResult ? (
                <>
                  {/* Status Bar */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(executionResult.status)}
                      <span className={`text-sm font-medium px-2 py-1 rounded border ${getStatusColor(executionResult.status)}`}>
                        {getStatusText(executionResult.status)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      {executionResult.executionTime && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatExecutionTime(executionResult.executionTime)}</span>
                        </span>
                      )}
                      {executionResult.memoryUsed && (
                        <span className="flex items-center space-x-1">
                          <HardDrive className="w-3 h-3" />
                          <span>{formatMemoryUsage(executionResult.memoryUsed)}</span>
                        </span>
                      )}
                      {executionResult.compilationTime && (
                        <span className="flex items-center space-x-1">
                          <Cpu className="w-3 h-3" />
                          <span>{formatExecutionTime(executionResult.compilationTime)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Output Content */}
                  <div className="flex-1 overflow-auto p-3 bg-gray-900 text-green-400 font-mono text-sm">
                    {executionResult.success ? (
                      <pre className="whitespace-pre-wrap">{executionResult.output}</pre>
                    ) : (
                      <pre className="whitespace-pre-wrap text-red-400">{executionResult.error}</pre>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handleClearOutput}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      {executionResult.output && (
                        <>
                          <Button
                            onClick={handleCopyOutput}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            onClick={handleDownloadOutput}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No output yet. Run your code to see results.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input Tab */}
          {activeTab === 'input' && (
            <div className="h-full p-3">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Standard Input (stdin)
                  </label>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter input that your program will read from stdin..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This input will be provided to your program when it runs.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Command Line Arguments
                  </label>
                  <Input
                    placeholder="arg1 arg2 arg3"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Space-separated command line arguments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Debug Tab */}
          {activeTab === 'debug' && (
            <div className="h-full p-3">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Code Analysis
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Code Size</span>
                      <span className="text-sm font-medium">{code.length} characters</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Language</span>
                      <span className="text-sm font-medium capitalize">{language}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Lines</span>
                      <span className="text-sm font-medium">{code.split('\n').length}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Execution Settings
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Timeout</span>
                      <span className="text-sm font-medium">10 seconds</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Memory Limit</span>
                      <span className="text-sm font-medium">256 MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="h-full p-3">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recent Executions
                </h4>
                {executionHistory.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {executionHistory.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          result.success
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                        }`}
                        onClick={() => setExecutionResult(result)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(result.status)}
                            <span className="text-sm font-medium">
                              {getStatusText(result.status)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {result.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {result.output ? result.output.substring(0, 100) + '...' : result.error?.substring(0, 100) + '...'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No execution history yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
