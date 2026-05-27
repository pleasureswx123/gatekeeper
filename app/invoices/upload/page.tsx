/**
 * 发票上传页面
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { useTaskProgress } from '@/hooks/useTaskProgress';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function InvoiceUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const { progress } = useTaskProgress(taskId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('请选择 PNG、JPG 或 PDF 文件');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('请选择发票文件');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('invoice_type', 'normal');

      const response = await apiClient.uploadFile(
        API_ENDPOINTS.INVOICES_UPLOAD,
        formData,
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      );

      setInvoiceId(response.invoice_id);
      setTaskId(response.task_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || '上传失败，请重试');
      setUploading(false);
    }
  };

  const handleViewInvoice = () => {
    if (invoiceId) {
      router.push(`/invoices/${invoiceId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">上传发票</h1>
          <p className="text-muted-foreground">
            上传发票文件进行 OCR 识别和真伪验证
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>发票文件</CardTitle>
            <CardDescription>支持 PNG、JPG 和 PDF 格式，最大 50MB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!taskId ? (
              <>
                {/* 文件上传区域 */}
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                     onClick={() => document.getElementById('file-input')?.click()}>
                  <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium mb-1">点击选择文件或拖拽上传</p>
                  <p className="text-sm text-muted-foreground mb-4">支持 PNG、JPG、PDF 格式</p>
                  {file && (
                    <p className="text-sm text-green-600 font-medium">
                      已选择: {file.name}
                    </p>
                  )}
                </div>

                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    '上传并识别'
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* 处理进度显示 */}
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">发票已上传</p>
                        <p className="text-xs text-muted-foreground">正在进行 OCR 识别...</p>
                      </div>
                    </div>

                    {progress && (
                      <>
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">
                              {progress.current_step || '处理中'}
                            </span>
                            <span className="text-sm font-bold">
                              {progress.progress_percentage || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progress.progress_percentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {progress.status_message}
                        </p>
                      </>
                    )}
                  </div>

                  {progress?.progress_percentage === 100 && (
                    <Button
                      onClick={handleViewInvoice}
                      className="w-full"
                      size="lg"
                    >
                      查看识别结果
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
