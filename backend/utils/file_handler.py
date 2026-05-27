"""
文件处理工具
"""
import os
import shutil
from pathlib import Path
from config import settings
import mimetypes


def ensure_upload_dir():
    """确保上传目录存在"""
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def save_upload_file(file, subfolder: str = "") -> str:
    """保存上传的文件"""
    ensure_upload_dir()
    
    # 生成文件存储路径
    if subfolder:
        file_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    else:
        file_dir = settings.UPLOAD_DIR
    
    Path(file_dir).mkdir(parents=True, exist_ok=True)
    
    file_path = os.path.join(file_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return file_path


def delete_file(file_path: str) -> bool:
    """删除文件"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        return True
    except Exception as e:
        print(f"Error deleting file: {e}")
        return False


def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return os.path.splitext(filename)[1].lower()


def is_allowed_file(filename: str) -> bool:
    """检查文件是否允许上传"""
    return get_file_extension(filename) in settings.ALLOWED_EXTENSIONS


def get_file_size(file_path: str) -> int:
    """获取文件大小（字节）"""
    if os.path.exists(file_path):
        return os.path.getsize(file_path)
    return 0
