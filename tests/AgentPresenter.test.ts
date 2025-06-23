To generate comprehensive tests for the `AgentPresenter` class in the `AIA` project, we'll follow the specified guidelines. This will include testing the main methods, error handling, and mocking dependencies using Jest mocks. We'll also adhere to TypeScript best practices, including type assertions.

Here is an example of a Jest test suite for the `AgentPresenter` class:

```typescript
// jest test suite for AgentPresenter - jest tests written in typescript

import { AgentPresenter } from '../../src/services/AgentPresenter';
import {
  IResilienceServiceMock,
  IPerformanceMonitorMock,
  IAIServiceMock,
  ICodeHighlightServiceMock,
  ISpinnerServiceMock,
} from '../__mocks__';
import { ExecutionStep, AgenticExecution } from '../../src/types/index';
import { CircuitBreakerState } from '../../src/interfaces/IResilienceService';
import { jest } from '@jest/globals';

describe('AgentPresenter', () => {
  let agentPresenter: AgentPresenter;
  let resilienceServiceMock: jest.Mocked<IResilienceServiceMock>;
  let performanceMonitorMock: jest.Mocked<IPerformanceMonitorMock>;
  let aiServiceMock: jest.Mocked<IAIServiceMock>;
  let codeHighlightMock: jest.Mocked<ICodeHighlightServiceMock>;
  let spinnerServiceMock: jest.Mocked<ISpinnerServiceMock>;

  beforeEach(() => {
    resilienceServiceMock = new IResilienceServiceMock();
    performanceMonitorMock = new IPerformanceMonitorMock();
    aiServiceMock = new IAIServiceMock();
    codeHighlightMock = new ICodeHighlightServiceMock();
    spinnerServiceMock = new ISpinnerServiceMock();
    agentPresenter = new AgentPresenter(
      resilienceServiceMock,
      performanceMonitorMock,
      aiServiceMock,
      codeHighlightMock,
      spinnerServiceMock
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('showPlanningPhase', () => {
    it('should display planning phase for simple goal', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      agentPresenter.showPlanningPhase('Simple Goal');

      expect(consoleSpy).toHaveBeenNthCalledWith(1, expect.stringContaining('🤖 AIA Agent'));
      expect(consoleSpy).toHaveBeenNthCalledWith(2, expect.stringContaining('🎯 Simple Goal'));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, expect.stringContaining('Planning...'));

      consoleSpy.mockRestore();
    });

    it('should display complex task message for complex goals', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      agentPresenter.showPlanningPhase('This is a very complex debug and analyze task');

      expect(consoleSpy).toHaveBeenNthCalledWith(1, expect.stringContaining('🤖 AIA Agent'));
      expect(consoleSpy).toHaveBeenNthCalledWith(2, expect.stringContaining('🎯 This is a very complex debug and analyze task'));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, expect.stringContaining('Analyzing task and creating execution plan...'));

      consoleSpy.mockRestore();
    });
  });

  describe('updatePlanningProgress', () => {
    it('should display classification progress', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      agentPresenter.updatePlanningProgress('classification');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Classifying...'));

      consoleSpy.mockRestore();
    });

    it('should display ready phase completion', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      agentPresenter.updatePlanningProgress('ready');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Ready...'));

      consoleSpy.mockRestore();
    });
  });

  describe('displayExecutionPlan', () => {
    it('should display execution plan for complex