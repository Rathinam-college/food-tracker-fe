import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const ManagementApprovalHistory = () => {
    const navigate = useNavigate();
    const [prs, setPrs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPrs = async () => {
        try {
            setLoading(true);
            const data = await api.getPurchaseRequests({ page_size: 100 });
            const history = (data.results || data).filter(pr => 
                !['DRAFT', 'AWAITING_L1', 'AWAITING_L2', 'AWAITING_APPROVAL'].includes(pr.status)
            );
            setPrs(history);
        } catch (err) {
            console.error("Error fetching PR history:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrs();
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'APPROVED': return { background: 'var(--status-success-bg)', color: 'var(--status-success-text-vibrant)' };
            case 'PO_GENERATED': return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
            case 'REJECTED': return { background: 'var(--status-error-bg)', color: 'var(--status-error-text-vibrant)' };
            default: return {};
        }
    };

    if (loading && prs.length === 0) return <div className="main-container"><h3>Loading history...</h3></div>;

    return (
        <div className="main-container">
            <header className="welcome-header animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '2.5rem' }}>📜</span>
                        <div>
                            <h1 style={{ margin: 0 }}>Approval History</h1>
                            <p style={{ margin: '0.2rem 0 0', opacity: 0.7 }}>Log of all procurement requests reviewed by management.</p>
                        </div>
                    </div>
                    <button 
                        className="secondary-btn" 
                        onClick={() => navigate('/management/approvals')}
                    >
                        ← Back to Approvals
                    </button>
                </div>
            </header>

            <div className="glass animate-fade-in" style={{ padding: '2rem', borderRadius: '24px' }}>
                {prs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <span style={{ fontSize: '4rem', opacity: 0.3, display: 'block', marginBottom: '1rem' }}>📜</span>
                        <h3>No history found.</h3>
                        <p style={{ color: 'var(--text-muted)' }}>You haven't reviewed any requests yet.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>PR Number</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Total Value</th>
                                    <th>Requested By</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prs.map((pr) => (
                                    <tr key={pr.id}>
                                        <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{pr.pr_number}</td>
                                        <td>{new Date(pr.order_date).toLocaleDateString()}</td>
                                        <td>
                                            <span style={{
                                                padding: '0.3rem 0.8rem',
                                                borderRadius: '20px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                ...getStatusStyle(pr.status)
                                            }}>
                                                {pr.status}
                                            </span>
                                        </td>
                                        <td>₹{parseFloat(pr.grand_total).toLocaleString()}</td>
                                        <td>{pr.created_by_username || 'System'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="secondary-btn" 
                                                style={{ fontSize: '0.7rem' }}
                                                onClick={() => navigate(`/po/${pr.id}`)}
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

export default ManagementApprovalHistory;
