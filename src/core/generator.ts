import { EventEmitter } from 'node:events';
import { resolve, dirname, basename, extname, join } from 'node:path';
import { rm } from 'node:fs/promises';
import type { DMGConfig, GeneratorOptions, ProgressInfo, DSStoreOptions } from '../types/config.js';
import { DMGConfigSchema } from '../types/config.js';
import * as hdiutil from './hdiutil.js';
import { generateDSStore } from './dsstore.js';
import {
  pathExists,
  getDirectorySize,
  copyPath,
  createSymlink,
  ensureDir,
  setVolumeIcon,
  tiffutil,
  readJsonFile,
  writeBinaryFile,
  copyFileToDir,
  hideFile
} from '../utils/filesystem.js';
import { exec } from '../utils/shell.js';

export class DMGGenerator extends EventEmitter {
  private config!: DMGConfig;
  private target!: string;
  private basepath!: string;
  private tempImagePath = '';
  private mountPath = '';
  private backgroundName = '';
  private currentStep = 0;
  private totalSteps = 13;

  constructor(private options: GeneratorOptions) {
    super();
  }

  async generate(): Promise<void> {
    if (process.platform !== 'darwin') {
      throw new Error(`Platform not supported: ${process.platform}`);
    }

    try {
      await this.parseOptions();
      await this.validateConfig();
      await this.checkTarget();
      await this.calculateSize();
      await this.createTemporaryImage();
      await this.mountImage();
      await this.copyBackground();
      await this.copyIcon();
      await this.createLinks();
      await this.copyFiles();
      await this.generateDSStore();
      await this.blessImage();
      await this.detachImage();
      await this.finalizeImage();
      await this.signImage();
      await this.cleanup();

      this.emit('finish');
    } catch (error) {
      await this.cleanupOnError();
      throw error;
    }
  }

  private async parseOptions(): Promise<void> {
    this.progress('Parsing options');

    if (this.options.source) {
      this.basepath = dirname(this.options.source);
      const rawConfig = await readJsonFile<unknown>(this.options.source);
      this.config = this.normalizeConfig(rawConfig);
    } else if (this.options.specification && this.options.basepath) {
      this.basepath = this.options.basepath;
      this.config = this.options.specification;
    } else {
      throw new Error('Must provide either source or (specification + basepath)');
    }

    this.target = resolve(this.options.target);
    this.progress('Options parsed', 'ok');
  }

  private normalizeConfig(raw: unknown): DMGConfig {
    const obj = raw as Record<string, unknown>;

    if (obj['background-color']) {
      obj.backgroundColor = obj['background-color'];
      delete obj['background-color'];
    }
    if (obj['icon-size']) {
      obj.iconSize = obj['icon-size'];
      delete obj['icon-size'];
    }
    if (obj['code-sign']) {
      const codeSign = obj['code-sign'] as Record<string, unknown>;
      obj.codeSign = {
        signingIdentity: codeSign['signing-identity'] as string,
        identifier: codeSign['identifier'] as string | undefined
      };
      delete obj['code-sign'];
    }

    return DMGConfigSchema.parse(obj);
  }

  private async validateConfig(): Promise<void> {
    this.progress('Validating configuration');
    DMGConfigSchema.parse(this.config);
    this.progress('Configuration valid', 'ok');
  }

  private async checkTarget(): Promise<void> {
    this.progress('Checking target path');

    const exists = await pathExists(this.target);
    if (exists) {
      throw new Error(`Target already exists: ${this.target}`);
    }

    await hdiutil.createEmptyFile(this.target);
    this.progress('Target path ready', 'ok');
  }

  private async calculateSize(): Promise<void> {
    this.progress('Calculating image size');

    const files = this.config.contents.filter(c => c.type === 'file');
    let totalSize = 0;

    for (const file of files) {
      const filePath = this.resolvePath(file.path);
      const exists = await pathExists(filePath);
      if (!exists) {
        throw new Error(`File not found: ${filePath}`);
      }
      const size = await getDirectorySize(filePath);
      totalSize += size;
    }

    const sizeWithBuffer = Math.ceil(totalSize * 1.5) + 32;
    this.progress(`Size: ${sizeWithBuffer} MB`, 'ok');
  }

  private async createTemporaryImage(): Promise<void> {
    this.progress('Creating temporary image');

    const files = this.config.contents.filter(c => c.type === 'file');
    let totalSize = 0;

    for (const file of files) {
      const filePath = this.resolvePath(file.path);
      const size = await getDirectorySize(filePath);
      totalSize += size;
    }

    const sizeWithBuffer = Math.ceil(totalSize * 1.5) + 32;

    this.tempImagePath = await hdiutil.create({
      name: this.config.title,
      size: `${sizeWithBuffer}m`,
      filesystem: this.config.filesystem
    });

    this.progress('Temporary image created', 'ok');
  }

  private async mountImage(): Promise<void> {
    this.progress('Mounting image');
    this.mountPath = await hdiutil.attach(this.tempImagePath);
    this.progress('Image mounted', 'ok');
  }

  private async copyBackground(): Promise<void> {
    this.progress('Copying background');

    if (!this.config.background) {
      this.progress('No background specified', 'skip');
      return;
    }

    const bgDir = join(this.mountPath, '.background');
    await ensureDir(bgDir);
    await hideFile(bgDir);

    const bgPath = this.resolvePath(this.config.background);
    const retinaPath = bgPath.replace(/\.([a-z]+)$/, '@2x.$1');
    const retinaExists = await pathExists(retinaPath);

    if (retinaExists) {
      const ext = extname(this.config.background);
      const baseName = basename(this.config.background, ext);
      const outputName = `${baseName}.tiff`;
      const outputPath = join(bgDir, outputName);

      await tiffutil(bgPath, retinaPath, outputPath);
      this.backgroundName = join('.background', outputName);
    } else {
      const fileName = basename(this.config.background);
      await copyFileToDir(bgPath, bgDir);
      this.backgroundName = join('.background', fileName);
    }

    this.progress('Background copied', 'ok');
  }

  private async copyIcon(): Promise<void> {
    this.progress('Copying volume icon');

    if (!this.config.icon) {
      this.progress('No icon specified', 'skip');
      return;
    }

    const iconPath = this.resolvePath(this.config.icon);
    const destPath = join(this.mountPath, '.VolumeIcon.icns');

    await copyPath(iconPath, destPath);
    await setVolumeIcon(this.mountPath);

    this.progress('Volume icon set', 'ok');
  }

  private async createLinks(): Promise<void> {
    this.progress('Creating links');

    const links = this.config.contents.filter(c => c.type === 'link');

    if (links.length === 0) {
      this.progress('No links to create', 'skip');
      return;
    }

    for (const link of links) {
      const name = link.name ?? basename(link.path);
      const linkPath = join(this.mountPath, name);
      await createSymlink(link.path, linkPath);
    }

    this.progress(`${links.length} link(s) created`, 'ok');
  }

  private async copyFiles(): Promise<void> {
    this.progress('Copying files');

    const files = this.config.contents.filter(c => c.type === 'file');

    if (files.length === 0) {
      this.progress('No files to copy', 'skip');
      return;
    }

    for (const file of files) {
      const name = file.name ?? basename(file.path);
      const sourcePath = this.resolvePath(file.path);
      const destPath = join(this.mountPath, name);

      await copyPath(sourcePath, destPath);
    }

    this.progress(`${files.length} file(s) copied`, 'ok');
  }

  private async generateDSStore(): Promise<void> {
    this.progress('Generating .DS_Store');

    const iconPositions = this.config.contents
      .filter(c => c.type !== 'position')
      .map(c => ({
        name: c.name ?? basename(c.path),
        x: c.x,
        y: c.y
      }));

    const dsStoreOptions: DSStoreOptions = {
      iconSize: this.config.iconSize ?? 80,
      iconPositions,
      windowSize: this.config.window?.size,
      windowPosition: this.config.window?.position,
      backgroundPath: this.backgroundName
        ? join(this.mountPath, this.backgroundName)
        : undefined
    };

    if (this.config.backgroundColor) {
      dsStoreOptions.backgroundColor = this.parseColor(this.config.backgroundColor);
    }

    const dsStoreBuffer = generateDSStore(dsStoreOptions);
    const dsStorePath = join(this.mountPath, '.DS_Store');

    await writeBinaryFile(dsStorePath, dsStoreBuffer);

    this.progress('.DS_Store generated', 'ok');
  }

  private async blessImage(): Promise<void> {
    this.progress('Blessing image');

    if (this.config.filesystem === 'APFS') {
      this.progress('Blessing not supported for APFS', 'skip');
      return;
    }

    try {
      const args = ['--folder', this.mountPath];

      if (process.arch !== 'arm64') {
        args.push('--openfolder', this.mountPath);
      }

      await exec('bless', args);
      this.progress('Image blessed', 'ok');
    } catch (error) {
      this.progress('Blessing failed (non-critical)', 'skip');
    }
  }

  private async detachImage(): Promise<void> {
    this.progress('Detaching image');
    await hdiutil.detach(this.mountPath);
    this.progress('Image detached', 'ok');
  }

  private async finalizeImage(): Promise<void> {
    this.progress('Finalizing image');

    const format = this.config.format ?? 'UDZO';

    await rm(this.target, { force: true });
    await hdiutil.convert(this.tempImagePath, format, this.target);

    this.progress('Image finalized', 'ok');
  }

  private async signImage(): Promise<void> {
    this.progress('Signing image');

    if (!this.config.codeSign?.signingIdentity) {
      this.progress('No signing identity specified', 'skip');
      return;
    }

    const args = [
      '--verbose',
      '--sign', this.config.codeSign.signingIdentity
    ];

    if (this.config.codeSign.identifier) {
      args.push('--identifier', this.config.codeSign.identifier);
    }

    args.push(this.target);

    await exec('codesign', args);
    this.progress('Image signed', 'ok');
  }

  private async cleanup(): Promise<void> {
    if (this.tempImagePath) {
      await rm(dirname(this.tempImagePath), { recursive: true, force: true }).catch(() => {});
    }
  }

  private async cleanupOnError(): Promise<void> {
    if (this.mountPath) {
      await hdiutil.detach(this.mountPath).catch(() => {});
    }

    if (this.tempImagePath) {
      await rm(dirname(this.tempImagePath), { recursive: true, force: true }).catch(() => {});
    }

    await rm(this.target, { force: true }).catch(() => {});
  }

  private resolvePath(relativePath: string): string {
    return resolve(this.basepath, relativePath);
  }

  private parseColor(color: string): [number, number, number] {
    const match = color.match(/^#([0-9a-f]{6})$/i);
    if (match) {
      const hex = match[1];
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255
      ];
    }

    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      return [
        parseInt(rgbMatch[1]) / 255,
        parseInt(rgbMatch[2]) / 255,
        parseInt(rgbMatch[3]) / 255
      ];
    }

    return [1, 1, 1];
  }

  private progress(title: string, status?: 'ok' | 'skip' | 'fail'): void {
    if (status) {
      this.currentStep++;
      const info: ProgressInfo = {
        current: this.currentStep,
        total: this.totalSteps,
        type: 'step-end',
        status
      };
      this.emit('progress', info);
    } else {
      const info: ProgressInfo = {
        current: this.currentStep,
        total: this.totalSteps,
        type: 'step-begin',
        title
      };
      this.emit('progress', info);
    }
  }
}

export function generateDMG(options: GeneratorOptions): DMGGenerator {
  return new DMGGenerator(options);
}
