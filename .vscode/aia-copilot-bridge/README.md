# AIA Copilot Bridge - VSCode Extension

## 🎯 Overview

The AIA Copilot Bridge enhances GitHub Copilot with intelligent context from the AIA CLI, providing architecture-aware code suggestions and O(1) symbol lookup performance.

## ✨ Key Features

### 🚀 Performance

- **O(1) Symbol Lookup**: <5ms vs 50-200ms traditional file scanning
- **10-40x Faster**: Dependency analysis and symbol resolution
- **Smart Caching**: Efficient incremental updates

### 💰 Cost Management

- **Two-Tier System**: Free symbol updates + optional AI context updates
- **Safe Defaults**: AI updates disabled by default to prevent unexpected costs
- **Daily Limits**: Configurable protection against excessive API usage
- **User Prompts**: Clear warnings before expensive operations

### 🧠 Intelligent Updates

- **Smart Strategy**: Only triggers AI updates for architectural changes
- **File Filtering**: Ignores test files, builds, and non-significant changes
- **Content Analysis**: Detects real changes vs formatting/whitespace
- **Debounced Operations**: Batches changes to reduce API calls

## 🔧 Installation

1. Open VSCode in your AIA workspace
2. Press `F1` → "Developer: Install Extension from Location"
3. Select `.vscode/aia-copilot-bridge/` folder
4. Extension automatically integrates with existing AIA CLI

## 💡 Usage

### Quick Start (Cost-Safe)

```bash
# Enable basic symbol updates (FREE)
AIA: Update Symbol Index Only (Fast)

# Manual AI context update when needed (USES API CREDITS)
AIA: Update AI Context Only (Expensive)
```

### Auto-Update Configuration

```bash
# Configure update strategy
AIA: Configure Update Strategy

# View current settings
AIA: Show Update Settings
```

## ⚙️ Configuration

### Recommended Settings (Cost-Conscious)

```json
{
  "aia.symbolIndex.autoUpdate": true,
  "aia.symbolIndex.enableAIUpdates": false,
  "aia.symbolIndex.aiUpdateStrategy": "manual",
  "aia.symbolIndex.promptBeforeExpensiveUpdates": true,
  "aia.symbolIndex.maxDailyAIUpdates": 10
}
```

### Key Settings Explained

| Setting                        | Default    | Purpose                                             |
| ------------------------------ | ---------- | --------------------------------------------------- |
| `enableAIUpdates`              | `false`    | Master switch for automatic AI operations           |
| `aiUpdateStrategy`             | `"manual"` | When to trigger AI updates: manual/smart/time-based |
| `promptBeforeExpensiveUpdates` | `true`     | Confirm before API operations                       |
| `maxDailyAIUpdates`            | `10`       | Daily limit for automatic AI updates                |
| `smartUpdateThreshold`         | `5`        | Files changed needed for smart triggers             |

## 📊 Update Strategies

### 1. Manual (Safest) 🔒

- **Cost**: Lowest
- **AI Updates**: Only when manually triggered
- **Best for**: Budget-conscious development, infrequent changes

### 2. Smart (Balanced) 🧠

- **Cost**: Medium
- **AI Updates**: Only on significant architectural changes
- **Best for**: Active development with cost awareness

### 3. Time-Based (Aggressive) ⏰

- **Cost**: Highest
- **AI Updates**: Periodic regardless of changes
- **Best for**: High-budget teams wanting maximum automation

## 🛡️ Cost Protection Features

### Built-in Safeguards

- ✅ **AI updates disabled by default**
- ✅ **User confirmation dialogs**
- ✅ **Daily usage limits**
- ✅ **Smart file filtering**
- ✅ **API call debouncing**
- ✅ **Usage monitoring & warnings**

### File Filtering (AI Updates)

```typescript
// Triggers AI updates:
service.ts, provider.ts, factory.ts, manager.ts,
engine.ts, command.ts, interface.ts, config.ts

// Ignored for AI updates:
*.test.ts, *.spec.ts, dist/, build/, node_modules/
```

## 📈 Performance Metrics

| Operation             | Before   | After     | Improvement       |
| --------------------- | -------- | --------- | ----------------- |
| Symbol Lookup         | 50-200ms | <5ms      | **10-40x faster** |
| Dependency Analysis   | 2-5s     | 50-200ms  | **10-25x faster** |
| AI Context Generation | 3-8s     | 200-500ms | **6-16x faster**  |

## 🔍 Monitoring

### Commands

- `AIA: Show Update Settings` - Current configuration
- `AIA: Show Performance Report` - Timing metrics
- `AIA: Reset Daily AI Update Counter` - Override limits

### Status Indicators

- Console logs show operation types and timing
- Daily usage counters in notifications
- Cost warnings at 80% of daily limit

## 🚀 Advanced Usage

### Workspace-Specific Settings

Add to `.vscode/settings.json`:

```json
{
  "aia.symbolIndex": {
    "enableAIUpdates": true,
    "aiUpdateStrategy": "smart",
    "smartUpdateThreshold": 3,
    "maxDailyAIUpdates": 20
  }
}
```

### Development Workflow

1. **Daily coding**: Use free symbol updates
2. **Before big features**: Trigger AI context update
3. **Architecture changes**: Let smart strategy handle it
4. **Cost monitoring**: Check daily usage in notifications

## 📚 Documentation

- **[Cost Optimization Guide](COST-OPTIMIZATION.md)** - Detailed cost management
- **[AIA CLI Integration](../../AIA-CLI-VSCODE-INTEGRATION-FINAL.md)** - Technical implementation
- **[VSCode Integration](../../VSCode-Integration-COMPLETE.md)** - Complete setup guide

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Test with cost monitoring enabled
4. Submit pull request with cost impact analysis

## 📄 License

This extension is part of the AIA CLI project and follows the same license terms.

---

**💡 Pro Tip**: Start with manual strategy and free symbol updates. Enable AI updates strategically when you need richer architectural context for complex features.
