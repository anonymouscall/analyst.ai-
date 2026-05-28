import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, KeyRound, ArrowLeft, HelpCircle } from 'lucide-react';

const LOGIN_LOGS = [
  'Requesting administrative handshake...',
  'Decrypted session authorization credentials...',
  'Synchronizing SQLite audit log schema...',
  'Opening secure stdio communication pipes...',
  'Admin terminal connection established.'
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [debugOtp, setDebugOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [loginLogIdx, setLoginLogIdx] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If token exists, direct to workspace
    const token = localStorage.getItem('admin-auth-token');
    if (token) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to request code.');
      } else {
        setStep(2);
        if (data.debugOtp) {
          setDebugOtp(data.debugOtp);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Connection error to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !otp.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid verification code.');
      } else {
        // Save database-driven session token & email
        localStorage.setItem('admin-auth-token', data.token);
        localStorage.setItem('admin-auth-email', data.email);
        
        // Trigger high-fidelity data scanning login loader
        setAuthenticating(true);
        
        let curIdx = 0;
        const logTimer = setInterval(() => {
          if (curIdx < LOGIN_LOGS.length - 1) {
            curIdx++;
            setLoginLogIdx(curIdx);
          } else {
            clearInterval(logTimer);
          }
        }, 180);

        let curPct = 0;
        const pctTimer = setInterval(() => {
          curPct += 5;
          if (curPct >= 100) {
            curPct = 100;
            clearInterval(pctTimer);
            setTimeout(() => {
              window.dispatchEvent(new Event('db-status-changed'));
              navigate('/admin');
            }, 150);
          }
          setLoginProgress(curPct);
        }, 40);
      }
    } catch (err: any) {
      setError(err.message || 'Verification connection error.');
    } finally {
      setLoading(false);
    }
  };

  if (authenticating) {
    return (
      <div className="login-container container animate-fade-in">
        <div className="login-box glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
          <div className="login-loader-spinner-wrapper" style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="login-loader-pulse" />
            <div className="login-loader-spinner" />
            <Lock size={20} style={{ color: 'var(--text-heading)', zIndex: 2 }} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>{loginProgress}%</h3>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.6, marginBottom: '20px' }}>Initializing Session Catalog</span>
          
          <div className="login-loader-logs">
            {LOGIN_LOGS.slice(0, loginLogIdx + 1).map((log, idx) => (
              <div key={idx} className="login-log-line" style={{ opacity: idx === loginLogIdx ? 1 : 0.6 }}>
                <span className="login-log-prompt">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          .login-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: calc(100vh - 160px);
          }
          .login-box {
            width: 100%;
            max-width: 420px;
            padding: 40px;
            border-radius: 12px;
          }
          .login-loader-pulse {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 1px solid var(--primary);
            opacity: 0.15;
            animation: intro-pulse 1.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }
          .login-loader-spinner {
            position: absolute;
            inset: 4px;
            border-radius: 50%;
            border: 2px solid var(--border);
            border-top-color: var(--text-heading);
            animation: intro-spin 1.0s cubic-bezier(0.44, 0.21, 0.29, 0.86) infinite;
          }
          .login-loader-logs {
            width: 100%;
            height: 96px;
            background: var(--glass-bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 14px;
            text-align: left;
            display: flex;
            flex-direction: column;
            gap: 6px;
            overflow: hidden;
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .login-log-line {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.68rem;
            font-family: var(--font-mono);
            color: var(--text);
            animation: login-line-fade 0.2s forwards;
          }
          .login-log-prompt {
            color: var(--primary);
            opacity: 0.8;
          }
          @keyframes login-line-fade {
            from { opacity: 0; transform: translateY(2px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes intro-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes intro-pulse {
            0% { transform: scale(0.85); opacity: 0.3; }
            100% { transform: scale(1.15); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-container container animate-fade-in">
      <div className="login-box glass-panel">
        
        {step === 1 ? (
          /* STEP 1: REQUEST OTP */
          <>
            <div className="login-header">
              <div className="lock-icon-wrapper">
                <Mail size={20} className="logo-icon" />
              </div>
              <h2>OTP Sign In</h2>
              <p>Enter your email below to receive a secure 6-digit verification code stored in our SQLite database.</p>
            </div>
            
            <form onSubmit={handleRequestOtp} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                    placeholder="user@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              {error && <div className="form-error">{error}</div>}
              
              <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', width: '100%' }}>
                <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
              </button>
            </form>
          </>
        ) : (
          /* STEP 2: VERIFY OTP */
          <>
            <div className="login-header">
              <div className="lock-icon-wrapper">
                <KeyRound size={20} className="logo-icon" />
              </div>
              <h2>Verify OTP</h2>
              <p>We've simulated sending a security code to <strong style={{ color: 'var(--text-heading)' }}>{email}</strong>.</p>
            </div>
            
            <form onSubmit={handleVerifyOtp} className="login-form">
              <div className="form-group">
                <label htmlFor="otp">Verification Code</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '38px', width: '100%', letterSpacing: '0.3em', textAlign: 'center', fontWeight: 700 }}
                    placeholder="123456"
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              {/* Developer Debug Autofill Bubble */}
              {debugOtp && (
                <div 
                  onClick={() => setOtp(debugOtp)}
                  style={{
                    background: 'var(--accent-glow)',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: 'var(--text-heading)',
                    transition: 'all 0.2s'
                  }}
                  title="Click to autofill simulated code"
                  className="debug-autofill-bubble"
                >
                  <HelpCircle size={12} style={{ color: 'var(--accent)' }} />
                  <span>[Dev Mode] Click to autofill: <strong>{debugOtp}</strong></span>
                </div>
              )}
              
              {error && <div className="form-error">{error}</div>}
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => { setStep(1); setError(''); setOtp(''); }}
                  disabled={loading}
                  style={{ flexShrink: 0, padding: '12px 14px' }}
                >
                  <ArrowLeft size={16} />
                </button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', flexGrow: 1 }}>
                  <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
                </button>
              </div>
            </form>
          </>
        )}

      </div>
      <style>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 160px);
        }
        .login-box {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 12px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .lock-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: oklch(65% 0.2 300 / 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .login-header h2 {
          font-size: 1.8rem;
          margin-bottom: 8px;
          color: var(--text-heading);
        }
        .login-header p {
          font-size: 0.85rem;
          opacity: 0.7;
          line-height: 1.5;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group label {
          font-size: 0.8rem;
          font-family: var(--font-mono);
          text-transform: uppercase;
          opacity: 0.8;
          color: var(--text-heading);
        }
        .form-input {
          border: 1px solid var(--border);
          color: var(--text-heading);
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          padding: 12px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          border-color: var(--primary);
        }
        .form-error {
          color: oklch(65% 0.18 20);
          font-size: 0.8rem;
          background: oklch(65% 0.18 20 / 0.1);
          padding: 10px;
          border-radius: 6px;
          border: 1px solid oklch(65% 0.18 20 / 0.2);
          text-align: center;
        }
        .debug-autofill-bubble:hover {
          background: var(--border) !important;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;