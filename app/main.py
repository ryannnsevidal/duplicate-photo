from fastapi import FastAPI, UploadFile, File
from typing import List
import os
import hashlib
from PIL import Image
import imagehash
import pandas as pd
from io import BytesIO

app = FastAPI(title="Photo & Document Deduplicator API")

IMAGE_HASH_THRESHOLD = 5
image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff'}
document_extensions = {'.pdf', '.docx', '.txt'}

def get_image_hash(image_bytes):
    try:
        image = Image.open(BytesIO(image_bytes))
        return imagehash.phash(image)
    except Exception:
        return None

def get_file_hash(file_bytes):
    try:
        return hashlib.sha256(file_bytes).hexdigest()
    except Exception:
        return None

@app.post("/api/detect-duplicates/")
async def detect_duplicates(files: List[UploadFile] = File(...)):
    seen_image_hashes = {}
    seen_file_hashes = {}
    duplicate_files = []

    for file in files:
        contents = await file.read()
        ext = os.path.splitext(file.filename)[1].lower()

        if ext in image_extensions:
            img_hash = get_image_hash(contents)
            if img_hash is None:
                continue
            duplicate_found = False
            for seen_path, seen_hash in seen_image_hashes.items():
                if abs(img_hash - seen_hash) <= IMAGE_HASH_THRESHOLD:
                    duplicate_files.append((file.filename, seen_path))
                    duplicate_found = True
                    break
            if not duplicate_found:
                seen_image_hashes[file.filename] = img_hash

        elif ext in document_extensions:
            file_hash = get_file_hash(contents)
            if file_hash is None:
                continue
            if file_hash in seen_file_hashes.values():
                for k, v in seen_file_hashes.items():
                    if v == file_hash:
                        duplicate_files.append((file.filename, k))
                        break
            else:
                seen_file_hashes[file.filename] = file_hash

    df = pd.DataFrame(duplicate_files, columns=["Duplicate", "Original"])
    df.to_csv("duplicates.csv", index=False)
    return {"duplicates": duplicate_files}
