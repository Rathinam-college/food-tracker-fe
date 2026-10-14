import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const StockBalanceReport = () => {
    const [balanceData, setBalanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exportingBalance, setExportingBalance] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [asOfDate, setAsOfDate] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    
    // Column Visibility State
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);
    const columnsMenuRef = useRef(null);
    
    const [visibleColumns, setVisibleColumns] = useState({
        purchasedQty: true,
        purchasedVal: true,
        pushedQty: true,
        pushedVal: true,
        adjustedQty: true,
        adjustedVal: true,
        returnedQty: true,
        returnedVal: true,
        remainingQty: true,
        remainingVal: true
    });

    useEffect(() => {
        fetchBalanceReport();
    }, [asOfDate]);

    // Close columns dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target)) {
                setShowColumnsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchBalanceReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getStockBalanceReport(asOfDate);
            setBalanceData(data);
        } catch (err) {
            console.error("Failed to fetch balance report:", err);
            setError("Failed to load stock balance data.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportBalance = async () => {
        setExportingBalance(true);
        try {
            const blob = await api.exportStockBalanceReportExcel(asOfDate);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Stock_Balance_Report_${asOfDate || new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export failed.');
            console.error(err);
        } finally {
            setExportingBalance(false);
        }
    };

    const toggleColumn = (colKey) => {
        setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
    };

    const categories = [...new Set(balanceData.map(item => item.category_name))].sort();

    const filteredData = balanceData.filter(item => {
        const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) ||
                              item.category_name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter ? item.category_name === categoryFilter : true;
        return matchesSearch && matchesCategory;
    });

    const totals = {
        purchasedQty: filteredData.reduce((sum, item) => sum + parseFloat(item.purchased_qty || 0), 0),
        purchasedVal: filteredData.reduce((sum, item) => sum + parseFloat(item.purchased_val || 0), 0),
        pushedQty: filteredData.reduce((sum, item) => sum + parseFloat(item.pushed_qty || 0), 0),
        pushedVal: filteredData.reduce((sum, item) => sum + parseFloat(item.pushed_val || 0), 0),
        adjustedQty: filteredData.reduce((sum, item) => sum + parseFloat(item.adjusted_qty || 0), 0),
        adjustedVal: filteredData.reduce((sum, item) => sum + parseFloat(item.adjusted_val || 0), 0),
        returnedQty: filteredData.reduce((sum, item) => sum + parseFloat(item.returned_qty || 0), 0),
        returnedVal: filteredData.reduce((sum, item) => sum + parseFloat(item.returned_val || 0), 0),
        remainingQty: filteredData.reduce((sum, item) => sum + parseFloat(item.remaining_qty || 0), 0),
        remainingVal: filteredData.reduce((sum, item) => sum + parseFloat(item.remaining_val || 0), 0),
    };

    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '3.5rem' }}>📊</div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                            Stock Balance Report {asOfDate ? `(As of ${asOfDate})` : ''}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>
                            Consolidated view of purchases, issuances, and returns across all items.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            className="action-btn" 
                            style={{ 
                                background: 'var(--color-primary)', 
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1rem'
                            }}
                            onClick={handleExportBalance}
                            disabled={exportingBalance || loading}
                        >
                            {exportingBalance ? '⌛ Exporting...' : '📊 Export Stock Balance Report'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Metric Cards */}
            <div className="dashboard-grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="glass metric-card" style={{ borderLeft: '6px solid var(--color-secondary)', padding: '1.5rem' }}>
                    <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 700 }}>Total Items</div>
                    <div className="metric-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{filteredData.length}</div>
                </div>

                <div className="glass metric-card" style={{ borderLeft: '6px solid #9b59b6', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 700 }}>Total Purchased Value</div>
                    <div className="metric-value" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.5rem)', fontWeight: 800, color: '#9b59b6', wordBreak: 'break-word', lineHeight: 1.2, marginTop: '0.5rem' }}>
                        ₹{totals.purchasedVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </div>
                
                <div className="glass metric-card" style={{ borderLeft: '6px solid var(--color-primary)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 700 }}>Total In-stock Value</div>
                    <div className="metric-value" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.5rem)', fontWeight: 800, color: 'var(--color-primary)', wordBreak: 'break-word', lineHeight: 1.2, marginTop: '0.5rem' }}>
                        ₹{totals.remainingVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div className="glass metric-card" style={{ borderLeft: '6px solid var(--status-success-text-vibrant)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 700 }}>Total Pushed Value</div>
                    <div className="metric-value" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.5rem)', fontWeight: 800, color: 'var(--status-success-text-vibrant)', wordBreak: 'break-word', lineHeight: 1.2, marginTop: '0.5rem' }}>
                        ₹{totals.pushedVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div className="glass metric-card" style={{ borderLeft: '6px solid var(--status-error-text-vibrant)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 700 }}>Adj/Wasted Value</div>
                    <div className="metric-value" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.5rem)', fontWeight: 800, color: 'var(--status-error-text-vibrant)', wordBreak: 'break-word', lineHeight: 1.2, marginTop: '0.5rem' }}>
                        ₹{totals.adjustedVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div className="glass metric-card" style={{ borderLeft: '6px solid #e67e22', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 700 }}>Total Returned Value</div>
                    <div className="metric-value" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.5rem)', fontWeight: 800, color: '#e67e22', wordBreak: 'break-word', lineHeight: 1.2, marginTop: '0.5rem' }}>
                        ₹{totals.returnedVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="glass" style={{ padding: '1.2rem 2rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '250px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search by item name or category..." 
                        className="form-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '2.5rem', marginBottom: 0, width: '100%' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <select
                        className="form-input"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{ marginBottom: 0, width: '100%', cursor: 'pointer' }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div style={{ width: '200px' }}>
                    <input
                        type="date"
                        className="form-input"
                        value={asOfDate}
                        onChange={(e) => setAsOfDate(e.target.value)}
                        style={{ marginBottom: 0, width: '100%' }}
                        title="View stock balance as of this date"
                    />
                </div>
                
                {/* Column Toggle Dropdown */}
                <div style={{ position: 'relative' }} ref={columnsMenuRef}>
                    <button 
                        className="action-btn" 
                        onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                        style={{ background: 'var(--bg-glass-heavy)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}
                    >
                        ⚙️ Columns
                    </button>
                    {showColumnsMenu && (
                        <div className="glass" style={{ 
                            position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', 
                            padding: '1rem', zIndex: 10, minWidth: '220px',
                            display: 'flex', flexDirection: 'column', gap: '0.8rem',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            background: 'var(--bg-navbar)'
                        }}>
                            <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                                Show/Hide Columns
                            </div>
                            {Object.entries({
                                purchasedQty: 'Purchased Qty', purchasedVal: 'Purchased Value',
                                pushedQty: 'Pushed Qty', pushedVal: 'Pushed Value',
                                adjustedQty: 'Adjusted/Wasted Qty', adjustedVal: 'Adjusted/Wasted Value',
                                returnedQty: 'Returned Qty', returnedVal: 'Returned Value',
                                remainingQty: 'Remaining Qty', remainingVal: 'Remaining Value'
                            }).map(([key, label]) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={visibleColumns[key]} 
                                        onChange={() => toggleColumn(key)}
                                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1.5rem' }}></div>
                    <p style={{ color: 'var(--text-muted)' }}>Calculating balances...</p>
                </div>
            ) : error ? (
                <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderLeft: '4px solid var(--status-error-text-vibrant)' }}>
                    <p style={{ color: 'var(--status-error-text-vibrant)', fontWeight: 600 }}>{error}</p>
                    <button className="action-btn" onClick={fetchBalanceReport} style={{ marginTop: '1rem' }}>Retry</button>
                </div>
            ) : (
                <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflow: 'auto', maxHeight: '500px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="sticky-col sticky-left header-bg" style={{ minWidth: '220px', maxWidth: '300px', left: 0, zIndex: 11 }}>ITEM DETAILS</th>
                                    {visibleColumns.purchasedQty && <th style={{ minWidth: '120px', textAlign: 'right' }}>PURCHASED QTY</th>}
                                    {visibleColumns.purchasedVal && <th style={{ textAlign: 'right' }}>Purchased Value</th>}
                                    
                                    {visibleColumns.pushedQty && <th style={{ textAlign: 'right' }}>Pushed Qty</th>}
                                    {visibleColumns.pushedVal && <th style={{ textAlign: 'right' }}>Pushed Value</th>}
                                    
                                    {visibleColumns.adjustedQty && <th style={{ textAlign: 'right' }}>Adjusted/Wasted Qty</th>}
                                    {visibleColumns.adjustedVal && <th style={{ textAlign: 'right' }}>Adjusted/Wasted Value</th>}
                                    
                                    {visibleColumns.returnedQty && <th style={{ textAlign: 'right' }}>Returned Qty</th>}
                                    {visibleColumns.returnedVal && <th style={{ textAlign: 'right' }}>Returned Value</th>}
                                    
                                    {visibleColumns.remainingQty && <th className="sticky-col header-bg" style={{ textAlign: 'right', right: visibleColumns.remainingVal ? '140px' : 0, minWidth: '100px', whiteSpace: 'normal', borderLeft: '2px solid var(--border-glass)' }}>Remaining Qty</th>}
                                    {visibleColumns.remainingVal && <th className="sticky-col header-bg" style={{ textAlign: 'right', right: 0, minWidth: '140px', whiteSpace: 'normal' }}>Remaining Value (₹)</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item) => (
                                    <tr key={item.item_id}>
                                        <td className="sticky-col sticky-left row-bg" style={{ minWidth: '220px', maxWidth: '300px', left: 0, zIndex: 10 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <Link to={`/procurement/stock/item/${item.item_id}`} style={{ fontWeight: '600', color: 'var(--color-primary)', textDecoration: 'none', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                                    {item.item_name}
                                                </Link>
                                                <span className="category-badge" style={{ alignSelf: 'flex-start', fontSize: '0.7rem' }}>
                                                    {item.category_name}
                                                </span>
                                            </div>
                                        </td>
                                        
                                        {visibleColumns.purchasedQty && <td style={{ textAlign: 'right' }}>{parseFloat(item.purchased_qty || 0).toFixed(2)} <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '2px' }}>{item.unit}</span></td>}
                                        {visibleColumns.purchasedVal && <td style={{ textAlign: 'right' }}>{parseFloat(item.purchased_val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                        
                                        {visibleColumns.pushedQty && <td style={{ textAlign: 'right', color: 'var(--status-success-text-vibrant)' }}>{parseFloat(item.pushed_qty || 0).toFixed(2)} <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '2px' }}>{item.unit}</span></td>}
                                        {visibleColumns.pushedVal && <td style={{ textAlign: 'right', color: 'var(--status-success-text-vibrant)' }}>{parseFloat(item.pushed_val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                        
                                        {visibleColumns.adjustedQty && <td style={{ textAlign: 'right', color: 'var(--status-error-text-vibrant)' }}>{parseFloat(item.adjusted_qty || 0).toFixed(2)} <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '2px' }}>{item.unit}</span></td>}
                                        {visibleColumns.adjustedVal && <td style={{ textAlign: 'right', color: 'var(--status-error-text-vibrant)' }}>{parseFloat(item.adjusted_val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                        
                                        {visibleColumns.returnedQty && <td style={{ textAlign: 'right', color: '#e67e22' }}>{parseFloat(item.returned_qty || 0).toFixed(2)} <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '2px' }}>{item.unit}</span></td>}
                                        {visibleColumns.returnedVal && <td style={{ textAlign: 'right', color: '#e67e22' }}>{parseFloat(item.returned_val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                        
                                        {visibleColumns.remainingQty && <td className="sticky-col row-bg" style={{ textAlign: 'right', right: visibleColumns.remainingVal ? '140px' : 0, minWidth: '100px', fontWeight: 800, borderLeft: '2px solid var(--border-glass)' }}>{parseFloat(item.remaining_qty || 0).toFixed(2)} <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '2px' }}>{item.unit}</span></td>}
                                        {visibleColumns.remainingVal && <td className="sticky-col row-bg" style={{ textAlign: 'right', right: 0, minWidth: '140px', fontWeight: 800, color: 'var(--color-primary)' }}>₹{parseFloat(item.remaining_val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th className="sticky-col sticky-left header-bg" style={{ textAlign: 'right', paddingRight: '1.5rem', minWidth: '220px', maxWidth: '300px', left: 0, zIndex: 11 }}>GRAND TOTAL:</th>
                                    
                                    {visibleColumns.purchasedQty && <th style={{ textAlign: 'center' }}>-</th>}
                                    {visibleColumns.purchasedVal && <th style={{ textAlign: 'right' }}>₹{totals.purchasedVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>}
                                    
                                    {visibleColumns.pushedQty && <th style={{ textAlign: 'center' }}>-</th>}
                                    {visibleColumns.pushedVal && <th style={{ textAlign: 'right' }}>₹{totals.pushedVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>}
                                    
                                    {visibleColumns.adjustedQty && <th style={{ textAlign: 'center' }}>-</th>}
                                    {visibleColumns.adjustedVal && <th style={{ textAlign: 'right' }}>₹{totals.adjustedVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>}
                                    
                                    {visibleColumns.returnedQty && <th style={{ textAlign: 'center' }}>-</th>}
                                    {visibleColumns.returnedVal && <th style={{ textAlign: 'right' }}>₹{totals.returnedVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>}
                                    
                                    {visibleColumns.remainingQty && <th className="sticky-col header-bg" style={{ textAlign: 'center', right: visibleColumns.remainingVal ? '140px' : 0, minWidth: '100px', borderLeft: '2px solid var(--border-glass)' }}>-</th>}
                                    {visibleColumns.remainingVal && <th className="sticky-col header-bg" style={{ textAlign: 'right', color: 'var(--color-primary)', right: 0, minWidth: '140px' }}>₹{totals.remainingVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {filteredData.length === 0 && (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No items match your search.
                        </div>
                    )}
                </div>
            )}
            
            <style>{`
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .data-table thead th {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                }
                .data-table tfoot th {
                    position: sticky;
                    bottom: 0;
                    z-index: 2;
                    background: var(--bg-navbar);
                    border-top: 2px solid var(--border-glass);
                    border-bottom: none;
                }
                .data-table th {
                    text-align: left;
                    padding: 1.2rem 1rem;
                    background: var(--bg-navbar);
                    color: var(--text-muted);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 700;
                    border-bottom: 2px solid var(--border-glass);
                    white-space: nowrap;
                    box-shadow: 0 1px 0 var(--border-glass);
                }
                .data-table td {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-glass);
                    font-size: 0.95rem;
                    white-space: nowrap;
                }
                
                /* Sticky Columns Support */
                .sticky-col {
                    position: sticky;
                }
                .sticky-left {
                    left: 0;
                    border-right: 2px solid var(--border-glass);
                }
                
                /* Z-indexes: Header needs to be above row content, sticky headers need to be above normal headers, 
                   and intersecting sticky row/header cells need max z-index */
                .data-table thead th {
                    z-index: 2; /* Normal headers */
                }
                .data-table thead th.sticky-col,
                .data-table tfoot th.sticky-col {
                    z-index: 4; /* Sticky headers/footers over scroll content */
                }
                .data-table tbody td.sticky-col {
                    z-index: 1; /* Sticky row cells over normal scrolling row cells */
                }

                /* Solid backgrounds for sticky elements to prevent transparency bleed */
                .header-bg {
                    background: var(--bg-navbar) !important;
                }
                .row-bg {
                    background: var(--bg-main) !important;
                }
                .data-table tr:hover .row-bg {
                    background: #111827 !important; /* Darker solid background for hover */
                }

                .data-table tr:hover {
                    background: var(--bg-glass);
                }
                .item-link:hover {
                    text-decoration: underline !important;
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--bg-glass-heavy);
                    border-top: 4px solid var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default StockBalanceReport;
