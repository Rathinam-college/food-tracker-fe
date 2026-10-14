import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CustomMonthlySummary = () => {
    const [reportData, setReportData] = useState({ period: [], rows: [] });
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [monthsCount, setMonthsCount] = useState(3);
    const [loading, setLoading] = useState(false);
    const [hasConfig, setHasConfig] = useState(true);
    const [generatedAt, setGeneratedAt] = useState(null);
    const [purchaseType, setPurchaseType] = useState('all');

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const fullMonths = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    useEffect(() => {
        api.getCustomSummaryConfigs().then(configs => {
            if (configs.length === 0) setHasConfig(false);
        });
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const typeParam = purchaseType === 'all' ? undefined : purchaseType;
            const data = await api.getCustomMonthlySummary(month, year, monthsCount, typeParam);
            setReportData(data);
            setGeneratedAt(new Date().toLocaleString());
        } catch (error) {
            console.error("Error fetching custom summary", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getRowTotal = (monthlyData) => {
        return monthlyData.reduce((sum, d) => sum + d.total, 0);
    };

    const getColumnTotal = (m, y) => {
        let total = 0;
        reportData.rows.forEach(row => {
            if (row.type === 'CATEGORY' || row.type === 'ITEM' || row.type === 'GROUP') {
                const monthData = row.monthly_data.find(d => d.month === m && d.year === y);
                if (monthData) total += monthData.total;
            } else if (row.type === 'ITEMIZED_CATEGORY') {
                row.sub_items.forEach(item => {
                    const monthData = item.monthly_data.find(d => d.month === m && d.year === y);
                    if (monthData) total += monthData.total;
                });
            }
        });
        return total;
    };

    const downloadExcel = async () => {
        if (!reportData || reportData.rows.length === 0) return;
        
        try {
            setLoading(true);
            const typeParam = purchaseType === 'all' ? undefined : purchaseType;
            const blob = await api.exportCustomSummaryExcel(month, year, monthsCount, typeParam);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Custom_Summary_${fullMonths[month-1]}_${year}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export Excel report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const grandTotal = reportData.rows.reduce((sum, row) => {
        if (row.type === 'ITEMIZED_CATEGORY') {
            return sum + row.sub_items.reduce((s, item) => s + getRowTotal(item.monthly_data), 0);
        }
        return sum + getRowTotal(row.monthly_data);
    }, 0);

    return (
        <div className="main-container">
            <header className="welcome-header print-hidden">
                <h1 className="glow-text">Custom Multi-Month Summary</h1>
                <p>Comparison of expenditure across selected periods based on your configuration.</p>
            </header>

            {!hasConfig && (
                <div className="glass-heavy" style={{ padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
                    <h3 style={{ color: 'var(--text-main)' }}>No Configuration Found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>You haven't set up any report blocks yet. Please define your structure in Custom Summary Config.</p>
                </div>
            )}

            <div className="glass-heavy print-hidden responsive-grid grid-min-180" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="input-label">END MONTH</label>
                    <select className="form-input" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                        {fullMonths.map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="input-label">END YEAR</label>
                    <select className="form-input" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="input-label">PERIOD RANGE</label>
                    <select className="form-input" value={monthsCount} onChange={(e) => setMonthsCount(parseInt(e.target.value))}>
                        <option value={1}>Single Month</option>
                        <option value={3}>Last 3 Months</option>
                        <option value={6}>Last 6 Months</option>
                        <option value={12}>Last 12 Months</option>
                    </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="input-label">PURCHASE TYPE</label>
                    <select className="form-input" value={purchaseType} onChange={(e) => setPurchaseType(e.target.value)}>
                        <option value="all">ALL PURCHASES</option>
                        <option value="REGULAR">REGULAR ONLY</option>
                        <option value="SPECIAL_EVENT">SPECIAL EVENTS</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                        className="action-btn glow-button" 
                        onClick={fetchReport} 
                        disabled={loading || !hasConfig}
                        style={{ height: '42px', width: '100%' }}
                    >
                        {loading ? 'GENERATING...' : 'GENERATE REPORT'}
                    </button>
                </div>
            </div>

            {reportData.rows.length > 0 && (
                <div className="report-paper glass-heavy animate-fade-in" style={{ padding: '2.5rem', position: 'relative' }}>
                    <div className="report-header mobile-wrap-header" style={{ borderBottom: '2px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div className="report-title-section" style={{ flex: 1 }}>
                            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'var(--color-primary)', width: '4px', height: '32px', borderRadius: '2px' }}></div>
                                <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>EXPENDITURE ANALYSIS</h1>
                            </div>
                            <p style={{ margin: '0', color: 'var(--color-secondary)', fontSize: '1.1rem', fontWeight: 600 }}>
                                {monthsCount} Months ending {fullMonths[month-1]} {year}
                            </p>
                            <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <span>📅 Generated: <strong>{generatedAt}</strong></span>
                                <span>🏢 Entity: <strong>Rathinam Food Tracker</strong></span>
                            </div>
                        </div>
                        <div className="print-hidden mobile-stack-buttons" style={{ display: 'flex', gap: '0.8rem' }}>
                            <button className="action-btn glow-button" onClick={downloadExcel} style={{ padding: '10px 20px', fontSize: '0.85rem', flex: 1, whiteSpace: 'nowrap' }}>
                                <span style={{ marginRight: '8px' }}>📊</span> EXCEL
                            </button>
                            <button className="action-btn" onClick={handlePrint} style={{ padding: '10px 20px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', flex: 1, whiteSpace: 'nowrap' }}>
                                <span style={{ marginRight: '8px' }}>🖨️</span> PRINT
                            </button>
                        </div>
                    </div>

                    <div className="mini-dashboard print-hidden responsive-grid grid-3" style={{ marginBottom: '2.5rem' }}>
                        <div className="mini-card glass" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid rgba(244, 121, 32, 0.2)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Period Grand Total</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                        </div>
                        <div className="mini-card glass" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid rgba(0, 150, 214, 0.2)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Months Analyzed</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{monthsCount}</div>
                        </div>
                        <div className="mini-card glass" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Row Blocks</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{reportData.rows.length}</div>
                        </div>
                    </div>

                    <div className="table-responsive table-scroll-lg" style={{ overflow: 'auto', maxHeight: '500px', width: '100%' }}>
                        <table className="custom-summary-table">
                            <thead>
                                <tr>
                                    <th className="sticky-col-left" style={{ minWidth: '200px', zIndex: 30 }}>PARTICULARS</th>
                                    {reportData.period.map(p => (
                                        <th key={`${p.month}-${p.year}`} style={{ textAlign: 'right' }}>
                                            {months[p.month-1]} '{p.year.toString().slice(-2)}
                                        </th>
                                    ))}
                                    <th className="sticky-col-right" style={{ textAlign: 'right', color: 'var(--color-primary)', zIndex: 30 }}>TOTAL (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.rows.map((row, idx) => (
                                    <React.Fragment key={`${row.type}-${row.id}-${idx}`}>
                                        {row.type === 'CATEGORY' || row.type === 'ITEM' || row.type === 'GROUP' ? (
                                            <tr className={row.type === 'CATEGORY' || row.type === 'GROUP' ? 'category-row' : 'standalone-item-row'}>
                                                <td className="particulars sticky-col-left">
                                                    {row.name.toUpperCase()} {!row.has_override && (row.type === 'CATEGORY' ? '(TOTAL)' : (row.type === 'GROUP' ? '(GROUP)' : ''))}
                                                </td>
                                                {row.monthly_data.map((d, i) => (
                                                    <td key={i} className="amount">₹{d.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                                ))}
                                                <td className="amount row-total sticky-col-right">₹{getRowTotal(row.monthly_data).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ) : (
                                            <>
                                                <tr className="category-header-row">
                                                    <td colSpan={reportData.period.length + 2}>{row.name.toUpperCase()} {row.has_override ? '' : 'BREAKDOWN'}</td>
                                                </tr>
                                                {row.sub_items.map(item => (
                                                    <tr key={item.id} className="item-row">
                                                        <td className="particulars sticky-col-left">{item.name}</td>
                                                        {item.monthly_data.map((d, i) => (
                                                            <td key={i} className="amount">₹{d.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                                        ))}
                                                        <td className="amount row-total sticky-col-right">₹{getRowTotal(item.monthly_data).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                                <tr className="itemized-summary-row">
                                                    <td className="particulars sticky-col-left">{row.has_override ? row.name.toUpperCase() : `SUBTOTAL (${row.name})`}</td>
                                                    {reportData.period.map((p, i) => {
                                                        const subtotal = row.sub_items.reduce((s, item) => {
                                                            const d = item.monthly_data.find(md => md.month === p.month && md.year === p.year);
                                                            return s + (d ? d.total : 0);
                                                        }, 0);
                                                        return <td key={i} className="amount">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                                    })}
                                                    <td className="amount row-total sticky-col-right">
                                                        ₹{row.sub_items.reduce((s, item) => s + getRowTotal(item.monthly_data), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="grand-total-row">
                                    <td className="particulars sticky-col-left" style={{ zIndex: 30 }}>GRAND TOTAL</td>
                                    {reportData.period.map((p, i) => (
                                        <td key={i} className="amount">₹{getColumnTotal(p.month, p.year).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                    ))}
                                    <td className="amount sticky-col-right" style={{ zIndex: 30 }}>₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .input-label { color: var(--text-muted); fontSize: 0.75rem; fontWeight: 700; marginBottom: 0.4rem; display: block; }
                .report-paper { padding: 2rem; border-radius: 12px; }
                .custom-summary-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid var(--border-glass); border-radius: 8px; }
                .custom-summary-table th { padding: 14px 12px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); border-bottom: 2px solid var(--color-primary); background: var(--bg-navbar); }
                .custom-summary-table td { padding: 12px; border-bottom: 1px solid var(--border-glass); transition: all 0.2s; }
                .custom-summary-table tr:hover td { background: var(--bg-glass); }
                .amount { text-align: right; font-family: 'Inter', monospace; font-size: 1rem; font-weight: 600; }
                .particulars { font-size: 0.95rem; font-weight: 500; }
                .category-row { background: var(--bg-glass-heavy); font-weight: 700; color: var(--text-main); }
                .standalone-item-row { background: var(--bg-glass); }
                .category-header-row td { background: var(--bg-glass-heavy); font-weight: 800; font-size: 0.8rem; color: var(--color-secondary); padding: 8px 12px; border-top: 1px solid var(--border-glass-bright); }
                .item-row .particulars { padding-left: 2.5rem; color: var(--text-muted); font-size: 0.9rem; }
                .itemized-summary-row { font-weight: 700; background: var(--bg-glass-heavy); color: var(--text-main); }
                .custom-summary-table thead th { position: sticky; top: 0; z-index: 20; background: var(--bg-navbar); }
                .sticky-col-left { position: sticky; left: 0; background: var(--bg-navbar) !important; z-index: 10; border-right: 1px solid var(--border-glass-bright); }
                .sticky-col-right { position: sticky; right: 0; background: var(--bg-navbar) !important; z-index: 10; border-left: 1px solid var(--border-glass-bright); }
                .custom-summary-table tr:hover .sticky-col-left, .custom-summary-table tr:hover .sticky-col-right { background: var(--bg-navbar) !important; filter: brightness(1.1); }
                .grand-total-row td { position: sticky; bottom: 0; z-index: 20; background: var(--bg-navbar) !important; border-top: 2px solid var(--color-primary); color: var(--text-main); font-weight: 900; font-size: 1.1rem; padding: 15px 12px; }
                .grand-total-row .sticky-col-left, .grand-total-row .sticky-col-right { background: var(--bg-navbar) !important; }
                
                .mini-card { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
                .mini-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.08); }

                @media print {
                    .print-hidden, .welcome-header, .sidebar, .top-nav, .navbar, .no-print { display: none !important; }
                    .main-container { padding: 0 !important; margin: 0 !important; }
                    .report-paper { background: white !important; color: black !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
                    .custom-summary-table th { background: #f8fafc !important; color: black !important; border: 1px solid #000 !important; }
                    .custom-summary-table td { color: black !important; border: 1px solid #e2e8f0 !important; }
                    .category-row { background: #f5f5f5 !important; }
                    .grand-total-row td { background: #000 !important; color: #fff !important; border: 1px solid #000 !important; }
                    .particulars { position: static !important; }
                    .report-header h1 { color: #000 !important; }
                    .report-header p { color: #333 !important; }
                    body { background: white !important; }
                }
            `}} />
        </div>
    );
};

export default CustomMonthlySummary;
