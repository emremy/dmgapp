const isColorSupported = process.stdout.isTTY && process.env.TERM !== 'dumb' && !process.env.NO_COLOR;

const wrap = (open: string, close: string) => (text: string): string =>
  isColorSupported ? `\x1b[${open}m${text}\x1b[${close}m` : text;

export const reset = wrap('0', '0');
export const bold = wrap('1', '22');
export const dim = wrap('2', '22');
export const red = wrap('31', '39');
export const green = wrap('32', '39');
export const yellow = wrap('33', '39');
export const blue = wrap('34', '39');
export const cyan = wrap('36', '39');
export const white = wrap('37', '39');

export const boldGreen = (text: string): string => bold(green(text));
export const boldRed = (text: string): string => bold(red(text));
export const boldYellow = (text: string): string => bold(yellow(text));
