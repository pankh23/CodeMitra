"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractClassName = exports.getFileName = exports.getDefaultCode = exports.isLanguageSupported = exports.getSupportedLanguages = exports.getLanguageById = exports.SUPPORTED_LANGUAGES = void 0;
exports.SUPPORTED_LANGUAGES = {
    javascript: {
        id: 'javascript',
        name: 'JavaScript',
        version: '18.x',
        extension: 'js',
        dockerImage: 'node:18-alpine',
        runCommand: 'node main.js',
        timeout: 30000,
        memoryLimit: '256m',
        allowedPackages: ['fs', 'path', 'util', 'crypto', 'os'],
        bannedImports: ['child_process', 'cluster', 'dgram', 'dns', 'net', 'tls', 'http', 'https']
    },
    python: {
        id: 'python',
        name: 'Python',
        version: '3.11',
        extension: 'py',
        dockerImage: 'python:3.11-alpine',
        runCommand: 'python main.py',
        timeout: 30000,
        memoryLimit: '256m',
        allowedPackages: ['math', 'random', 'datetime', 'json', 'collections', 'itertools', 'functools', 'operator', 're'],
        bannedImports: ['os', 'sys', 'subprocess', 'socket', 'urllib', 'requests', 'http', 'ftplib', 'smtplib', 'telnetlib', 'eval', 'exec', 'compile', '__import__']
    },
    java: {
        id: 'java',
        name: 'Java',
        version: '17',
        extension: 'java',
        dockerImage: 'eclipse-temurin:17-jdk',
        compileCommand: 'javac Main.java',
        runCommand: 'java Main',
        timeout: 30000,
        memoryLimit: '512m',
        allowedPackages: ['java.util.*', 'java.lang.*', 'java.math.*', 'java.text.*'],
        bannedImports: ['java.io.*', 'java.net.*', 'java.nio.*', 'java.rmi.*', 'java.security.*', 'javax.net.*', 'java.lang.Runtime', 'java.lang.Process', 'java.lang.ProcessBuilder']
    },
    cpp: {
        id: 'cpp',
        name: 'C++',
        version: '17',
        extension: 'cpp',
        dockerImage: 'gcc:11-alpine',
        compileCommand: 'g++ -std=c++17 -O2 -Wall -Wextra -o main main.cpp',
        runCommand: './main',
        timeout: 45000,
        memoryLimit: '256m',
        allowedPackages: ['iostream', 'vector', 'string', 'algorithm', 'map', 'set', 'queue', 'stack', 'deque', 'list', 'utility', 'cmath', 'cstdlib', 'cstring', 'ctime'],
        bannedImports: ['system', 'exec', 'fork', 'signal', 'unistd.h', 'sys/socket.h', 'netinet/in.h', 'arpa/inet.h', 'sys/stat.h', 'sys/types.h', 'dirent.h']
    }
};
const getLanguageById = (id) => {
    return exports.SUPPORTED_LANGUAGES[id];
};
exports.getLanguageById = getLanguageById;
const getSupportedLanguages = () => {
    return Object.values(exports.SUPPORTED_LANGUAGES);
};
exports.getSupportedLanguages = getSupportedLanguages;
const isLanguageSupported = (id) => {
    return id in exports.SUPPORTED_LANGUAGES;
};
exports.isLanguageSupported = isLanguageSupported;
const getDefaultCode = (languageId) => {
    const defaultCodes = {
        javascript: `console.log("Hello, World!");`,
        python: `print("Hello, World!")`,
        java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
        cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`
    };
    return defaultCodes[languageId] || '';
};
exports.getDefaultCode = getDefaultCode;
const getFileName = (languageId, className) => {
    const language = (0, exports.getLanguageById)(languageId);
    if (!language) {
        throw new Error(`Unsupported language: ${languageId}`);
    }
    if (languageId === 'java') {
        return `${className || 'Main'}.${language.extension}`;
    }
    return `main.${language.extension}`;
};
exports.getFileName = getFileName;
const extractClassName = (code, languageId) => {
    if (languageId === 'java') {
        const match = code.match(/public\s+class\s+(\w+)/);
        return match ? match[1] : 'Main';
    }
    return undefined;
};
exports.extractClassName = extractClassName;
//# sourceMappingURL=index.js.map