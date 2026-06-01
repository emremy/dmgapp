import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateDMG } from '../src/core/generator.js';
import { pathExists } from '../src/utils/filesystem.js';
import { exec } from '../src/utils/shell.js';
import { rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Integration Tests', () => {
  const testConfigPath = resolve(__dirname, 'assets/appdmg.json');

  const getTestOutputPath = (testName: string) => 
    resolve(__dirname, `test-output-${testName.replace(/\s+/g, '-')}.dmg`);

  afterAll(async () => {
    const files = await exec('ls', [__dirname]);
    const dmgFiles = files.stdout.split('\n').filter(f => f.startsWith('test-output-') && f.endsWith('.dmg'));
    for (const file of dmgFiles) {
      await rm(resolve(__dirname, file), { force: true });
    }
  });

  it('should generate DMG from legacy test config', async () => {
    const testOutputPath = getTestOutputPath('legacy-config');
    
    const generator = generateDMG({
      source: testConfigPath,
      target: testOutputPath
    });

    const progressEvents: any[] = [];
    generator.on('progress', (info) => {
      progressEvents.push(info);
    });

    await generator.generate();

    expect(await pathExists(testOutputPath)).toBe(true);
    expect(progressEvents.length).toBeGreaterThan(0);
  }, 60000);

  it('should create valid DMG with correct contents', async () => {
    const testOutputPath = getTestOutputPath('valid-contents');
    
    const generator = generateDMG({
      source: testConfigPath,
      target: testOutputPath
    });

    await generator.generate();

    const mountResult = await exec('hdiutil', [
      'attach', testOutputPath,
      '-nobrowse',
      '-noverify'
    ]);

    const mountMatch = /\s+(\/Volumes\/.+)$/m.exec(mountResult.stdout);
    expect(mountMatch).toBeTruthy();

    const mountPath = mountMatch![1];

    try {
      const lsResult = await exec('ls', ['-la', mountPath]);
      const contents = lsResult.stdout;

      expect(contents).toContain('.background');
      expect(contents).toContain('.DS_Store');
      expect(contents).toContain('.VolumeIcon.icns');
      expect(contents).toContain('Applications');
      expect(contents).toContain('TestApp.app');
      expect(contents).toContain('TestDoc.txt');

      const bgResult = await exec('ls', ['-la', join(mountPath, '.background')]);
      expect(bgResult.stdout).toContain('TestBkg.tiff');

      const linkResult = await exec('readlink', [join(mountPath, 'Applications')]);
      expect(linkResult.stdout.trim()).toBe('/Applications');
    } finally {
      await exec('hdiutil', ['detach', mountPath]);
    }
  }, 60000);

  it('should handle background with retina support', async () => {
    const testOutputPath = getTestOutputPath('retina-background');
    
    const generator = generateDMG({
      source: testConfigPath,
      target: testOutputPath
    });

    await generator.generate();

    const mountResult = await exec('hdiutil', [
      'attach', testOutputPath,
      '-nobrowse',
      '-noverify'
    ]);

    const mountMatch = /\s+(\/Volumes\/.+)$/m.exec(mountResult.stdout);
    const mountPath = mountMatch![1];

    try {
      const bgPath = join(mountPath, '.background', 'TestBkg.tiff');
      const exists = await pathExists(bgPath);
      expect(exists).toBe(true);
    } finally {
      await exec('hdiutil', ['detach', mountPath]);
    }
  }, 60000);
});
