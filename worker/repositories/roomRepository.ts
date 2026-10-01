import type { PhotoRow, RoomRow } from '../types';
export class RoomRepository {
  constructor(private readonly db: D1Database) {}
  async create(room: RoomRow): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO rooms (id,title,participant_key_hash,admin_key_hash,created_at,expires_at,status) VALUES (?,?,?,?,?,?,?)',
      )
      .bind(
        room.id,
        room.title,
        room.participant_key_hash,
        room.admin_key_hash,
        room.created_at,
        room.expires_at,
        room.status,
      )
      .run();
  }
  async find(id: string): Promise<RoomRow | null> {
    return this.db.prepare('SELECT * FROM rooms WHERE id=?').bind(id).first<RoomRow>();
  }
  async photos(roomId: string): Promise<PhotoRow[]> {
    const result = await this.db
      .prepare('SELECT * FROM photos WHERE room_id=? ORDER BY sort_order')
      .bind(roomId)
      .all<PhotoRow>();
    return result.results;
  }
  async participantCount(roomId: string): Promise<number> {
    const row = await this.db
      .prepare('SELECT COUNT(*) count FROM participants WHERE room_id=?')
      .bind(roomId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }
  async expired(now: string): Promise<RoomRow[]> {
    const result = await this.db
      .prepare("SELECT * FROM rooms WHERE expires_at<=? OR status='deleting'")
      .bind(now)
      .all<RoomRow>();
    return result.results;
  }
  async markDeleting(id: string): Promise<void> {
    await this.db.prepare("UPDATE rooms SET status='deleting' WHERE id=?").bind(id).run();
  }
  async remove(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM rooms WHERE id=?').bind(id).run();
  }
}
