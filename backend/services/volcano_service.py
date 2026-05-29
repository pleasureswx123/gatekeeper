"""
火山引擎 API 集成（LLM 和 OCR）
"""
import requests
import json
from typing import Dict, Any
from config import settings
import base64
import mimetypes
import os
import tempfile


class VolcanoEngineClient:
    """火山引擎 API 客户端"""
    
    def __init__(self):
        self.api_key = settings.ARK_API_KEY
        self.base_url = settings.ARK_BASE_URL.rstrip("/")
        self.chat_model = settings.ARK_CHAT_MODEL
        self.invoice_verification_mode = settings.INVOICE_VERIFICATION_MODE
    
    def _chat_completions(self, messages: list, temperature: float = 0.2, max_tokens: int = 2000) -> Dict[str, Any]:
        """调用火山方舟 OpenAI 兼容 Chat Completions API"""
        if not self.api_key:
            raise ValueError("ARK_API_KEY is not configured")

        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            json={
                "model": self.chat_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=60,
        )
        if not response.ok:
            try:
                error_body = response.json()
                message = error_body.get("error", {}).get("message") or response.text
            except ValueError:
                message = response.text
            raise RuntimeError(
                f"ARK API request failed ({response.status_code}): {message[:500]}"
            )
        return response.json()

    @staticmethod
    def _parse_json_content(content: str) -> Dict[str, Any]:
        """解析模型返回的 JSON，兼容被代码块包裹的情况"""
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()

        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError(f"Model response is not JSON: {content[:300]}")
        return json.loads(cleaned[start:end + 1])

    @staticmethod
    def _file_to_image_data_url(file_path: str) -> str:
        """将图片或 PDF 首页转换为模型可识别的图片 data URL"""
        mime_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

        if mime_type == "application/pdf" or file_path.lower().endswith(".pdf"):
            from pdf2image import convert_from_path

            with tempfile.TemporaryDirectory() as tmpdir:
                pages = convert_from_path(
                    file_path,
                    dpi=180,
                    first_page=1,
                    last_page=1,
                    fmt="png",
                    output_folder=tmpdir,
                )
                if not pages:
                    raise ValueError("PDF invoice has no renderable pages")

                rendered_path = os.path.join(tmpdir, "invoice_page_1.png")
                pages[0].save(rendered_path, "PNG")
                with open(rendered_path, "rb") as f:
                    image_data = base64.b64encode(f.read()).decode("utf-8")
                return f"data:image/png;base64,{image_data}"

        if not mime_type.startswith("image/"):
            raise ValueError(f"Unsupported invoice file type: {mime_type}")

        with open(file_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        return f"data:{mime_type};base64,{image_data}"
    
    def recognize_invoice_ocr(self, image_path: str) -> Dict[str, Any]:
        """
        识别发票 OCR
        使用火山方舟多模态模型识别发票
        """
        try:
            data_url = self._file_to_image_data_url(image_path)
            messages = [
                {
                    "role": "system",
                    "content": (
                        "你是发票结构化识别助手。请从图片中提取发票字段，只返回合法 JSON，"
                        "不要返回 Markdown、解释或多余文本。无法识别的字段返回空字符串或 0。"
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """请识别这张发票，按以下结构返回：
{
  "invoice_number": "",
  "invoice_code": "",
  "invoice_date": "",
  "issuer_name": "",
  "issuer_tax_id": "",
  "receiver_name": "",
  "receiver_tax_id": "",
  "invoice_amount": 0,
  "tax_amount": 0,
  "total_amount": 0,
  "confidence": 0,
  "items": [
    {
      "name": "",
      "quantity": 0,
      "unit": "",
      "price": 0,
      "amount": 0,
      "tax_rate": 0,
      "tax_amount": 0
    }
  ]
}""",
                        },
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ]
            completion = self._chat_completions(messages, temperature=0.0, max_tokens=2000)
            content = completion["choices"][0]["message"]["content"]
            result = self._parse_json_content(content)
            result["status"] = "success"
            return result
        except Exception as e:
            return {
                "status": "error",
                "error_message": str(e),
                "confidence": 0.0
            }
    
    def verify_invoice_authenticity(self, invoice_number: str, invoice_code: str) -> Dict[str, Any]:
        """
        验证发票真伪
        当前支持 mock 模式，真实验真后续应接发票核验服务
        """
        try:
            if self.invoice_verification_mode != "mock":
                raise ValueError(
                    f"Unsupported INVOICE_VERIFICATION_MODE: {self.invoice_verification_mode}"
                )

            result = {
                "status": "success",
                "is_valid": True,
                "is_voided": False,
                "verification_method": "mock",
                "details": {
                    "invoice_number": invoice_number,
                    "invoice_code": invoice_code,
                    "issuer_verified": True,
                    "amount_verified": True,
                    "date_valid": True,
                    "note": "Mock verification result. It does not prove invoice authenticity."
                }
            }
            
            return result
        except Exception as e:
            return {
                "status": "error",
                "error_message": str(e),
                "is_valid": False
            }
    
    def check_duplicate_invoice(self, invoice_number: str, receiver_tax_id: str) -> Dict[str, Any]:
        """
        检查重复发票
        查询该纳税人是否已经报销过此发票
        """
        try:
            # 模拟检查结果
            result = {
                "status": "success",
                "is_duplicate": False,
                "previous_submission": None
            }
            
            return result
        except Exception as e:
            return {
                "status": "error",
                "error_message": str(e)
            }
    
    def analyze_contract_with_llm(self, contract_text: str) -> Dict[str, Any]:
        """
        使用 LLM 分析合同风险
        调用火山方舟大模型 API 进行深层语义分析
        """
        try:
            messages = [
                {
                    "role": "system",
                    "content": """你是一位资深的财务法律顾问。你需要分析合同中的财务风险。
请识别以下风险类型：
1. 税率风险 - 不符合当前税法的条款
2. 付款风险 - 不合理的付款条件或延期条款
3. 违约风险 - 违约责任和赔偿条款不清晰
4. 保险风险 - 缺少必要的保险条款
5. 保密风险 - 保密条款不完整

对于每个识别的风险，提供：
- 风险类型
- 严重程度（低/中/高/严重）
- 具体位置
- 修复建议
请只返回合法 JSON，结构为：
{
  "risks": [
    {
      "type": "",
      "severity": "",
      "description": "",
      "suggestion": ""
    }
  ],
  "risk_score": 0,
  "risk_level": "",
  "analysis_confidence": 0
}
"""
                },
                {
                    "role": "user",
                    "content": f"请分析以下合同文本的风险：\n\n{contract_text[:12000]}"
                }
            ]
            completion = self._chat_completions(messages, temperature=0.2, max_tokens=3000)
            content = completion["choices"][0]["message"]["content"]
            result = self._parse_json_content(content)
            result["status"] = "success"
            return result
        except Exception as e:
            return {
                "status": "error",
                "error_message": str(e)
            }


volcano_client = VolcanoEngineClient()
