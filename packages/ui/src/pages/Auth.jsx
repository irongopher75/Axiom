import React, { useState, useEffect } from 'react';
import { login, register } from '../api/index';
import { Navigate } from 'react-router-dom';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [redirectTo, setRedirectTo] = useState(null);
    const [tick, setTick] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }));

    useEffect(() => {
        // If already logged in, go straight to terminal
        if (localStorage.getItem('token')) {
            setRedirectTo('/terminal');
        }
        const t = setInterval(() => setTick(new Date().toLocaleTimeString('en-IN', { hour12: false })), 1000);
        return () => clearInterval(t);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
                setRedirectTo('/terminal');
            } else {
                await register(email, password);
                setError('');
                alert('Registration submitted. Awaiting admin approval.');
                setIsLogin(true);
            }
        } catch (err) {
            if (!err.response) {
                setError('SERVER OFFLINE. PLEASE START BACKEND SERVER.');
            } else {
                const detail = err.response?.data?.detail;
                if (Array.isArray(detail)) setError(detail.map(d => d.msg).join(', '));
                else if (typeof detail === 'string') setError(detail);
                else setError('Authentication failed. Check credentials.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (redirectTo) return <Navigate to={redirectTo} replace />;

    return (
        <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace' }}>

            {/* Background grid lines */}
            <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(#0A0A0A 1px, transparent 1px), linear-gradient(90deg, #0A0A0A 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

            {/* Status bar */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '28px', background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 10 }}>
                <span style={{ color: '#FF6600', fontSize: '12px', letterSpacing: '2px' }}>▸ AXIOM TERMINAL</span>
                <span style={{ color: '#333', fontSize: '10px' }}>{tick} IST</span>
            </div>

            {/* Login Card */}
            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px', padding: '0 16px', marginTop: '28px' }}>
                <div style={{ border: '1px solid #1A1A1A', background: '#0D0D0D', padding: '40px 36px' }}>

                    {/* Logo */}
                    <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '26px', color: '#FF6600', letterSpacing: '6px', marginBottom: '6px' }}>AXIOM</div>
                        <div style={{ fontSize: '11px', color: '#333', letterSpacing: '2px' }}>QUANTITATIVE INTELLIGENCE HUB</div>
                    </div>

                    {/* Mode toggle */}
                    <div style={{ display: 'flex', marginBottom: '28px', borderBottom: '1px solid #1A1A1A' }}>
                        {['LOGIN', 'REGISTER'].map(mode => {
                            const active = (mode === 'LOGIN') === isLogin;
                            return (
                                <button key={mode} onClick={() => { setIsLogin(mode === 'LOGIN'); setError(''); }}
                                    style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? '#FF6600' : 'transparent'}`, color: active ? '#FF6600' : '#444', fontFamily: 'IBM Plex Mono', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.15s', borderRadius: 0 }}>
                                    {mode}
                                </button>
                            );
                        })}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: 'rgba(255,34,68,0.08)', border: '1px solid #FF224433', padding: '8px 12px', marginBottom: '16px', color: '#FF4455', fontSize: '10px', letterSpacing: '0.05em', borderRadius: 0 }}>
                            {error.toUpperCase()}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', color: '#444', fontSize: '9px', letterSpacing: '1px', marginBottom: '4px' }}>EMAIL</label>
                            <input
                                type="email" required autoComplete="email"
                                value={email} onChange={e => setEmail(e.target.value)}
                                style={{ width: '100%', background: '#060606', border: '1px solid #1A1A1A', padding: '10px 12px', color: '#FFF', fontFamily: 'IBM Plex Mono', fontSize: '12px', outline: 'none', boxSizing: 'border-box', transition: 'border 0.15s', borderRadius: 0 }}
                                onFocus={e => e.target.style.borderColor = '#FF6600'}
                                onBlur={e => e.target.style.borderColor = '#1A1A1A'}
                                placeholder="user@domain.com"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#444', fontSize: '9px', letterSpacing: '1px', marginBottom: '4px' }}>PASSWORD</label>
                            <input
                                type="password" required autoComplete="current-password"
                                value={password} onChange={e => setPassword(e.target.value)}
                                style={{ width: '100%', background: '#060606', border: '1px solid #1A1A1A', padding: '10px 12px', color: '#FFF', fontFamily: 'IBM Plex Mono', fontSize: '12px', outline: 'none', boxSizing: 'border-box', transition: 'border 0.15s', borderRadius: 0 }}
                                onFocus={e => e.target.style.borderColor = '#FF6600'}
                                onBlur={e => e.target.style.borderColor = '#1A1A1A'}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit" disabled={isLoading}
                            onMouseEnter={e => { if (!isLoading) { e.target.style.background = '#FF6600'; e.target.style.color = '#000'; } }}
                            onMouseLeave={e => { if (!isLoading) { e.target.style.background = 'transparent'; e.target.style.color = '#FF6600'; } }}
                            style={{
                                marginTop: '8px',
                                padding: '12px',
                                background: 'transparent',
                                color: isLoading ? '#555' : '#FF6600',
                                border: `1px solid ${isLoading ? '#1A1A1A' : '#FF6600'}`,
                                fontFamily: 'IBM Plex Mono',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                letterSpacing: '2px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                borderRadius: 0
                            }}
                        >
                            {isLoading ? 'AUTHENTICATING...' : (isLogin ? 'ACCESS TERMINAL' : 'REQUEST ACCESS')}
                        </button>
                    </form>

                    {/* Register note */}
                    {!isLogin && (
                        <div style={{ marginTop: '16px', color: '#333', fontSize: '9px', textAlign: 'center', lineHeight: '1.6' }}>
                            NEW ACCOUNTS REQUIRE ADMIN APPROVAL<br />BEFORE TERMINAL ACCESS IS GRANTED
                        </div>
                    )}

                    {/* Admin link */}
                    <div style={{ marginTop: '28px', textAlign: 'center', borderTop: '1px solid #111', paddingTop: '16px' }}>
                        <a href="/admin" style={{ color: '#333', fontSize: '9px', letterSpacing: '1px', textDecoration: 'none' }}>
                            ADMIN CONSOLE →
                        </a>
                    </div>
                </div>

                {/* Version tag */}
                <div style={{ textAlign: 'center', marginTop: '12px', color: '#1A1A1A', fontSize: '9px', letterSpacing: '1px' }}>
                    AXIOM v3.0 · RESTRICTED ACCESS
                </div>
            </div>
        </div>
    );
};

export default Auth;
