const encoder = new TextEncoder();
const BASE64_REPLACEMENTS: Record<string, string> = { '+': '-', '/': '_', '=': '' };

/** Generates opaque URL-safe identifiers without time, sequence, or device information. */
export function randomToken(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/[+/=]/g, (value) => BASE64_REPLACEMENTS[value]);
}
export const generateRoomId = () => randomToken(18);
export const generateAccessKey = () => randomToken(32);
export const generateParticipantToken = () => randomToken(32);
export const generatePhotoId = () => randomToken(18);

/** SHA-256 is appropriate because inputs are 256-bit random secrets rather than human passwords. */
export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function constantTimeEqual(left: string, right: string): boolean {
  const max = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < max; index += 1)
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}
export function readBearer(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  return token.length >= 40 && token.length <= 100 ? token : null;
}
