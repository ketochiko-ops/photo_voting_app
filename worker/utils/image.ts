export const DEFAULT_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp';
function appendBytes(output: number[], bytes: Uint8Array | number[]): void {
  for (const byte of bytes) output.push(byte);
}
export function detectedImageMime(bytes: Uint8Array): SupportedMime | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.slice(0, 8).every((v, i) => v === [137, 80, 78, 71, 13, 10, 26, 10][i]))
    return 'image/png';
  if (
    new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  return null;
}
export function validateImage(
  bytes: Uint8Array,
  declaredMime: string,
  maxBytes = DEFAULT_MAX_PHOTO_BYTES,
): SupportedMime {
  if (bytes.byteLength > maxBytes) throw new Error('FILE_TOO_LARGE');
  const detected = detectedImageMime(bytes);
  if (!detected || detected !== declaredMime) throw new Error('INVALID_IMAGE');
  return detected;
}

/** Remove application/comment segments, including EXIF, XMP and ICC data, from a JPEG. */
function sanitizeJpeg(input: Uint8Array): Uint8Array {
  const output: number[] = [0xff, 0xd8];
  let offset = 2;
  while (offset < input.length) {
    if (input[offset] !== 0xff) throw new Error('INVALID_IMAGE');
    const markerStart = offset;
    while (input[offset] === 0xff) offset++;
    const marker = input[offset++];
    if (marker === 0xd9) {
      output.push(0xff, marker);
      return new Uint8Array(output);
    }
    // Standalone restart markers can occur while traversing entropy-coded scans.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      output.push(0xff, marker);
      continue;
    }
    if (offset + 2 > input.length) throw new Error('INVALID_IMAGE');
    const length = (input[offset] << 8) | input[offset + 1];
    const end = offset + length;
    if (length < 2 || end > input.length) throw new Error('INVALID_IMAGE');
    const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) appendBytes(output, input.slice(markerStart, end));
    offset = end;
    if (marker === 0xda) {
      // Copy compressed scan bytes until the next non-stuffed, non-restart marker.
      const scanStart = offset;
      while (offset < input.length - 1) {
        if (input[offset] !== 0xff) {
          offset++;
          continue;
        }
        let next = offset + 1;
        while (input[next] === 0xff) next++;
        const nextMarker = input[next];
        if (nextMarker === 0x00 || (nextMarker >= 0xd0 && nextMarker <= 0xd7)) {
          offset = next + 1;
          continue;
        }
        appendBytes(output, input.slice(scanStart, offset));
        break;
      }
    }
  }
  throw new Error('INVALID_IMAGE');
}

function sanitizePng(input: Uint8Array): Uint8Array {
  const output: number[] = [...input.slice(0, 8)];
  // Only chunks required to render static or animated PNGs are retained.
  const imageChunks = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'acTL', 'fcTL', 'fdAT']);
  let offset = 8;
  while (offset + 12 <= input.length) {
    const length =
      ((input[offset] << 24) |
        (input[offset + 1] << 16) |
        (input[offset + 2] << 8) |
        input[offset + 3]) >>>
      0;
    const end = offset + 12 + length;
    if (end > input.length) throw new Error('INVALID_IMAGE');
    const type = new TextDecoder().decode(input.slice(offset + 4, offset + 8));
    if (imageChunks.has(type)) appendBytes(output, input.slice(offset, end));
    offset = end;
    if (type === 'IEND') return new Uint8Array(output);
  }
  throw new Error('INVALID_IMAGE');
}

function writeUint32LE(output: number[], value: number): void {
  output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, value >>> 24);
}

function sanitizeWebp(input: Uint8Array): Uint8Array {
  const chunks: number[] = [];
  const imageChunks = new Set(['VP8X', 'ALPH', 'ANIM', 'ANMF', 'VP8 ', 'VP8L']);
  let offset = 12;
  while (offset + 8 <= input.length) {
    const type = new TextDecoder().decode(input.slice(offset, offset + 4));
    const view = new DataView(input.buffer, input.byteOffset + offset + 4, 4);
    const length = view.getUint32(0, true);
    const paddedEnd = offset + 8 + length + (length % 2);
    if (paddedEnd > input.length) throw new Error('INVALID_IMAGE');
    if (imageChunks.has(type)) {
      const chunk = Array.from(input.slice(offset, paddedEnd));
      // Clear ICC, EXIF and XMP presence flags in the VP8X feature byte.
      if (type === 'VP8X' && length >= 1) chunk[8] &= ~(0x20 | 0x08 | 0x04);
      appendBytes(chunks, chunk);
    }
    offset = paddedEnd;
  }
  if (offset !== input.length) throw new Error('INVALID_IMAGE');
  const output = [...new TextEncoder().encode('RIFF')];
  writeUint32LE(output, 4 + chunks.length);
  appendBytes(output, new TextEncoder().encode('WEBP'));
  appendBytes(output, chunks);
  return new Uint8Array(output);
}

/**
 * Return image bytes with privacy-sensitive metadata removed. The operation is
 * deliberately server-side so clients cannot accidentally bypass it.
 */
export function sanitizeImage(bytes: Uint8Array, mime: SupportedMime): Uint8Array {
  if (mime === 'image/jpeg') return sanitizeJpeg(bytes);
  if (mime === 'image/png') return sanitizePng(bytes);
  return sanitizeWebp(bytes);
}
