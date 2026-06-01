import { dim, blue, green, yellow, red, boldGreen } from './colors.js';
import { Spinner } from './spinner.js';

export class Logger {
  private spinner: Spinner | null = null;
  private currentStep = 0;
  private totalSteps = 0;
  private quiet = false;

  constructor(options?: { quiet?: boolean }) {
    this.quiet = options?.quiet ?? false;
  }

  setTotalSteps(total: number): void {
    this.totalSteps = total;
  }

  startStep(title: string): void {
    if (this.quiet) return;
    this.currentStep++;
    const stepPrefix = this.totalSteps > 0
      ? dim(`[${this.currentStep}/${this.totalSteps}] `)
      : '';
    this.spinner = new Spinner(`${stepPrefix}${title}`);
    this.spinner.start();
  }

  succeedStep(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  failStep(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  skipStep(message?: string): void {
    if (this.spinner) {
      this.spinner.warn(message ?? 'Skipped');
      this.spinner = null;
    }
  }

  info(message: string): void {
    if (this.quiet) return;
    console.log(blue('ℹ'), message);
  }

  success(message: string): void {
    if (this.quiet) return;
    console.log(green('✓'), message);
  }

  warn(message: string): void {
    if (this.quiet) return;
    console.log(yellow('⚠'), message);
  }

  error(message: string): void {
    console.error(red('✗'), message);
  }

  done(message: string): void {
    if (this.quiet) return;
    console.log();
    console.log(boldGreen('✓'), green(message));
    console.log();
  }
}

export const logger = new Logger();
