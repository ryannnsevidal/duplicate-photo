import os
import glob
import exifread
from PIL import Image
import imagehash 
from collections import defaultdict

# Settings
IMAGE_FOLDER = "./images"
HASH_FUNC = imagehash.phash  # perceptual hash

def read_exif_tags(filepath):
    """Extract EXIF metadata."""
    try:
        with open(filepath, 'rb') as f:
            tags = exifread.process_file(f, stop_tag="UNDEF", details=False)
        return tags
    except Exception as e:
        print(f"Error reading EXIF from {filepath}: {e}")
        return {}

def get_metadata_key(tags):
    """Create a metadata fingerprint key from selected tags."""
    keys = ['EXIF DateTimeOriginal', 'Image Make', 'Image Model', 'GPS GPSLatitude', 'GPS GPSLongitude']
    return tuple(str(tags.get(k, '')) for k in keys)

def find_duplicates_by_metadata(image_files):
    seen_meta = {}
    duplicates = []

    for path in image_files:
        tags = read_exif_tags(path)
        meta_key = get_metadata_key(tags)

        if meta_key in seen_meta:
            duplicates.append((path, seen_meta[meta_key]))
        else:
            seen_meta[meta_key] = path
    return duplicates

def find_duplicates_by_hash(image_files, hash_func=HASH_FUNC, threshold=5):
    hash_map = {}
    duplicates = []

    for path in image_files:
        try:
            img = Image.open(path)
            img_hash = hash_func(img)
            found = False

            for existing_path, existing_hash in hash_map.items():
                if img_hash - existing_hash <= threshold:  # Hamming distance
                    duplicates.append((path, existing_path))
                    found = True
                    break

            if not found:
                hash_map[path] = img_hash
        except Exception as e:
            print(f"Error hashing {path}: {e}")

    return duplicates

def main():
    image_files = glob.glob(os.path.join(IMAGE_FOLDER, "*.jpg"))

    print("\n🔍 Searching for duplicates using EXIF metadata...")
    meta_duplicates = find_duplicates_by_metadata(image_files)
    for dup in meta_duplicates:
        print(f"Duplicate by metadata: {dup[0]} == {dup[1]}")

    print("\n🔍 Searching for duplicates using perceptual hashing...")
    hash_duplicates = find_duplicates_by_hash(image_files)
    for dup in hash_duplicates:
        print(f"Duplicate by hash: {dup[0]} == {dup[1]}")

if __name__ == "__main__":
    main()
