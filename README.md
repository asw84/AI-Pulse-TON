<div align="center">

# 🚀 AI Pulse TON

### AI-Powered Analytics for TON Ecosystem

[![Telegram Mini App](https://img.shields.io/badge/Telegram-Mini%20App-blue?logo=telegram)](https://t.me/Sergei_AI_Pulse_Bot)
[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://ai-pulse-ton.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Online-success)](https://ai-pulse-ton-backend.onrender.com)

*Production-ready Telegram Mini App with Web3 wallet integration and AI-powered market analysis*

[Live Demo](https://ai-pulse-ton.vercel.app) • [Telegram Bot](https://t.me/Sergei_AI_Pulse_Bot) • [API Docs](https://ai-pulse-ton-backend.onrender.com/docs)

</div>

---

## 🎯 Project Overview

**AI Pulse TON** is a full-stack Telegram Mini App that demonstrates advanced integration of:

- 🔗 **Web3 Wallet Connection** via TonConnect
- 🤖 **AI-Powered Analytics** using LangGraph orchestration
- ⛓️ **Real-time Blockchain Data** from TON Network
- 💎 **Premium Features** with native TON payments

Built in **under 4 hours** as a showcase of modern Web3 + AI development capabilities.

---

## ✨ Key Features

### 🔐 Seamless Wallet Integration
- One-click wallet connection via TonConnect protocol
- Support for Tonkeeper, TON Space, MyTonWallet
- Real-time balance display and transaction history

### 🧠 AI-Powered Analysis (LangGraph)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  fetch_wallet   │────▶│    analyze      │────▶│ format_response │
│  (TON API)      │     │  (MiniMax AI)   │     │   (Output)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```
- **Stateful Graph Execution** with conditional routing
- **Real-time wallet analysis** with balance, status, activity
- **Market sentiment detection** (Bullish/Bearish/Neutral)
- **Personalized recommendations** based on wallet data

### 💰 Premium Monetization
- Free tier: Basic AI analysis
- Premium tier: Deep analysis for 0.1 TON
- Native blockchain payments — no credit cards needed

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      TELEGRAM MINI APP                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────────────────┐  │
│  │   Frontend      │         │         Backend             │  │
│  │  (Vercel)       │◄───────▶│        (Render)             │  │
│  │                 │         │                             │  │
│  │  • React 18     │  REST   │  • FastAPI                  │  │
│  │  • TailwindCSS  │   API   │  • LangGraph                │  │
│  │  • TonConnect   │         │  • OpenRouter AI            │  │
│  │  • Vite         │         │  • tonapi.io                │  │
│  └────────┬────────┘         └──────────────┬──────────────┘  │
│           │                                  │                 │
│           ▼                                  ▼                 │
│  ┌─────────────────┐         ┌─────────────────────────────┐  │
│  │  TON Blockchain │         │      AI Provider            │  │
│  │    (Testnet)    │         │    (MiniMax M2.1)           │  │
│  └─────────────────┘         └─────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, Vite, TailwindCSS | Modern SPA with premium UI |
| **Web3** | TonConnect UI React | Wallet connection protocol |
| **Backend** | FastAPI, Python 3.11 | High-performance async API |
| **AI Orchestration** | LangGraph | Stateful agent workflows |
| **LLM** | MiniMax M2.1 via OpenRouter | Cost-effective AI analysis |
| **Blockchain API** | tonapi.io | Real-time TON data |
| **Hosting** | Vercel + Render | Serverless + Container |

---

## 📊 LangGraph Implementation

The backend uses **LangGraph** for intelligent workflow orchestration:

```python
# Graph Definition
workflow = StateGraph(AgentState)

workflow.add_node("fetch_wallet", fetch_wallet_info)   # TON API call
workflow.add_node("analyze", analyze_with_ai)          # AI processing
workflow.add_node("format_response", format_response)  # Output formatting
workflow.add_node("format_error", format_error)        # Error handling

workflow.add_conditional_edges(
    "fetch_wallet",
    should_continue_after_fetch,  # Conditional routing
    {"analyze": "analyze", "format_error": "format_error"}
)
```

### State Management
```python
class AgentState(TypedDict):
    wallet_address: str
    wallet_info: dict | None
    ton_api_error: str | None
    ai_analysis: str | None
    sentiment: str  # bullish/bearish/neutral
    details: list[dict]
    deep_mode: bool
    final_report: str | None
```

### API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/analyze/{wallet}` | Free AI analysis |
| `GET /api/deep-analyze/{wallet}` | Premium deep analysis |
| `GET /api/graph` | Returns Mermaid diagram of LangGraph |
| `GET /health` | Service health check |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- OpenRouter API key

### Frontend
```bash
cd ai-pulse-tma
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
uvicorn main:app --reload
```

### Environment Variables
```env
# Backend (.env)
OPENROUTER_API_KEY=sk-or-xxx
AI_MODEL=minimax/minimax-m2.1
FRONTEND_URL=https://your-app.vercel.app
```

---

## 📱 Screenshots

### Telegram Mini App
<img src="https://via.placeholder.com/300x600/0f172a/ffffff?text=AI+Pulse+TON" alt="App Screenshot" width="300"/>

### AI Analysis Response
```json
{
  "status": "success",
  "report": "Вердикт: NEUTRAL...",
  "sentiment": "neutral",
  "wallet_info": {
    "balance": 2.0,
    "status": "active"
  },
  "graph_path": ["fetch_wallet", "analyze", "format_response"]
}
```

---

## 💼 Business Value

### For End Users
- 🎯 Instant AI-powered wallet analysis
- 📊 Market sentiment and recommendations
- 🔒 Non-custodial — your keys, your crypto

### For Businesses
- 💰 Built-in monetization via TON payments
- 📈 Scalable serverless architecture
- 🔌 Easy integration with existing Telegram bots

---

## 🧑‍💻 Developer

**Sergei** — Full-Stack Web3 Developer

- 🔗 Expertise: React, Python, LangChain/LangGraph, TON, Telegram Mini Apps
- 📧 Available for freelance projects
- ⚡ Rapid prototyping: This project was built in **under 4 hours**

---

## 📄 License

MIT License — feel free to use this as a template for your own projects.

---

<div align="center">

**Built with ❤️ for the TON Ecosystem**

[⭐ Star this repo](https://github.com/asw84/AI-Pulse-TON) if you found it useful!

</div>
