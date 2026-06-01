#!/usr/bin/env node

import { resolve, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { generateDMG } from './core/generator.js';
import type { ProgressInfo } from './types/config.js';
import { parseArgs, printHelp } from './utils/cli-parser.js';
import { bold, dim, green, yellow, red, boldGreen, boldRed } from './utils/colors.js';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf-8')
);

const options = parseArgs(process.argv.slice(2));

if (options.version) {
  console.log(`dmgapp v${packageJson.version}`);
  process.exit(0);
}

if (options.help) {
  printHelp(packageJson.version);
  process.exit(0);
}

if (options.args.length < 2) {
  printHelp(packageJson.version);
  process.exit(1);
}

if (options.args.length > 2) {
  console.error(boldRed('Error:'), 'Too many arguments');
  process.exit(1);
}

const [jsonPath, dmgPath] = options.args;

try {
  if (extname(jsonPath) !== '.json') {
    throw new Error('Input must have the .json file extension');
  }

  if (extname(dmgPath) !== '.dmg') {
    throw new Error('Output must have the .dmg file extension');
  }

  const source = resolve(jsonPath);
  const target = resolve(dmgPath);

  const generator = generateDMG({ source, target });

  if (!options.quiet) {
    console.log();
    console.log(bold('dmgapp'), dim(`v${packageJson.version}`));
    console.log(dim('─'.repeat(50)));
    console.log();
  }

  generator.on('progress', (info: ProgressInfo) => {
    if (options.quiet) return;

    if (info.type === 'step-begin') {
      const stepPrefix = dim(`[${String(info.current).padStart(2)}/${info.total}]`);
      process.stdout.write(`${stepPrefix} ${info.title}...`);
    }

    if (info.type === 'step-end') {
      const statusMap = {
        ok: green(' ✓'),
        skip: yellow(' ○'),
        fail: red(' ✗')
      };
      console.log(statusMap[info.status!]);
    }
  });

  generator.on('finish', () => {
    if (options.quiet) return;

    console.log();
    console.log(boldGreen('✓ DMG created successfully'));
    console.log(dim('  →'), target);
    console.log();
  });

  await generator.generate();
} catch (error: unknown) {
  if (!options.quiet) {
    console.log();
  }

  const err = error as Error;

  if (options.verbose && err.stack) {
    console.error(red(err.stack));
    console.log();
  }

  console.error(boldRed('Error:'), err.message);
  process.exit(1);
}
