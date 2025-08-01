"""
Firebase Integration for Google Drive Duplicate Detection
Extends the FastAPI backend with Firebase Authentication and Firestore
"""

import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FirebaseService:
    """Firebase service for authentication and database operations"""
    
    def __init__(self):
        self.db = None
        self.app = None
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Try to get credentials from environment or service account file
            firebase_key_path = os.getenv('FIREBASE_PRIVATE_KEY_PATH')
            
            if firebase_key_path and os.path.exists(firebase_key_path):
                # Use service account file
                cred = credentials.Certificate(firebase_key_path)
                logger.info("Using Firebase service account file")
            else:
                # Try to use default credentials or environment variables
                try:
                    cred = credentials.ApplicationDefault()
                    logger.info("Using Firebase application default credentials")
                except Exception:
                    logger.warning("Firebase credentials not found. Firebase features disabled.")
                    return
            
            # Initialize Firebase app
            if not firebase_admin._apps:
                self.app = firebase_admin.initialize_app(cred)
            else:
                self.app = firebase_admin.get_app()
            
            # Initialize Firestore
            self.db = firestore.client()
            logger.info("Firebase initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            self.db = None
    
    def is_available(self) -> bool:
        """Check if Firebase is available"""
        return self.db is not None
    
    def verify_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token"""
        if not self.is_available():
            return None
        
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None
    
    def save_user_session(self, user_id: str, session_data: Dict[str, Any]) -> bool:
        """Save user session data to Firestore"""
        if not self.is_available():
            return False
        
        try:
            doc_ref = self.db.collection('user_sessions').document(user_id)
            doc_ref.set(session_data, merge=True)
            logger.info(f"Session saved for user: {user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save session: {e}")
            return False
    
    def get_user_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user session data from Firestore"""
        if not self.is_available():
            return None
        
        try:
            doc_ref = self.db.collection('user_sessions').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Failed to get session: {e}")
            return None
    
    def save_drive_files(self, user_id: str, files_data: list) -> bool:
        """Save Google Drive files data to Firestore"""
        if not self.is_available():
            return False
        
        try:
            # Save files in batches (Firestore batch limit is 500)
            batch_size = 500
            for i in range(0, len(files_data), batch_size):
                batch = self.db.batch()
                batch_files = files_data[i:i + batch_size]
                
                for file_data in batch_files:
                    doc_ref = self.db.collection('drive_files').document(f"{user_id}_{file_data['id']}")
                    file_data['user_id'] = user_id
                    batch.set(doc_ref, file_data, merge=True)
                
                batch.commit()
            
            logger.info(f"Saved {len(files_data)} files for user: {user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save drive files: {e}")
            return False
    
    def get_drive_files(self, user_id: str, limit: int = 1000) -> list:
        """Get Google Drive files for a user from Firestore"""
        if not self.is_available():
            return []
        
        try:
            query = self.db.collection('drive_files').where('user_id', '==', user_id).limit(limit)
            docs = query.stream()
            
            files = []
            for doc in docs:
                file_data = doc.to_dict()
                files.append(file_data)
            
            logger.info(f"Retrieved {len(files)} files for user: {user_id}")
            return files
        except Exception as e:
            logger.error(f"Failed to get drive files: {e}")
            return []
    
    def save_duplicate_analysis(self, user_id: str, analysis_data: Dict[str, Any]) -> bool:
        """Save duplicate analysis results to Firestore"""
        if not self.is_available():
            return False
        
        try:
            doc_ref = self.db.collection('duplicate_analysis').document(user_id)
            analysis_data['user_id'] = user_id
            analysis_data['timestamp'] = firestore.SERVER_TIMESTAMP
            doc_ref.set(analysis_data, merge=True)
            
            logger.info(f"Saved duplicate analysis for user: {user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save duplicate analysis: {e}")
            return False
    
    def get_duplicate_analysis(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get duplicate analysis results from Firestore"""
        if not self.is_available():
            return None
        
        try:
            doc_ref = self.db.collection('duplicate_analysis').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Failed to get duplicate analysis: {e}")
            return None

# Global Firebase service instance
firebase_service = FirebaseService()

def get_firebase_service() -> FirebaseService:
    """Get the global Firebase service instance"""
    return firebase_service
