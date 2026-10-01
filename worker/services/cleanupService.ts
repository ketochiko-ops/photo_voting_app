import { RoomRepository } from '../repositories/roomRepository';
export async function cleanupRoom(db: D1Database, bucket: R2Bucket, roomId: string): Promise<void> {
  const repository = new RoomRepository(db);
  await repository.markDeleting(roomId);
  // Listing by an opaque room prefix makes retries safe; absent R2 objects and cascaded DB rows are harmless.
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix: `rooms/${roomId}/`, cursor });
    if (listed.objects.length) await bucket.delete(listed.objects.map((item) => item.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  await repository.remove(roomId);
}
export async function cleanupExpired(
  db: D1Database,
  bucket: R2Bucket,
  now = new Date(),
): Promise<number> {
  const repo = new RoomRepository(db);
  const rooms = await repo.expired(now.toISOString());
  for (const room of rooms) await cleanupRoom(db, bucket, room.id);
  return rooms.length;
}
