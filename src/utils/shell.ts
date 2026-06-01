import { execFile } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ShellError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly stdout: string,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'ShellError';
  }
}

export async function exec(
  command: string,
  args: string[],
  options?: { timeout?: number; cwd?: string }
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      timeout: options?.timeout ?? 60000,
      cwd: options?.cwd,
      maxBuffer: 10 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        const exitCode = typeof error.code === 'number' ? error.code : 1;
        reject(new ShellError(
          `Command failed: ${command} ${args.join(' ')}\n${error.message}`,
          exitCode,
          stdout?.toString() ?? '',
          stderr?.toString() ?? ''
        ));
        return;
      }

      resolve({
        stdout: stdout?.toString() ?? '',
        stderr: stderr?.toString() ?? '',
        exitCode: 0
      });
    });
  });
}

export async function execQuiet(
  command: string,
  args: string[],
  options?: { timeout?: number; cwd?: string }
): Promise<ExecResult> {
  try {
    return await exec(command, args, options);
  } catch {
    return {
      stdout: '',
      stderr: '',
      exitCode: 1
    };
  }
}
