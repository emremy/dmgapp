import { access, stat, cp, symlink, mkdir, rm, readFile, writeFile, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { exec } from './shell.js';

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function getFileSize(path: string): Promise<number> {
  const stats = await stat(path);
  return stats.size;
}

export async function getDirectorySize(path: string): Promise<number> {
  try {
    const result = await exec('du', ['-sm', path]);
    const match = /^(\d+)\t/.exec(result.stdout);
    if (match) {
      return parseInt(match[1], 10);
    }
    throw new Error(`Failed to parse du output: ${result.stdout}`);
  } catch {
    return 0;
  }
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function copyPath(source: string, destination: string): Promise<void> {
  await cp(source, destination, { recursive: true });
}

export async function copyFileToDir(source: string, destDir: string, newName?: string): Promise<string> {
  const fileName = newName ?? source.split('/').pop()!;
  const destPath = join(destDir, fileName);
  await copyFile(source, destPath);
  return destPath;
}

export async function createSymlink(target: string, linkPath: string): Promise<void> {
  await symlink(target, linkPath);
}

export async function removePath(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content) as T;
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await ensureDir(dirname(path));
  await writeFile(path, content, 'utf-8');
}

export async function writeBinaryFile(path: string, data: Buffer): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, data);
}

export async function setVolumeIcon(volumePath: string): Promise<void> {
  const buf = Buffer.alloc(32);
  buf.writeUInt8(4, 8);
  await exec('xattr', ['-wx', 'com.apple.FinderInfo', buf.toString('hex'), volumePath]);
}

export async function tiffutil(
  normalPath: string,
  retinaPath: string,
  outputPath: string
): Promise<void> {
  await exec('tiffutil', ['-cathidpicheck', normalPath, retinaPath, '-out', outputPath]);
}

export async function hideFile(path: string): Promise<void> {
  await exec('chflags', ['hidden', path]);
}
