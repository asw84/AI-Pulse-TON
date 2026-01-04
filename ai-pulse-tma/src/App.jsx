import { useState } from 'react';
import { TonConnectButton, TonConnectUIProvider, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import WebApp from '@twa-dev/sdk';
import './index.css';

// Инициализация Telegram Web App
WebApp.ready();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function MainContent() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  const fetchReport = async () => {
    if (!address) {
      WebApp.showAlert('Сначала подключите кошелек!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze/${address}`);
      if (!response.ok) {
        throw new Error('Ошибка получения отчета');
      }
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err.message);
      WebApp.showAlert('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const requestDeepAnalysis = async () => {
    if (!address) {
      WebApp.showAlert('Сначала подключите кошелек!');
      return;
    }

    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: '0QAD3sa-ZJE929PM_rvnDormWmwZorniPoj5OcYmxdkHSabD',
            amount: '100000000',
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      WebApp.showAlert('Транзакция отправлена! Глубокий анализ скоро будет доступен.');

      const response = await fetch(`${BACKEND_URL}/api/deep-analyze/${address}`);
      const data = await response.json();
      setReport(data);
    } catch (err) {
      WebApp.showAlert('Ошибка транзакции: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center p-6 font-sans relative overflow-hidden">
      {/* Декоративный светящийся круг на фоне */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <header className="z-10 text-center mb-10">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
          AI Pulse TON
        </h1>
        <p className="text-slate-400 text-sm font-light tracking-wide">
          Интеллектуальный анализ экосистемы
        </p>
      </header>

      <main className="z-10 w-full max-w-md space-y-4">
        {/* Контейнер для кошелька */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl flex flex-col items-center">
          <TonConnectButton />
          {address && (
            <p className="mt-3 text-slate-400 text-xs font-mono">
              {address.slice(0, 8)}...{address.slice(-6)}
            </p>
          )}
        </div>

        {/* Кнопка отчета */}
        <button
          onClick={fetchReport}
          disabled={loading || !address}
          className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <span>🔍</span> Получить AI-отчет
            </>
          )}
        </button>

        {/* Кнопка глубокого анализа */}
        <button
          onClick={requestDeepAnalysis}
          disabled={!address}
          className="w-full py-4 px-6 bg-slate-800/60 border border-slate-700 rounded-2xl font-semibold text-slate-300 hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>💎</span> Глубокий анализ <span className="text-blue-400 font-bold">(0.1 TON)</span>
        </button>

        {/* Сообщение об ошибке */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Карточка с отчетом */}
        {report && (
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl animate-[fadeIn_0.3s_ease-out]">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              📊 AI Вердикт
            </h2>

            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold mb-4 ${report.sentiment === 'bullish'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : report.sentiment === 'bearish'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
              {report.sentiment === 'bullish' ? '🚀 Bullish' :
                report.sentiment === 'bearish' ? '📉 Bearish' : '⚖️ Neutral'}
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              {report.report}
            </p>

            {report.details && report.details.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-700/50">
                {report.details.map((detail, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-slate-400 bg-slate-900/50 rounded-xl p-3">
                    <span className="text-lg">{detail.icon}</span>
                    <span>{detail.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto pt-10 text-slate-500 text-[10px] uppercase tracking-[2px] z-10">
        Powered by AI & TON Blockchain
      </footer>
    </div>
  );
}

function App() {
  return (
    <TonConnectUIProvider manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}>
      <MainContent />
    </TonConnectUIProvider>
  );
}

export default App;
