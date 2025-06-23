# AIA VSCode Extension - Cost Optimization Guide

## 🎯 Overview

The AIA VSCode extension provides intelligent context for GitHub Copilot by leveraging the AIA CLI. While **symbol index updates are free and fast**, **AI-powered context updates use API credits** and should be managed carefully.

## 💰 Cost Management Features

### 🔒 Safe Defaults

- **AI Updates**: Disabled by default (`enableAIUpdates: false`)
- **Update Strategy**: Manual only (`aiUpdateStrategy: "manual"`)
- **Daily Limit**: 10 AI updates maximum (`maxDailyAIUpdates: 10`)
- **User Prompts**: Enabled before expensive operations (`promptBeforeExpensiveUpdates: true`)

### 📊 Two-Tier Update System

| Type                   | Speed  | Cost      | Frequency          | Purpose                    |
| ---------------------- | ------ | --------- | ------------------ | -------------------------- |
| **Symbol Updates**     | <2s    | FREE      | High (2s debounce) | Fast code completion       |
| **AI Context Updates** | 30-60s | EXPENSIVE | Low (60s debounce) | Rich architectural context |

### 🧠 Update Strategies

#### 1. Manual (Recommended for Cost Control)

```json
{
  "aia.symbolIndex.aiUpdateStrategy": "manual",
  "aia.symbolIndex.enableAIUpdates": false
}
```

- **Cost**: Lowest - only when you choose
- **Control**: Complete - trigger via commands only
- **Best for**: Budget-conscious developers, infrequent changes

#### 2. Smart (Balanced)

```json
{
  "aia.symbolIndex.aiUpdateStrategy": "smart",
  "aia.symbolIndex.enableAIUpdates": true,
  "aia.symbolIndex.smartUpdateThreshold": 5
}
```

- **Cost**: Medium - only on significant architectural changes
- **Control**: Automated but selective
- **Best for**: Active development with cost awareness

#### 3. Time-Based (Highest Cost)

```json
{
  "aia.symbolIndex.aiUpdateStrategy": "time-based",
  "aia.symbolIndex.enableAIUpdates": true
}
```

- **Cost**: Highest - regular automatic updates
- **Control**: Scheduled updates regardless of changes
- **Best for**: High-budget teams wanting maximum automation

## 🛡️ Protection Features

### Daily Limits

- **Default**: 10 AI updates per day
- **Auto-reset**: Midnight each day
- **Warning**: Alert at 80% of limit
- **Override**: Manual commands still work after limit

### User Confirmation

- **Prompt before expensive operations** (configurable)
- **Clear cost warnings** in dialog boxes
- **API credit usage notifications**

### Smart File Filtering

AI updates only trigger for architecturally significant files:

```typescript
// These patterns trigger AI updates:
- **/service.ts, **/provider.ts, **/factory.ts
- **/manager.ts, **/engine.ts, **/command.ts
- **/interface.ts, **/type.ts, **/config.ts
- **/index.ts (main entry points)

// These patterns are ignored:
- **/*.test.ts, **/*.spec.ts
- **/dist/**, **/build/**, **/node_modules/**
- **/coverage/**, **/tests/**
```

## 🎛️ Configuration Options

### Essential Settings

```json
{
  // Cost Protection
  "aia.symbolIndex.enableAIUpdates": false,
  "aia.symbolIndex.maxDailyAIUpdates": 10,
  "aia.symbolIndex.promptBeforeExpensiveUpdates": true,

  // Update Strategy
  "aia.symbolIndex.aiUpdateStrategy": "manual",
  "aia.symbolIndex.smartUpdateThreshold": 5,

  // Timing
  "aia.symbolIndex.aiDebounceDelay": 60000,
  "aia.symbolIndex.minAIUpdateInterval": 600000
}
```

### Advanced Tuning

```json
{
  // More Conservative (Lower Costs)
  "aia.symbolIndex.aiDebounceDelay": 120000, // 2 minutes
  "aia.symbolIndex.minAIUpdateInterval": 1800000, // 30 minutes
  "aia.symbolIndex.smartUpdateThreshold": 10, // 10 files
  "aia.symbolIndex.maxDailyAIUpdates": 5, // 5 per day

  // More Aggressive (Higher Costs)
  "aia.symbolIndex.aiDebounceDelay": 30000, // 30 seconds
  "aia.symbolIndex.minAIUpdateInterval": 300000, // 5 minutes
  "aia.symbolIndex.smartUpdateThreshold": 2, // 2 files
  "aia.symbolIndex.maxDailyAIUpdates": 25 // 25 per day
}
```

## 🚀 Commands for Cost Management

### Manual Controls

- `AIA: Update Symbol Index Only (Fast)` - FREE operation
- `AIA: Update AI Context Only (Expensive)` - Uses API credits
- `AIA: Configure Update Strategy` - Quick setup wizard

### Monitoring

- `AIA: Show Update Settings` - View current configuration
- `AIA: Reset Daily AI Update Counter` - Override daily limit

### Toggles

- `AIA: Toggle AI Auto-Updates` - Enable/disable with warnings
- `AIA: Toggle Auto-Update` - Master on/off switch

## 📈 Best Practices

### For Cost-Conscious Development

1. **Start with manual strategy**
2. **Use symbol-only updates for daily work**
3. **Trigger AI updates before important coding sessions**
4. **Monitor daily usage via status notifications**

### For Active Development

1. **Use smart strategy with higher threshold (5-10 files)**
2. **Enable prompts for awareness**
3. **Set conservative daily limits (5-10 updates)**
4. **Review usage weekly**

### For High-Budget Teams

1. **Use smart or time-based strategies**
2. **Increase daily limits as needed**
3. **Disable prompts for smoother workflow**
4. **Monitor costs through API provider dashboards**

## 🔍 Monitoring Usage

### Status Bar Indicators

- **Symbol updates**: No cost indicator (always free)
- **AI updates**: Shows daily usage count and cost warnings

### Console Logging

```
✅ Local symbol update completed in 1.2s
🧠 AI context update (expensive operation)...
📊 Daily AI updates: 3/10
⚠️ Approaching daily AI update limit (8/10)
```

### Notifications

- **AI update completion** with timing and daily count
- **Daily limit warnings** at 80% usage
- **Cost protection alerts** when limits reached

## ⚙️ Quick Setup Wizard

Run `AIA: Configure Update Strategy` to quickly set up cost-appropriate settings:

1. **Low Cost** → Manual strategy, prompts enabled, low daily limit
2. **Balanced** → Smart strategy, moderate threshold, standard daily limit
3. **High Automation** → Time-based strategy, higher daily limit, minimal prompts

---

**💡 Remember**: Symbol updates are always free and provide great value. AI updates provide richer context but should be used judiciously based on your API budget and development patterns.
