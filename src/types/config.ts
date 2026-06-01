export interface ContentItem {
  x: number;
  y: number;
  type: 'link' | 'file' | 'position';
  path: string;
  name?: string;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface Window {
  position?: WindowPosition;
  size?: WindowSize;
}

export interface CodeSign {
  signingIdentity: string;
  identifier?: string;
}

export interface DMGConfig {
  title: string;
  icon?: string;
  background?: string;
  backgroundColor?: string;
  iconSize?: number;
  window?: Window;
  format?: 'UDRW' | 'UDRO' | 'UDCO' | 'UDZO' | 'UDBZ' | 'ULFO' | 'ULMO';
  filesystem?: 'HFS+' | 'APFS';
  contents: ContentItem[];
  codeSign?: CodeSign;
}

export interface GeneratorOptions {
  source?: string;
  target: string;
  basepath?: string;
  specification?: DMGConfig;
}

export interface ProgressInfo {
  current: number;
  total: number;
  type: 'step-begin' | 'step-end';
  title?: string;
  status?: 'ok' | 'skip' | 'fail';
}

export interface DSStoreOptions {
  iconSize: number;
  backgroundColor?: [number, number, number];
  backgroundPath?: string;
  windowSize?: { width: number; height: number };
  windowPosition?: { x: number; y: number };
  iconPositions: Array<{ name: string; x: number; y: number }>;
}

class ValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join(', '));
    this.name = 'ValidationError';
  }
}

interface SafeParseResult {
  success: boolean;
  data?: DMGConfig;
  error?: ValidationError;
}

const VALID_FORMATS = ['UDRW', 'UDRO', 'UDCO', 'UDZO', 'UDBZ', 'ULFO', 'ULMO'] as const;
const VALID_FILESYSTEMS = ['HFS+', 'APFS'] as const;
const VALID_CONTENT_TYPES = ['link', 'file', 'position'] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateContentItem(item: unknown, index: number): ContentItem {
  const errors: string[] = [];

  if (!isObject(item)) {
    throw new ValidationError([`contents[${index}]: must be an object`]);
  }

  if (typeof item.x !== 'number') errors.push(`contents[${index}].x: must be a number`);
  if (typeof item.y !== 'number') errors.push(`contents[${index}].y: must be a number`);
  if (typeof item.type !== 'string' || !VALID_CONTENT_TYPES.includes(item.type as typeof VALID_CONTENT_TYPES[number])) {
    errors.push(`contents[${index}].type: must be one of ${VALID_CONTENT_TYPES.join(', ')}`);
  }
  if (typeof item.path !== 'string') errors.push(`contents[${index}].path: must be a string`);
  if (item.name !== undefined && typeof item.name !== 'string') {
    errors.push(`contents[${index}].name: must be a string`);
  }

  if (errors.length > 0) throw new ValidationError(errors);

  return {
    x: item.x as number,
    y: item.y as number,
    type: item.type as ContentItem['type'],
    path: item.path as string,
    name: item.name as string | undefined
  };
}

function validateWindow(window: unknown): Window {
  if (!isObject(window)) {
    throw new ValidationError(['window: must be an object']);
  }

  const result: Window = {};

  if (window.position !== undefined) {
    if (!isObject(window.position)) {
      throw new ValidationError(['window.position: must be an object']);
    }
    if (typeof window.position.x !== 'number') {
      throw new ValidationError(['window.position.x: must be a number']);
    }
    if (typeof window.position.y !== 'number') {
      throw new ValidationError(['window.position.y: must be a number']);
    }
    result.position = { x: window.position.x, y: window.position.y };
  }

  if (window.size !== undefined) {
    if (!isObject(window.size)) {
      throw new ValidationError(['window.size: must be an object']);
    }
    if (typeof window.size.width !== 'number') {
      throw new ValidationError(['window.size.width: must be a number']);
    }
    if (typeof window.size.height !== 'number') {
      throw new ValidationError(['window.size.height: must be a number']);
    }
    result.size = { width: window.size.width, height: window.size.height };
  }

  return result;
}

function validateCodeSign(codeSign: unknown): CodeSign {
  if (!isObject(codeSign)) {
    throw new ValidationError(['codeSign: must be an object']);
  }

  const errors: string[] = [];

  if (typeof codeSign.signingIdentity !== 'string') {
    errors.push('codeSign.signingIdentity: must be a string');
  }
  if (codeSign.identifier !== undefined && typeof codeSign.identifier !== 'string') {
    errors.push('codeSign.identifier: must be a string');
  }

  if (errors.length > 0) throw new ValidationError(errors);

  return {
    signingIdentity: codeSign.signingIdentity as string,
    identifier: codeSign.identifier as string | undefined
  };
}

function validateConfig(input: unknown): DMGConfig {
  const errors: string[] = [];

  if (!isObject(input)) {
    throw new ValidationError(['Configuration must be an object']);
  }

  if (typeof input.title !== 'string') {
    errors.push('title: must be a string');
  }

  if (!Array.isArray(input.contents)) {
    errors.push('contents: must be an array');
  }

  if (errors.length > 0) throw new ValidationError(errors);

  const result: DMGConfig = {
    title: input.title as string,
    contents: (input.contents as unknown[]).map(validateContentItem)
  };

  if (input.icon !== undefined) {
    if (typeof input.icon !== 'string') throw new ValidationError(['icon: must be a string']);
    result.icon = input.icon;
  }

  if (input.background !== undefined) {
    if (typeof input.background !== 'string') throw new ValidationError(['background: must be a string']);
    result.background = input.background;
  }

  if (input.backgroundColor !== undefined) {
    if (typeof input.backgroundColor !== 'string') throw new ValidationError(['backgroundColor: must be a string']);
    result.backgroundColor = input.backgroundColor;
  }

  if (input.iconSize !== undefined) {
    if (typeof input.iconSize !== 'number') throw new ValidationError(['iconSize: must be a number']);
    result.iconSize = input.iconSize;
  }

  if (input.window !== undefined) {
    result.window = validateWindow(input.window);
  }

  if (input.format !== undefined) {
    if (typeof input.format !== 'string' || !VALID_FORMATS.includes(input.format as typeof VALID_FORMATS[number])) {
      throw new ValidationError([`format: must be one of ${VALID_FORMATS.join(', ')}`]);
    }
    result.format = input.format as DMGConfig['format'];
  }

  if (input.filesystem !== undefined) {
    if (typeof input.filesystem !== 'string' || !VALID_FILESYSTEMS.includes(input.filesystem as typeof VALID_FILESYSTEMS[number])) {
      throw new ValidationError([`filesystem: must be one of ${VALID_FILESYSTEMS.join(', ')}`]);
    }
    result.filesystem = input.filesystem as DMGConfig['filesystem'];
  }

  if (input.codeSign !== undefined) {
    result.codeSign = validateCodeSign(input.codeSign);
  }

  return result;
}

export const DMGConfigSchema = {
  parse(input: unknown): DMGConfig {
    return validateConfig(input);
  },

  safeParse(input: unknown): SafeParseResult {
    try {
      const data = validateConfig(input);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as ValidationError };
    }
  }
};
