import { describe, expect, it } from 'vitest';
import { detectedImageMime, sanitizeImage, validateImage } from '../../worker/utils/image';
describe('image validation', () => {
  it('uses magic bytes instead of trusting MIME', () => {
    const jpeg = new Uint8Array([255, 216, 255, 1]);
    expect(detectedImageMime(jpeg)).toBe('image/jpeg');
    expect(() => validateImage(jpeg, 'image/png')).toThrow('INVALID_IMAGE');
  });
  it('enforces converted size server-side', () =>
    expect(() => validateImage(new Uint8Array([255, 216, 255, 1]), 'image/jpeg', 3)).toThrow(
      'FILE_TOO_LARGE',
    ));
  it('removes JPEG EXIF and comment segments while preserving image data', () => {
    const jpeg = new Uint8Array([
      0xff,
      0xd8,
      0xff,
      0xe1,
      0x00,
      0x08,
      ...new TextEncoder().encode('Exif\0\0'),
      0xff,
      0xfe,
      0x00,
      0x05,
      1,
      2,
      3,
      0xff,
      0xdb,
      0x00,
      0x03,
      7,
      0xff,
      0xd9,
    ]);
    expect(Array.from(sanitizeImage(jpeg, 'image/jpeg'))).toEqual([
      0xff, 0xd8, 0xff, 0xdb, 0x00, 0x03, 7, 0xff, 0xd9,
    ]);
  });

  it('retains only the EXIF orientation needed to render JPEG pixels correctly', () => {
    const privateExif = new Uint8Array([
      0xff,
      0xd8,
      0xff,
      0xe1,
      0,
      0x33,
      ...new TextEncoder().encode('Exif\0\0'),
      0x49,
      0x49,
      0x2a,
      0,
      8,
      0,
      0,
      0,
      2,
      0,
      0x12,
      1,
      3,
      0,
      1,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0x0f,
      1,
      2,
      0,
      5,
      0,
      0,
      0,
      38,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ...new TextEncoder().encode('Alice'),
      0xff,
      0xd9,
    ]);

    const sanitized = sanitizeImage(privateExif, 'image/jpeg');
    expect(Array.from(sanitized)).toEqual([
      0xff,
      0xd8,
      0xff,
      0xe1,
      0,
      0x22,
      ...new TextEncoder().encode('Exif\0\0'),
      0x49,
      0x49,
      0x2a,
      0,
      8,
      0,
      0,
      0,
      1,
      0,
      0x12,
      1,
      3,
      0,
      1,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0xff,
      0xd9,
    ]);
    expect(new TextDecoder().decode(sanitized)).not.toContain('Alice');
  });

  it('retains JPEG color rendering segments but removes unrelated application data', () => {
    const segment = (marker: number, data: number[]) => [0xff, marker, 0, data.length + 2, ...data];
    const icc = segment(0xe2, [...new TextEncoder().encode('ICC_PROFILE\0'), 1, 1, 42]);
    const privateApp = segment(0xed, [...new TextEncoder().encode('private')]);
    const jpeg = new Uint8Array([0xff, 0xd8, ...icc, ...privateApp, 0xff, 0xd9]);

    expect(Array.from(sanitizeImage(jpeg, 'image/jpeg'))).toEqual([0xff, 0xd8, ...icc, 0xff, 0xd9]);
  });

  it('removes PNG textual metadata chunks', () => {
    const chunk = (type: string, data: number[]) => [
      0,
      0,
      0,
      data.length,
      ...new TextEncoder().encode(type),
      ...data,
      0,
      0,
      0,
      0,
    ];
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    const png = new Uint8Array([
      ...signature,
      ...chunk('tEXt', [1, 2]),
      ...chunk('IDAT', [3]),
      ...chunk('IEND', []),
    ]);
    expect(Array.from(sanitizeImage(png, 'image/png'))).toEqual([
      ...signature,
      ...chunk('IDAT', [3]),
      ...chunk('IEND', []),
    ]);
  });
});
