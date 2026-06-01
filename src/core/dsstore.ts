import type { DSStoreOptions } from '../types/config.js';

const MAGIC = Buffer.from([0x00, 0x00, 0x00, 0x01]);
const ALLOCATOR_OFFSET = 0x00001000;

export class DSStoreWriter {
  private records: Map<string, Buffer> = new Map();

  constructor(private options: DSStoreOptions) {}

  generate(): Buffer {
    this.buildRecords();
    return this.writeBinary();
  }

  private buildRecords(): void {
    this.addIconViewSettings();
    this.addWindowSettings();
    this.addIconPositions();
  }

  private addIconViewSettings(): void {
    const icvp = this.buildICVP();
    this.records.set('.:icvp', icvp);
  }

  private buildICVP(): Buffer {
    const parts: Buffer[] = [];

    parts.push(this.writePlistDict([
      { key: 'arrangeBy', type: 'ustr', value: 'none' },
      { key: 'backgroundColorBlue', type: 'doub', value: this.options.backgroundColor?.[2] ?? 1.0 },
      { key: 'backgroundColorGreen', type: 'doub', value: this.options.backgroundColor?.[1] ?? 1.0 },
      { key: 'backgroundColorRed', type: 'doub', value: this.options.backgroundColor?.[0] ?? 1.0 },
      { key: 'backgroundType', type: 'long', value: this.options.backgroundPath ? 2 : 0 },
      { key: 'gridOffsetX', type: 'long', value: 0 },
      { key: 'gridOffsetY', type: 'long', value: 0 },
      { key: 'gridSpacing', type: 'doub', value: 100.0 },
      { key: 'iconSize', type: 'doub', value: this.options.iconSize },
      { key: 'labelOnBottom', type: 'bool', value: false },
      { key: 'showIconPreview', type: 'bool', value: true },
      { key: 'showItemInfo', type: 'bool', value: false },
      { key: 'textSize', type: 'doub', value: 12.0 },
      { key: 'viewOptionsVersion', type: 'long', value: 1 }
    ]));

    if (this.options.backgroundPath) {
      parts.push(this.writePlistEntry('imagePath', 'ustr', this.options.backgroundPath));
    }

    return Buffer.concat(parts);
  }

  private addWindowSettings(): void {
    if (this.options.windowSize || this.options.windowPosition) {
      const bwsp = this.buildBWSP();
      this.records.set('.:bwsp', bwsp);
    }
  }

  private buildBWSP(): Buffer {
    const entries: Array<{ key: string; type: string; value: unknown }> = [];

    if (this.options.windowSize) {
      entries.push({ key: 'ContainerShowSidebar', type: 'bool', value: false });
      entries.push({ key: 'PreviewPaneHeight', type: 'long', value: 0 });
      entries.push({ key: 'ShowPreview', type: 'bool', value: false });
      entries.push({ key: 'ShowSidebar', type: 'bool', value: false });
      entries.push({ key: 'ShowStatusBar', type: 'bool', value: false });
      entries.push({ key: 'ShowToolbar', type: 'bool', value: false });
      entries.push({ key: 'SidebarWidth', type: 'long', value: 0 });
      entries.push({ key: 'WindowBounds', type: 'bubb', value: this.buildWindowBounds() });
    }

    return this.writePlistDict(entries);
  }

  private buildWindowBounds(): Buffer {
    const x = this.options.windowPosition?.x ?? 100;
    const y = this.options.windowPosition?.y ?? 100;
    const width = this.options.windowSize?.width ?? 640;
    const height = this.options.windowSize?.height ?? 480;

    const bounds = `${x} ${y} ${x + width} ${y + height}`;
    return this.writeUTF16String(bounds);
  }

  private addIconPositions(): void {
    for (const icon of this.options.iconPositions) {
      const lsvp = this.buildLSVP(icon.x, icon.y);
      this.records.set(`${icon.name}:lsvp`, lsvp);
    }
  }

  private buildLSVP(x: number, y: number): Buffer {
    return this.writePlistDict([
      { key: 'X', type: 'long', value: x },
      { key: 'Y', type: 'long', value: y }
    ]);
  }

  private writePlistDict(entries: Array<{ key: string; type: string; value: unknown }>): Buffer {
    const parts: Buffer[] = [];

    parts.push(Buffer.from([0x00, 0x00, 0x00, entries.length]));

    for (const entry of entries) {
      parts.push(this.writePlistEntry(entry.key, entry.type, entry.value));
    }

    return Buffer.concat(parts);
  }

  private writePlistEntry(key: string, type: string, value: unknown): Buffer {
    const parts: Buffer[] = [];

    parts.push(this.writeUTF16String(key));
    parts.push(Buffer.from(type, 'ascii'));

    switch (type) {
      case 'long':
        parts.push(this.writeLong(value as number));
        break;
      case 'bool':
        parts.push(this.writeBool(value as boolean));
        break;
      case 'doub':
        parts.push(this.writeDouble(value as number));
        break;
      case 'ustr':
        parts.push(this.writeUTF16String(value as string));
        break;
      case 'bubb':
        parts.push(value as Buffer);
        break;
    }

    return Buffer.concat(parts);
  }

  private writeLong(value: number): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeInt32BE(value, 0);
    return buf;
  }

  private writeBool(value: boolean): Buffer {
    return Buffer.from([value ? 0x01 : 0x00]);
  }

  private writeDouble(value: number): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(value, 0);
    return buf;
  }

  private writeUTF16String(str: string): Buffer {
    const utf16 = Buffer.from(str, 'utf16le');
    const lengthBuf = Buffer.alloc(4);
    lengthBuf.writeUInt32BE(str.length, 0);
    return Buffer.concat([lengthBuf, utf16]);
  }

  private writeBinary(): Buffer {
    const header = this.writeHeader();
    const allocator = this.writeAllocator();
    const btree = this.writeBTree();

    const totalSize = header.length + allocator.length + btree.length;
    const padding = Buffer.alloc(Math.max(0, 4096 - totalSize));

    return Buffer.concat([header, allocator, btree, padding]);
  }

  private writeHeader(): Buffer {
    const header = Buffer.alloc(32);

    MAGIC.copy(header, 0);
    header.writeUInt32BE(ALLOCATOR_OFFSET, 4);
    header.writeUInt32BE(0x00001000, 8);
    header.writeUInt32BE(0x00000000, 12);

    return header;
  }

  private writeAllocator(): Buffer {
    const allocator = Buffer.alloc(ALLOCATOR_OFFSET - 32);

    allocator.writeUInt32BE(0x00000001, 0);
    allocator.writeUInt32BE(0x00000000, 4);

    return allocator;
  }

  private writeBTree(): Buffer {
    const parts: Buffer[] = [];

    parts.push(this.writeBTreeHeader());

    for (const [key, value] of this.records) {
      parts.push(this.writeBTreeRecord(key, value));
    }

    return Buffer.concat(parts);
  }

  private writeBTreeHeader(): Buffer {
    const header = Buffer.alloc(12);

    header.writeUInt32BE(this.records.size, 0);
    header.writeUInt32BE(0x00000000, 4);
    header.writeUInt32BE(0x00000000, 8);

    return header;
  }

  private writeBTreeRecord(key: string, value: Buffer): Buffer {
    const parts: Buffer[] = [];

    parts.push(this.writeUTF16String(key));
    parts.push(value);

    return Buffer.concat(parts);
  }
}

export function generateDSStore(options: DSStoreOptions): Buffer {
  const writer = new DSStoreWriter(options);
  return writer.generate();
}
