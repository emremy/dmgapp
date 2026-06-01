import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { exec } from '../utils/shell.js';

export interface CreateOptions {
  name: string;
  size: string;
  filesystem?: 'HFS+' | 'APFS';
}

export async function create(options: CreateOptions): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'dmgapp-'));
  const outname = join(tempDir, `${options.name}.dmg`);

  const args = [
    'create', outname,
    '-ov',
    '-fs', options.filesystem ?? 'HFS+',
    '-size', options.size,
    '-volname', options.name
  ];

  try {
    await exec('hdiutil', args);
    return outname;
  } catch (error) {
    await rm(outname, { force: true }).catch(() => {});
    throw error;
  }
}

export async function attach(imagePath: string): Promise<string> {
  const args = [
    'attach', imagePath,
    '-nobrowse',
    '-noverify',
    '-noautoopen'
  ];

  const result = await exec('hdiutil', args);
  const match = /\s+(\/Volumes\/.+)$/m.exec(result.stdout);

  if (!match) {
    throw new Error('Failed to mount image: mount path not found in output');
  }

  return match[1];
}

export async function detach(mountPath: string, maxRetries = 8): Promise<void> {
  const args = ['detach', mountPath];
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await exec('hdiutil', args);
      return;
    } catch (error: unknown) {
      attempts++;
      const shellError = error as { exitCode?: number; code?: number };

      if ((shellError.exitCode === 16 || shellError.code === 16) && attempts < maxRetries) {
        const delay = Math.pow(2, attempts - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}

export async function convert(
  source: string,
  format: string,
  target: string
): Promise<void> {
  const args = [
    'convert', source,
    '-ov',
    '-format', format,
    '-imagekey', 'zlib-level=9',
    '-o', target
  ];

  try {
    await exec('hdiutil', args);
  } catch (error) {
    await rm(target, { force: true }).catch(() => {});
    throw error;
  }
}

export async function createEmptyFile(path: string): Promise<void> {
  await writeFile(path, '', { flag: 'wx' });
}
