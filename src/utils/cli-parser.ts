export interface CliOptions {
  quiet: boolean;
  verbose: boolean;
  help: boolean;
  version: boolean;
  args: string[];
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    quiet: false,
    verbose: false,
    help: false,
    version: false,
    args: []
  };

  for (const arg of argv) {
    if (arg === '-q' || arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-V' || arg === '--version') {
      options.version = true;
    } else if (!arg.startsWith('-')) {
      options.args.push(arg);
    }
  }

  return options;
}

export function printHelp(_version: string): void {
  console.log(`
Usage: dmgapp [options] <json-path> <dmg-path>

Zero native dependencies, ESM-first, blazing fast macOS DMG generator

Arguments:
  json-path      Path to the JSON configuration file
  dmg-path       Path for the output DMG file

Options:
  -V, --version  Output the version number
  -q, --quiet    Suppress progress output (default: false)
  -v, --verbose  Show verbose error output (default: false)
  -h, --help     Display help for command
`);
}
