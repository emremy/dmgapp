# Quick Start Guide

## Installation

```bash
# Install globally
npm install -g dmgapp

# Or as a dev dependency
npm install --save-dev dmgapp
```

## Basic Usage

### 1. Create a configuration file

Create `app.json`:

```json
{
  "title": "My App",
  "contents": [
    { "x": 448, "y": 344, "type": "link", "path": "/Applications" },
    { "x": 192, "y": 344, "type": "file", "path": "MyApp.app" }
  ]
}
```

### 2. Generate the DMG

```bash
dmgapp app.json MyApp.dmg
```

## Advanced Configuration

```json
{
  "title": "My Application",
  "icon": "volume-icon.icns",
  "background": "background.png",
  "icon-size": 128,
  "window": {
    "position": { "x": 100, "y": 100 },
    "size": { "width": 640, "height": 480 }
  },
  "format": "UDZO",
  "filesystem": "HFS+",
  "contents": [
    { "x": 448, "y": 344, "type": "link", "path": "/Applications" },
    { "x": 192, "y": 344, "type": "file", "path": "MyApp.app" }
  ],
  "code-sign": {
    "signing-identity": "Developer ID Application: Company (ABC123)"
  }
}
```

## Retina Backgrounds

Add a `@2x` version alongside your background:

```
background.png      (normal)
background@2x.png   (retina)
```

The tool automatically detects and combines them.

## Programmatic API

```typescript
import { generateDMG } from 'dmgapp';

// From config file
const generator = generateDMG({
  source: './config.json',
  target: './output.dmg'
});

// Or with direct specification
const generator = generateDMG({
  target: './output.dmg',
  basepath: __dirname,
  specification: {
    title: 'My App',
    contents: [
      { x: 448, y: 344, type: 'link', path: '/Applications' },
      { x: 192, y: 344, type: 'file', path: 'MyApp.app' }
    ]
  }
});

// Listen to progress
generator.on('progress', (info) => {
  console.log(`[${info.current}/${info.total}] ${info.title}`);
});

generator.on('finish', () => {
  console.log('Done!');
});

// Generate
await generator.generate();
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build DMG
on: [push]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build DMG
        run: npx dmgapp config.json output.dmg
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: dmg
          path: output.dmg
```

## Migration from node-appdmg

Your existing configuration files work without changes:

```bash
# Old
appdmg config.json output.dmg

# New
dmgapp config.json output.dmg
```

### Key Differences

- **No build step**: `npm install` just works
- **Node 18+**: Requires modern Node.js
- **ESM only**: Use `import` not `require`

## Troubleshooting

### "Resource busy" errors
The tool automatically retries. If it persists, close Finder windows on the mounted volume.

### Code signing fails
Verify your identity:
```bash
security find-identity -v -p codesigning
```

### Background not showing
- Use paths relative to the JSON file
- Supported: PNG, JPG, TIFF
- For retina: ensure `@2x` file exists

## CLI Options

```bash
dmgapp <json-path> <dmg-path> [options]

Options:
  -V, --version    Show version
  -q, --quiet      Suppress output
  -v, --verbose    Verbose errors
  -h, --help       Show help
```

## Requirements

- macOS only
- Node.js 18+
- No Xcode or build tools needed
