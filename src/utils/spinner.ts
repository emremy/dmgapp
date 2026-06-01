const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const INTERVAL = 80;

export class Spinner {
  private frameIndex = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private text = '';

  constructor(text: string) {
    this.text = text;
  }

  start(): this {
    if (!process.stdout.isTTY) {
      process.stdout.write(`${this.text}...`);
      return this;
    }

    this.intervalId = setInterval(() => {
      const frame = FRAMES[this.frameIndex % FRAMES.length];
      process.stdout.write(`\r\x1b[36m${frame}\x1b[39m ${this.text}...`);
      this.frameIndex++;
    }, INTERVAL);

    return this;
  }

  stop(symbol: string, color: string, message?: string): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const finalText = message ?? this.text;
    process.stdout.write(`\r\x1b[2K${color}${symbol}\x1b[39m ${finalText}\n`);
  }

  succeed(message?: string): void {
    this.stop('✓', '\x1b[32m', message);
  }

  fail(message?: string): void {
    this.stop('✗', '\x1b[31m', message);
  }

  warn(message?: string): void {
    this.stop('○', '\x1b[33m', message ?? 'Skipped');
  }
}
