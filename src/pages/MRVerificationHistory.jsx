import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const MRVerificationHistory = () => {
    const navigate = useNavigate();
    const [mrs, setMrs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMrs = async () => {
        try {
            setLoading(true);
            const data = await api.getMaterialRequests();
            const history = (data.results || data).filter(mr => mr.status !== 'PLACED' && mr.status !== 'DRAFT');
            setMrs(history);
        } catch (err) {
            console.error("Error fetching MR history:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMrs();
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'MGMT_APPROVED': return { background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' };
            case 'ISSUED': return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
            case 'ACCEPTED': return { background: 'var(--status-success-bg)', color: 'var(--status-success-text-vibrant)' };
            case 'COMPLETED': return { background: 'var(--status-accent-bg)', color: 'var(--status-accent-text)' };
            case 'REJECTED': return { background: 'var(--status-error-bg)', color: 'var(--status-error-text-vibrant)' };
            default: return {};
        }
    };

    if (loading && mrs.length === 0) return <div className="main-container"><h3>Loading history...</h3></div>;

    return (
        <div className="main-container">
            <header className="welcome-header animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '2.5rem' }}>📜</span>
                        <div>
                            <h1 style={{ margin: 0 }}>Verification History</h1>
                            <p style={{ margin: '0.2rem 0 0', opacity: 0.7 }}>Log of all kitchen requests reviewed by management.</p>
                        </div>
                    </div>
                    <button 
                        className="secondary-btn" 
                        onClick={() => navigate('/management/kitchen-requests')}
                    >
                        ← Back to Queue
                    </button>
                </div>
            </header>

            <div className="glass animate-fade-in" style={{ padding: '2rem', borderRadius: '24px' }}>
                {mrs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <span style={{ fontSize: '4rem', opacity: 0.3, display: 'block', marginBottom: '1rem' }}>📜</span>
                        <h3>No history found.</h3>
                        <p style={{ color: 'var(--text-muted)' }}>You haven't verified any requests yet.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>MR Number</th>
                                    <th>Review Date</th>
                                    <th>Status</th>
                                    <th>Items</th>
                                    <th>Verified By</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mrs.map((mr) => (
                                    <tr key={mr.id}>
                                        <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{mr.mr_number}</td>
                                        <td>{mr.mgmt_verified_at ? new Date(mr.mgmt_verified_at).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            <span style={{
                                                padding: '0.3rem 0.8rem',
                                                borderRadius: '20px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                ...getStatusStyle(mr.status)
                                            }}>
                                                {mr.status}
                                            </span>
                                        </td>
                                        <td>{mr.items?.length || 0} items</td>
                                        <td>{mr.mgmt_verified_by_username || 'System'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="secondary-btn" 
                                                style={{ fontSize: '0.7rem' }}
                                                onClick={() => navigate(`/management/kitchen-requests/view/${mr.id}`)}
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MRVerificationHistory;
