Here's a comprehensive set of Jest tests for the `IProfileManager` interface, following the specified patterns and context guidelines. This example assumes the existence of mock utilities and reflects an interface-driven development approach.

```typescript
// tests/interfaces/IProfileManager.test.ts
import { IProfileManager, Profile } from '../../src/interfaces/IProfileManager';
import { mockProfileManager } from '../__mocks__/mockProfileManager';
import { mockProfile } from '../__mocks__/mockProfile';
import { jest } from '@jest/globals';

describe('IProfileManager Interface', () => {
  let profileManager: IProfileManager;

  beforeEach(() => {
    jest.clearAllMocks();
    profileManager = mockProfileManager();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('create method', () => {
    it('should create a profile successfully', () => {
      const newProfile: Profile = profileManager.create('testProfile');
      expect(newProfile).toMatchObject({
        name: 'testProfile',
        created: expect.any(Date),
        config: {},
      });
    });

    it('should throw an error if profile creation fails', () => {
      jest.spyOn(profileManager, 'create').mockImplementation(() => {
        throw new Error('Creation failed');
      });

      expect(() => profileManager.create('testProfile')).toThrow('Creation failed');
    });
  });

  describe('switch method', () => {
    it('should switch to the specified profile', () => {
      expect(() => profileManager.switch('testProfile')).not.toThrow();
    });

    it('should throw an error if the profile does not exist', () => {
      jest.spyOn(profileManager, 'switch').mockImplementation(() => {
        throw new Error('Profile not found');
      });

      expect(() => profileManager.switch('nonExistentProfile')).toThrow('Profile not found');
    });
  });

  describe('list method', () => {
    it('should return a list of all profiles', () => {
      const profiles = profileManager.list();
      expect(profiles).toBeInstanceOf(Array);
      expect(profiles).toEqual(expect.arrayContaining([mockProfile]));
    });
  });

  describe('getActive method', () => {
    it('should return the currently active profile', () => {
      const activeProfile: Profile = profileManager.getActive();
      expect(activeProfile).toBeDefined();
      expect(activeProfile.name).toBeDefined();
    });
  });

  describe('delete method', () => {
    it('should delete the specified profile', () => {
      expect(() => profileManager.delete('testProfile')).not.toThrow();
    });

    it('should throw an error if the profile does not exist', () => {
      jest.spyOn(profileManager, 'delete').mockImplementation(() => {
        throw new Error('Profile not found');
      });

      expect(() => profileManager.delete('nonExistentProfile')).toThrow('Profile not found');
    });
  });

  describe('exists method', () => {
    it('should return true if the profile exists', () => {
      const exists = profileManager.exists('testProfile');
      expect(exists).toBe(true);
    });

    it('should return false if the profile does not exist', () => {
      jest.spyOn(profileManager, 'exists').mockReturnValue(false);

      const exists = profileManager.exists('nonExistentProfile');
      expect(exists).toBe(false);
    });
  });

  describe('export method', () => {
    it('should export the profile to a file successfully', async () => {
      await expect(profileManager.export('testProfile', '/path/to/file')).resolves.not.toThrow();
    });

    it('should throw an error if export fails', async () => {
      jest.spyOn(profileManager, 'export').mockRejectedValue(new Error('Export