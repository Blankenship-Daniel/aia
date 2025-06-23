To generate comprehensive Jest tests for the `ProfileManager` class, we'll follow the patterns and context provided. The tests will model typical patterns like mocking, using setup/teardown, and addressing both success and error scenarios. Here is how we can implement it:

```typescript
import { ProfileManager } from '../src/services/ProfileManager';
import { IMemoryPersistence } from '../src/interfaces/IMemoryPersistence';
import { Profile } from '../src/interfaces/IProfileManager';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock utilities and dependencies
jest.mock('fs-extra');
jest.mock('../src/interfaces/IMemoryPersistence');

describe('ProfileManager Service', () => {
  let persistenceMock: jest.Mocked<IMemoryPersistence>;
  let profileManager: ProfileManager;

  beforeEach(async () => {
    persistenceMock = {
      loadMemory: jest.fn().mockResolvedValue({ profiles: [], activeProfile: 'default' }),
      saveMemory: jest.fn().mockResolvedValue(undefined),
    };
    profileManager = new ProfileManager(persistenceMock);
    await profileManager['load'](); // Ensure load is complete
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create method', () => {
    it('should create a new profile successfully', () => {
      const profile = profileManager.create('testProfile', { description: 'Test profile' });

      expect(profile).toMatchObject({ name: 'testProfile', description: 'Test profile' });
      expect(persistenceMock.saveMemory).toHaveBeenCalled();
      expect(profileManager.exists('testProfile')).toBe(true);
    });

    it('should throw an error when creating a profile that already exists', () => {
      profileManager.create('duplicateProfile');

      expect(() => {
        profileManager.create('duplicateProfile');
      }).toThrow('Profile \'duplicateProfile\' already exists');
    });
  });

  describe('switch method', () => {
    it('should switch the active profile', () => {
      profileManager.create('switchProfile');
      profileManager.switch('switchProfile');

      const activeProfile = profileManager.getActive();
      expect(activeProfile.name).toBe('switchProfile');
    });

    it('should throw an error when switching to a non-existent profile', () => {
      expect(() => {
        profileManager.switch('nonExistentProfile');
      }).toThrow('Profile \'nonExistentProfile\' not found');
    });
  });

  describe('delete method', () => {
    it('should delete a profile successfully', () => {
      profileManager.create('profileToDelete');
      profileManager.delete('profileToDelete');

      expect(profileManager.exists('profileToDelete')).toBe(false);
    });

    it('should throw an error when attempting to delete the default profile', () => {
      expect(() => {
        profileManager.delete('default');
      }).toThrow('Cannot delete default profile');
    });

    it('should throw an error when deleting a non-existent profile', () => {
      expect(() => {
        profileManager.delete('nonExistentProfile');
      }).toThrow('Profile \'nonExistentProfile\' not found');
    });
  });

  describe('export method', () => {
    it('should export a profile successfully', async () => {
      profileManager.create('exportProfile');
      await profileManager.export('exportProfile', '/path/to/export.json');

      expect(fs.ensureDir).toHaveBeenCalledWith(expect.any(String));
      expect(fs.writeJson).toHaveBeenCalledWith(
        '/path/to/export.json',
        expect.objectContaining({ profile: expect.any(Object) }),
        { spaces: 2 }
      );
    });

    it('should throw an error when exporting a non-existent profile', async () => {
      await expect(profileManager.export('nonExistentProfile', '/path/to/export.json'))
        .rejects
       