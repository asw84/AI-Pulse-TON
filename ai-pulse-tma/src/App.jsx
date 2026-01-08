import { useState, useEffect } from 'react';
import { TonConnectButton, TonConnectUIProvider, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { TwaAnalyticsProvider, useTWAEvent } from '@tonsolutions/telemetree-react';
import WebApp from '@twa-dev/sdk';
import './index.css';

// Инициализация Telegram Web App
WebApp.ready();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const TG_ANALYTICS_TOKEN = import.meta.env.VITE_TG_ANALYTICS_TOKEN || '';

function MainContent() {
  // Состояние для отслеживания инициализации TG Analytics
  const [tgAnalyticsReady, setTgAnalyticsReady] = useState(false);

  // Инициализация TG Analytics с ожиданием загрузки SDK
  useEffect(() => {
    const initTgAnalytics = () => {
      if (window.tgAnalytics && TG_ANALYTICS_TOKEN) {
        window.tgAnalytics.init({
          token: TG_ANALYTICS_TOKEN,
          project_name: 'ai_pulse_ton',
          refresh_rate: 10000,
        });
        console.log('TG Analytics Initialized! 🚀');
        console.log('Token:', TG_ANALYTICS_TOKEN.substring(0, 20) + '...');
        setTgAnalyticsReady(true);
        return true;
      }
      return false;
    };

    // Если уже загружен — инициализируем сразу
    if (initTgAnalytics()) return;

    // Иначе ждём загрузку скрипта (проверяем каждые 100ms, максимум 5 секунд)
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (initTgAnalytics() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.warn('TG Analytics SDK not loaded after 5 seconds');
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [userData, setUserData] = useState(null);
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const trackEvent = useTWAEvent();

  const CLIENT_ID = "nPiytmRGEQGNoYAhR85q";
  const REDIRECT_URI = "https://ai-pulse-ton.vercel.app/auth/callback";

  // PKCE Helpers
  const base64URLEncode = (buffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return base64URLEncode(array);
  };

  const generateCodeChallenge = async (verifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(hash);
  };

  // Инициализация верификации (Implicit Flow)
  const startVerification = () => {
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('ton_id_state', state);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'id_token',
      scope: 'openid profile',
      state: state
    });

    window.location.href = `https://oauth2.ton.org/authorize?${params.toString()}`;
  };

  // Обработка callback при загрузке
  useEffect(() => {
    const handleCallback = async () => {
      // TON ID присылает данные в query или hash
      const urlParams = new URLSearchParams(window.location.search || window.location.hash.replace('#', '?'));
      const token = urlParams.get('id_token');
      const state = urlParams.get('state');
      const savedState = localStorage.getItem('ton_id_state');

      if (token && state === savedState) {
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
          const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });

          const verifyData = await verifyResponse.json();

          if (verifyData.success) {
            setIsVerified(true);
            setUserData(verifyData.user || { name: 'Verified User' });
            WebApp.showAlert(`✅ Личность подтверждена!`);
          }
        } catch (err) {
          console.error('Auth error:', err);
          WebApp.showAlert('Ошибка подтверждения на сервере');
        }
      }
    };

    handleCallback();
  }, [BACKEND_URL]);

  // Отслеживание подключения кошелька
  useEffect(() => {
    if (address) {
      trackEvent.track('wallet_connected', {
        address: address,
        platform: WebApp.platform,
        version: WebApp.version
      });
    }
  }, [address, trackEvent]);

  const fetchReport = async () => {
    if (!address) {
      WebApp.showAlert('Сначала подключите кошелек!');
      return;
    }

    // TG Analytics: трекинг клика на "Получить отчет"
    if (window.tgAnalytics) {
      window.tgAnalytics.track('click_get_report', {
        wallet: address,
        platform: 'tma'
      });
    }

    // Отслеживание начала базового анализа (Telemetree)
    trackEvent.track('basic_analysis_started', {
      address: address
    });

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

    // TG Analytics: трекинг клика на "Глубокий анализ"
    if (window.tgAnalytics) {
      window.tgAnalytics.track('click_deep_analysis', {
        wallet: address,
        platform: 'tma'
      });
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

      // Отслеживание покупки премиум-анализа
      trackEvent.track('premium_analysis_purchased', {
        address: address,
        amount: '0.1'
      });

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

        {/* Кнопка TON ID (Временно отключено) */}
        {/* {!isVerified ? (
          <button
            onClick={startVerification}
            style={{ backgroundColor: 'rgba(79, 70, 229, 0.2)', border: '1px solid rgba(99, 102, 241, 0.5)' }}
            className="w-full py-4 px-6 rounded-2xl font-bold text-indigo-400 transition-all flex items-center justify-center gap-2 hover:bg-indigo-500/20 active:scale-[0.98]"
          >
            <span>🆔</span> Подтвердить личность (TON ID)
          </button>
        ) : (
          <div className="w-full py-3 px-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✅</span>
              <span className="text-sm font-medium text-emerald-400">Личность подтверждена</span>
            </div>
            {userData && <span className="text-xs text-slate-400">{userData.name}</span>}
          </div>
        )} */}

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

      <footer className="mt-auto pt-10 text-slate-500 text-[10px] uppercase tracking-[2px] z-10 flex flex-col items-center gap-2">
        <span>Powered by AI & TON Blockchain</span>
        <div className="flex flex-col items-center gap-1 normal-case tracking-normal">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${tgAnalyticsReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
            <span className="text-[9px]">{tgAnalyticsReady ? 'TG Analytics Active' : 'TG Analytics Connecting...'}</span>
          </div>
          {!tgAnalyticsReady && (
            <span className="text-[8px] text-slate-600">
              {!TG_ANALYTICS_TOKEN ? 'Missing Token' : !window.tgAnalytics ? 'SDK Script Not Loaded' : 'Init Error'}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <TwaAnalyticsProvider
      projectId={import.meta.env.VITE_TELEMETREE_PROJECT_ID || "YOUR_PROJECT_ID"}
      apiKey={import.meta.env.VITE_TELEMETREE_API_KEY || "YOUR_API_KEY"}
      appName="AI Pulse TON"
    >
      <TonConnectUIProvider manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}>
        <MainContent />
      </TonConnectUIProvider>
    </TwaAnalyticsProvider>
  );
}

export default App;
