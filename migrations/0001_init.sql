-- Initial schema

CREATE TABLE IF NOT EXISTS images (
	id BIGSERIAL PRIMARY KEY,
	path TEXT UNIQUE NOT NULL,
	size BIGINT NOT NULL,
	sha256 TEXT NOT NULL,
	width INT,
	height INT,
	exif_dt TIMESTAMPTZ,
	phash BIGINT,
	dhash BIGINT,
	status TEXT DEFAULT 'OK',
	scanned_at TIMESTAMPTZ DEFAULT now(),
	added_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dupe_groups (
	id BIGSERIAL PRIMARY KEY,
	representative_image_id BIGINT REFERENCES images(id),
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dupe_group_members (
	group_id BIGINT REFERENCES dupe_groups(id),
	image_id BIGINT REFERENCES images(id),
	distance INT NOT NULL,
	reason TEXT NOT NULL,
	PRIMARY KEY (group_id, image_id)
);

CREATE INDEX IF NOT EXISTS idx_images_sha256 ON images(sha256);
CREATE INDEX IF NOT EXISTS idx_images_path ON images(path);