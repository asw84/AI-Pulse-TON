# AI Pulse TON

Telegram Mini App для AI-анализа TON экосистемы с подключением кошелька.

## Структура

```
├── ai-pulse-tma/     # React фронтенд (Vite + TonConnect)
└── backend/          # FastAPI бэкенд (OpenRouter AI)
```

## Деплой

### Frontend (Vercel)
```bash
cd ai-pulse-tma
npx vercel --prod
```

### Backend (Render)
1. Подключите репозиторий на render.com
2. Выберите папку `backend`
3. Добавьте переменные окружения:
   - `OPENROUTER_API_KEY` - ваш ключ OpenRouter
   - `AI_MODEL` - модель (по умолчанию minimax/minimax-m2.1)
   - `FRONTEND_URL` - URL вашего Vercel приложения

## Локальный запуск

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
cp .env.example .env  # Заполните .env
py -m uvicorn main:app --reload --port 8000
```

## Технологии

- **Frontend**: React, Vite, TailwindCSS, TonConnect UI
- **Backend**: FastAPI, OpenRouter (MiniMax M2.1)
- **Blockchain**: TON (The Open Network)
