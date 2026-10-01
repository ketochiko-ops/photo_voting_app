import { describe, expect, it } from 'vitest';
import { detectedImageMime, validateImage } from '../../worker/utils/image';
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
});
