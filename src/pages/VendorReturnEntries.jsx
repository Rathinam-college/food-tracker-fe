import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const VendorReturnEntries = () => {
    const { user } = useAuth();
    const isAdmin = user?.is_superuser || ['Admin', 'Super Admin'].includes(user?.profile?.role_details?.name);

    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [selectedReturn, setSelectedReturn] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchReturns();
    }, [startDate, endDate]);

    const fetchReturns = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const data = await api.getVendorReturns(params);
            // DRF might return paginated { results: [...] } or direct array
            setReturns(data.results || data);
        } catch (err) {
            console.error("Failed to fetch vendor returns:", err);
            setError("Failed to load vendor return history.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await api.exportVendorReturnsExcel();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Vendor_Returns_History_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to export Excel file.");
        } finally {
            setExporting(false);
        }
    };

    const openModal = (ret) => {
        setSelectedReturn(ret);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedReturn(null);
        setIsModalOpen(false);
    };

    const handleDeleteReturn = async (ret) => {
        const msg = `⚠️ WARNING: Deleting this Vendor Return will:
- RESTORE the returned quantities to your Store Inventory.
- RE-ALLOCATE the stock back to the original Purchase Request.
- INCREASE the quantity received count on the PR.

This will return the system to the state it was in BEFORE the return was processed. Are you absolutely sure?`;

        if (window.confirm(msg)) {
            setDeletingId(ret.id);
            try {
                await api.deleteVendorReturn(ret.id);
                setReturns(prev => prev.filter(r => r.id !== ret.id));
            } catch (err) {
                console.error("Failed to delete vendor return:", err);
                alert(err.error || "Failed to delete record. Please try again.");
            } finally {
                setDeletingId(null);
            }
        }
    };

    const filteredReturns = returns.filter(ret => {
        const vendorName = (ret.vendor_name || '').toLowerCase();
        const prRef = (ret.purchase_request_details?.pr_reference || '').toLowerCase();
        const searchLower = search.toLowerCase();
        return vendorName.includes(searchLower) || prRef.includes(searchLower);
    });

    const totalReturnValue = filteredReturns.reduce((sum, ret) => sum + parseFloat(ret.total_amount || 0), 0);

    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '3.5rem' }}>🔄</div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                            Vendor Return History
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>
                            Audit log of all items returned to suppliers.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            className="action-btn" 
                            onClick={handleExport}
                            disabled={exporting || loading}
                            style={{ 
                                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                                padding: '0.8rem 1.5rem'
                            }}
                        >
                            {exporting ? '⌛ Exporting...' : '📥 Export Excel'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="glass" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search Vendor or PR Reference..." 
                        className="form-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>From</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            style={{ marginBottom: 0 }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>To</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            style={{ marginBottom: 0 }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ padding: '0 1rem', borderLeft: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Return Value</div>
                        <div style={{ fontWeight: 800, color: '#e67e22', fontSize: '1.2rem' }}>
                            ₹{totalReturnValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1.5rem' }}></div>
                    <p style={{ color: 'var(--text-muted)' }}>Loading return records...</p>
                </div>
            ) : error ? (
                <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderLeft: '4px solid var(--status-error-text-vibrant)' }}>
                    <p style={{ color: 'var(--status-error-text-vibrant)', fontWeight: 600 }}>{error}</p>
                    <button className="action-btn" onClick={fetchReturns} style={{ marginTop: '1rem' }}>Retry</button>
                </div>
            ) : (
                <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Return Date</th>
                                    <th>PR Reference</th>
                                    <th>Vendor</th>
                                    <th style={{ textAlign: 'center' }}>Items</th>
                                    <th style={{ textAlign: 'right' }}>Total Value</th>
                                    <th>Processed By</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReturns.map((ret) => (
                                    <tr key={ret.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {ret.return_date ? new Date(ret.return_date).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td>
                                            <Link to={`/procurement/po/${ret.purchase_request}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                                                PR-{ret.purchase_request}
                                            </Link>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{ret.vendor_name || 'N/A'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                background: 'var(--bg-glass)', 
                                                padding: '0.2rem 0.6rem', 
                                                borderRadius: '50px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}>
                                                {ret.items?.length || 0} Items
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#e67e22' }}>
                                            ₹{parseFloat(ret.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                                            {ret.created_by_username || 'Unknown'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button 
                                                    className="action-btn"
                                                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'var(--bg-glass-heavy)' }}
                                                    onClick={() => openModal(ret)}
                                                >
                                                    View
                                                </button>
                                                {isAdmin && (
                                                    <button 
                                                        className="action-btn"
                                                        style={{ 
                                                            padding: '0.4rem 1rem', 
                                                            fontSize: '0.8rem', 
                                                            background: deletingId === ret.id ? 'var(--bg-glass)' : 'rgba(231, 76, 60, 0.1)',
                                                            color: deletingId === ret.id ? 'var(--text-muted)' : '#e74c3c',
                                                            border: '1px solid rgba(231, 76, 60, 0.2)'
                                                        }}
                                                        onClick={() => handleDeleteReturn(ret)}
                                                        disabled={deletingId === ret.id}
                                                    >
                                                        {deletingId === ret.id ? '⌛' : '🗑️ Delete'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredReturns.length === 0 && (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No vendor returns match your search criteria.
                        </div>
                    )}
                </div>
            )}

            {/* Modal for Details */}
            {isModalOpen && selectedReturn && (
                <div className="modal-overlay animate-fade-in" onClick={closeModal} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    padding: '2rem'
                }}>
                    <div className="glass modal-content" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
                        padding: '2.5rem', position: 'relative'
                    }}>
                        <button 
                            onClick={closeModal}
                            style={{
                                position: 'absolute', top: '1.5rem', right: '1.5rem',
                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                fontSize: '1.5rem', cursor: 'pointer'
                            }}
                        >✕</button>

                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Return Details</h2>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                                Sent to <strong>{selectedReturn.vendor_name}</strong> on {new Date(selectedReturn.return_date).toLocaleDateString()}
                            </p>
                        </div>

                        {selectedReturn.remarks && (
                            <div style={{ 
                                background: 'var(--bg-glass)', padding: '1rem 1.5rem', 
                                borderRadius: '8px', marginBottom: '2rem', fontStyle: 'italic',
                                borderLeft: '3px solid var(--color-primary)'
                            }}>
                                "{selectedReturn.remarks}"
                            </div>
                        )}

                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Items Returned</h3>
                        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-glass-heavy)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: 600 }}>Item</th>
                                        <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: 600 }}>Reason</th>
                                        <th style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 600 }}>Unit Price</th>
                                        <th style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 600 }}>Quantity</th>
                                        <th style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 600 }}>Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedReturn.items.map((item, idx) => (
                                        <tr key={idx} style={{ borderTop: '1px solid var(--border-glass)' }}>
                                            <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                                                {item.item_name}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                {item.reason || 'No reason provided'}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                                                ₹{parseFloat(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 700, color: '#e67e22' }}>
                                                -{parseFloat(item.quantity).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 800, color: '#c0392b' }}>
                                                ₹{parseFloat(item.line_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th {
                    text-align: left; padding: 1.2rem 1rem;
                    background: var(--bg-glass-heavy); color: var(--text-muted);
                    font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;
                    font-weight: 700; border-bottom: 2px solid var(--border-glass);
                }
                .data-table td {
                    padding: 1rem; border-bottom: 1px solid var(--border-glass);
                    font-size: 0.95rem;
                }
                .data-table tr:hover { background: var(--bg-glass); }
                .loading-spinner {
                    width: 40px; height: 40px; border: 4px solid var(--bg-glass-heavy);
                    border-top: 4px solid var(--color-primary); border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default VendorReturnEntries;
