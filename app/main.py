from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer
from typing import List
import os
import firebase_admin
from firebase_admin import credentials, auth
from PIL import Image
import imagehash
from io import BytesIO
from pathlib import Path

app = FastAPI(title="Photo & Document Deduplicator API")

# --- Firebase Admin SDK initialization ---
FIREBASE_CRED_PATH = os.environ.get("FIREBASE_CRED_PATH", "firebase_service_account.json")
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CRED_PATH)
    firebase_admin.initialize_app(cred)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  # tokenUrl is unused, but required

# --- Firebase Auth user verification ---
async def get_current_user(token: str = Security(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate Firebase credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token  # contains uid, email, etc.
    except Exception:
        raise credentials_exception

# --- Secure upload endpoint ---
@app.post("/upload/")
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    image_hashes = {}
    doc_hashes = {}
    deleted_files = []
    saved_files = []

    UPLOAD_DIR = "uploaded_files"
    Path(UPLOAD_DIR).mkdir(exist_ok=True)
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff'}
    document_extensions = {'.pdf', '.docx', '.txt'}
    IMAGE_HASH_THRESHOLD = 5

    def get_image_hash(image_bytes):
        try:
            image = Image.open(BytesIO(image_bytes))
            return imagehash.phash(image)
        except Exception as e:
            print(f"Image hash failed: {e}")
            return None

    def get_file_hash(file_bytes):
        try:
            import hashlib
            return hashlib.md5(file_bytes).hexdigest()
        except Exception as e:
            print(f"File hash failed: {e}")
            return None

    for file in files:
        content = await file.read()
        ext = os.path.splitext(file.filename)[1].lower()
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        if ext in image_extensions:
            img_hash = get_image_hash(content)
            if img_hash is None:
                continue

            is_duplicate = False
            for existing_name, existing_hash in image_hashes.items():
                if abs(img_hash - existing_hash) <= IMAGE_HASH_THRESHOLD:
                    print(f"Duplicate found (image): {file.filename} ~ {existing_name}")
                    deleted_files.append(file.filename)
                    is_duplicate = True
                    break
            if not is_duplicate:
                image_hashes[file.filename] = img_hash
                with open(file_path, "wb") as f:
                    f.write(content)
                saved_files.append(file.filename)

        elif ext in document_extensions:
            doc_hash = get_file_hash(content)
            if doc_hash in doc_hashes.values():
                print(f"Duplicate found (doc): {file.filename}")
                deleted_files.append(file.filename)
            else:
                doc_hashes[file.filename] = doc_hash
                with open(file_path, "wb") as f:
                    f.write(content)
                saved_files.append(file.filename)

    return {
        "saved_files": saved_files,
        "deleted_duplicates": deleted_files,
        "firebase_user": current_user.get("email", current_user.get("uid"))
    }

@app.get("/")
def root():
    return {"message": "Duplicate Photo API is running. Use /upload to POST files."}

@app.get("/favicon.ico")
def favicon():
    return {"message": "No favicon. This is an API."}
