import React, { useState, useEffect } from 'react';
import api from '../services/api';


const StockTransitionReport = () => {
    const [movements, setMovements] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    // Filters
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const [selectedItem, setSelectedItem] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [startDate, setStartDate] = useState(firstOfMonth);
    const [endDate, setEndDate] = useState(today);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState('20');
    const [paginationData, setPaginationData] = useState({ count: 0, total_pages: 1, has_next: false, has_previous: false });

    const MOVEMENT_TYPES = {
        'STORE_INWARD': 'Store Inward',
        'STORE_TO_KITCHEN': 'Store to Kitchen',
        'KITCHEN_TO_STORE': 'Kitchen Return',
        'WASTAGE': 'Wastage / Adjustment',
        'VENDOR_RETURN': 'Vendor Return'
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchMovements();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItem, selectedType, startDate, endDate, page, pageSize]);

    const fetchInitialData = async () => {
        try {
            const itemsData = await api.getItems(1, 1000);
            setItems(itemsData.results || itemsData);
        } catch (err) {
            console.error("Failed to load items:", err);
            setError("Failed to load initial data.");
        }
    };

    const fetchMovements = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: page,
                page_size: pageSize
            };
            if (selectedItem) params.item = selectedItem;
            if (selectedType) params.type = selectedType;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const response = await api.getStockMovements(params);
            setMovements(response.results || []);
            setPaginationData({
                count: response.count || 0,
                total_pages: Math.ceil((response.count || 0) / (pageSize === 'all' ? (response.count || 1) : parseInt(pageSize))),
                has_next: !!response.next,
                has_previous: !!response.previous
            });
        } catch (err) {
            console.error("Failed to fetch movements:", err);
            setError("Failed to load stock movements.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {};
            if (selectedItem) params.item = selectedItem;
            if (selectedType) params.type = selectedType;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const blob = await api.exportStockMovementsExcel(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Stock_Transitions_${new Date().toISOString().split('T')[0]}.xlsx`;
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header">
                <div className="mobile-wrap-header">
                    <div>
                        <h1>
                            <span>🔄</span>
                            Transition Report
                        </h1>
                        <p>
                            Track and audit inventory movements across departments.
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exporting || movements.length === 0}
                        className="action-btn"
                        style={{ background: 'var(--status-success-text-vibrant)' }}
                    >
                        <span className={exporting ? 'animate-spin' : ''}>📥</span>
                        <span>Export Excel</span>
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="glass responsive-grid grid-min-180" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
                <div className="form-group-stack">
                    <label>MATERIAL</label>
                    <select 
                        className="glass-input"
                        style={{ width: '100%' }}
                        value={selectedItem} 
                        onChange={(e) => setSelectedItem(e.target.value)}
                    >
                        <option value="">All Materials</option>
                        {items.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-group-stack">
                    <label>MOVEMENT TYPE</label>
                    <select 
                        className="glass-input"
                        style={{ width: '100%' }}
                        value={selectedType} 
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option value="">All Movement Types</option>
                        {Object.entries(MOVEMENT_TYPES).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group-stack">
                    <label>START DATE</label>
                    <input 
                        type="date" 
                        className="glass-input"
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className="form-group-stack">
                    <label>END DATE</label>
                    <input 
                        type="date" 
                        className="glass-input"
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div className="grid-action-align" style={{ gridColumn: '1 / -1' }}>
                    <div className="mobile-stack-buttons" style={{ justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => {
                                setSelectedItem('');
                                setSelectedType('');
                                setStartDate(firstOfMonth);
                                setEndDate(today);
                                setPage(1);
                            }}
                            className="secondary-btn"
                        >
                            Clear Filters
                        </button>
                        
                        <button
                            onClick={fetchMovements}
                            disabled={loading}
                            className="action-btn"
                        >
                            <span className={loading ? 'animate-spin' : ''} style={{ display: 'inline-block', marginRight: '8px' }}>🔄</span>
                            {loading ? 'Refreshing...' : 'Refresh Data'}
                        </button>

                    </div>
                </div>
            </div>

            {error && (
                <div className="glass error-alert animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '6px solid var(--status-error-text-vibrant)' }}>
                    <span className="icon">⚠️</span> {error}
                </div>
            )}

            {/* Data Table */}
            <div className="glass" style={{ padding: '2rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.4rem' }}>Movement Ledger</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SHOW</span>
                            <select 
                                className="glass-input" 
                                value={pageSize} 
                                onChange={(e) => { setPageSize(e.target.value); setPage(1); }}
                                style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: '0.85rem' }}
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                        <span style={{ fontSize: '0.8rem', background: 'var(--bg-glass)', padding: '0.4rem 1rem', borderRadius: '50px', fontWeight: 600 }}>
                            Showing {movements.length} of {paginationData.count} Record{paginationData.count !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="table-responsive table-scroll-lg">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.8rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                <th style={{ padding: '0.5rem 1.5rem', width: '180px' }}>Timeline</th>
                                <th style={{ padding: '0.5rem 1.5rem', width: '250px' }}>Asset</th>
                                <th style={{ padding: '0.5rem 1.5rem', width: '150px', textAlign: 'center' }}>Transition</th>
                                <th style={{ padding: '0.5rem 1.5rem', width: '200px', textAlign: 'center' }}>Workflow Step</th>
                                <th style={{ padding: '0.5rem 1.5rem' }}>Reference / Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} style={{ opacity: 0.3 }}>
                                        <td colSpan="5" style={{ padding: '1.5rem' }}>
                                            <div className="animate-pulse" style={{ background: 'var(--bg-glass-heavy)', height: '40px', borderRadius: '12px' }}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : movements.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.4 }}>📋</div>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>Ledger is clean. No transitions logged.</p>
                                    </td>
                                </tr>
                            ) : (
                                movements.map((mov) => {
                                    const isPositive = mov.type === 'STORE_INWARD' || mov.type === 'KITCHEN_TO_STORE';
                                    const transitionColor = isPositive ? 'var(--status-success-text-vibrant)' : 'var(--status-pending-text)';
                                    const transitionBg = isPositive ? 'var(--status-success-bg)' : 'var(--status-pending-bg)';

                                    return (
                                        <tr key={mov.id} style={{ background: 'var(--bg-glass)', transition: 'all 0.3s' }}>
                                            <td style={{ padding: '1.5rem', width: '180px', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                                                    {formatDate(mov.movement_date).split(',')[0]}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                    {formatDate(mov.movement_date).split(',')[1]}
                                                    <span style={{ marginLeft: '0.8rem', color: 'var(--color-secondary)' }}>By: {mov.user_username || 'System'}</span>
                                                </div>
                                            </td>
                                            
                                            <td style={{ padding: '1.5rem', width: '250px' }}>
                                                <div style={{ 
                                                    fontWeight: 700, 
                                                    fontSize: '1.15rem', 
                                                    color: 'var(--text-main)',
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'break-word',
                                                    lineHeight: '1.4'
                                                }}>
                                                    {mov.item_name}
                                                </div>
                                            </td>
                                            
                                            <td style={{ padding: '1.5rem', width: '150px', textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '8px', background: transitionBg, border: `1px solid ${transitionColor}40` }}>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: transitionColor }}>
                                                        {isPositive ? '+' : '-'}{parseFloat(mov.quantity).toLocaleString()}
                                                    </span>
                                                    <span style={{ fontSize: '0.8rem', color: transitionColor, fontWeight: 700, opacity: 0.8 }}>
                                                        {mov.item_unit}
                                                    </span>
                                                </div>
                                            </td>
                                            
                                            <td style={{ padding: '1.5rem', width: '200px', textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '0.5rem 1.2rem', 
                                                    borderRadius: '50px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 800, 
                                                    background: 'var(--bg-glass)', 
                                                    color: 'var(--text-main)',
                                                    border: '1px solid var(--border-glass)',
                                                    textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap',
                                                    display: 'inline-block'
                                                }}>
                                                    {MOVEMENT_TYPES[mov.type] || mov.type}
                                                </span>
                                            </td>
                                            
                                            <td style={{ padding: '1.5rem', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                                    {mov.reference_id ? `REF: ${mov.reference_id}` : 'General Entry'}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {mov.remarks || 'No remarks available.'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {pageSize !== 'all' && paginationData.total_pages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                        <button 
                            className="secondary-btn" 
                            disabled={!paginationData.has_previous}
                            onClick={() => {
                                setPage(p => p - 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            ◀ Prev
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            Page {page} of {paginationData.total_pages}
                        </span>
                        <button 
                            className="secondary-btn" 
                            disabled={!paginationData.has_next}
                            onClick={() => {
                                setPage(p => p + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            Next ▶
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockTransitionReport;
