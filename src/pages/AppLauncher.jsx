import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AppLauncher = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [pendingResets, setPendingResets] = useState(0);

    useEffect(() => {
        if (user?.is_superuser) {
            const fetchPending = async () => {
                try {
                    const response = await fetch(`/food_tracker/api/password-reset-requests/?status=PENDING`, {
                        headers: {
                            'Authorization': `Token ${localStorage.getItem('ft_token')}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setPendingResets(data.results ? data.results.length : data.length);
                    }
                } catch (err) {
                    console.error('Error fetching reset requests:', err);
                }
            };
            fetchPending();
        }
    }, [user]);

    // All possible apps in the system
    const allApps = [
        { 
            code: 'kitchen', 
            name: 'Kitchen Department', 
            logo: '🍳', 
            description: 'Kitchen Operations, Recipes & Yield Management',
            path: '/kitchen/',
            color: '#f7768e'
        },
        { 
            code: 'procurement', 
            name: 'Procurement Department', 
            logo: '📦', 
            description: 'Procurement, Inventory & Master Data Management',
            path: '/procurement/',
            color: '#7aa2f7'
        },
        { 
            code: 'management', 
            name: 'Management Department', 
            logo: '💼', 
            description: 'Executive dashboard for PR approvals, financial reports, and inventory analysis.',
            path: '/management/',
            color: '#bb9af7'
        }
    ];

    // Filter apps based on user departments or staff status
    const assignedCodes = (user?.profile?.department_details || []).map(d => d.code);
    const availableDepts = allApps.filter(app => 
        assignedCodes.includes(app.code) || user?.is_superuser
    );

    const handleSelect = (path) => {
        navigate(path);
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'var(--bg-main)',
            backgroundImage: `
                radial-gradient(circle at 20% 20%, var(--gradient-1) 0%, transparent 40%),
                radial-gradient(circle at 80% 80%, var(--gradient-2) 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, var(--gradient-3) 0%, transparent 60%)
            `,
            backgroundAttachment: 'fixed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: 'var(--text-main)',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.5s ease'
        }}>
            {/* Theme Toggle for Launcher */}
            <button 
                className="theme-toggle" 
                onClick={toggleTheme}
                style={{ position: 'fixed', top: '2rem', right: '2rem', margin: 0 }}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
                <span className="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
            
            {pendingResets > 0 && (
                <div 
                    onClick={() => navigate('/procurement/admin')}
                    style={{
                        position: 'fixed',
                        top: '1rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #f47920, #e06010)',
                        color: 'white',
                        padding: '0.6rem 1.5rem',
                        borderRadius: '50px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(244,121,32,0.4)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        animation: 'slideDown 0.5s ease-out'
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>🔔</span>
                    <span>{pendingResets} Password Reset Request{pendingResets > 1 ? 's' : ''} Pending</span>
                </div>
            )}

            <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #7aa2f7, #bb9af7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Welcome, {user?.first_name || user?.username}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Please select a department to continue</p>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2.5rem', 
                justifyContent: 'center', 
                maxWidth: '1100px',
                width: '100%',
                margin: '0 auto'
            }}>
                {availableDepts.map((dept) => (
                    <div 
                        key={dept.code}
                        onClick={() => handleSelect(dept.path)}
                        className="dept-card"
                        style={{
                            background: 'var(--bg-glass)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '24px',
                            padding: '3rem 1.5rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div style={{ fontSize: '4.5rem', marginBottom: '1.5rem', display: 'block' }}>
                            {dept.logo || '🏢'}
                        </div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
                            {dept.display_name || dept.name}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5', fontSize: '0.95rem' }}>
                            {dept.description || 'Access department modules and tools.'}
                        </p>
                        
                        <div className="card-hover-bg" style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: `radial-gradient(circle at center, ${dept.color}15 0%, transparent 70%)`,
                            opacity: 0,
                            transition: 'opacity 0.4s ease'
                        }} />
                    </div>
                ))}
            </div>

            <button 
                onClick={logout}
                style={{
                    marginTop: '5rem',
                    background: 'none',
                    border: '1px solid var(--border-glass-bright)',
                    color: 'var(--text-muted)',
                    padding: '0.8rem 2rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#fff'; }}
                onMouseOut={(e) => { e.target.style.background = 'none'; e.target.style.color = '#94a3b8'; }}
            >
                Logout from System
            </button>

            <style>{`
                .dept-card:hover {
                    transform: translateY(-15px) scale(1.02);
                    border-color: var(--color-primary);
                    box-shadow: var(--shadow-premium);
                    background: var(--bg-glass-heavy);
                }
                .dept-card:hover .card-hover-bg {
                    opacity: 1;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.8s ease-out forwards;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                @media (max-width: 768px) {
                    h1 { font-size: 2rem !important; }
                    p { font-size: 1rem !important; }
                    .dept-card { padding: 2rem 1rem !important; }
                }
            `}</style>
        </div>
    );
};

export default AppLauncher;
