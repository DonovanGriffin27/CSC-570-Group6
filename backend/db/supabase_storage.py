import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

BUCKET = "evidence-files"

_client = None

def _get_client():
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        _client = create_client(url, key)
    return _client


ALLOWED_MIME_TYPES = {
    # Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    # Images
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
    # Video
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    # Audio
    "audio/mpeg",
    "audio/wav",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def upload_evidence_file(evidence_id: int, filename: str, data: bytes, content_type: str) -> str:
    path = f"evidence/{evidence_id}/{filename}"
    _get_client().storage.from_(BUCKET).upload(
        path=path,
        file=data,
        file_options={"content-type": content_type},
    )
    return path


def get_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    result = _get_client().storage.from_(BUCKET).create_signed_url(storage_path, expires_in)
    return result["signedURL"]
