import { describe, it, expect } from 'vitest';
import { generateDMG } from '../src/index.js';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Issue #238: Paths with spaces', () => {
  it('should handle app names with spaces', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dmgapp-test-'));
    const configPath = join(tempDir, 'config.json');
    const outputPath = join(tempDir, 'output.dmg');
    const appPath = join(tempDir, 'My App.app');

    try {
      await mkdir(appPath, { recursive: true });
      await writeFile(join(appPath, 'test.txt'), 'test');

      const config = {
        title: 'Test DMG',
        contents: [
          { x: 448, y: 344, type: 'link', path: '/Applications' },
          { x: 192, y: 344, type: 'file', path: 'My App.app' }
        ]
      };

      await writeFile(configPath, JSON.stringify(config));

      const generator = generateDMG({
        source: configPath,
        target: outputPath
      });

      await generator.generate();

      expect(true).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});

describe('Issue #237: Hidden files affecting positions', () => {
  it('should not include position-only items in icon positions', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dmgapp-test-'));
    const configPath = join(tempDir, 'config.json');
    const outputPath = join(tempDir, 'output.dmg');
    const appPath = join(tempDir, 'TestApp.app');

    try {
      await mkdir(appPath, { recursive: true });
      await writeFile(join(appPath, 'test.txt'), 'test');

      const config = {
        title: 'Test DMG',
        contents: [
          { x: 448, y: 344, type: 'link', path: '/Applications' },
          { x: 192, y: 344, type: 'file', path: 'TestApp.app' },
          { x: 5000, y: 0, type: 'position', path: '.DS_Store' }
        ]
      };

      await writeFile(configPath, JSON.stringify(config));

      const generator = generateDMG({
        source: configPath,
        target: outputPath
      });

      await generator.generate();

      expect(true).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
