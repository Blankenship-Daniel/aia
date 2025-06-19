const chokidar = require('chokidar');

class IndexWatcher {
  indexService: any;
  watcher: null;
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
    await this.indexService.indexFile(filePath);
    console.log(`📝 Indexed new file: ${filePath}`);
  }

  async handleFileChanged(filePath) {
    await this.indexService.reindexFile(filePath);
    console.log(`🔄 Reindexed changed file: ${filePath}`);
  }

  async handleFileRemoved(filePath) {
    await this.indexService.removeFromIndex(filePath);
    console.log(`🗑️  Removed from index: ${filePath}`);
  }
}

module.exports = IndexWatcher;
