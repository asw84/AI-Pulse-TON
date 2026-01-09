import { useState, useEffect } from 'react';
import { TonConnectButton, TonConnectUIProvider, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { TwaAnalyticsProvider, useTWAEvent } from '@tonsolutions/telemetree-react';
import WebApp from '@twa-dev/sdk';
import './index.css';

// Инициализация Telegram Web App
WebApp.ready();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const TG_ANALYTICS_TOKEN = import.meta.env.VITE_TG_ANALYTICS_TOKEN || '';
const CLIENT_ID = import.meta.env.VITE_TON_ID_CLIENT_ID || 'nPiytmRGEQGNOYAhR85q';

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

function WelcomePage() {
  const handleTonIdLogin = async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = Math.random().toString(36).substring(7);

    localStorage.setItem('ton_id_verifier', verifier);
    localStorage.setItem('ton_id_state', state);

    // ВАЖНО: Этот URL должен БУКВА В БУКВУ совпадать с тем, что в TON Builders!
    const redirectUri = 'https://ai-pulse-ton.vercel.app/auth/callback';
    const scope = 'openid profile wallet';

    const params = new URLSearchParams();
    params.append('response_type', 'code');
    params.append('client_id', CLIENT_ID);
    params.append('redirect_uri', redirectUri);
    params.append('scope', scope);
    params.append('state', state);
    params.append('code_challenge', challenge);
    params.append('code_challenge_method', 'S256');

    window.location.href = `https://id.ton.org/v1/oauth2/signin?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Декоративные фоновые элементы */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="z-10 text-center space-y-10 max-w-sm">
        <div className="flex flex-col items-center space-y-6">
          {/* Логотип */}
          <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-cyan-500/20 rotate-12 transition-transform hover:rotate-0 duration-500 cursor-default">
            <span className="text-4xl">⚡</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              AI Pulse TON
            </h1>
            <p className="text-lg text-slate-400 font-medium leading-relaxed">
              Autonomous AI Agents for your TON Portfolio
            </p>
          </div>
        </div>

        {/* Кнопка входа */}
        <button
          onClick={handleTonIdLogin}
          className="group relative w-full py-5 px-8 bg-[#0098EA] hover:bg-[#0087d1] rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(0,152,234,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <img
            src="https://ton.org/download/ton_symbol.svg"
            alt="TON"
            className="w-6 h-6 group-hover:rotate-12 transition-transform"
          />
          Sign in with TON ID
        </button>

        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold pt-4">
          Secure • Fast • Decentralized
        </p>
      </div>
    </div>
  );
}

function MainContent() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tgAnalyticsReady, setTgAnalyticsReady] = useState(false);

  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const trackEvent = useTWAEvent();

  // Инициализация аналитики
  useEffect(() => {
    const initAnalytics = () => {
      const sdk = window.tgAnalytics || window.telegramAnalytics;
      if (sdk && TG_ANALYTICS_TOKEN) {
        sdk.init({
          token: TG_ANALYTICS_TOKEN,
          project_name: 'ai_pulse_ton',
          refresh_rate: 10000,
        });
        setTgAnalyticsReady(true);
        return true;
      }
      return false;
    };

    if (initAnalytics()) return;
    const interval = setInterval(() => {
      if (initAnalytics()) clearInterval(interval);
    }, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const fetchReport = async () => {
    if (!address) {
      WebApp.showAlert('Сначала подключите кошелек!');
      return;
    }

    if (window.tgAnalytics) {
      window.tgAnalytics.track('click_get_report', { wallet: address, platform: 'tma' });
    }
    trackEvent.track('basic_analysis_started', { address: address });

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze/${address}`);
      if (!response.ok) throw new Error('Ошибка получения отчета');
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

    if (window.tgAnalytics) {
      window.tgAnalytics.track('click_deep_analysis', { wallet: address, platform: 'tma' });
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
      trackEvent.track('premium_analysis_purchased', { address: address, amount: '0.1' });
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
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl flex flex-col items-center">
          <TonConnectButton />
          {address && (
            <p className="mt-3 text-slate-400 text-xs font-mono">
              {address.slice(0, 8)}...{address.slice(-6)}
            </p>
          )}
        </div>

        <button
          onClick={fetchReport}
          disabled={loading || !address}
          className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <><span>🔍</span> Получить AI-отчет</>
          )}
        </button>

        <button
          onClick={requestDeepAnalysis}
          disabled={!address}
          className="w-full py-4 px-6 bg-slate-800/60 border border-slate-700 rounded-2xl font-semibold text-slate-300 hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>💎</span> Глубокий анализ <span className="text-blue-400 font-bold">(0.1 TON)</span>
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {report && (
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl animate-[fadeIn_0.3s_ease-out]">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">📊 AI Вердикт</h2>
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold mb-4 ${report.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              report.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
              {report.sentiment === 'bullish' ? '🚀 Bullish' : report.sentiment === 'bearish' ? '📉 Bearish' : '⚖️ Neutral'}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">{report.report}</p>
            {report.details?.map((detail, index) => (
              <div key={index} className="flex items-center gap-3 text-sm text-slate-400 bg-slate-900/50 rounded-xl p-3 mb-2">
                <span className="text-lg">{detail.icon}</span>
                <span>{detail.text}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto pt-10 text-slate-500 text-[10px] uppercase tracking-[2px] z-10 flex flex-col items-center gap-2">
        <span>Powered by AI & TON Blockchain</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${tgAnalyticsReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
          <span className="text-[9px]">{tgAnalyticsReady ? 'TG Analytics Active' : 'TG Analytics Connecting...'}</span>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'));
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDesc = params.get('error_description');

      if (error) {
        setAuthError(`${error}: ${errorDesc || ''}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const savedState = localStorage.getItem('ton_id_state');
      const verifier = localStorage.getItem('ton_id_verifier');

      // Если в URL есть прямой токен (от бэкенда при редиректе)
      const token = params.get('token');
      if (token) {
        localStorage.setItem('auth_token', token);
        setAuthToken(token);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Если в URL есть код (прямой колбэк от TON ID на фронтенд)
      if (code && state === savedState && verifier) {
        try {
          // Очищаем временные данные
          localStorage.removeItem('ton_id_state');
          localStorage.removeItem('ton_id_verifier');
          window.history.replaceState({}, document.title, window.location.pathname);

          const response = await fetch(`${BACKEND_URL}/api/auth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              code_verifier: verifier,
              redirect_uri: `${window.location.origin}/auth/callback`
            })
          });

          if (!response.ok) throw new Error('Failed to exchange code');

          const data = await response.json();
          if (data.access_token) {
            localStorage.setItem('auth_token', data.access_token);
            setAuthToken(data.access_token);
          }
        } catch (err) {
          console.error('Auth exchange error:', err);
          setAuthError(err.message);
        }
      }
    };

    handleAuth();
  }, []);

  return (
    <TwaAnalyticsProvider
      projectId={import.meta.env.VITE_TELEMETREE_PROJECT_ID || "ai_pulse_ton"}
      apiKey={import.meta.env.VITE_TELEMETREE_API_KEY || ""}
      appName="AI Pulse TON"
    >
      <TonConnectUIProvider manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}>
        {authError && (
          <div className="fixed top-0 left-0 w-full z-[100] p-4 bg-red-500/90 text-white text-center text-sm backdrop-blur-md">
            ⚠️ Ошибка входа: {authError}
            <button onClick={() => setAuthError(null)} className="ml-4 underline">Закрыть</button>
          </div>
        )}
        {authToken ? <MainContent /> : <WelcomePage />}
      </TonConnectUIProvider>
    </TwaAnalyticsProvider>
  );
}

export default App;
