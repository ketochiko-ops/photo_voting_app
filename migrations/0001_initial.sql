PRAGMA foreign_keys = ON;
CREATE TABLE rooms (id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100), participant_key_hash TEXT NOT NULL, admin_key_hash TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('active','deleting')));
CREATE TABLE photos (id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, object_key TEXT NOT NULL UNIQUE, original_filename TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, byte_size INTEGER NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE participants (id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 50), participant_token_hash TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(room_id, participant_token_hash));
CREATE TABLE votes (room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE, participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE, created_at TEXT NOT NULL, PRIMARY KEY(photo_id, participant_id));
CREATE INDEX idx_photos_room_order ON photos(room_id, sort_order);
CREATE INDEX idx_participants_room ON participants(room_id);
CREATE INDEX idx_votes_room ON votes(room_id);
CREATE INDEX idx_rooms_expiry ON rooms(status, expires_at);
