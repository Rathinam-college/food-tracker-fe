import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MonthlyKitchenConsumptionReport = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    // Filters
    const [monthsCount, setMonthsCount] = useState('1');
    const [startMonth, setStartMonth] = useState(new Date().toISOString().slice(0, 7));
    const [monthColumns, setMonthColumns] = useState([]);

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthsCount, startMonth]);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            // Generate all month columns in the range
            const cols = [];
            const [year, month] = startMonth.split('-').map(Number);
            const count = parseInt(monthsCount);
            
            let date = new Date(year, month - 1);
            for (let i = 0; i < count; i++) {
                const y = date.getFullYear();
                const m = date.getMonth() + 1;
                cols.push(`${y}-${String(m).padStart(2, '0')}`);
                date.setMonth(date.getMonth() - 1);
            }
            setMonthColumns(cols.sort());

            const params = {
                months_count: monthsCount,
                start_month: startMonth
            };
            const data = await api.getMonthlyKitchenConsumptions(params);
            setReportData(data);
        } catch (err) {
            console.error("Failed to fetch monthly report:", err);
            setError("Failed to load monthly kitchen consumption data.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {
                months_count: monthsCount,
                start_month: startMonth
            };
            const blob = await api.exportMonthlyKitchenConsumptionsExcel(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Monthly_Kitchen_Consumption_${new Date().toISOString().split('T')[0]}.xlsx`;
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

    const formatMonthName = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    // Grouping by Item for the pivot table
    const itemPivotData = reportData.reduce((acc, curr) => {
        if (!acc[curr.item_name]) {
            acc[curr.item_name] = {
                name: curr.item_name,
                unit: curr.unit,
                months: {},
                itemTotalCost: 0,
                itemTotalConsumed: 0
            };
        }
        acc[curr.item_name].months[curr.month] = {
            total_cost: curr.total_cost,
            net_consumed: curr.net_consumed,
            expense_per_person: curr.expense_per_person,
            total_people: curr.total_people
        };
        acc[curr.item_name].itemTotalCost += curr.total_cost;
        acc[curr.item_name].itemTotalConsumed += curr.net_consumed;
        return acc;
    }, {});

    const sortedItems = Object.values(itemPivotData).sort((a, b) => b.itemTotalCost - a.itemTotalCost);
    // Use the calculated monthColumns instead of deriving from data
    const sortedMonths = monthColumns;

    // Calculate Column Totals (Monthly Totals)
    const monthTotals = sortedMonths.reduce((acc, month) => {
        const monthRows = reportData.filter(d => d.month === month);
        acc[month] = {
            total_cost: monthRows.reduce((sum, r) => sum + r.total_cost, 0),
            total_people: monthRows.length > 0 ? monthRows[0].total_people : 0
        };
        return acc;
    }, {});

    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header">
                <h1>
                    <span>📊</span>
                    Monthly Kitchen Consumption Report
                </h1>
                <p>Item-wise analytical view of monthly consumption and expenditure trends.</p>
            </header>

            {/* Filter Bar */}
            <div className="glass responsive-grid grid-min-180" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
                <div className="form-group-stack">
                    <label>PERIOD</label>
                    <select
                        className="glass-input"
                        value={monthsCount}
                        onChange={(e) => setMonthsCount(e.target.value)}
                    >
                        <option value="1">1 Month</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                    </select>
                </div>

                <div className="form-group-stack">
                    <label>START MONTH</label>
                    <input
                        type="month"
                        className="glass-input"
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                    />
                </div>

                <div className="grid-action-align" style={{ gridColumn: '1 / -1' }}>
                    <div className="mobile-stack-buttons" style={{ justifyContent: 'flex-end' }}>
                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className="action-btn"
                        >
                            <span className={loading ? 'animate-spin' : ''} style={{ display: 'inline-block', marginRight: '8px' }}>🔄</span>
                            {loading ? 'Refreshing...' : 'Refresh Data'}
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={exporting || reportData.length === 0}
                            className="action-btn"
                            style={{ background: 'var(--status-success-text-vibrant)' }}
                        >
                            <span style={{ marginRight: '8px' }}>📥</span>
                            {exporting ? 'Exporting...' : 'Export Excel'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="glass error-alert animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '6px solid var(--status-error-text-vibrant)' }}>
                    <span className="icon">⚠️</span> {error}
                </div>
            )}

            {/* Summary Cards */}
            {!loading && reportData.length > 0 && (
                <div className="responsive-grid grid-3" style={{ marginBottom: '2.5rem' }}>
                    {[
                        {
                            label: 'Total Period Expenditure',
                            value: `₹${reportData.reduce((acc, curr) => acc + parseFloat(curr.total_cost || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                            icon: '💰',
                            color: '#2ecc71'
                        },
                        {
                            label: 'Total Production Count',
                            value: Object.values(monthTotals).reduce((acc, curr) => acc + curr.total_people, 0).toLocaleString(),
                            icon: '👥',
                            color: '#3498db'
                        },
                        {
                            label: 'Overall Period Avg / Production',
                            value: (() => {
                                const totalCost = reportData.reduce((acc, curr) => acc + parseFloat(curr.total_cost || 0), 0);
                                const totalPeople = Object.values(monthTotals).reduce((acc, curr) => acc + curr.total_people, 0);
                                return `₹${(totalPeople > 0 ? totalCost / totalPeople : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                            })(),
                            icon: '📉',
                            color: '#e67e22'
                        }
                    ].map((stat, idx) => (
                        <div key={idx} className="glass animate-fade-in" style={{ padding: '1.5rem', borderRadius: '20px', borderLeft: `5px solid ${stat.color}`, animationDelay: `${idx * 0.1}s` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{stat.label}</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stat.value}</div>
                                </div>
                                <span style={{ fontSize: '2.5rem', opacity: 0.8 }}>{stat.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pivot Table Data */}
            <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div className="loading-spinner"></div>
                        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Preparing comparative analysis...</p>
                    </div>
                ) : sortedMonths.length === 0 ? (
                    <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.4 }}>📅</div>
                        <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>No consumption data found for the selected period.</p>
                    </div>
                ) : (
                    <div className="table-responsive table-scroll-lg" style={{ overflow: 'auto', maxHeight: '500px', width: '100%' }}>
                        <table className="tracker-table themed-tracker">
                            <thead>
                                <tr>
                                    <th className="sticky-col first-col header-glow" style={{ textAlign: 'left' }}>Item Name</th>
                                    {sortedMonths.map(month => (
                                        <th key={month} className="month-header">
                                            <div style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>{formatMonthName(month)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'none' }}>
                                                {monthTotals[month] ? `People: ${monthTotals[month].total_people.toLocaleString()}` : 'No Data'}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="sticky-col total-col header-glow">Item Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedItems.map((item) => (
                                    <tr key={item.name} className="trend-row-item themed-row">
                                        <td className="sticky-col first-col item-name-cell">
                                            {item.name}
                                            <div className="uom-label">UOM: {item.unit}</div>
                                        </td>
                                        {sortedMonths.map(month => {
                                            const mData = item.months[month];
                                            return (
                                                <td key={month} className={`trend-data-cell ${mData ? 'active-cell' : ''}`}>
                                                    {mData ? (
                                                        <div className="total-summary-box">
                                                            <div className="grand-total-amount" style={{ color: 'var(--text-main)', fontWeight: '800' }}>
                                                                ₹{mData.total_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                            </div>
                                                            <div className="avg-price-tag" style={{ background: 'var(--gradient-2)', color: 'var(--color-primary)', fontWeight: '700' }}>
                                                                ₹{mData.expense_per_person.toLocaleString(undefined, { maximumFractionDigits: 2 })} / production
                                                            </div>
                                                            <div className="total-qty-label" style={{ marginTop: '2px' }}>
                                                                {mData.net_consumed.toLocaleString()} <span style={{ opacity: 0.6 }}>{item.unit}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ opacity: 0.2 }}>—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="sticky-col total-col row-total-cell">
                                            <div className="total-summary-box">
                                                <div className="grand-total-amount" style={{ color: 'var(--color-success)', fontSize: '1.1rem' }}>
                                                    ₹{item.itemTotalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </div>
                                                <div className="total-qty-label" style={{ fontWeight: '600' }}>
                                                    {item.itemTotalConsumed.toLocaleString()} <span style={{ opacity: 0.6 }}>{item.unit}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="footer-total-row">
                                    <td className="sticky-col first-col footer-label">MONTHLY TOTAL (₹)</td>
                                    {sortedMonths.map(month => (
                                        <td key={month} className="footer-cell" style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>
                                                ₹{(monthTotals[month]?.total_cost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)' }}>
                                                Avg: ₹{(monthTotals[month] && monthTotals[month].total_people > 0 ? monthTotals[month].total_cost / monthTotals[month].total_people : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                    ))}
                                    <td className="sticky-col total-col grand-total-cell" style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.2rem' }}>
                                            ₹{Object.values(monthTotals).reduce((sum, m) => sum + m.total_cost, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255,255,255,0.1);
                    border-top: 4px solid var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                
                .themed-tracker {
                    width: 100% !important;
                    table-layout: auto !important;
                    border-collapse: collapse;
                    color: var(--text-main);
                    background: var(--bg-glass);
                }

                .themed-tracker th, .themed-tracker td {
                    border: 0.5px solid rgba(255, 255, 255, 0.1);
                    padding: 1rem 0.8rem;
                    text-align: center;
                    min-width: 90px !important;
                }

                .themed-tracker thead th {
                    background: var(--bg-navbar);
                    color: var(--text-main);
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 1px;
                    position: sticky;
                    top: 0;
                    z-index: 15;
                }

                .themed-tracker thead .sticky-col {
                    z-index: 25 !important;
                }

                .header-glow {
                    color: var(--color-secondary) !important;
                    text-shadow: 0 0 8px rgba(0, 150, 214, 0.4);
                }

                .sticky-col {
                    position: sticky;
                    background: var(--bg-navbar) !important;
                    z-index: 10;
                }

                .first-col { left: 0; width: 180px !important; min-width: 180px !important; max-width: 180px !important; text-align: left !important; z-index: 20; padding-left: 1.5rem !important; }
                .total-col { 
                    right: 0; 
                    min-width: 120px !important; 
                    background: var(--bg-navbar) !important;
                    z-index: 20;
                    padding-right: 1.5rem !important;
                }

                .themed-row:hover td {
                    background: var(--bg-glass) !important;
                }
                .themed-row:hover .sticky-col {
                    background: var(--bg-navbar) !important;
                    filter: brightness(1.1);
                }

                .uom-label {
                    color: var(--color-secondary);
                    font-weight: 600;
                    font-size: 0.75rem;
                }

                .item-name-cell {
                    font-weight: 700;
                    font-size: 1.1rem;
                }

                .total-summary-box {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    align-items: center;
                }

                .grand-total-amount { font-size: 1.1rem; }
                .total-qty-label { font-size: 0.75rem; }
                .avg-price-tag { 
                    font-size: 0.65rem; 
                    padding: 2px 8px; 
                    border-radius: 4px;
                    display: inline-block;
                }

                .active-cell { 
                    background: rgba(255, 255, 255, 0.03);
                }

                .footer-total-row td {
                    background: var(--bg-navbar) !important;
                    padding: 1.5rem 1rem;
                    border-top: 2px solid var(--color-primary);
                    font-weight: 800;
                    position: sticky;
                    bottom: 0;
                    z-index: 15;
                }

                .footer-total-row .sticky-col {
                    background: var(--bg-main) !important;
                    z-index: 25 !important;
                }

                .table-scroll-xl {
                    overflow-x: auto;
                    max-width: 100%;
                }
                .table-scroll-xl::-webkit-scrollbar {
                    height: 8px;
                }
                .table-scroll-xl::-webkit-scrollbar-thumb {
                    background: var(--border-glass-bright);
                    border-radius: 4px;
                }
            `}} />
        </div>
    );
};

export default MonthlyKitchenConsumptionReport;
