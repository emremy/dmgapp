# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-01-XX

### Added
- Initial release
- Zero runtime dependencies - pure Node.js implementation
- Full Apple Silicon (M1/M2/M3) support
- ESM-first architecture with TypeScript
- CLI with beautiful progress indicators
- Programmatic API for build scripts
- Retina background support (automatic @2x handling)
- Code signing support
- Multiple DMG formats (UDZO, UDBZ, ULFO, ULMO, etc.)
- HFS+ and APFS filesystem support
- Window positioning and sizing
- Icon positioning for files and links
- Volume icon support
- Background color support
- Comprehensive test suite
- Full documentation with examples

### Fixed
- Issue #238: Paths with spaces in app names now work correctly
- Issue #230: Background folder is now properly hidden in DMG
- Issue #237: Hidden files no longer affect icon positions
- Issue #239: Apple Silicon bless command compatibility

### Changed
- Modern TypeScript codebase (vs legacy JavaScript)
- Native Node.js APIs instead of C++ bindings
- ESM modules instead of CommonJS

[1.0.0]: https://github.com/emremy/dmgapp/releases/tag/v1.0.0
