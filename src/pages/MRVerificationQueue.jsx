import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const MRVerificationQueue = () => {
    const [mrs, setMrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMR, setSelectedMR] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [adjustedQuantities, setAdjustedQuantities] = useState({});
    const [adjustmentRemarks, setAdjustmentRemarks] = useState({});

    const fetchMrs = async () => {
        try {
            setLoading(true);
            // In get_queryset, we already filter PLACED for those with can_verify_mr
            const data = await api.getMaterialRequests({ status: 'PLACED' });
            setMrs(data.results || data);
        } catch (err) {
            console.error("Error fetching MRs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMrs();
    }, []);

    const handleSelectMR = (mr) => {
        setSelectedMR(mr);
        setRemarks(mr.mgmt_remarks || '');
        const qtys = {};
        const adjRems = {};
        mr.items.forEach(item => {
            qtys[item.id] = item.quantity;
            adjRems[item.id] = item.mgmt_adjustment_remarks || '';
        });
        setAdjustedQuantities(qtys);
        setAdjustmentRemarks(adjRems);
    };

    const handleQuantityChange = (itemId, val) => {
        setAdjustedQuantities(prev => ({
            ...prev,
            [itemId]: val
        }));
    };

    const handleVerifyAction = async (isApproved) => {
        if (!isApproved && !remarks.trim()) {
            alert("Please provide remarks when sending back to kitchen.");
            return;
        }

        const confirmMsg = isApproved 
            ? "Are you sure you want to approve this request for procurement?" 
            : "Are you sure you want to send this back to the kitchen for corrections?";
        
        if (!window.confirm(confirmMsg)) return;

        try {
            setActionLoading(true);
            const items = selectedMR.items.map(item => ({
                id: item.id,
                quantity: parseFloat(adjustedQuantities[item.id]),
                mgmt_adjustment_remarks: adjustmentRemarks[item.id] || ''
            }));

            await api.verifyMaterialRequest(selectedMR.id, {
                action: isApproved ? 'APPROVE' : 'SEND_BACK',
                mgmt_remarks: remarks,
                items: items
            });

            setSelectedMR(null);
            fetchMrs();
        } catch (err) {
            console.error("Verification failed:", err);
            alert(err.error || "Action failed. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && mrs.length === 0) return <div className="main-container"><h3>Loading kitchen requests...</h3></div>;

    return (
        <div className="main-container">
            <header className="welcome-header animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>🍳</span>
                    <div>
                        <h1 style={{ margin: 0 }}>Kitchen Request Verification</h1>
                        <p style={{ margin: '0.2rem 0 0', opacity: 0.7 }}>Review, adjust, and authorize kitchen material requests.</p>
                    </div>
                </div>
                <Link to="/management/kitchen-requests/history">
                    <button className="secondary-btn">📜 View History Logs</button>
                </Link>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: selectedMR ? '1fr 450px' : '1fr', gap: '2rem', alignItems: 'start' }}>
                <div className="glass animate-fade-in" style={{ padding: '2rem', borderRadius: '24px' }}>
                    {mrs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                            <span style={{ fontSize: '4rem', opacity: 0.3, display: 'block', marginBottom: '1rem' }}>📋</span>
                            <h3>No pending kitchen requests.</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Everything has been verified!</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>MR Number</th>
                                        <th>Date</th>
                                        <th>Items</th>
                                        <th style={{ textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mrs.map((mr) => (
                                        <tr key={mr.id} className={selectedMR?.id === mr.id ? 'selected-row' : ''} onClick={() => handleSelectMR(mr)} style={{ cursor: 'pointer' }}>
                                            <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{mr.mr_number}</td>
                                            <td>{new Date(mr.order_date).toLocaleDateString()}</td>
                                            <td>{mr.items?.length || 0} items</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="action-btn" style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '0.7rem' }}>
                                                    Review & Verify
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {selectedMR && (
                    <div className="glass animate-slide-in-right" style={{ padding: '2rem', borderRadius: '24px', position: 'sticky', top: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Reviewing {selectedMR.mr_number}</h3>
                            <button onClick={() => setSelectedMR(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', opacity: 0.7 }}>Requested Items</label>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {selectedMR.items.map(item => (
                                    <div key={item.id} style={{ 
                                        padding: '1rem', 
                                        background: 'rgba(255,255,255,0.05)', 
                                        borderRadius: '12px', 
                                        marginBottom: '0.8rem',
                                        border: '1px solid var(--border-glass)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600 }}>{item.item_name}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Orig: {item.quantity} {item.unit}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Verify Qty:</span>
                                            <input 
                                                type="number" 
                                                className="form-input"
                                                style={{ height: '32px', padding: '0 0.5rem', width: '80px' }}
                                                value={adjustedQuantities[item.id] || 0}
                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            />
                                            <span style={{ fontSize: '0.8rem' }}>{item.unit}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>ADJUSTMENT REASON (Optional)</span>
                                            <input 
                                                type="text" 
                                                className="form-input"
                                                style={{ height: '28px', padding: '0 0.5rem', fontSize: '0.8rem' }}
                                                placeholder="e.g. Excessive qty, store low"
                                                value={adjustmentRemarks[item.id] || ''}
                                                onChange={(e) => setAdjustmentRemarks({...adjustmentRemarks, [item.id]: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', opacity: 0.7 }}>Management Remarks</label>
                            <textarea 
                                className="form-input" 
                                rows="3"
                                placeholder="Add instructions or reason for adjustment/return..."
                                style={{ width: '100%', resize: 'none', padding: '0.8rem' }}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                className="action-btn"
                                style={{ flex: 1, background: 'var(--color-success)', color: '#fff', height: '48px', fontWeight: 700 }}
                                disabled={actionLoading}
                                onClick={() => handleVerifyAction(true)}
                            >
                                {actionLoading ? 'Processing...' : 'Approve & Send'}
                            </button>
                            <button 
                                className="action-btn"
                                style={{ flex: 1, background: 'var(--status-error-text-vibrant)', color: '#fff', height: '48px', fontWeight: 700 }}
                                disabled={actionLoading}
                                onClick={() => handleVerifyAction(false)}
                            >
                                Send Back
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MRVerificationQueue;
