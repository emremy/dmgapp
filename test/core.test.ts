import { describe, it, expect } from 'vitest';
import { DMGConfigSchema } from '../src/types/config.js';
import { generateDSStore } from '../src/core/dsstore.js';

describe('Configuration Schema', () => {
  it('should validate minimal config', () => {
    const config = {
      title: 'Test App',
      contents: [
        { x: 100, y: 100, type: 'file', path: 'test.app' }
      ]
    };

    const result = DMGConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate full config', () => {
    const config = {
      title: 'Test App',
      icon: 'icon.icns',
      background: 'bg.png',
      backgroundColor: '#ffffff',
      iconSize: 128,
      window: {
        position: { x: 100, y: 100 },
        size: { width: 640, height: 480 }
      },
      format: 'UDZO',
      filesystem: 'HFS+',
      contents: [
        { x: 448, y: 344, type: 'link', path: '/Applications' },
        { x: 192, y: 344, type: 'file', path: 'test.app' }
      ],
      codeSign: {
        signingIdentity: 'Developer ID',
        identifier: 'com.example.app'
      }
    };

    const result = DMGConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject invalid format', () => {
    const config = {
      title: 'Test App',
      format: 'INVALID',
      contents: []
    };

    const result = DMGConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const config = {
      title: 'Test App'
    };

    const result = DMGConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('DS_Store Generator', () => {
  it('should generate DS_Store buffer', () => {
    const buffer = generateDSStore({
      iconSize: 80,
      iconPositions: [
        { name: 'test.app', x: 100, y: 100 }
      ]
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should include background path', () => {
    const buffer = generateDSStore({
      iconSize: 80,
      backgroundPath: '/Volumes/Test/.background/bg.png',
      iconPositions: [
        { name: 'test.app', x: 100, y: 100 }
      ]
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should include window settings', () => {
    const buffer = generateDSStore({
      iconSize: 80,
      windowSize: { width: 640, height: 480 },
      windowPosition: { x: 100, y: 100 },
      iconPositions: [
        { name: 'test.app', x: 100, y: 100 }
      ]
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should handle multiple icon positions', () => {
    const buffer = generateDSStore({
      iconSize: 128,
      iconPositions: [
        { name: 'app1.app', x: 100, y: 100 },
        { name: 'app2.app', x: 200, y: 200 },
        { name: 'Applications', x: 300, y: 300 }
      ]
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
