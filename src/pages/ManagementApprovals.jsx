import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ManagementApprovals = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchPendingRequests = async () => {
        try {
            setLoading(true);
            const params = { page_size: 100 };
            const [l1Data, l2Data, generalData] = await Promise.all([
                api.getPurchaseRequests({ ...params, status: 'AWAITING_L1' }),
                api.getPurchaseRequests({ ...params, status: 'AWAITING_L2' }),
                api.getPurchaseRequests({ ...params, status: 'AWAITING_APPROVAL' })
            ]);
            
            // Helper to safely extract results from paginated or array response
            const getResults = (data) => (data && data.results) ? data.results : (data || []);
            
            const l1 = getResults(l1Data);
            const l2 = getResults(l2Data);
            const general = getResults(generalData);
            
            // Deduplicate by ID
            const merged = [...l1, ...l2, ...general];
            const uniqueMap = new Map();
            merged.forEach(item => uniqueMap.set(item.id, item));
            const unique = Array.from(uniqueMap.values());
            
            setPendingRequests(unique.sort((a, b) => new Date(b.order_date) - new Date(a.order_date)));
        } catch (err) {
            console.error("Error fetching pending requests:", err);
            setError("Could not load pending requests.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const handleApproveL1 = async (id) => {
        try {
            setActionLoading(id);
            await api.approvePRL1(id);
            await fetchPendingRequests();
        } catch (err) {
            console.error("Error approving L1:", err);
            alert(err.error || "Approval failed.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveL2 = async (id) => {
        try {
            setActionLoading(id);
            await api.approvePRL2(id);
            await fetchPendingRequests();
        } catch (err) {
            console.error("Error approving L2:", err);
            alert(err.error || "Approval failed.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Are you sure you want to reject this request back to DRAFT?")) return;
        try {
            setActionLoading(id);
            await api.rejectPRApproval(id);
            await fetchPendingRequests();
        } catch (err) {
            console.error("Error rejecting PR:", err);
            alert(err.error || "Rejection failed.");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="main-container"><h3>Loading pending approvals...</h3></div>;
    if (error) return <div className="main-container"><h3>Error: {error}</h3></div>;

    return (
        <div className="main-container">
            <header className="welcome-header animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>✅</span>
                    <div>
                        <h1 style={{ margin: 0 }}>Pending Procurement Approvals</h1>
                        <p style={{ margin: '0.2rem 0 0', opacity: 0.7 }}>Review and authorization center for Purchase Requests.</p>
                    </div>
                </div>
            </header>

            <div className="glass animate-fade-in" style={{ padding: '2rem', borderRadius: '24px' }}>
                {pendingRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <span style={{ fontSize: '4rem', opacity: 0.3, display: 'block', marginBottom: '1rem' }}>🎉</span>
                        <h3>No pending approvals found.</h3>
                        <p style={{ color: 'var(--text-muted)' }}>You're all caught up!</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table" style={{ minWidth: '1000px' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '150px' }}>Ref Number</th>
                                    <th style={{ width: '120px' }}>Date</th>
                                    <th style={{ width: '250px' }}>Vendor</th>
                                    <th style={{ width: '140px' }}>Amount</th>
                                    <th style={{ width: '180px' }}>Status</th>
                                    <th style={{ width: '320px', textAlign: 'right', paddingRight: '2.5rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map((pr) => (
                                    <tr key={pr.id}>
                                        <td style={{ fontWeight: 800, color: 'var(--color-primary)' }} title={pr.pr_reference}>
                                            {pr.pr_reference}
                                        </td>
                                        <td>{new Date(pr.order_date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }} title={pr.vendor_name || pr.vendor}>
                                            {pr.vendor_name || pr.vendor}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>₹{parseFloat(pr.total_amount).toLocaleString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <span className="status-badge awaiting-approval" style={{ whiteSpace: 'nowrap', background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                                    Awaiting Approval
                                                </span>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <div style={{ 
                                                        fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
                                                        background: pr.approved_by_l1_name ? 'var(--status-success-bg)' : 'var(--bg-glass)',
                                                        color: pr.approved_by_l1_name ? 'var(--status-success-text-vibrant)' : 'var(--text-muted)',
                                                        border: `1px solid ${pr.approved_by_l1_name ? 'var(--status-success-bg)' : 'var(--border-glass)'}`
                                                    }}>L1 {pr.approved_by_l1_name ? '✓' : ''}</div>
                                                    <div style={{ 
                                                        fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
                                                        background: pr.approved_by_l2_name ? 'var(--status-success-bg)' : 'var(--bg-glass)',
                                                        color: pr.approved_by_l2_name ? 'var(--status-success-text-vibrant)' : 'var(--text-muted)',
                                                        border: `1px solid ${pr.approved_by_l2_name ? 'var(--status-success-bg)' : 'var(--border-glass)'}`
                                                    }}>L2 {pr.approved_by_l2_name ? '✓' : ''}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                <button 
                                                    className="action-btn"
                                                    style={{ background: 'var(--bg-glass)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', height: '32px', padding: '0 0.8rem', fontSize: '0.7rem' }}
                                                    disabled={actionLoading === pr.id}
                                                    onClick={() => navigate(`/management/po/${pr.id}`)}
                                                >
                                                    View
                                                </button>
                                                
                                                {hasPermission('can_approve_pr_l1') && !pr.approved_by_l1_name && (
                                                    <button 
                                                        className="action-btn" 
                                                        style={{ background: 'var(--color-success)', color: '#fff', height: '32px', padding: '0 0.8rem', fontSize: '0.7rem', fontWeight: 700 }}
                                                        disabled={actionLoading === pr.id}
                                                        onClick={() => handleApproveL1(pr.id)}
                                                    >
                                                        Approve L1
                                                    </button>
                                                )}

                                                {hasPermission('can_approve_pr_l2') && !pr.approved_by_l2_name && (
                                                    <button 
                                                        className="action-btn" 
                                                        style={{ background: 'var(--color-primary)', color: '#fff', height: '32px', padding: '0 0.8rem', fontSize: '0.7rem', fontWeight: 700 }}
                                                        disabled={actionLoading === pr.id}
                                                        onClick={() => handleApproveL2(pr.id)}
                                                    >
                                                        Approve L2
                                                    </button>
                                                )}

                                                <button 
                                                    className="action-btn" 
                                                    style={{ background: 'var(--status-error-text-vibrant)', color: '#fff', height: '32px', padding: '0 0.8rem', fontSize: '0.7rem', fontWeight: 700 }}
                                                    disabled={actionLoading === pr.id}
                                                    onClick={() => handleReject(pr.id)}
                                                >
                                                    Reject
                                                </button>
                                            </div>
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

export default ManagementApprovals;
