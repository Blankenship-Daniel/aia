const {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} = require('@jest/globals');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { MemoryManager } = require('../dist/MemoryManager');

describe('MemoryManager', () => {
  let memoryManager;
  let testMemoryPath;

  beforeEach(async () => {
    // Create a temporary memory file for testing
    testMemoryPath = path.join(os.tmpdir(), `test-memory-${Date.now()}.json`);
    memoryManager = new MemoryManager(testMemoryPath);
  });

  afterEach(async () => {
    // Clean up test files
    if (await fs.pathExists(testMemoryPath)) {
      await fs.remove(testMemoryPath);
    }
  });

  describe('Memory Loading and Saving', () => {
    test('should initialize with default memory structure', async () => {
      const memory = await memoryManager.loadMemory();

      expect(memory).toHaveProperty('conversations');
      expect(memory).toHaveProperty('commands');
      expect(memory).toHaveProperty('preferences');
      expect(memory).toHaveProperty('workingDirectories');
      expect(memory).toHaveProperty('metadata');
      expect(memory.metadata).toHaveProperty('version', '2.0.0');
    });

    test('should save and load memory correctly', async () => {
      await memoryManager.loadMemory();

      // Add test data
      memoryManager.memory.conversations.push({
        query: 'test query',
        response: 'test response',
        timestamp: new Date().toISOString(),
        context: { workingDirectory: '/test' },
      });

      await memoryManager.saveMemory();

      // Create new instance and load
      const newMemoryManager = new MemoryManager(testMemoryPath);
      const loadedMemory = await newMemoryManager.loadMemory();

      expect(loadedMemory.conversations).toHaveLength(1);
      expect(loadedMemory.conversations[0].query).toBe('test query');
    });
  });

  describe('Semantic Search', () => {
    beforeEach(async () => {
      await memoryManager.loadMemory();

      // Add test conversations
      memoryManager.memory.conversations = [
        {
          query: 'how to debug nodejs code',
          response: 'You can use console.log, debugger, or VS Code debugger',
          timestamp: new Date().toISOString(),
          context: { workingDirectory: '/project' },
        },
        {
          query: 'git status command',
          response: 'Shows the status of your git repository',
          timestamp: new Date().toISOString(),
          context: { workingDirectory: '/project' },
        },
        {
          query: 'install packages npm',
          response: 'Use npm install to install packages',
          timestamp: new Date().toISOString(),
          context: { workingDirectory: '/project' },
        },
      ];

      memoryManager.memory.commands = [
        {
          command: 'git status',
          timestamp: new Date().toISOString(),
          workingDirectory: '/project',
        },
        {
          command: 'npm install',
          timestamp: new Date().toISOString(),
          workingDirectory: '/project',
        },
      ];

      await memoryManager.buildSemanticIndex();
    });

    test('should find relevant conversations', async () => {
      const results = await memoryManager.semanticSearch('debug nodejs');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('conversation');
      expect(results[0].content.query).toContain('debug nodejs');
    });

    test('should find relevant commands', async () => {
      const results = await memoryManager.semanticSearch('git');

      const gitResults = results.filter(
        (r) => r.type === 'command' && r.content.command.includes('git')
      );
      expect(gitResults).toHaveLength(1);
    });

    test('should return empty array for irrelevant searches', async () => {
      const results = await memoryManager.semanticSearch(
        'completely unrelated topic'
      );

      expect(results).toHaveLength(0);
    });

    test('should limit results correctly', async () => {
      const results = await memoryManager.semanticSearch('project', 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Memory Compression', () => {
    beforeEach(async () => {
      await memoryManager.loadMemory();

      // Add many conversations to trigger compression
      for (let i = 0; i < 1200; i++) {
        memoryManager.memory.conversations.push({
          query: `test query ${i}`,
          response: `test response ${i}`,
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
          context: { workingDirectory: '/test' },
        });
      }
    });

    test('should detect when compression is needed', () => {
      const needed = memoryManager.needsCompression();
      expect(needed).toBe(true);
    });

    test('should compress memory when needed', async () => {
      const originalCount = memoryManager.memory.conversations.length;
      expect(originalCount).toBeGreaterThan(1000);

      await memoryManager.compressMemory();

      const newCount = memoryManager.memory.conversations.length;
      expect(newCount).toBeLessThan(originalCount);
      expect(memoryManager.memory.metadata.compressionApplied).toBe(true);
    });
  });

  describe('Smart Cleanup', () => {
    beforeEach(async () => {
      await memoryManager.loadMemory();

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45); // 45 days ago

      // Add old, low-importance conversations
      memoryManager.memory.conversations = [
        {
          query: 'short query',
          response: 'short',
          timestamp: oldDate.toISOString(),
          context: { workingDirectory: '/test' },
        },
        {
          query: 'recent important code debugging question',
          response:
            'This is a long and detailed response about debugging that should be kept because it is valuable and contains important debugging information.',
          timestamp: new Date().toISOString(),
          context: { workingDirectory: '/test' },
        },
      ];
    });

    test('should remove old, low-importance conversations', async () => {
      const originalCount = memoryManager.memory.conversations.length;

      const result = await memoryManager.smartCleanup();

      expect(result.removed).toBeGreaterThan(0);
      expect(memoryManager.memory.conversations.length).toBeLessThan(
        originalCount
      );
    });

    test('should keep recent and important conversations', async () => {
      await memoryManager.smartCleanup();

      const remaining = memoryManager.memory.conversations;
      const recentImportant = remaining.find(
        (conv) => conv.query.includes('debugging') && conv.response.length > 100
      );

      expect(recentImportant).toBeDefined();
    });
  });

  describe('Memory Export', () => {
    let exportPath;

    beforeEach(async () => {
      await memoryManager.loadMemory();
      exportPath = path.join(os.tmpdir(), `test-export-${Date.now()}.json`);

      memoryManager.memory.conversations.push({
        query: 'export test',
        response: 'test export response',
        timestamp: new Date().toISOString(),
        context: { workingDirectory: '/test' },
      });
    });

    afterEach(async () => {
      if (await fs.pathExists(exportPath)) {
        await fs.remove(exportPath);
      }
    });

    test('should export memory to JSON', async () => {
      const result = await memoryManager.exportMemory(exportPath, 'json');

      expect(result.success).toBe(true);
      expect(await fs.pathExists(exportPath)).toBe(true);

      const exported = await fs.readJson(exportPath);
      expect(exported).toHaveProperty('conversations');
      expect(exported).toHaveProperty('exportMetadata');
      expect(exported.conversations).toHaveLength(1);
    });
  });

  describe('Context Linking', () => {
    beforeEach(async () => {
      await memoryManager.loadMemory();

      // Add conversations from different directories
      memoryManager.memory.conversations = [
        {
          query: 'first project query',
          response: 'response 1',
          timestamp: new Date().toISOString(),
          context: { workingDirectory: '/project1' },
        },
        {
          query: 'second project query',
          response: 'response 2',
          timestamp: new Date().toISOString(),
          context: { workingDirectory: '/project1' },
        },
        {
          query: 'different project',
          response: 'response 3',
          timestamp: new Date().toISOString(),
          context: { workingDirectory: '/project2' },
        },
      ];

      await memoryManager.linkContexts();
    });

    test('should link conversations by working directory', async () => {
      expect(memoryManager.contextLinks.has('/project1')).toBe(true);
      expect(memoryManager.contextLinks.has('/project2')).toBe(false); // Only one conversation

      const project1Links = memoryManager.contextLinks.get('/project1');
      expect(project1Links.conversations).toHaveLength(2);
    });

    test('should find common topics in linked contexts', async () => {
      const project1Links = memoryManager.contextLinks.get('/project1');
      expect(project1Links.commonTopics).toBeDefined();
      expect(Array.isArray(project1Links.commonTopics)).toBe(true);
    });
  });

  describe('Memory Statistics', () => {
    beforeEach(async () => {
      await memoryManager.loadMemory();

      memoryManager.memory.conversations.push({
        query: 'test',
        response: 'test',
        timestamp: new Date().toISOString(),
        context: { workingDirectory: '/test' },
      });

      await memoryManager.buildSemanticIndex();
    });

    test('should provide accurate memory statistics', () => {
      const stats = memoryManager.getMemoryStats();

      expect(stats).toHaveProperty('conversations');
      expect(stats).toHaveProperty('commands');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('semanticIndexSize');
      expect(stats).toHaveProperty('contextLinks');
      expect(stats).toHaveProperty('compressionNeeded');

      expect(stats.conversations).toBe(1);
      expect(stats.semanticIndexSize).toBeGreaterThan(0);
    });
  });
});
