"""
Firebase Authentication & Admin SDK Module for Lucky Trade AI
Connected to project: opc-ai-trader
Service Account: firebase-adminsdk-fbsvc@opc-ai-trader.iam.gserviceaccount.com
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("firebase_auth")

KEY_FILENAME = "opc-ai-trader-firebase-adminsdk-fbsvc-17705c7301.json"

_firebase_app = None
_firebase_initialized = False

def init_firebase_admin() -> bool:
    global _firebase_app, _firebase_initialized
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        if len(firebase_admin._apps) > 0:
            _firebase_initialized = True
            return True

        # Search paths for the service account key
        search_paths = [
            Path(__file__).resolve().parent.parent / KEY_FILENAME,
            Path(__file__).resolve().parent.parent / "config" / KEY_FILENAME,
            Path(r"D:\TRADE-AI") / KEY_FILENAME,
            Path(r"D:\TRADE-AI\AI-Trader-main") / KEY_FILENAME
        ]

        cert_path = None
        for p in search_paths:
            if p.exists():
                cert_path = str(p)
                break

        if not cert_path:
            logger.warning("Firebase service account key file not found: %s", KEY_FILENAME)
            return False

        cred = credentials.Certificate(cert_path)
        _firebase_app = firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase Admin SDK initialized successfully with: %s", cert_path)
        return True
    except Exception as exc:
        logger.warning("Failed to initialize Firebase Admin SDK: %s", exc)
        return False

def verify_token(id_token: str) -> Optional[Dict[str, Any]]:
    """Xác thực token JWT từ client gửi lên."""
    if not init_firebase_admin():
        return None
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(id_token)
        return decoded
    except Exception as exc:
        logger.warning("Token verification failed: %s", exc)
        return None
