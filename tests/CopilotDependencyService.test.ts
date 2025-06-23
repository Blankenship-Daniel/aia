Below is a comprehensive Jest test suite for the `CopilotDependencyService` using the specified patterns and best practices. The test suite includes both successful and error handling scenarios, with mocks for external dependencies.

```typescript
import { CopilotDependencyService } from '../src/services/CopilotDependencyService';
import {
  ICopilotDependencyService,
  DependencyStatus,
} from '../src/interfaces/ICopilotDependencyService';
import { exec } from 'child_process';
import { platform } from 'os';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('os', () => ({
  platform: jest.fn(),
}));

describe('CopilotDependencyService', () => {
  let service: CopilotDependencyService;
  const execMock = exec as jest.Mock;
  const platformMock = platform as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CopilotDependencyService();
  });

  describe('checkDependencies', () => {
    it('should return success status when all dependencies are available', async () => {
      execMock.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('gh --version')) {
          callback(null, { stdout: 'gh version 1.0.0' });
        } else if (cmd.includes('gh extension list')) {
          callback(null, { stdout: 'github/gh-copilot' });
        } else if (cmd.includes('gh auth status')) {
          callback(null, { stdout: 'Logged in to github.com' });
        } else if (cmd.includes('gh copilot --help')) {
          callback(null, { stdout: 'copilot help' });
        }
      });

      const status: DependencyStatus = await service.checkDependencies();

      expect(status.gh).toBe(true);
      expect(status.copilot).toBe(true);
      expect(status.authenticated).toBe(true);
      expect(status.copilotAccess).toBe(true);
      expect(status.errors).toEqual([]);
      expect(status.message).toBe('All dependencies are available and configured');
    });

    it('should return error status when GitHub CLI is not installed', async () => {
      execMock.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('gh --version')) {
          callback(new Error('Command not found'), {});
        }
      });

      const status: DependencyStatus = await service.checkDependencies();

      expect(status.gh).toBe(false);
      expect(status.errors).toContain('GitHub CLI (gh) is not installed or not in PATH');
      expect(status.message).toBe('GitHub CLI is required but not found');
    });

    it('should handle errors gracefully and return an appropriate message', async () => {
      execMock.mockImplementation((cmd, options, callback) => {
        callback(new Error('mock error'), {});
      });

      const status: DependencyStatus = await service.checkDependencies();

      expect(status.errors).toContain(expect.stringContaining('Dependency check failed: mock error'));
      expect(status.message).toBe('Unable to verify dependencies');
    });
  });

  describe('getInstallInstructions', () => {
    it('should provide installation instructions for missing GitHub CLI on macOS', async () => {
      platformMock.mockReturnValue('darwin');
      const status: DependencyStatus = { gh: false, copilot: false, authenticated: false, copilotAccess: false, errors: [], instructions: [] };

      const instructions = await service.getInstallInstructions(status);

      expect(instructions).toContain('📦 Install GitHub CLI:');
      expect(instructions).toContain('brew install gh');
    });

    it('should provide different installation instructions based on platform', async () => {
      platformMock.mockReturnValue('linux');
      const status: DependencyStatus = { gh: false, copilot: false,