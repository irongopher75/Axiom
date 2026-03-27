import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/index';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [activePortfolios, setActivePortfolios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedRows, setExpandedRows] = useState({});
    const [adminEmail, setAdminEmail] = useState('');
    const [tick, setTick] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    const mono = { fontFamily: 'IBM Plex Mono, monospace' };

    const fetchAdminData = async () => {
        setLoading(true);
        setError(null);
        try {
            const meRes = await api.get('/api/v1/users/me');
            if (!meRes.data.is_superuser) {
                navigate('/terminal');
                return;
            }
            setAdminEmail(meRes.data.email);

            const pendingRes = await api.get('/api/v1/admin/pending-users');
            setPendingUsers(pendingRes.data);

            const overviewRes = await api.get('/api/v1/admin/users-overview');
            setActivePortfolios(overviewRes.data);
            
        } catch (err) {
            console.error('Admin Fetch Error:', err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/');
            } else {
                setError('Failed to load surveillance data.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
        const t = setInterval(() => setTick(new Date().toLocaleTimeString('en-IN', { hour12: false })), 1000);
        const poll = setInterval(fetchAdminData, 30000);
        return () => { clearInterval(t); clearInterval(poll); };
    }, [navigate]);

    const handleApprove = async (userId) => {
        try {
            await api.post(`/api/v1/admin/approve/${userId}`);
            setPendingUsers(prev => prev.filter(u => u._id !== userId && u.id !== userId));
            fetchAdminData();
        } catch (err) {
            console.error('Failed to approve user:', err);
            alert('Approval failed.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const toggleRow = (userId) => {
        setExpandedRows(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#000000', color: '#E8E8E0', fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
            {/* Header Mirroring Terminal */}
            <div style={{ background: '#0D0D0D', borderBottom: '1px solid #1A1A1A', padding: '0 24px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ color: '#FF6600', fontSize: '13px', letterSpacing: '3px', fontWeight: 'bold' }}>AXIOM</span>
                    <span style={{ color: '#333', fontSize: '10px', ...mono }}>/ ADMIN SURVEILLANCE CONSOLE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ color: '#444', fontSize: '10px', ...mono }}>{adminEmail}</span>
                    <span style={{ color: '#333', fontSize: '10px', ...mono }}>{tick}</span>
                    <button onClick={() => navigate('/terminal')} style={{ background: 'transparent', border: '1px solid #1A1A1A', color: '#555', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', ...mono }}>↗ TERMINAL</button>
                    <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #FF244433', color: '#FF2244', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', ...mono }}>LOGOUT</button>
                </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                
                {error && <div style={{ padding: '12px', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', border: '1px solid #FF3B30', ...mono, fontSize: '12px' }}>[SYS_ERR] {error}</div>}

                {/* REGISTRATIONS SECTION */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '18px', color: '#06B6D4', letterSpacing: '2px', ...mono }}>PENDING APPROVALS</div>
                        <div style={{ background: '#06B6D422', border: '1px solid #06B6D4', color: '#06B6D4', padding: '2px 8px', ...mono, fontSize: '12px' }}>{pendingUsers.length}</div>
                    </div>
                    
                    <div style={{ border: '1px solid #1A1A1A', background: '#0D0D0D' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#111', borderBottom: '1px solid #1A1A1A', color: '#888', ...mono, fontSize: '10px', letterSpacing: '1px' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'normal' }}>ACCOUNT EMAIL</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'normal' }}>STATUS</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'normal' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#555', fontStyle: 'italic', ...mono, fontSize: '11px' }}>NO PENDING CLEARANCE REQUESTS</td>
                                    </tr>
                                ) : (
                                    pendingUsers.map(user => (
                                        <tr key={user._id || user.id} style={{ borderBottom: '1px solid #1A1A1A' }}>
                                            <td style={{ padding: '12px', ...mono, color: '#CCC' }}>{user.email}</td>
                                            <td style={{ padding: '12px' }}><span style={{ color: '#FF9500', fontSize: '11px', border: '1px solid #FF9500', padding: '2px 6px', ...mono }}>PENDING</span></td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <button 
                                                    onClick={() => handleApprove(user._id || user.id)}
                                                    style={{ background: 'rgba(0,255,65,0.06)', color: '#00FF41', border: '1px solid #00FF4144', padding: '6px 16px', cursor: 'pointer', ...mono, fontSize: '11px', transition: 'all 0.2s', letterSpacing: '1px' }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,255,65,0.15)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(0,255,65,0.06)'}
                                                >
                                                    APPROVE ACCESS
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SURVEILLANCE SECTION */}
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '18px', color: '#FF9500', letterSpacing: '2px', ...mono }}>LIVE PORTFOLIO SURVEILLANCE</div>
                        <div style={{ background: '#FF950022', border: '1px solid #FF9500', color: '#FF9500', padding: '2px 8px', ...mono, fontSize: '12px' }}>{activePortfolios.length}</div>
                        {loading && <div style={{ fontSize: '10px', color: '#06B6D4', ...mono, marginLeft: 'auto' }}>POLLING ACTIVE...</div>}
                    </div>

                    <div style={{ border: '1px solid #1A1A1A', background: '#0D0D0D' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#111', borderBottom: '1px solid #1A1A1A', color: '#888', ...mono, fontSize: '10px', letterSpacing: '1px' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'normal', width: '30px' }}></th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'normal' }}>ACCOUNT EMAIL</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'normal' }}>TOTAL EQUITY</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'normal' }}>OPEN EXPOSURE</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'normal' }}>UNREALIZED PnL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activePortfolios.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#555', fontStyle: 'italic', ...mono, fontSize: '11px' }}>NO ACTIVE PROTOCOLS TO MONITOR</td>
                                    </tr>
                                ) : (
                                    activePortfolios.map(port => {
                                        const pnlColor = port.unrealized_pnl >= 0 ? '#00FF41' : '#FF3B30';
                                        const isExpanded = !!expandedRows[port.id];
                                        return (
                                            <React.Fragment key={port.id}>
                                                {/* Parent Row */}
                                                <tr style={{ borderBottom: '1px solid #1A1A1A', cursor: 'pointer', background: isExpanded ? '#151515' : 'transparent', transition: 'background 0.2s' }} onClick={() => toggleRow(port.id)} onMouseOver={e => e.currentTarget.style.background = '#151515'} onMouseOut={e => { if(!isExpanded) e.currentTarget.style.background = 'transparent' }}>
                                                    <td style={{ padding: '12px', color: '#888', textAlign: 'center', fontSize: '10px' }}>
                                                        {isExpanded ? '▼' : '▶'}
                                                    </td>
                                                    <td style={{ padding: '12px', ...mono, color: '#D4D4D4' }}>{port.email}</td>
                                                    <td style={{ padding: '12px', textAlign: 'right', ...mono, color: '#FFF' }}>{formatCurrency(port.total_equity)}</td>
                                                    <td style={{ padding: '12px', textAlign: 'right', ...mono, color: '#888' }}>{formatCurrency(port.total_exposure)}</td>
                                                    <td style={{ padding: '12px', textAlign: 'right', ...mono, color: pnlColor }}>
                                                        {port.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(port.unrealized_pnl)}
                                                    </td>
                                                </tr>
                                                
                                                {/* Expanded Holdings Row */}
                                                {isExpanded && (
                                                    <tr style={{ borderBottom: '2px solid #1A1A1A', background: '#0a0a0a' }}>
                                                        <td colSpan="5" style={{ padding: '16px 24px 24px 44px' }}>
                                                            <div style={{ fontSize: '10px', color: '#555', marginBottom: '12px', letterSpacing: '2px', ...mono }}>ACTIVE HOLDINGS LOG</div>
                                                            {port.holdings.length === 0 ? (
                                                                <div style={{ color: '#444', fontStyle: 'italic', fontSize: '11px', ...mono }}>[ ACCOUNT IS ALL CASH // NO EXPOSURE ]</div>
                                                            ) : (
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', ...mono }}>
                                                                    <thead>
                                                                        <tr style={{ color: '#666', borderBottom: '1px solid #222' }}>
                                                                            <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'normal' }}>SYMBOL</th>
                                                                            <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'normal' }}>SIDE</th>
                                                                            <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'normal' }}>QTY</th>
                                                                            <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'normal' }}>ENTRY</th>
                                                                            <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'normal' }}>CURRENT</th>
                                                                            <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'normal' }}>PnL</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {port.holdings.map(h => (
                                                                            <tr key={h.trade_id} style={{ borderBottom: '1px solid #151515' }}>
                                                                                <td style={{ padding: '8px 4px', color: '#D4D4D4' }}>{h.symbol}</td>
                                                                                <td style={{ padding: '8px 4px', textAlign: 'center', color: h.side === 'BUY' ? '#00FF41' : '#FF3B30' }}>{h.side}</td>
                                                                                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#FFF' }}>{h.quantity}</td>
                                                                                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#888' }}>{h.entry_price.toFixed(2)}</td>
                                                                                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#06B6D4' }}>{h.current_price.toFixed(2)}</td>
                                                                                <td style={{ padding: '8px 4px', textAlign: 'right', color: h.pnl >= 0 ? '#00FF41' : '#FF3B30' }}>
                                                                                    {h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)} <span style={{ color: '#666', fontSize: '9px' }}>({h.pnl_pct.toFixed(2)}%)</span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
