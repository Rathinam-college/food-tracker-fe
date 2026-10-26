import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MonthWiseSummary = () => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [period, setPeriod] = useState(3);
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [monthColumns, setMonthColumns] = useState([]);
    const [purchaseType, setPurchaseType] = useState('all');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await api.getCategories();
                setCategories(data);
            } catch (err) {
                console.error("Error fetching categories:", err);
            }
        };
        fetchCategories();
    }, []);

    const getMonthName = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleString('default', { month: 'short' }) + ' ' + year;
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            // Calculate which month columns should be shown
            const cols = [];
            let curr = new Date();
            // Start from current month and go back
            for (let i = 0; i < period; i++) {
                const m = curr.getMonth() + 1;
                const y = curr.getFullYear();
                cols.unshift(`${y}-${String(m).padStart(2, '0')}`);
                curr.setMonth(curr.getMonth() - 1);
            }
            setMonthColumns(cols);

            // Fetch data (backend currently takes categories[] even for single selection if we passed it that way)
            // But we'll pass it as a single array item for now
            const cats = selectedCategory ? [selectedCategory] : [];
            const typeParam = purchaseType === 'all' ? undefined : purchaseType;
            const data = await api.getMonthWiseSummary(period, cats, typeParam);
            setSummaryData(data);
        } catch (err) {
            console.error("Error fetching summary:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const cats = selectedCategory ? [selectedCategory] : [];
            const typeParam = purchaseType === 'all' ? undefined : purchaseType;
            const blob = await api.exportMonthWiseSummary(period, cats, typeParam);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `Monthly_Trend_${dateStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Error exporting excel", err);
            alert('Failed to export Excel');
        }
    };

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1 className="glow-text">Monthly Trend Analysis</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <p>Comparative view of monthly expenditure patterns.</p>
                    {summaryData.length > 0 && (
                        <button 
                            className="action-btn" 
                            style={{ background: 'var(--status-success-text-vibrant)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: '700' }}
                            onClick={handleExportExcel}
                        >
                            📊 Export Excel
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Summary Cards */}
            {summaryData.length > 0 && (
                <div className="dashboard-grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', display: 'grid', gap: '1.5rem' }}>
                    <div className="glass metric-card" style={{ borderLeft: '6px solid var(--color-secondary)', padding: '1.5rem 2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ fontSize: '2.5rem' }}>📊</div>
                            <div>
                                <div className="metric-title" style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Materials Analyzed</div>
                                <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800 }}>{summaryData.length}</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass metric-card" style={{ borderLeft: '6px solid #2ecc71', padding: '1.5rem 2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ fontSize: '2.5rem' }}>💰</div>
                            <div>
                                <div className="metric-title" style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Period Total Spend</div>
                                <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800, color: '#2ecc71' }}>
                                    ₹{summaryData.reduce((sum, item) => sum + Object.values(item.monthly_data).reduce((s, d) => s + d.amount, 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass responsive-grid grid-min-180" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <div className="form-group-stack">
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>CATEGORY</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="glass-input"
                        style={{ height: '45px' }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group-stack">
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>TREND PERIOD</label>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(parseInt(e.target.value))}
                        className="glass-input"
                        style={{ height: '45px' }}
                    >
                        <option value={3}>Last 3 Months</option>
                        <option value={6}>Last 6 Months</option>
                        <option value={12}>Last 12 Months</option>
                    </select>
                </div>
                
                <div className="form-group-stack">
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>PURCHASE TYPE</label>
                    <select
                        value={purchaseType}
                        onChange={(e) => setPurchaseType(e.target.value)}
                        className="glass-input"
                        style={{ height: '45px' }}
                    >
                        <option value="all">All Types</option>
                        <option value="REGULAR">Regular Purchase</option>
                        <option value="SPECIAL_EVENT">Special Event</option>
                    </select>
                </div>

                <div className="mobile-stack-buttons" style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', alignSelf: 'flex-end', width: '100%' }}>
                    <button
                        onClick={fetchSummary}
                        disabled={loading}
                        className="action-btn glow-button"
                        style={{ flex: 1, height: '45px', padding: '0 1rem' }}
                    >
                        {loading ? '...' : 'View Trend'}
                    </button>
                    <button
                        onClick={() => {
                            setSelectedCategory('');
                            setPeriod(3);
                        }}
                        className="secondary-btn"
                        style={{ flex: 1, height: '45px', padding: '0 1rem' }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="report-container scroll-container">
                {loading ? (
                    <div className="loading-container" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="loading-spinner"></div>
                        <p style={{ marginTop: '1rem', color: 'var(--color-primary)' }}>Generating trends...</p>
                    </div>
                ) : summaryData.length > 0 ? (
                    <table className="themed-trend-table">
                        <thead>
                            <tr>
                                <th className="sticky-col first-col">Item Details</th>
                                {monthColumns.map(month => (
                                    <th key={month} className="month-header">
                                        {getMonthName(month)}
                                    </th>
                                ))}
                                <th className="sticky-col total-col-header">Monthly Avg / Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaryData.map((item) => {
                                let itemTotalQty = 0;
                                let itemTotalAmount = 0;
                                Object.values(item.monthly_data).forEach(d => {
                                    itemTotalQty += d.qty;
                                    itemTotalAmount += d.amount;
                                });
                                const avgPrice = itemTotalQty > 0 ? itemTotalAmount / itemTotalQty : 0;

                                return (
                                    <React.Fragment key={item.item_id}>
                                        <tr className="trend-row-item themed-row">
                                            <td className="sticky-col first-col item-name-cell">
                                                {item.item_name}
                                                <div className="uom-label">UOM: {item.unit}</div>
                                            </td>
                                            {monthColumns.map(month => {
                                                const mData = item.monthly_data[month];
                                                const mAvg = mData && mData.qty > 0 ? (mData.amount / mData.qty).toFixed(1) : null;

                                                return (
                                                    <td key={`${item.item_id}-${month}`} className="trend-data-cell">
                                                        {mData ? (
                                                            <div className="total-summary-box">
                                                                <div className="grand-total-amount">₹{mData.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                                <div className="total-qty-label">{mData.qty.toLocaleString()} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>{item.unit}</span></div>
                                                                <div className="avg-price-tag">Avg: ₹{mAvg}</div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>-</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="sticky-col total-col-cell">
                                                <div className="total-summary-box">
                                                    <div className="grand-total-amount">₹{itemTotalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                                    <div className="total-qty-label">{itemTotalQty.toLocaleString()} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>{item.unit}</span></div>
                                                    <div className="avg-price-tag" style={{ background: 'rgba(0, 150, 214, 0.1)', color: 'var(--color-secondary)' }}>
                                                        Total Avg: ₹{avgPrice.toFixed(1)}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="grand-total-footer-row">
                                <td className="sticky-col first-col grand-total-label">MONTHLY GRAND TOTAL</td>
                                {monthColumns.map(month => {
                                    const monthTotal = summaryData.reduce((sum, item) => sum + (item.monthly_data[month]?.amount || 0), 0);
                                    return (
                                        <td key={`total-${month}`} className="trend-data-cell grand-total-month-val">
                                            ₹{monthTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                    );
                                })}
                                <td className="sticky-col total-col-cell grand-total-overall-val">
                                    ₹{summaryData.reduce((sum, item) => sum + Object.values(item.monthly_data).reduce((s, d) => s + d.amount, 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (
                    <div className="glass" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <p>Configure filters and click View Trend to see the analysis.</p>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .glow-text {
                    color: var(--text-main);
                    text-shadow: 0 0 10px rgba(255,255,255,0.5), 0 0 20px var(--color-primary);
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }

                .light-theme .glow-text, .sky-theme .glow-text {
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.5);
                    background: linear-gradient(to bottom, var(--color-primary), var(--text-main));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .glow-button {
                    background: linear-gradient(135deg, var(--color-primary), var(--color-accent)) !important;
                    box-shadow: 0 0 15px rgba(244, 121, 32, 0.4);
                    transition: all 0.3s ease;
                    border: none !important;
                }

                .report-container {
                    max-height: calc(100vh - 120px);
                    min-height: 500px;
                    overflow: auto !important;
                    position: relative;
                    border-radius: 12px;
                    border: 1px solid var(--border-glass);
                    background: var(--bg-main);
                }

                .themed-trend-table {
                    width: 100% !important;
                    border-collapse: separate;
                    border-spacing: 0;
                }

                .themed-trend-table th, .themed-trend-table td {
                    padding: 0.8rem;
                    text-align: center;
                    border: 0.5px solid rgba(255, 255, 255, 0.1);
                    min-width: 100px !important;
                }

                .themed-trend-table thead th {
                    position: sticky;
                    top: 0;
                    background: var(--bg-navbar) !important;
                    z-index: 200;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                    font-weight: 700;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    background-clip: padding-box;
                }

                .themed-trend-table thead th.sticky-col {
                    z-index: 300;
                }

                .sticky-col {
                    position: sticky;
                    background: var(--bg-main) !important;
                    z-index: 100;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.3);
                }

                .first-col { 
                    left: 0; 
                    text-align: left !important; 
                    min-width: 220px !important; 
                    width: 220px !important; 
                    background: var(--bg-main) !important;
                }

                .total-col-header, .total-col-cell { 
                    right: 0; 
                    min-width: 150px !important; 
                    border-left: 2px solid var(--color-success) !important;
                    box-shadow: -2px 0 10px rgba(0,0,0,0.3);
                }

                .grand-total-footer-row td {
                    position: sticky;
                    bottom: 0;
                    background: var(--bg-navbar) !important;
                    color: var(--text-main);
                    font-weight: 800;
                    font-size: 1.1rem;
                    border-top: 2px solid var(--color-primary) !important;
                    z-index: 200;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
                }

                .grand-total-footer-row td.sticky-col {
                    z-index: 300;
                }

                .item-name-cell {
                    color: var(--text-main);
                    font-weight: 700;
                    font-size: 1.05rem;
                }

                .uom-label {
                    font-size: 0.75rem;
                    color: var(--color-secondary);
                    font-weight: 500;
                }

                .total-summary-box {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .grand-total-amount { color: var(--text-success); font-weight: 800; font-size: 1.1rem; }
                .total-qty-label { font-size: 0.8rem; color: var(--text-main); }
                .avg-price-tag { 
                    font-size: 0.65rem; 
                    background: rgba(153, 194, 33, 0.1); 
                    color: var(--text-success); 
                    padding: 2px 6px; 
                    border-radius: 4px;
                    display: inline-block;
                }

                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid rgba(255,255,255,0.1);
                    border-top: 5px solid var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .glass-input {
                    background: var(--bg-glass);
                    border: 1px solid var(--border-glass);
                    border-radius: var(--radius-sm);
                    color: var(--text-main);
                    padding: 0.8rem;
                    width: 100%;
                    outline: none;
                }

                .glass-input:focus { border-color: var(--color-primary); background: rgba(255, 255, 255, 0.08); }

                .grand-total-label {
                    color: var(--color-primary) !important;
                    letter-spacing: 1px;
                    font-size: 0.9rem !important;
                    text-align: right !important;
                }

                .grand-total-month-val {
                    color: var(--text-success) !important;
                }

                .grand-total-overall-val {
                    color: var(--text-main) !important;
                    border-left: 2px solid var(--color-primary) !important;
                }
            `}} />
        </div>
    );
};

export default MonthWiseSummary;
