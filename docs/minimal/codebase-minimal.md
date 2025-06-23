# AIA-CLI: Essential Project Guide

## Quick Overview
AIA-CLI is a large-scale TypeScript application for automated development assistance. It implements a service-oriented architecture with interface-driven design principles.

**Core Technologies:**
- TypeScript
- Node.js
- Service-Oriented Architecture

## Getting Started

### Requirements
- Node.js 14+
- TypeScript 4.x+

### Installation
```bash
npm install
npm run build
```

### Basic Usage
```bash
npm start
# or
node dist/main.js
```

## Project Structure
```
aia-cli/
├── src/           # Source code
├── tests/         # 56 test files
├── interfaces/    # 7 core interfaces
└── dist/          # Compiled output
```

## Core Components

### Key Services
- Main Application Service
- Interface Handlers (7 core interfaces)
- Component Services (146 classes)

### Primary Interfaces
The system is built around 7 core interfaces that define the contract between services.

## Development Essentials

### Adding Features
1. Implement relevant interface
2. Create service class
3. Add unit tests
4. Register with main service

### Testing
```bash
npm test
```
- 56 test files covering core functionality
- Unit tests required for new features

### Build Process
```bash
npm run build
```

## Common Tasks

### Development Operations
```bash
npm run dev     # Development mode
npm run lint    # Code linting
npm run test    # Run tests
```

### Performance Considerations
- Service initialization is lazy-loaded
- Interface implementations should be lightweight
- Follow established patterns for consistency

---
*Note: This is a minimal but complete guide. For detailed documentation, consult the full documentation set.*