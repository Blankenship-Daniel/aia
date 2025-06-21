# AIA CLI Developer Reference

## AI-Only Architecture Developer Guide 🎯

**Status**: ✅ **AI-ONLY ARCHITECTURE IMPLEMENTED** for core systems
**Focus**: Service-Oriented TypeScript CLI with SOLID principles and Dependency Injection

## Quick Setup

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test            # Run comprehensive test suite (30 files)
npm start           # Start CLI application
node main.js --help  # Show available commands
```

## AI-Only Implementation Guide

### ✅ Reference Implementations (AI-Only)

#### 1. **AITaskClassifier** - Pure AI Classification

```typescript
// Example: AI-only task classification (no fallback)
async classifyTask(task: string, context: TaskContext): Promise<TaskClassification> {
  if (!this.aiService.isAvailable()) {
    throw new Error('AI service required for task classification');
  }

  const result = await this.aiService.generateResponse(/* AI prompt */);
  return this.validateAndReturnClassification(result);
}
```

#### 2. **AISecurityAnalyzer** - AI-First Security

```typescript
// Example: AI-first security validation with fallback
async validateCommand(command: string, context: SecurityContext): Promise<SecurityAnalysis> {
  try {
    return await this.performAIAnalysis(command, context);
  } catch (error) {
    console.warn('AI unavailable, using regex fallback');
    return this.performRegexAnalysis(command);
  }
}
```

### 🛠️ Development Targets for AI Enhancement

#### High Priority: Pattern-Based Components

1. **ModelSelector.ts** (202 lines)

```typescript
// Current: Pattern-based model selection
this.queryPatterns = {
  coding: /\b(code|programming|debug)\b/i,
  analysis: /\b(analyze|research|explain)\b/i,
};

// AI Enhancement Target: Replace with AI-powered intent understanding
async selectOptimalModel(query: string, context: ModelContext): Promise<AIModel> {
  const analysis = await this.aiService.analyzeIntent(query, context);
  return this.selectBasedOnAIAnalysis(analysis);
}
```

2. **ConversationContextManager.ts** (754 lines)

```typescript
// Current: Regex-based pronoun resolution
const itPattern = /\bit\b/gi;
const matches = input.match(itPattern);

// AI Enhancement Target: AI-powered coreference resolution
async resolveReferences(input: string, history: ConversationExchange[]): Promise<string> {
  return await this.aiService.resolveCoreferences(input, history);
}
```

## Important Files for Development

### Core AI Services

- **src/services/AIService.ts**: Central AI integration service
- **src/services/AITaskClassifier.ts**: ✅ AI-only task classification
- **src/services/AISecurityAnalyzer.ts**: ✅ AI-first security validation
- **src/services/EnhancedTaskComplexityAnalyzer.ts**: ✅ AI-only complexity analysis

### Service Infrastructure

- **src/container/DIContainer.ts**: Dependency injection container
- **src/container/ServiceFactory.ts**: Service registration and creation
- **src/interfaces/**: 22+ TypeScript interfaces (SOLID ISP compliance)

### Configuration & Entry Points

- **main.js**: Application entry point
- **src/cli/CLIApplication.ts**: Command-line interface handler
- **src/AgenticReasoningEngine.ts**: Core AI reasoning system
- **.aia/config.json**: Runtime configuration

### Memory & Context

- **src/services/MemoryService.ts**: Composite memory management
- **src/services/ContextService.ts**: Environment and project awareness
- **src/services/ConversationMemoryService.ts**: Conversation history

## Main Classes by Priority

### ✅ AI-Only Implementations

- **AITaskClassifier** (src/services/AITaskClassifier.ts)
- **EnhancedTaskComplexityAnalyzer** (src/services/EnhancedTaskComplexityAnalyzer.ts)
- **AgentExecutionEngine** (src/services/AgentExecutionEngine.ts)
- **AISecurityAnalyzer** (src/services/AISecurityAnalyzer.ts)

### 🔄 AI-Enhanced Hybrid

- **SecurityValidator** (src/SecurityValidator.ts) - AI-first with regex fallback
- **ErrorAnalysisService** (src/services/ErrorAnalysisService.ts) - Pattern + AI hybrid

### 🛠️ Prime AI Enhancement Targets

- **ModelSelector** (src/ModelSelector.ts) - 202 lines of pattern logic
- **ConversationContextManager** (src/ConversationContextManager.ts) - 754 lines
- **CommandIntelligence** (src/CommandIntelligence.ts) - 627 lines
- **NLPEngine** (src/NLPEngine.ts) - 580 lines

## Testing Strategy

**Test Coverage**: 30 comprehensive test files

### AI-Only Component Tests

```bash
# Test AI-only implementations
npm test -- --testNamePattern="ai-task-classification|ai-security-analyzer"

# Test integration scenarios
npm test -- --testNamePattern="integration"

# Test fallback scenarios
npm test -- --testNamePattern="fallback|unavailable"
```

### Key Test Files

- **tests/ai-task-classification-integration.test.ts**: AI classification tests
- **tests/ai-security-analyzer-integration.test.ts**: Security validation tests
- **tests/agent-execution-integration.test.ts**: Agent execution tests
- **tests/working-ai-classification.test.ts**: Working AI classification scenarios

## Development Patterns

### 1. **AI-Only Pattern** (Recommended for new features)

```typescript
async performAIOperation(input: string, context: Context): Promise<Result> {
  if (!this.aiService.isAvailable()) {
    throw new Error('AI service required for this operation');
  }

  const result = await this.aiService.generateResponse(prompt, context);
  return this.validateAIResponse(result);
}
```

### 2. **AI-First with Fallback Pattern** (For critical systems)

```typescript
async performOperationWithFallback(input: string): Promise<Result> {
  try {
    return await this.performAIOperation(input);
  } catch (error) {
    console.warn('AI unavailable, using fallback');
    return this.performFallbackOperation(input);
  }
}
```

### 3. **Service Registration Pattern**

```typescript
// In ServiceFactory.ts
container.register<IAIService>('aiService', () => new AIService(/* deps */));
container.register<INewService>(
  'newService',
  () => new NewService(container.resolve('aiService'))
);
```

## Adding New AI-Enhanced Services

### Step 1: Create Interface

```typescript
// src/interfaces/IMyAIService.ts
export interface IMyAIService {
  performAIAnalysis(input: string, context: Context): Promise<Analysis>;
}
```

### Step 2: Implement Service

```typescript
// src/services/MyAIService.ts
export class MyAIService implements IMyAIService {
  constructor(private aiService: IAIService) {}

  async performAIAnalysis(input: string, context: Context): Promise<Analysis> {
    // AI-only implementation
    if (!this.aiService.isAvailable()) {
      throw new Error('AI service required for analysis');
    }

    return await this.aiService.generateResponse(/* prompt */, context);
  }
}
```

### Step 3: Register in ServiceFactory

```typescript
// src/container/ServiceFactory.ts
container.register<IMyAIService>(
  'myAIService',
  () => new MyAIService(container.resolve('aiService'))
);
```

### Step 4: Add Tests

```typescript
// tests/my-ai-service.test.ts
describe('MyAIService', () => {
  it('should require AI service for analysis', async () => {
    const mockAI = { isAvailable: () => false };
    const service = new MyAIService(mockAI);

    await expect(service.performAIAnalysis('input', {})).rejects.toThrow(
      'AI service required'
    );
  });
});
```

## Debugging AI-Only Components

### 1. **Check AI Service Availability**

```typescript
if (!this.aiService.isAvailable()) {
  console.error('AI service not available - check configuration');
  console.log('Current config:', this.configService.getCurrentConfig());
}
```

### 2. **Validate AI Responses**

```typescript
private validateAIResponse(response: any): TaskClassification {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid AI response format');
  }

  return {
    taskType: this.validateTaskType(response.taskType),
    complexity: this.validateComplexity(response.complexity),
    // ... validation logic
  };
}
```

### 3. **Test with Mock AI Service**

```typescript
const mockAIService = {
  isAvailable: () => true,
  generateResponse: jest.fn().mockResolvedValue(mockResponse),
};
```

## Performance Considerations

### AI Request Optimization

- **Caching**: Implement result caching for repeated operations
- **Batching**: Combine multiple requests when possible
- **Timeouts**: Set appropriate timeouts for AI requests
- **Fallback**: Provide graceful degradation for critical paths

### Memory Management

- **Memory Services**: Use appropriate memory service for context
- **Context Limits**: Respect AI model context window limits
- **Cleanup**: Implement proper cleanup for long-running operations

## Architecture Benefits

### AI-Only Approach Benefits

- ✅ **Context Awareness**: Understanding vs. pattern matching
- ✅ **Adaptability**: Self-improving through AI feedback
- ✅ **Maintainability**: No regex pattern maintenance
- ✅ **User Experience**: Natural language understanding

### Hybrid Approach Benefits

- ✅ **Reliability**: Graceful degradation when AI unavailable
- ✅ **Performance**: Fast fallback for time-critical operations
- ✅ **Compatibility**: Maintains functionality in offline scenarios
- Check test files for usage examples
- Use existing error handling patterns
- Follow naming conventions from existing code
