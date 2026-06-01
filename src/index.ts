export { generateDMG, DMGGenerator } from './core/generator.js';
export { generateDSStore, DSStoreWriter } from './core/dsstore.js';
export * as hdiutil from './core/hdiutil.js';
export type {
  DMGConfig,
  ContentItem,
  Window,
  WindowPosition,
  WindowSize,
  CodeSign,
  GeneratorOptions,
  ProgressInfo,
  DSStoreOptions
} from './types/config.js';
export { DMGConfigSchema } from './types/config.js';
