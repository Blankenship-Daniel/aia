Below is a comprehensive set of Jest tests for the `ContextService` class following the project requirements and patterns provided:

```typescript
import { ContextService } from '../src/services/ContextService';
import { IContextService, IConfigurationService } from '../src/interfaces';
import { ContextInfo } from '../src/types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

jest.mock('fs-extra');
jest.mock('path');
jest.mock('os');
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('ContextService', () => {
  let contextService: ContextService;
  let mockConfigService: jest.Mocked<IConfigurationService>;

  beforeEach(() => {
    mockConfigService = { /* mock configuration methods */ } as jest.Mocked<IConfigurationService>;
    contextService = new ContextService(mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should set initialized to true if not initialized', async () => {
      await contextService.initialize();
      expect((contextService as any).initialized).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      (contextService as any).initialized = true;
      await contextService.initialize();
      expect((contextService as any).initialized).toBe(true);
    });
  });

  describe('gatherContext', () => {
    it('should return cached context if available', async () => {
      const fakeContext: ContextInfo = {
        workingDirectory: '',
        platform: '',
        arch: '',
        nodeVersion: '',
        user: '',
        shell: '',
        timestamp: '',
        projectType: '',
        projectInfo: {},
        gitStatus: '',
        environmentScore: 0
      };
      const cacheKey = `context_${process.cwd()}_${Date.now()}`;
      (contextService as any).cache.set(cacheKey, fakeContext);

      const context = await contextService.gatherContext();

      expect(context).toEqual(fakeContext);
    });

    it('should gather context information on success', async () => {
      const expectedContext: ContextInfo = {
        workingDirectory: process.cwd(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        user: process.env.USER || 'unknown',
        shell: process.env.SHELL || 'unknown',
        timestamp: expect.any(String),
        projectType: 'node',
        projectInfo: { dependencies: {}, structure: {} },
        gitStatus: 'clean',
        environmentScore: 1.0
      };

      jest.spyOn(contextService, 'analyzeProject').mockResolvedValue({
        projectType: 'node',
        dependencies: {},
        structure: {},
        vulnerabilities: []
      });

      jest.spyOn(contextService, 'getGitStatus').mockResolvedValue({
        branch: 'main',
        status: 'clean',
        commits: 0,
        modified: [],
        staged: []
      });

      jest
        .spyOn(contextService, 'calculateEnvironmentScore')
        .mockReturnValue(1.0);

      const context = await contextService.gatherContext();

      expect(context.workingDirectory).toBe(expectedContext.workingDirectory);
      expect(context.projectType).toBe(expectedContext.projectType);
      expect(context.environmentScore).toBe(expectedContext.environmentScore);
    });

    it('should handle error from getGitStatus gracefully', async () => {
      jest.spyOn(contextService, 'analyzeProject').mockResolvedValue({
        projectType: 'node',
        dependencies: {},
        structure: {},
        vulnerabilities: []
      });

      jest
        .spyOn(contextService, 'getGitStatus')
        .mockRejectedValue(new Error('Git command