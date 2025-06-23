Here are Jest test cases for the `PreferencesService` class as described, following your specifications. I've included tests for each method in the class, along with appropriate setup and teardown, and error-handling scenarios.

```typescript
import { PreferencesService } from '../src/services/PreferencesService';
import { IMemoryPersistence } from '../src/interfaces/IMemoryPersistence';
import { mocked } from '../tests/__mocks__/memory-persistence.mock';

jest.mock('../src/interfaces/IMemoryPersistence');

describe('PreferencesService', () => {
  let preferencesService: PreferencesService;
  let memoryPersistenceMock: jest.Mocked<IMemoryPersistence>;

  beforeEach(() => {
    memoryPersistenceMock = new (mocked('../src/interfaces/IMemoryPersistence'))();
    preferencesService = new PreferencesService(memoryPersistenceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreference', () => {
    it('should return preference value if it exists', async () => {
      memoryPersistenceMock.loadMemory.mockResolvedValue({ preferences: { theme: 'dark' } });
      
      const preference = await preferencesService.getPreference<string>('theme');
      expect(preference).toBe('dark');
    });

    it('should return default value if preference does not exist', async () => {
      memoryPersistenceMock.loadMemory.mockResolvedValue({ preferences: {} });
      
      const preference = await preferencesService.getPreference<string>('theme', 'light');
      expect(preference).toBe('light');
    });

    it('should throw error if preference does not exist and no default is provided', async () => {
      memoryPersistenceMock.loadMemory.mockResolvedValue({ preferences: {} });
      
      await expect(preferencesService.getPreference<string>('theme')).rejects.toThrow("Preference 'theme' not found and no default provided");
    });

    it('should return default value on error if default is provided', async () => {
      memoryPersistenceMock.loadMemory.mockRejectedValue(new Error('Load error'));
      
      const preference = await preferencesService.getPreference<string>('theme', 'light');
      expect(preference).toBe('light');
    });

    it('should throw error if loading fails and no default is provided', async () => {
      memoryPersistenceMock.loadMemory.mockRejectedValue(new Error('Load error'));
      
      await expect(preferencesService.getPreference<string>('theme')).rejects.toThrow("Failed to get preference 'theme': Error: Load error");
    });
  });

  describe('setPreference', () => {
    it('should set and save preference value', async () => {
      memoryPersistenceMock.loadMemory.mockResolvedValue({ preferences: {} });
      memoryPersistenceMock.saveMemory.mockResolvedValue();
      
      await preferencesService.setPreference<string>('theme', 'dark');
      
      expect(memoryPersistenceMock.saveMemory).toHaveBeenCalledWith({ preferences: { theme: 'dark' } });
    });

    it('should throw an error if saving fails', async () => {
      memoryPersistenceMock.loadMemory.mockResolvedValue({ preferences: {} });
      memoryPersistenceMock.saveMemory.mockRejectedValue(new Error('Save error'));
      
      await expect(preferencesService.setPreference<string>('theme', 'dark')).rejects.toThrow("Failed to set preference 'theme': Error: Save error");
    });
  });

  describe('getAllPreferences', () => {
    it('should return all preferences', async () => {
      memoryPersistenceMock.loadMemory.mockResolvedValue({ preferences: { theme: 'dark' } });
      
      const allPreferences = await preferencesService.getAllPreferences();
      
      expect(allPreferences).toEqual({ theme: 'dark' });
    });

    it('should throw an error if loading fails', async () => {
      memoryPersistenceMock.loadMemory.mockRejectedValue(new Error('Load error'));
      
      await expect(preferencesService.getAllPreferences()).rejects.toThrow("Failed to get all preferences: Error: