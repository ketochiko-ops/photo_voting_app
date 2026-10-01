export const DEFAULT_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp';
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
