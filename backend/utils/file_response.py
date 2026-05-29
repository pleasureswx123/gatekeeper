"""
Authenticated file response helpers.
"""
from pathlib import Path
import mimetypes
from fastapi.responses import FileResponse


def build_file_response(file_path: str, filename: str | None = None, preview: bool = False):
    display_name = filename or Path(file_path).name
    media_type = mimetypes.guess_type(display_name)[0] or "application/octet-stream"

    return FileResponse(
        file_path,
        filename=display_name,
        media_type=media_type,
        content_disposition_type="inline" if preview else "attachment",
    )
