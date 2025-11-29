Certainly! Here's a Jest test suite for the `TaskListPresenter` class, following your project's test patterns and requirements:

```typescript
import { TaskListPresenter } from '../../src/services/TaskListPresenter';
import { ExecutionStep } from '../../src/interfaces'; // Assuming interfaces are exported here
import { Listr } from 'listr2';
import { Observable } from 'rxjs';

// Mock utilities and external dependencies
jest.mock('listr2');
jest.mock('rxjs');

describe('TaskListPresenter', () => {
  let taskListPresenter: TaskListPresenter;
  let mockListrRun: jest.Mock;

  beforeEach(() => {
    taskListPresenter = new TaskListPresenter();
    mockListrRun = jest.fn();
    (Listr as jest.Mock).mockImplementation(() => ({
      run: mockListrRun,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithTaskList', () => {
    it('should execute tasks successfully when all steps succeed', async () => {
      const steps: ExecutionStep[] = [{ 
        description: 'Step 1', 
        execute: jest.fn().mockResolvedValue({ success: true, output: 'Output 1' })
      }];

      await expect(taskListPresenter.executeWithTaskList(steps)).resolves.toBeUndefined();

      expect(mockListrRun).toHaveBeenCalled();
      expect(Listr).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
        concurrent: false,
      }));
    });

    it('should handle error if a task fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const steps: ExecutionStep[] = [{ 
        description: 'Step 1', 
        execute: jest.fn().mockResolvedValue({ success: false, error: 'Task failed' })
      }];

      await expect(taskListPresenter.executeWithTaskList(steps)).resolves.toBeUndefined();

      expect(mockListrRun).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('A task failed.'));
      consoleErrorSpy.mockRestore();
    });

    it('should handle exceptions thrown during task execution', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const steps: ExecutionStep[] = [{ 
        description: 'Step 1', 
        execute: jest.fn().mockRejectedValue(new Error('Unexpected error'))
      }];

      await expect(taskListPresenter.executeWithTaskList(steps)).resolves.toBeUndefined();

      expect(mockListrRun).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('A task failed.'));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('createStepTask', () => {
    it('should create an observable that completes on success', (done) => {
      const step: ExecutionStep = {
        description: 'Test Step',
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      const mockTask = { title: '', output: '' };
      const resultObservable = taskListPresenter['createStepTask'](step, mockTask);

      resultObservable.subscribe({
        complete: () => {
          expect(mockTask.title).toContain('✓');
          done();
        },
      });

      expect(step.execute).toHaveBeenCalled();
    });

    it('should emit an error when execution fails', (done) => {
      const step: ExecutionStep = {
        description: 'Test Step',
        execute: jest.fn().mockResolvedValue({ success: false, error: 'Execution error' })
      };

      const mockTask = { title: '', output: '' };
      const resultObservable = taskListPresenter['create