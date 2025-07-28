# Contributing to CodeMitra 🤝

Thank you for your interest in contributing to CodeMitra! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Code of Conduct](#code-of-conduct)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18+ installed
- **Docker** and Docker Compose installed
- **Git** installed
- **PostgreSQL** 15+ (or Docker)
- **Redis** 7+ (or Docker)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/yourusername/codemitra.git
   cd codemitra
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/original-owner/codemitra.git
   ```

## 🛠️ Development Setup

### 1. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

### 2. Start Development Environment

```bash
# Start all services with Docker
docker-compose -f docker-compose.dev.yml up -d

# Or start manually
npm run dev
```

### 3. Verify Setup

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432
- Redis: localhost:6379

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Follow strict TypeScript configuration
- Use proper type annotations
- Avoid `any` type - use proper interfaces

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User | null> => {
  // implementation
};

// ❌ Avoid
const getUser = async (id: any): Promise<any> => {
  // implementation
};
```

### React Components

- Use functional components with hooks
- Use TypeScript interfaces for props
- Follow naming conventions

```typescript
// ✅ Good
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
};
```

### File Naming

- Use PascalCase for components: `MonacoEditor.tsx`
- Use camelCase for utilities: `socketUtils.ts`
- Use kebab-case for CSS files: `global-styles.css`

### Import Organization

```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import { Editor } from '@monaco-editor/react';
import { useSocket } from '@/lib/socket';

// 3. Local imports
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

// 4. Type imports
import type { User } from '@/types';
```

### Comments and Documentation

- Use JSDoc for functions and classes
- Add inline comments for complex logic
- Document API endpoints

```typescript
/**
 * Executes code in a secure Docker container
 * @param code - The source code to execute
 * @param language - Programming language
 * @param input - Standard input (optional)
 * @returns Promise with execution results
 */
export const executeCode = async (
  code: string,
  language: string,
  input?: string
): Promise<ExecutionResult> => {
  // implementation
};
```

## 🧪 Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

### Writing Tests

```typescript
// Example test
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- Button.test.tsx

# Run tests with coverage
npm run test:coverage
```

### Test Coverage Requirements

- Minimum 80% code coverage
- 100% coverage for critical paths
- Test all error scenarios

## 🔄 Pull Request Process

### 1. Create a Feature Branch

```bash
git checkout -b feature/amazing-feature
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, well-documented code
- Add tests for new functionality
- Update documentation if needed
- Follow the code style guidelines

### 3. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add real-time cursor tracking

- Implement cursor position broadcasting
- Add visual cursor indicators
- Handle cursor synchronization across users
- Add tests for cursor functionality"
```

### 4. Push and Create PR

```bash
git push origin feature/amazing-feature
```

### 5. Pull Request Template

When creating a PR, use this template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No console errors
```

### 6. Code Review Process

- All PRs require at least one review
- Address review comments promptly
- Maintainers may request changes
- PRs are merged after approval

## 🐛 Issue Reporting

### Bug Reports

When reporting bugs, include:

1. **Clear description** of the issue
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Environment details**:
   - OS and version
   - Browser and version
   - Node.js version
   - Docker version

### Issue Template

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 12.0]
- Browser: [e.g., Chrome 96]
- Node.js: [e.g., 18.0.0]
- Docker: [e.g., 20.10.0]

## Additional Context
Screenshots, logs, etc.
```

## 💡 Feature Requests

### Feature Request Guidelines

1. **Check existing issues** first
2. **Describe the problem** you're solving
3. **Propose a solution** with details
4. **Consider implementation** complexity
5. **Provide use cases** and examples

### Feature Request Template

```markdown
## Problem Statement
Describe the problem you're trying to solve

## Proposed Solution
Describe your proposed solution

## Use Cases
- Use case 1
- Use case 2

## Implementation Details
Technical details if applicable

## Alternatives Considered
Other approaches you considered
```

## 📚 Documentation

### Documentation Guidelines

- Keep documentation up-to-date
- Use clear, concise language
- Include code examples
- Add diagrams when helpful
- Follow markdown best practices

### Documentation Structure

```
docs/
├── getting-started.md
├── api-reference.md
├── deployment.md
├── contributing.md
└── architecture.md
```

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Use welcoming and inclusive language
- Be collaborative and constructive
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Other conduct inappropriate in a professional setting

## 🏆 Recognition

### Contributors

Contributors will be recognized in:

- GitHub contributors list
- Project documentation
- Release notes
- Community acknowledgments

### Contribution Types

- **Code**: Bug fixes, features, improvements
- **Documentation**: Guides, tutorials, API docs
- **Testing**: Test cases, bug reports
- **Design**: UI/UX improvements, mockups
- **Community**: Support, mentoring, outreach

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and discussions
- **Discord**: For real-time chat (if available)
- **Email**: For private matters

### Resources

- [Project Documentation](https://docs.codemitra.com)
- [API Reference](https://api.codemitra.com/docs)
- [Community Guidelines](CODE_OF_CONDUCT.md)
- [Development Setup](README.md#development-setup)

---

Thank you for contributing to CodeMitra! Your contributions help make this project better for everyone. 🚀 