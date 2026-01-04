"""
AI Pulse TON - FastAPI Backend с полноценным LangGraph
"""

import os
import logging
from typing import TypedDict, Annotated, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
from datetime import datetime

# LangGraph imports
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Загрузка переменных окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ai_pulse_ton")

# Конфигурация
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
AI_MODEL = os.getenv("AI_MODEL", "minimax/minimax-m2.1")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
TONCENTER_API_KEY = os.getenv("TONCENTER_API_KEY", "")

app = FastAPI(
    title="AI Pulse TON",
    description="AI-powered TON ecosystem analysis with LangGraph",
    version="2.0.0"
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


# ============ LANGGRAPH STATE ============

class AgentState(TypedDict):
    """Состояние агента, передаваемое между узлами"""
    wallet_address: str
    wallet_info: dict | None
    ton_api_error: str | None
    ai_analysis: str | None
    sentiment: str
    details: list[dict]
    deep_mode: bool
    final_report: str | None


# ============ TOOLS / УЗЛЫ ГРАФА ============

async def fetch_wallet_info(state: AgentState) -> AgentState:
    """
    Узел 1: Получение информации о кошельке через TON API
    """
    wallet_address = state["wallet_address"]
    logger.info(f"[Node: fetch_wallet_info] Fetching info for wallet: {wallet_address[:20]}...")
    
    try:
        async with httpx.AsyncClient() as client:
            url = "https://testnet.toncenter.com/api/v2/getAddressInformation"
            params = {"address": wallet_address}
            
            if TONCENTER_API_KEY:
                params["api_key"] = TONCENTER_API_KEY
            
            response = await client.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    result = data.get("result", {})
                    balance_nano = int(result.get("balance", 0))
                    balance_ton = balance_nano / 1e9
                    
                    wallet_info = {
                        "balance": round(balance_ton, 4),
                        "status": result.get("state", "unknown"),
                        "last_activity": result.get("last_transaction_lt", "N/A")
                    }
                    
                    logger.info(f"[Node: fetch_wallet_info] Success: balance={balance_ton} TON")
                    return {**state, "wallet_info": wallet_info, "ton_api_error": None}
            
            logger.warning(f"[Node: fetch_wallet_info] API returned non-200: {response.status_code}")
            return {**state, "wallet_info": None, "ton_api_error": f"API error: {response.status_code}"}
            
    except Exception as e:
        logger.error(f"[Node: fetch_wallet_info] Exception: {e}")
        return {**state, "wallet_info": None, "ton_api_error": str(e)}


async def analyze_with_ai(state: AgentState) -> AgentState:
    """
    Узел 2: AI-анализ через OpenRouter
    """
    logger.info(f"[Node: analyze_with_ai] Starting AI analysis, deep_mode={state['deep_mode']}")
    
    if not OPENROUTER_API_KEY:
        logger.warning("[Node: analyze_with_ai] No API key, using fallback")
        return {
            **state,
            "ai_analysis": "🔍 Демо-режим: API ключ не настроен. TON экосистема показывает признаки роста.",
            "sentiment": "neutral"
        }
    
    wallet_info = state.get("wallet_info") or {}
    ton_error = state.get("ton_api_error")
    deep = state.get("deep_mode", False)
    
    # Формируем контекст для AI
    context = f"""
Адрес кошелька: {state['wallet_address']}
Баланс: {wallet_info.get('balance', 'неизвестно')} TON
Статус: {wallet_info.get('status', 'неизвестно')}
Ошибка TON API: {ton_error or 'нет'}
"""
    
    analysis_type = "глубокий и детальный" if deep else "краткий"
    
    prompt = f"""Ты — AI-аналитик криптовалютного рынка TON. 

ДАННЫЕ О КОШЕЛЬКЕ:
{context}

ЗАДАЧА: Предоставь {analysis_type} анализ:
1. Оценка активности кошелька
2. Текущий тренд TON рынка
3. Рекомендации для держателя

ФОРМАТ ОТВЕТА:
Начни с "Вердикт: [BULLISH/BEARISH/NEUTRAL]"
Затем анализ ({"5-7" if deep else "2-3"} предложения)"""

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
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1000 if deep else 500,
                    "temperature": 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                ai_text = data["choices"][0]["message"]["content"]
                
                # Определяем сентимент
                sentiment = "neutral"
                if "BULLISH" in ai_text.upper():
                    sentiment = "bullish"
                elif "BEARISH" in ai_text.upper():
                    sentiment = "bearish"
                
                logger.info(f"[Node: analyze_with_ai] Success, sentiment={sentiment}")
                return {**state, "ai_analysis": ai_text, "sentiment": sentiment}
            else:
                logger.error(f"[Node: analyze_with_ai] OpenRouter error: {response.status_code}")
                return {
                    **state,
                    "ai_analysis": f"⚠️ Ошибка AI ({response.status_code}). Баланс: {wallet_info.get('balance', 'N/A')} TON",
                    "sentiment": "neutral"
                }
                
    except Exception as e:
        logger.error(f"[Node: analyze_with_ai] Exception: {e}")
        return {
            **state,
            "ai_analysis": f"⚠️ Ошибка AI: {str(e)}",
            "sentiment": "neutral"
        }


async def format_response(state: AgentState) -> AgentState:
    """
    Узел 3: Форматирование финального ответа
    """
    logger.info("[Node: format_response] Formatting final response")
    
    wallet_info = state.get("wallet_info") or {}
    
    # Формируем детали
    details = [
        {"icon": "💰", "text": f"Баланс: {wallet_info.get('balance', 'N/A')} TON"},
        {"icon": "📊", "text": f"Статус: {wallet_info.get('status', 'unknown')}"},
    ]
    
    if state.get("deep_mode"):
        details.append({"icon": "💎", "text": "Премиум анализ активирован"})
        if wallet_info.get("last_activity"):
            details.append({"icon": "🔄", "text": f"Последняя активность: {wallet_info.get('last_activity')}"})
    
    if state.get("ton_api_error"):
        details.append({"icon": "⚠️", "text": f"Предупреждение: {state['ton_api_error']}"})
    
    return {
        **state,
        "details": details,
        "final_report": state.get("ai_analysis", "Анализ недоступен")
    }


def should_continue_after_fetch(state: AgentState) -> Literal["analyze", "format_error"]:
    """
    Условное ребро: решаем, продолжать анализ или обработать ошибку
    Теперь всегда идём к анализу - AI может работать и без данных кошелька
    """
    # Всегда идём к AI анализу - он справится даже без данных о кошельке
    logger.info(f"[Edge] Proceeding to analyze (wallet_info: {state.get('wallet_info') is not None})")
    return "analyze"


async def format_error(state: AgentState) -> AgentState:
    """
    Узел обработки ошибок TON API
    """
    logger.info("[Node: format_error] Handling TON API error")
    
    error_msg = state.get("ton_api_error", "Unknown error")
    
    return {
        **state,
        "ai_analysis": f"⚠️ Не удалось получить данные кошелька: {error_msg}. Проверьте адрес.",
        "sentiment": "neutral",
        "details": [
            {"icon": "❌", "text": f"Ошибка: {error_msg}"},
            {"icon": "💡", "text": "Проверьте корректность адреса кошелька"}
        ],
        "final_report": "Анализ невозможен из-за ошибки API"
    }


# ============ СБОРКА ГРАФА ============

def build_analysis_graph():
    """
    Строим LangGraph с узлами и ребрами
    """
    workflow = StateGraph(AgentState)
    
    # Добавляем узлы
    workflow.add_node("fetch_wallet", fetch_wallet_info)
    workflow.add_node("analyze", analyze_with_ai)
    workflow.add_node("format_response", format_response)
    workflow.add_node("format_error", format_error)
    
    # Устанавливаем точку входа
    workflow.set_entry_point("fetch_wallet")
    
    # Условное ребро после получения данных кошелька
    workflow.add_conditional_edges(
        "fetch_wallet",
        should_continue_after_fetch,
        {
            "analyze": "analyze",
            "format_error": "format_error"
        }
    )
    
    # Прямые ребра
    workflow.add_edge("analyze", "format_response")
    workflow.add_edge("format_response", END)
    workflow.add_edge("format_error", END)
    
    return workflow.compile()


# Компилируем граф один раз при старте
analysis_graph = build_analysis_graph()

# Логируем структуру графа
logger.info("=== LangGraph Structure ===")
try:
    mermaid_code = analysis_graph.get_graph().draw_mermaid()
    logger.info(f"Mermaid diagram:\n{mermaid_code}")
except Exception as e:
    logger.warning(f"Could not generate Mermaid diagram: {e}")


# ============ API ENDPOINTS ============

class AnalysisReport(BaseModel):
    status: str
    report: str
    sentiment: str
    details: list[dict] = []
    wallet_info: dict | None = None
    timestamp: str
    graph_path: list[str] = []  # Показывает путь через граф


@app.get("/")
async def root():
    return {
        "message": "AI Pulse TON API",
        "version": "2.0.0 (LangGraph)",
        "endpoints": {
            "analyze": "/api/analyze/{wallet_address}",
            "deep_analyze": "/api/deep-analyze/{wallet_address}",
            "graph": "/api/graph"
        }
    }


@app.get("/api/graph")
async def get_graph():
    """Возвращает Mermaid диаграмму графа"""
    try:
        mermaid = analysis_graph.get_graph().draw_mermaid()
        return {"mermaid": mermaid}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/analyze/{wallet_address}", response_model=AnalysisReport)
async def analyze_wallet(wallet_address: str):
    """Бесплатный AI-анализ через LangGraph"""
    
    if len(wallet_address) < 48:
        raise HTTPException(status_code=400, detail="Некорректный адрес кошелька")
    
    logger.info(f"[API] Starting analysis for: {wallet_address[:20]}...")
    
    # Начальное состояние
    initial_state: AgentState = {
        "wallet_address": wallet_address,
        "wallet_info": None,
        "ton_api_error": None,
        "ai_analysis": None,
        "sentiment": "neutral",
        "details": [],
        "deep_mode": False,
        "final_report": None
    }
    
    # Запускаем граф
    result = await analysis_graph.ainvoke(initial_state)
    
    logger.info(f"[API] Analysis complete, sentiment: {result['sentiment']}")
    
    return AnalysisReport(
        status="success",
        report=result["final_report"] or result["ai_analysis"],
        sentiment=result["sentiment"],
        details=result["details"],
        wallet_info=result["wallet_info"],
        timestamp=datetime.now().isoformat(),
        graph_path=["fetch_wallet", "analyze" if not result.get("ton_api_error") else "format_error", "format_response"]
    )


@app.get("/api/deep-analyze/{wallet_address}", response_model=AnalysisReport)
async def deep_analyze_wallet(wallet_address: str):
    """Глубокий AI-анализ (премиум)"""
    
    if len(wallet_address) < 48:
        raise HTTPException(status_code=400, detail="Некорректный адрес кошелька")
    
    logger.info(f"[API] Starting DEEP analysis for: {wallet_address[:20]}...")
    
    initial_state: AgentState = {
        "wallet_address": wallet_address,
        "wallet_info": None,
        "ton_api_error": None,
        "ai_analysis": None,
        "sentiment": "neutral",
        "details": [],
        "deep_mode": True,  # Включаем глубокий режим
        "final_report": None
    }
    
    result = await analysis_graph.ainvoke(initial_state)
    
    return AnalysisReport(
        status="success",
        report=result["final_report"] or result["ai_analysis"],
        sentiment=result["sentiment"],
        details=result["details"],
        wallet_info=result["wallet_info"],
        timestamp=datetime.now().isoformat(),
        graph_path=["fetch_wallet", "analyze", "format_response"]
    )


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "langgraph": "active",
        "model": AI_MODEL,
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
