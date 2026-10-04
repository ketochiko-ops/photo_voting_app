CREATE TABLE votes_new (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('favorite','recommendation','unpublishable')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(photo_id, participant_id, vote_type)
);

INSERT INTO votes_new(room_id, photo_id, participant_id, vote_type, created_at)
SELECT room_id, photo_id, participant_id, 'favorite', created_at FROM votes;

DROP TABLE votes;
ALTER TABLE votes_new RENAME TO votes;
CREATE INDEX idx_votes_room ON votes(room_id);
