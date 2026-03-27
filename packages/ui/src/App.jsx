import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AxiomTerminal from './components/terminal/AxiomTerminal';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './components/landing/LandingPage';
import LogoReveal from './components/auth/LogoReveal';
import { getMe } from './api/index';
import { UpdateNotification } from './components/Desktop/UpdateNotification';

// ─── Auth State Helper ────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token');

// ─── Protected Route Guard ────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
    const [status, setStatus] = useState('checking');

    useEffect(() => {
        if (!getToken()) {
            setStatus('denied');
            return;
        }
        getMe()
            .then(res => {
                if (res.data?.is_active && res.data?.is_approved) setStatus('ok');
                else setStatus('denied');
            })
            .catch(() => {
                localStorage.removeItem('token');
                setStatus('denied');
            });
    }, []);

    if (status === 'checking') {
        return (
            <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono', color: '#FF6600', fontSize: '13px', letterSpacing: '0.1em' }}>
                VERIFYING SESSION...
            </div>
        );
    }
    if (status === 'denied') return <Navigate to="/login" replace />;
    return children;
};

// ─── Admin Route Guard ─────────────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
    const [status, setStatus] = useState('checking');

    useEffect(() => {
        if (!getToken()) { setStatus('denied'); return; }
        getMe()
            .then(res => {
                if (res.data?.is_superuser && res.data?.is_active) setStatus('ok');
                else setStatus('denied');
            })
            .catch(() => setStatus('denied'));
    }, []);

    if (status === 'checking') {
        return (
            <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono', color: '#FF6600', fontSize: '13px', letterSpacing: '0.1em' }}>
                VERIFYING ADMIN ACCESS...
            </div>
        );
    }
    if (status === 'denied') return <Navigate to="/terminal" replace />;
    return children;
};

// ─── App Router ───────────────────────────────────────────────────────────────
function App() {
    const [showReveal, setShowReveal] = useState(true);

    // Initial branding sequence logic
    useEffect(() => {
        // If they're coming from inside the app (e.g. refresh on /terminal), 
        // maybe we skip reveal? User said "When the domain loads...".
        // For now, we always show it once per app mount.
    }, []);

    if (showReveal) {
        return <LogoReveal onComplete={() => setShowReveal(false)} />;
    }

    return (
        <BrowserRouter>
            <UpdateNotification />
            <Routes>
                {/* Landing page = AXIOM Landing */}
                <Route path="/" element={<LandingPage />} />

                {/* Login Page — refined for v3.5 */}
                <Route path="/login" element={<Auth />} />

                {/* AXIOM Terminal — requires active account */}
                <Route
                    path="/terminal"
                    element={
                        <ProtectedRoute>
                            <AxiomTerminal />
                        </ProtectedRoute>
                    }
                />

                {/* Admin dashboard */}
                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    }
                />

                <Route path="/dashboard" element={<Navigate to="/terminal" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
