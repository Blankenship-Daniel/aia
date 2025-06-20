/**
 * Profile Manager Service Implementation
 * SOLID SRP: Responsible only for profile management operations
 * SOLID OCP: Can be extended with new profile features without modification
 * SOLID LSP: Substitutable with other IProfileManager implementations
 * SOLID ISP: Implements only profile management interface methods
 * SOLID DIP: Depends on IMemoryPersistence abstraction for storage
 */

import { IProfileManager, Profile } from '../interfaces/IProfileManager';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import * as fs from 'fs-extra';
import * as path from 'path';

export class ProfileManager implements IProfileManager {
  private profiles: Map<string, Profile> = new Map();
  private activeProfile: string = 'default';
  private readonly STORAGE_KEY = 'profiles';

  constructor(private persistence: IMemoryPersistence) {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const memoryData = await this.persistence.loadMemory();
      if (memoryData.profiles) {
        this.profiles = new Map(memoryData.profiles || []);
        this.activeProfile = memoryData.activeProfile || 'default';
      }

      // Ensure default profile exists
      if (!this.profiles.has('default')) {
        this.create('default', {
          description: 'Default configuration profile',
        });
      }
    } catch (error) {
      // Initialize with default profile if loading fails
      this.create('default', {
        description: 'Default configuration profile',
      });
    }
  }

  private async save(): Promise<void> {
    try {
      const memoryData = await this.persistence.loadMemory();
      memoryData.profiles = Array.from(this.profiles.entries());
      memoryData.activeProfile = this.activeProfile;
      await this.persistence.saveMemory(memoryData);
    } catch (error) {
      // Create new memory data if loading fails
      const memoryData = {
        conversations: [],
        commands: [],
        preferences: {},
        workingDirectories: {},
        profiles: Array.from(this.profiles.entries()),
        activeProfile: this.activeProfile,
      } as any;
      await this.persistence.saveMemory(memoryData);
    }
  }

  create(name: string, config?: Partial<Profile>): Profile {
    if (this.profiles.has(name)) {
      throw new Error(`Profile '${name}' already exists`);
    }

    const profile: Profile = {
      name,
      created: new Date(),
      lastModified: new Date(),
      config: config?.config || {},
      description: config?.description,
      tags: config?.tags || [],
      ...config,
    };

    this.profiles.set(name, profile);
    this.save();
    return profile;
  }

  switch(name: string): void {
    if (!this.profiles.has(name)) {
      throw new Error(`Profile '${name}' not found`);
    }
    this.activeProfile = name;
    this.save();
  }

  list(): Profile[] {
    return Array.from(this.profiles.values()).sort((a, b) => {
      // Active profile first, then alphabetical
      if (a.name === this.activeProfile) return -1;
      if (b.name === this.activeProfile) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  getActive(): Profile {
    const profile = this.profiles.get(this.activeProfile);
    if (!profile) {
      // Fallback to default if active profile is missing
      this.activeProfile = 'default';
      return this.profiles.get('default') || this.create('default');
    }
    return profile;
  }

  delete(name: string): void {
    if (name === 'default') {
      throw new Error('Cannot delete default profile');
    }

    if (!this.profiles.has(name)) {
      throw new Error(`Profile '${name}' not found`);
    }

    this.profiles.delete(name);

    // Switch to default if we deleted the active profile
    if (this.activeProfile === name) {
      this.activeProfile = 'default';
    }

    this.save();
  }

  exists(name: string): boolean {
    return this.profiles.has(name);
  }

  async export(name: string, filePath: string): Promise<void> {
    const profile = this.profiles.get(name);
    if (!profile) {
      throw new Error(`Profile '${name}' not found`);
    }

    const exportData = {
      profile,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, exportData, { spaces: 2 });
  }

  async import(filePath: string): Promise<Profile> {
    try {
      const data = await fs.readJson(filePath);

      if (!data.profile || !data.profile.name) {
        throw new Error('Invalid profile file format');
      }

      const profile = data.profile as Profile;

      // Generate unique name if profile already exists
      let importName = profile.name;
      let counter = 1;
      while (this.profiles.has(importName)) {
        importName = `${profile.name}_${counter}`;
        counter++;
      }

      const importedProfile: Profile = {
        ...profile,
        name: importName,
        created: new Date(),
        lastModified: new Date(),
      };

      this.profiles.set(importName, importedProfile);
      this.save();

      return importedProfile;
    } catch (error) {
      throw new Error(
        `Failed to import profile: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Update an existing profile
   * @param name Profile name
   * @param updates Partial profile updates
   */
  update(name: string, updates: Partial<Profile>): Profile {
    const profile = this.profiles.get(name);
    if (!profile) {
      throw new Error(`Profile '${name}' not found`);
    }

    const updatedProfile: Profile = {
      ...profile,
      ...updates,
      name: profile.name, // Preserve original name
      created: profile.created, // Preserve creation date
      lastModified: new Date(),
      config: { ...profile.config, ...updates.config },
    };

    this.profiles.set(name, updatedProfile);
    this.save();
    return updatedProfile;
  }

  /**
   * Get profiles by tag
   * @param tag Tag to filter by
   * @returns Array of matching profiles
   */
  getByTag(tag: string): Profile[] {
    return Array.from(this.profiles.values()).filter((profile) =>
      profile.tags?.includes(tag)
    );
  }
}
