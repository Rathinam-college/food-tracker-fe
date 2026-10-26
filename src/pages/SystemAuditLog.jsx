import React, { useState, useEffect } from 'react';
import api from '../services/api';

const SystemAuditLog = () => {
    const [movements, setMovements] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    // Filters
    const [itemFilter, setItemFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState('20');
    const [totalPages, setTotalPages] = useState(1);
    const [nextUrl, setNextUrl] = useState(null);
    const [prevUrl, setPrevUrl] = useState(null);

    useEffect(() => {
        api.getItems(1, 1000)
            .then(res => {
                if (res.results) setItems(res.results);
                else if (Array.isArray(res)) setItems(res);
            })
            .catch(err => console.error("Error fetching items:", err));
    }, []);

    useEffect(() => {
        fetchAuditLog();
    }, [page, pageSize, itemFilter, typeFilter, startDate, endDate]);

    const fetchAuditLog = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                page_size: pageSize,
                ...(itemFilter && { item: itemFilter }),
                ...(typeFilter && { type: typeFilter }),
                ...(startDate && { start_date: startDate }),
                ...(endDate && { end_date: endDate }),
            };
            const data = await api.getStockMovements(params);
            if (data.results) {
                setMovements(data.results);
                setTotalPages(data.total_pages || 1);
                setNextUrl(data.next);
                setPrevUrl(data.previous);
            } else {
                setMovements(data);
                setTotalPages(1);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch audit log.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {
                ...(itemFilter && { item: itemFilter }),
                ...(typeFilter && { type: typeFilter }),
                ...(startDate && { start_date: startDate }),
                ...(endDate && { end_date: endDate }),
            };
            const blob = await api.exportStockMovementsExcel(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `System_Audit_Log_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export failed.');
            console.error(err);
        } finally {
            setExporting(false);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'STORE_INWARD': return 'var(--status-success-text-vibrant)';
            case 'STORE_TO_KITCHEN': return 'var(--color-primary)';
            case 'KITCHEN_TO_STORE': return '#e67e22';
            case 'WASTAGE': return 'var(--status-error-text-vibrant)';
            case 'BREAKAGE': return 'var(--status-error-text-vibrant)';
            case 'EXPIRED': return 'var(--status-error-text-vibrant)';
            case 'AUDIT': return '#f1c40f';
            case 'VENDOR_RETURN': return '#e74c3c';
            default: return 'var(--text-muted)';
        }
    };

    const formatType = (type) => {
        return type.replace(/_/g, ' ');
    };

    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '3rem' }}>📜</span>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                                System Audit Log
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: '0.2rem 0 0 0' }}>
                                Immutable ledger of all system transactions and stock movements.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleExport}
                        disabled={exporting || loading}
                        style={{
                            background: 'var(--color-secondary)', border: 'none',
                            borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: (exporting || loading) ? 'not-allowed' : 'pointer',
                            color: 'white', fontSize: '0.9rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            opacity: (exporting || loading) ? 0.6 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                        }}
                    >
                        {exporting ? '⏳ Exporting...' : '📄 Export to Excel'}
                    </button>
                </div>
            </header>

            <div className="glass" style={{
                padding: '1.2rem 1.5rem', marginBottom: '1.5rem',
                display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end'
            }}>
                <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Action Type
                    </label>
                    <select
                        className="glass-input"
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Types</option>
                        <option value="STORE_INWARD">Store Inward</option>
                        <option value="STORE_TO_KITCHEN">Store to Kitchen</option>
                        <option value="KITCHEN_TO_STORE">Kitchen to Store</option>
                        <option value="WASTAGE">Wastage / Breakage / Expired</option>
                        <option value="AUDIT">Audit Adjustments</option>
                        <option value="VENDOR_RETURN">Vendor Return</option>
                    </select>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Item
                    </label>
                    <select
                        className="glass-input"
                        value={itemFilter}
                        onChange={(e) => { setItemFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Items</option>
                        {items.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Start Date
                    </label>
                    <input
                        type="date"
                        className="glass-input"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        End Date
                    </label>
                    <input
                        type="date"
                        className="glass-input"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    />
                </div>
                <div style={{ flex: '0 0 auto' }}>
                    <button
                        onClick={() => {
                            setItemFilter('');
                            setTypeFilter('');
                            setStartDate('');
                            setEndDate('');
                            setPage(1);
                        }}
                        style={{
                            background: 'transparent', border: '1px solid var(--border-glass)',
                            borderRadius: '8px', padding: '0.65rem 1.2rem', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="glass table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-glass-heavy)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', borderBottom: '2px solid var(--border-glass)' }}>Date / Time</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', borderBottom: '2px solid var(--border-glass)' }}>Action Type</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', borderBottom: '2px solid var(--border-glass)' }}>Item</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'right', borderBottom: '2px solid var(--border-glass)' }}>Quantity Changed</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', borderBottom: '2px solid var(--border-glass)' }}>User</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', borderBottom: '2px solid var(--border-glass)' }}>Reference ID</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', borderBottom: '2px solid var(--border-glass)' }}>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    ⏳ Loading audit records...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--status-error-text-vibrant)' }}>
                                    ⚠️ {error}
                                </td>
                            </tr>
                        ) : movements.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    📭 No audit records found for the given criteria.
                                </td>
                            </tr>
                        ) : (
                            movements.map((mov) => {
                                const qty = parseFloat(mov.quantity);
                                const isNegative = ['STORE_TO_KITCHEN', 'WASTAGE', 'BREAKAGE', 'EXPIRED', 'VENDOR_RETURN'].includes(mov.type);
                                // AUDIT could be positive or negative based on how we implemented it, but usually StockMovement stores positive and we infer direction, 
                                // wait, StockMovement stores exactly what happened. If the item was decreased, does it store negative or positive? 
                                // Let's just print the exact amount but color it.
                                
                                return (
                                    <tr key={mov.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {new Date(mov.movement_date).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                background: 'var(--bg-glass-heavy)',
                                                color: getTypeColor(mov.type),
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                border: `1px solid ${getTypeColor(mov.type)}40`
                                            }}>
                                                {formatType(mov.type)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{mov.item_name}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: getTypeColor(mov.type) }}>
                                            {isNegative ? '-' : '+'}{qty.toFixed(3)}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                            {mov.username || 'System'}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {mov.reference_id || '—'}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {mov.remarks || '—'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '1.5rem', marginBottom: '3rem' }}>
                    <button
                        className="secondary-btn"
                        disabled={!prevUrl || loading}
                        onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        style={{ padding: '0.5rem 1.2rem', minWidth: '100px' }}
                    >
                        ◀ Previous
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Page <span style={{ color: 'var(--text-main)' }}>{page}</span> of {totalPages}
                    </span>
                    <button
                        className="secondary-btn"
                        disabled={!nextUrl || loading}
                        onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        style={{ padding: '0.5rem 1.2rem', minWidth: '100px' }}
                    >
                        Next ▶
                    </button>
                </div>
            )}
        </div>
    );
};

export default SystemAuditLog;
