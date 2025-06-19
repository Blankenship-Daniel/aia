const chokidar = require('chokidar');

class IndexWatcher {
  constructor(indexService) {
    this.indexService = indexService;
    this.watcher = null;
  }

  watch(directory) {
    this.watcher = chokidar.watch(directory, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    if (this.watcher) {
      this.watcher
        .on('add', (path) => this.handleFileAdded(path))
        .on('change', (path) => this.handleFileChanged(path))
        .on('unlink', (path) => this.handleFileRemoved(path));
    }
  }

  async handleFileAdded(filePath) {
    try {
      await this.indexService.indexFile(filePath);
      console.log(`📝 Indexed new file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to index new file ${filePath}:`, error.message);
    }
  }

  async handleFileChanged(filePath) {
    try {
      await this.indexService.reindexFile(filePath);
      console.log(`🔄 Reindexed changed file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to reindex file ${filePath}:`, error.message);
    }
  }

  async handleFileRemoved(filePath) {
    try {
      await this.indexService.removeFromIndex(filePath);
      console.log(`🗑️  Removed from index: ${filePath}`);
    } catch (error) {
      console.error(
        `Failed to remove file ${filePath} from index:`,
        error.message
      );
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

module.exports = IndexWatcher;
