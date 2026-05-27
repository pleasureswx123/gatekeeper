import { API_BASE_URL } from './config';
import { apiClient } from './client';

export async function downloadAuthenticatedFile(path: string, fallbackFilename: string) {
  const token = apiClient.getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '文件下载失败');
  }

  const blob = await response.blob();
  const filename = getFilenameFromDisposition(response.headers.get('content-disposition')) || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getFilenameFromDisposition(disposition: string | null) {
  if (!disposition) return null;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || null;
}
