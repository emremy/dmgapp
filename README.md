# 🎯 dmgapp

**The modern way to create macOS DMG installers**

> Zero dependencies. Zero compilation. Zero headaches.

Create beautiful, professional macOS DMG installers in seconds. Works everywhere Node.js works - including Apple Silicon.

## ✨ Why dmgapp?

### 🚀 **Just Works™**
```bash
npm install -g dmgapp
dmgapp config.json MyApp.dmg
```
That's it. No Xcode. No Python. No `node-gyp` errors. No compilation failures.

### 💎 **Production Ready**
- **Zero runtime dependencies** - Pure Node.js, nothing to break
- **Apple Silicon native** - M1/M2/M3 support out of the box
- **CI/CD friendly** - Works in GitHub Actions, GitLab CI, anywhere
- **Battle-tested** - Handles spaces in paths, hidden files, retina displays

### ⚡ **Lightning Fast**
No compilation step means instant installation and faster builds.

## 📦 Installation

```bash
# Global installation
npm install -g dmgapp

# Or as a dev dependency
npm install --save-dev dmgapp
```

**Requirements:** Node.js 18+ and macOS

## 🎨 Quick Start

### 1. Create `config.json`

```json
{
  "title": "My Awesome App",
  "icon": "icon.icns",
  "background": "background.png",
  "icon-size": 128,
  "window": {
    "size": { "width": 640, "height": 480 }
  },
  "contents": [
    { "x": 448, "y": 344, "type": "link", "path": "/Applications" },
    { "x": 192, "y": 344, "type": "file", "path": "MyApp.app" }
  ]
}
```

### 2. Generate your DMG

```bash
dmgapp config.json MyApp.dmg
```

### 3. Done! 🎉

Your professional DMG installer is ready at `MyApp.dmg`.

## 📖 Configuration

### Minimal Example

Just the essentials:

```json
{
  "title": "My App",
  "contents": [
    { "x": 448, "y": 344, "type": "link", "path": "/Applications" },
    { "x": 192, "y": 344, "type": "file", "path": "MyApp.app" }
  ]
}
```

### Full Example

All the bells and whistles:

```json
{
  "title": "My Application",
  "icon": "volume-icon.icns",
  "background": "background.png",
  "background-color": "#ffffff",
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
    "signing-identity": "Developer ID Application: My Company (ABC123)",
    "identifier": "com.mycompany.myapp"
  }
}
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `title` | string | ✅ | Volume name shown when mounted |
| `contents` | array | ✅ | Files and links to include |
| `icon` | string | | Volume icon (`.icns` file) |
| `background` | string | | Background image |
| `background-color` | string | | Background color (CSS format) |
| `icon-size` | number | | Icon size in pixels (default: 80) |
| `window` | object | | Window configuration |
| `format` | string | | DMG format (default: `UDZO`) |
| `filesystem` | string | | `HFS+` or `APFS` |
| `code-sign` | object | | Code signing options |

### Content Items

Each item in `contents`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `x` | number | ✅ | X position |
| `y` | number | ✅ | Y position |
| `type` | string | ✅ | `file`, `link`, or `position` |
| `path` | string | ✅ | Path to file or link target |
| `name` | string | | Custom display name |

**Content Types:**
- `file` - Copy a file or folder into the DMG
- `link` - Create a symlink (e.g., to `/Applications`)
- `position` - Position an existing file (for hidden files)

### DMG Formats

| Format | Description |
|--------|-------------|
| `UDZO` | zlib-compressed (recommended) |
| `UDBZ` | bzip2-compressed |
| `ULFO` | lzfse-compressed (macOS 10.11+) |
| `ULMO` | lzma-compressed (macOS 10.15+) |
| `UDRW` | Read/write (for development) |
| `UDRO` | Read-only |
| `UDCO` | ADC-compressed |

## 💻 Programmatic API

Use dmgapp in your build scripts:

```javascript
import { generateDMG } from 'dmgapp';

const generator = generateDMG({
  source: './config.json',
  target: './output.dmg'
});

generator.on('progress', (info) => {
  console.log(`[${info.current}/${info.total}] ${info.title}`);
});

generator.on('finish', () => {
  console.log('✅ DMG created successfully!');
});

generator.on('error', (err) => {
  console.error('❌ Error:', err);
});

await generator.generate();
```

### Inline Configuration

Skip the JSON file and configure directly:

```javascript
import { generateDMG } from 'dmgapp';

const generator = generateDMG({
  target: './output.dmg',
  basepath: process.cwd(),
  specification: {
    title: 'My App',
    contents: [
      { x: 448, y: 344, type: 'link', path: '/Applications' },
      { x: 192, y: 344, type: 'file', path: 'MyApp.app' }
    ]
  }
});

await generator.generate();
```

## 🖼️ Retina Backgrounds

dmgapp automatically creates retina-ready backgrounds:

```
background.png      ← Standard resolution
background@2x.png   ← Retina resolution (2x)
```

When both files exist, dmgapp combines them into a single `.tiff` file that macOS displays correctly on all screens.

**Pro tip:** Use the same filename with `@2x` before the extension.

## 🛠️ CLI Reference

```bash
dmgapp <config.json> <output.dmg> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `-V, --version` | Show version number |
| `-h, --help` | Show help message |
| `-q, --quiet` | Suppress progress output |
| `-v, --verbose` | Show detailed error messages |

### Examples

```bash
# Basic usage
dmgapp config.json MyApp.dmg

# Quiet mode (for CI/CD)
dmgapp config.json MyApp.dmg --quiet

# Debug mode
dmgapp config.json MyApp.dmg --verbose
```

## 🔄 Migration from node-appdmg

**Good news:** dmgapp is a drop-in replacement. Your existing configs work without changes.

```bash
# Before
appdmg config.json output.dmg

# After
dmgapp config.json output.dmg
```

### Why Switch?

| Feature | node-appdmg | dmgapp |
|---------|-------------|--------|
| Installation | ❌ Requires Xcode, Python | ✅ Just `npm install` |
| Apple Silicon | ❌ Broken | ✅ Full support |
| Node.js 20+ | ❌ Fails | ✅ Works perfectly |
| CI/CD setup | ❌ Complex | ✅ Zero config |
| Dependencies | ❌ Native C++ bindings | ✅ Zero runtime deps |

## 🤔 Troubleshooting

### "Resource busy" errors

**Problem:** DMG won't unmount.

**Solution:** Close any Finder windows showing the mounted volume. dmgapp automatically retries with exponential backoff.

### Code signing fails

**Problem:** `codesign` reports invalid identity.

**Solution:** List your signing identities:
```bash
security find-identity -v -p codesigning
```

Use the exact identity string from the output.

### Background not showing

**Problem:** DMG opens with white background.

**Solutions:**
- Use paths relative to the JSON file
- Supported formats: PNG, JPG, TIFF
- For retina: ensure `@2x` file exists in same directory

### Paths with spaces

**Problem:** App name contains spaces (e.g., "My App.app").

**Solution:** Just use the path normally - dmgapp handles spaces correctly:
```json
{ "path": "My App.app" }
```

## 🚀 CI/CD Integration

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
      
      - name: Install dmgapp
        run: npm install -g dmgapp
      
      - name: Build DMG
        run: dmgapp config.json MyApp.dmg --quiet
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: installer
          path: MyApp.dmg
```

### GitLab CI

```yaml
build-dmg:
  stage: package
  tags:
    - macos
  script:
    - npm install -g dmgapp
    - dmgapp config.json MyApp.dmg --quiet
  artifacts:
    paths:
      - MyApp.dmg
```

## 📊 Requirements

- **macOS** (darwin platform)
- **Node.js 18** or higher
- **No build tools required** ✨

## 🎯 Comparison

### vs node-appdmg

| Aspect | node-appdmg | dmgapp |
|--------|-------------|--------|
| **Dependencies** | Native C++ bindings | Zero runtime deps |
| **Installation** | Requires Xcode + Python | `npm install` |
| **Apple Silicon** | Broken | Full support |
| **Node.js 20+** | Fails | Works |
| **Code size** | ~800 lines JS | ~1,200 lines TS |
| **Type safety** | None | Full TypeScript |
| **Module system** | CommonJS | ESM |

### vs dmgbuild (Python)

| Aspect | dmgbuild | dmgapp |
|--------|----------|--------|
| **Language** | Python | JavaScript/TypeScript |
| **Runtime** | Python 3 | Node.js 18+ |
| **Dependencies** | Multiple Python packages | Zero runtime deps |
| **Installation** | `pip install` | `npm install` |
| **Config format** | Python script | JSON |

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built as a modern replacement for [node-appdmg](https://github.com/LinusU/node-appdmg) by Linus Unnebäck @LinusU.

---

**Made with ❤️ for the macOS developer community**

[Report an issue](https://github.com/emremy/dmgapp/issues) • [View source](https://github.com/emremy/dmgapp)
