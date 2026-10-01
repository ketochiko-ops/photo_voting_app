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
