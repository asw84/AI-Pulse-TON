"""
AI Pulse TON - FastAPI Backend
Сервер для AI-анализа TON экосистемы
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
from typing import Optional
from datetime import datetime

# Загрузка переменных окружения
load_dotenv()

# Конфигурация
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
AI_MODEL = os.getenv("AI_MODEL", "anthropic/claude-3.5-sonnet")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
TONCENTER_API_KEY = os.getenv("TONCENTER_API_KEY", "")
PAYMENT_WALLET = os.getenv("PAYMENT_WALLET", "")

app = FastAPI(
    title="AI Pulse TON",
    description="AI-powered TON ecosystem analysis",
    version="1.0.0"
)

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://*.vercel.app",
        "https://telegram.org",
        "https://*.telegram.org",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisReport(BaseModel):
    status: str
    report: str
    sentiment: str  # bullish, bearish, neutral
    details: list[dict] = []
    wallet_info: Optional[dict] = None
    timestamp: str


class WalletInfo(BaseModel):
    address: str
    balance: Optional[float] = None
    transactions_count: Optional[int] = None


async def get_wallet_info(wallet_address: str) -> dict:
    """Получение информации о кошельке через TON API"""
    try:
        async with httpx.AsyncClient() as client:
            # Используем публичный TON API
            url = f"https://testnet.toncenter.com/api/v2/getAddressInformation"
            params = {"address": wallet_address}
            
            if TONCENTER_API_KEY:
                params["api_key"] = TONCENTER_API_KEY
            
            response = await client.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    result = data.get("result", {})
                    # Конвертируем balance из наноТОН в TON
                    balance_nano = int(result.get("balance", 0))
                    balance_ton = balance_nano / 1e9
                    
                    return {
                        "balance": round(balance_ton, 4),
                        "status": result.get("state", "unknown"),
                        "last_activity": result.get("last_transaction_lt", "N/A")
                    }
    except Exception as e:
        print(f"Error fetching wallet info: {e}")
    
    return {"balance": None, "status": "unknown", "last_activity": None}


async def generate_ai_analysis(wallet_address: str, wallet_info: dict, deep: bool = False) -> dict:
    """Генерация AI анализа через OpenRouter"""
    
    if not OPENROUTER_API_KEY:
        # Фоллбэк если нет API ключа
        return {
            "report": "🔍 Демо-режим: API ключ не настроен. TON экосистема показывает признаки роста. Рекомендуется диверсификация портфеля.",
            "sentiment": "neutral",
            "details": [
                {"icon": "💰", "text": f"Баланс: {wallet_info.get('balance', 'N/A')} TON"},
                {"icon": "📊", "text": "Демо-анализ без AI"},
            ]
        }
    
    # Формируем промпт для AI
    analysis_type = "глубокий и детальный" if deep else "краткий"
    
    prompt = f"""Ты — AI-аналитик криптовалютного рынка, специализирующийся на TON экосистеме.

Проанализируй кошелек и текущее состояние TON рынка:

Адрес кошелька: {wallet_address}
Баланс: {wallet_info.get('balance', 'неизвестно')} TON
Статус: {wallet_info.get('status', 'неизвестно')}

Предоставь {analysis_type} анализ:
1. Оценка активности кошелька
2. Текущий тренд TON рынка (основываясь на общих знаниях)
3. Рекомендации для держателя

Формат ответа:
- Вердикт: [BULLISH/BEARISH/NEUTRAL]
- Основной текст анализа (2-3 предложения для краткого, 5-7 для глубокого)
"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": FRONTEND_URL,
                    "X-Title": "AI Pulse TON"
                },
                json={
                    "model": AI_MODEL,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 500 if not deep else 1000,
                    "temperature": 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                ai_text = data["choices"][0]["message"]["content"]
                
                # Определяем сентимент из ответа
                sentiment = "neutral"
                if "BULLISH" in ai_text.upper():
                    sentiment = "bullish"
                elif "BEARISH" in ai_text.upper():
                    sentiment = "bearish"
                
                # Формируем детали
                details = [
                    {"icon": "💰", "text": f"Баланс: {wallet_info.get('balance', 'N/A')} TON"},
                    {"icon": "📈", "text": f"Статус: {wallet_info.get('status', 'active')}"},
                ]
                
                if deep:
                    details.extend([
                        {"icon": "🔄", "text": f"Последняя активность: {wallet_info.get('last_activity', 'N/A')}"},
                        {"icon": "💎", "text": "Премиум анализ активирован"},
                    ])
                
                return {
                    "report": ai_text,
                    "sentiment": sentiment,
                    "details": details
                }
            else:
                raise Exception(f"OpenRouter API error: {response.status_code}")
                
    except Exception as e:
        print(f"AI generation error: {e}")
        return {
            "report": f"⚠️ Ошибка AI-анализа. Баланс кошелька: {wallet_info.get('balance', 'N/A')} TON. Рынок TON демонстрирует умеренную волатильность.",
            "sentiment": "neutral",
            "details": [
                {"icon": "💰", "text": f"Баланс: {wallet_info.get('balance', 'N/A')} TON"},
                {"icon": "⚠️", "text": "AI недоступен, базовый анализ"},
            ]
        }


@app.get("/")
async def root():
    return {
        "message": "AI Pulse TON API",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/api/analyze/{wallet_address}",
            "deep_analyze": "/api/deep-analyze/{wallet_address}"
        }
    }


@app.get("/api/analyze/{wallet_address}", response_model=AnalysisReport)
async def analyze_wallet(wallet_address: str):
    """
    Бесплатный AI-анализ кошелька и TON экосистемы
    """
    # Валидация адреса (базовая)
    if len(wallet_address) < 48:
        raise HTTPException(status_code=400, detail="Некорректный адрес кошелька")
    
    # Получаем информацию о кошельке
    wallet_info = await get_wallet_info(wallet_address)
    
    # Генерируем AI анализ
    analysis = await generate_ai_analysis(wallet_address, wallet_info, deep=False)
    
    return AnalysisReport(
        status="success",
        report=analysis["report"],
        sentiment=analysis["sentiment"],
        details=analysis["details"],
        wallet_info=wallet_info,
        timestamp=datetime.now().isoformat()
    )


@app.get("/api/deep-analyze/{wallet_address}", response_model=AnalysisReport)
async def deep_analyze_wallet(wallet_address: str):
    """
    Глубокий AI-анализ (премиум, требует оплаты 0.1 TON)
    В будущем здесь будет проверка транзакции оплаты
    """
    if len(wallet_address) < 48:
        raise HTTPException(status_code=400, detail="Некорректный адрес кошелька")
    
    # TODO: Проверка транзакции оплаты через TonCenter API
    # Пока просто генерируем глубокий анализ
    
    wallet_info = await get_wallet_info(wallet_address)
    analysis = await generate_ai_analysis(wallet_address, wallet_info, deep=True)
    
    return AnalysisReport(
        status="success",
        report=analysis["report"],
        sentiment=analysis["sentiment"],
        details=analysis["details"],
        wallet_info=wallet_info,
        timestamp=datetime.now().isoformat()
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
