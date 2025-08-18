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
    typescript: {
        id: 'typescript',
        name: 'TypeScript',
        version: '5.x',
        extension: 'ts',
        dockerImage: 'node:18-alpine',
        compileCommand: 'npx tsc main.ts --outDir dist --target es2020',
        runCommand: 'node dist/main.js',
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
        dockerImage: 'openjdk:17-alpine',
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
        dockerImage: 'gcc:latest',
        compileCommand: 'g++ -std=c++17 -O2 -Wall -Wextra -o main main.cpp',
        runCommand: './main',
        timeout: 30000,
        memoryLimit: '256m',
        allowedPackages: ['iostream', 'vector', 'string', 'algorithm', 'map', 'set', 'queue', 'stack', 'deque', 'list', 'utility', 'cmath', 'cstdlib', 'cstring', 'ctime'],
        bannedImports: ['system', 'exec', 'fork', 'signal', 'unistd.h', 'sys/socket.h', 'netinet/in.h', 'arpa/inet.h', 'sys/stat.h', 'sys/types.h', 'dirent.h']
    },
    c: {
        id: 'c',
        name: 'C',
        version: '17',
        extension: 'c',
        dockerImage: 'gcc:latest',
        compileCommand: 'gcc -std=c17 -O2 -Wall -Wextra -o main main.c',
        runCommand: './main',
        timeout: 30000,
        memoryLimit: '256m',
        allowedPackages: ['stdio.h', 'stdlib.h', 'string.h', 'math.h', 'time.h', 'limits.h', 'float.h', 'stdint.h', 'stdbool.h', 'stddef.h'],
        bannedImports: ['system', 'exec', 'fork', 'signal', 'unistd.h', 'sys/socket.h', 'netinet/in.h', 'arpa/inet.h', 'sys/stat.h', 'sys/types.h', 'dirent.h']
    },
    go: {
        id: 'go',
        name: 'Go',
        version: '1.21',
        extension: 'go',
        dockerImage: 'golang:1.21-alpine',
        compileCommand: 'go build -o main main.go',
        runCommand: './main',
        timeout: 30000,
        memoryLimit: '256m',
        allowedPackages: ['fmt', 'math', 'strings', 'strconv', 'sort', 'time', 'regexp', 'encoding/json', 'crypto/rand', 'crypto/sha256', 'crypto/md5'],
        bannedImports: ['os', 'os/exec', 'net', 'net/http', 'net/url', 'syscall', 'unsafe', 'reflect', 'plugin', 'runtime', 'os/signal']
    },
    rust: {
        id: 'rust',
        name: 'Rust',
        version: '1.75',
        extension: 'rs',
        dockerImage: 'rust:1.75-alpine',
        compileCommand: 'rustc -O main.rs',
        runCommand: './main',
        timeout: 30000,
        memoryLimit: '256m',
        allowedPackages: ['std::collections', 'std::vec', 'std::string', 'std::io', 'std::fmt', 'std::cmp', 'std::iter', 'std::option', 'std::result'],
        bannedImports: ['std::process', 'std::net', 'std::fs', 'std::os', 'std::thread', 'std::sync', 'std::env', 'std::ffi', 'std::ptr']
    },
    php: {
        id: 'php',
        name: 'PHP',
        version: '8.2',
        extension: 'php',
        dockerImage: 'php:8.2-cli-alpine',
        runCommand: 'php main.php',
        timeout: 30000,
        memoryLimit: '256m',
        allowedPackages: ['json', 'array', 'string', 'math', 'date', 'preg', 'filter', 'hash', 'ctype', 'mb_string'],
        bannedImports: ['exec', 'system', 'shell_exec', 'passthru', 'proc_open', 'popen', 'curl', 'file_get_contents', 'fopen', 'fwrite', 'file', 'glob', 'opendir', 'readdir', 'scandir', 'socket', 'fsockopen', 'gethostbyname', 'dns_get_record']
    },
    ruby: {
        id: 'ruby',
        name: 'Ruby',
        version: '3.2',
        extension: 'rb',
        dockerImage: 'ruby:3.2-alpine',
        runCommand: 'ruby main.rb',
        timeout: 30000,
        memoryLimit: '256m',
        allowedPackages: ['json', 'date', 'time', 'math', 'set', 'uri', 'base64', 'digest', 'securerandom'],
        bannedImports: ['system', 'exec', 'spawn', 'fork', 'open', 'popen', 'socket', 'net', 'open-uri', 'net/http', 'net/https', 'fileutils', 'pathname', 'tmpdir', 'tempfile', 'etc', 'process', 'thread', 'fiber', 'drb', 'rinda', 'xmlrpc']
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
        typescript: `console.log("Hello, World!");`,
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
}`,
        c: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
        go: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
        rust: `fn main() {
    println!("Hello, World!");
}`,
        php: `<?php
echo "Hello, World!";
?>`,
        ruby: `puts "Hello, World!"`
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