ALTER TABLE images ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS sha256_canonical TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS pdf_pages INT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS pdf_has_text BOOLEAN;
ALTER TABLE images ADD COLUMN IF NOT EXISTS pdf_has_images BOOLEAN;
ALTER TABLE images ADD COLUMN IF NOT EXISTS pdf_simhash BIGINT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS pdf_tlsh TEXT;

CREATE TABLE IF NOT EXISTS pdf_page_fingerprints (
	id BIGSERIAL PRIMARY KEY,
	image_id BIGINT REFERENCES images(id) ON DELETE CASCADE,
	page_index INT NOT NULL,
	phash BIGINT,
	simhash BIGINT,
	width INT,
	height INT
);

CREATE INDEX IF NOT EXISTS idx_images_sha256_canon ON images(sha256_canonical);
CREATE INDEX IF NOT EXISTS idx_images_pdf_simhash ON images(pdf_simhash);
CREATE INDEX IF NOT EXISTS idx_pdf_pages_image_id ON pdf_page_fingerprints(image_id);