import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const KitchenLanding = () => {
    const [notifications, setNotifications] = useState({
        issued: [],
        approved: [],
        rejected: [],
        acknowledged: [],
        corrections: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Fetch multiple statuses in parallel for efficiency
                const [issuedRes, approvedRes, rejectedRes, placedRes, draftRes] = await Promise.all([
                    api.getMaterialRequests({ status: 'ISSUED' }),
                    api.getMaterialRequests({ status: 'MGMT_APPROVED' }),
                    api.getMaterialRequests({ status: 'REJECTED' }),
                    api.getMaterialRequests({ status: 'PLACED', is_acknowledged: 'true' }),
                    api.getMaterialRequests({ status: 'DRAFT' })
                ]);

                // Helper to extract results
                const getResults = (res) => res.results || res;

                // Helper to get last dismissed timestamp
                const getLastDismissed = (type) => {
                    const str = localStorage.getItem(`dismissed_${type}_timestamp`);
                    return str ? new Date(str) : new Date(0);
                };

                const lastRejectedDismissed = getLastDismissed('rejected');
                const recentRejected = getResults(rejectedRes).filter(mr => {
                    const updatedAt = new Date(mr.updated_at);
                    const now = new Date();
                    return (now - updatedAt) < (48 * 60 * 60 * 1000) && updatedAt > lastRejectedDismissed;
                });

                setNotifications({
                    issued: getResults(issuedRes),
                    approved: getResults(approvedRes),
                    rejected: recentRejected,
                    acknowledged: getResults(placedRes),
                    corrections: getResults(draftRes).filter(mr => mr.mgmt_remarks)
                });
            } catch (err) {
                console.error("Failed to fetch kitchen notifications:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const handleDismiss = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        
        localStorage.setItem(`dismissed_${type}_timestamp`, new Date().toISOString());
        
        setNotifications(prev => ({
            ...prev,
            [type]: []
        }));
    };

    const renderNotification = (type, data) => {
        if (!data || data.length === 0) return null;

        const configs = {
            issued: {
                title: 'Stock Arrived!',
                message: 'Items have been issued from the store. Please verify and accept them.',
                icon: '🚚',
                color: 'var(--status-success-text-vibrant)',
                bg: 'var(--status-success-bg, rgba(16, 185, 129, 0.1))',
                link: '/kitchen/mr-entries?status=ISSUED',
                btnText: 'Check & Accept'
            },
            approved: {
                title: 'Management Approved!',
                message: 'Your request has been approved. Procurement is processing it.',
                icon: '✅',
                color: '#34d399',
                bg: 'rgba(52, 211, 153, 0.1)',
                link: '/kitchen/mr-entries?status=MGMT_APPROVED',
                btnText: 'View Status'
            },
            rejected: {
                title: 'Request Rejected!',
                message: 'A request was rejected. Please check the remarks for details.',
                icon: '❌',
                color: '#f87171',
                bg: 'rgba(248, 113, 113, 0.1)',
                link: '/kitchen/mr-entries?status=REJECTED',
                btnText: 'Check Remarks'
            },
            acknowledged: {
                title: 'Request Acknowledged',
                message: 'Procurement has seen and acknowledged your material request.',
                icon: '👀',
                color: '#60a5fa',
                bg: 'rgba(96, 165, 250, 0.1)',
                link: '/kitchen/mr-entries?status=PLACED',
                btnText: 'Track PR'
            },
            corrections: {
                title: 'Correction Required!',
                message: 'Management has sent back a request for changes. Check the remarks.',
                icon: '✏️',
                color: '#fbbf24',
                bg: 'rgba(251, 191, 36, 0.1)',
                link: '/kitchen/mr-entries?status=DRAFT',
                btnText: 'Edit Request'
            }
        };

        const config = configs[type];

        return (
            <div key={type} className="glass animate-fade-in" style={{ 
                padding: '1.2rem 1.5rem', 
                marginBottom: '1rem', 
                background: config.bg,
                borderLeft: `5px solid ${config.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.8rem' }}>{config.icon}</div>
                    <div>
                        <h3 style={{ margin: 0, color: config.color, fontSize: '1.1rem' }}>
                            {config.title} ({data.length})
                        </h3>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
                            {config.message}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to={config.link} className="action-btn" style={{ 
                        background: config.color,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem'
                    }}>
                        {config.btnText}
                    </Link>
                    
                    <button 
                        onClick={(e) => handleDismiss(e, type)}
                        title="Dismiss"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: config.color,
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            opacity: 0.6,
                            transition: 'opacity 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = 1}
                        onMouseLeave={(e) => e.target.style.opacity = 0.6}
                    >
                        ✕
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1>🍳 Kitchen Dashboard</h1>
                <p>Welcome to the Kitchen Operations Management System.</p>
            </header>

            {!loading && (
                <div className="notifications-container" style={{ marginBottom: '2rem' }}>
                    {renderNotification('corrections', notifications.corrections)}
                    {renderNotification('issued', notifications.issued)}
                    {renderNotification('approved', notifications.approved)}
                    {renderNotification('acknowledged', notifications.acknowledged)}
                    {renderNotification('rejected', notifications.rejected)}
                </div>
            )}

            <div className="actions-grid">
                <Link to="/kitchen/mr" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass action-card" style={{ '--accent-color': '#f7768e' }}>
                        <div className="card-icon-wrapper">📝</div>
                        <h3>Place Material Request</h3>
                        <p>Request raw materials from the main store for daily operations.</p>
                        <button className="action-btn">New Request</button>
                    </div>
                </Link>
                <Link to="/kitchen/mr-entries" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass action-card" style={{ '--accent-color': '#bb9af7' }}>
                        <div className="card-icon-wrapper">📋</div>
                        <h3>Request History</h3>
                        <p>View and track the status of your previously placed material requests.</p>
                        <button className="action-btn">View MRs</button>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default KitchenLanding;