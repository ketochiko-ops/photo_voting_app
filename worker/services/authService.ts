import type { Role } from '../../shared/types';
import { constantTimeEqual, hashSecret } from '../utils/security';
import { isExpired } from '../utils/domain';
import type { RoomRow } from '../types';
export async function authenticateRoom(
  room: RoomRow | null,
  suppliedKey: string | null,
  requiredRole?: Role,
): Promise<Role | null> {
  // Always hash even for missing rooms/keys so room enumeration does not get an obvious fast path.
  const suppliedHash = await hashSecret(suppliedKey ?? 'invalid-placeholder-key');
  const participantHash = room?.participant_key_hash ?? '0'.repeat(64);
  const adminHash = room?.admin_key_hash ?? 'f'.repeat(64);
  const role = constantTimeEqual(suppliedHash, adminHash)
    ? 'admin'
    : constantTimeEqual(suppliedHash, participantHash)
      ? 'participant'
      : null;
  if (!room || room.status !== 'active' || isExpired(room.expires_at) || !role) return null;
  return requiredRole && role !== requiredRole ? null : role;
}
