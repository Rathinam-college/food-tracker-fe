import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PurchaseTracker = () => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState([]);
    const [returnData, setReturnData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [purchaseType, setPurchaseType] = useState('all');

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    useEffect(() => {
        api.getCategories().then(setCategories);
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const categoryParam = selectedCategory === 'all' ? undefined : selectedCategory;
            const typeParam = purchaseType === 'all' ? undefined : purchaseType;
            // For analytics/tracker, we always need ALL records for the month
            const response = await api.getPurchasedReport(month, year, categoryParam, undefined, undefined, 1, 'all', undefined, typeParam);
            setReportData(response.results || []);

            // Fetch Returns for the same period
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            const returns = await api.getVendorReturnReport({ start_date: startDate, end_date: endDate });
            setReturnData(returns || []);

        } catch (error) {
            console.error("Error fetching tracker data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const categoryParam = selectedCategory === 'all' ? undefined : selectedCategory;
            const typeParam = purchaseType === 'all' ? undefined : purchaseType;
            const blob = await api.exportPurchaseTracker(month, year, categoryParam, typeParam);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const categoryName = selectedCategory === 'all'
                ? 'All_Categories'
                : (categories.find(c => c.id === parseInt(selectedCategory))?.name || 'Category');
            a.download = `Purchase_Tracker_${categoryName}_${months[month-1]}_${year}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Error exporting excel", err);
            alert('Failed to export Excel');
        }
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getDayName = (day) => {
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    // Group data by item and calculate totals
    const groupedData = reportData.reduce((acc, curr) => {
        if (!acc[curr.item_name]) {
            acc[curr.item_name] = {
                name: curr.item_name,
                unit: curr.unit || curr.item_unit || 'Kg',
                tax_rate: curr.tax_rate,
                days: {},
                itemMonthlyTotal: 0,
                itemMonthlyQty: 0
            };
        }
        const day = new Date(curr.purchase_date).getDate();
        if (!acc[curr.item_name].days[day]) {
            acc[curr.item_name].days[day] = { qty: 0, price: 0, total: 0 };
        }
        const qty = parseFloat(curr.quantity);
        const totalPrice = parseFloat(curr.total_price);
        
        acc[curr.item_name].days[day].qty += qty;
        acc[curr.item_name].days[day].total += totalPrice;
        // The individual unit price for the day will be calculated in the render or after the loop
        // to handle weighted averages correctly if multiple purchases happen on same day.
        acc[curr.item_name].days[day].price = acc[curr.item_name].days[day].total / acc[curr.item_name].days[day].qty;
        
        acc[curr.item_name].itemMonthlyTotal += totalPrice;
        acc[curr.item_name].itemMonthlyQty += qty;
        return acc;
    }, {});

    // Subtract Returns
    returnData.forEach(ret => {
        const itemName = ret.item_name;
        if (!groupedData[itemName]) {
            groupedData[itemName] = {
                name: itemName,
                unit: ret.unit || 'Kg',
                tax_rate: 0,
                days: {},
                itemMonthlyTotal: 0,
                itemMonthlyQty: 0
            };
        }
        
        const day = new Date(ret.return_date).getDate();
        if (!groupedData[itemName].days[day]) {
            groupedData[itemName].days[day] = { qty: 0, price: 0, total: 0 };
        }
        
        const qty = parseFloat(ret.quantity);
        const totalAmount = parseFloat(ret.total_amount);
        
        groupedData[itemName].days[day].qty -= qty;
        groupedData[itemName].days[day].total -= totalAmount;
        // Keep the original purchase price for reference if possible, or use return price
        if (groupedData[itemName].days[day].price === 0) {
            groupedData[itemName].days[day].price = parseFloat(ret.unit_price);
        }
        
        groupedData[itemName].itemMonthlyTotal -= totalAmount;
        groupedData[itemName].itemMonthlyQty -= qty;
    });

    const dayTotals = new Array(daysInMonth + 1).fill(0);
    Object.values(groupedData).forEach(item => {
        Object.keys(item.days).forEach(day => {
            dayTotals[parseInt(day)] += item.days[day].total;
        });
    });

    const grandTotal = Object.values(groupedData).reduce((sum, item) => sum + item.itemMonthlyTotal, 0);

    return (
        <div className="main-container">
            <header className="welcome-header">
                <div className="mobile-wrap-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                        <h1 className="glow-text">Purchase Tracker</h1>
                        <p>Monthly analytical view of procurement and expenditure.</p>
                    </div>
                    {Object.keys(groupedData).length > 0 && (
                        <button 
                            className="action-btn mobile-full-width" 
                            style={{ background: 'var(--status-success-text-vibrant)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', fontWeight: '700', justifyContent: 'center' }}
                            onClick={handleExportExcel}
                        >
                            📊 Export Tracker (Excel)
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Summary Cards */}
            <div className="dashboard-grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', display: 'grid', gap: '1.5rem' }}>
                <div className="glass metric-card" style={{ borderLeft: '6px solid var(--color-secondary)', padding: '1.5rem 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ fontSize: '2.5rem' }}>📊</div>
                        <div>
                            <div className="metric-title" style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Tracked Materials</div>
                            <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800 }}>{Object.keys(groupedData).length}</div>
                        </div>
                    </div>
                </div>

                <div className="glass metric-card" style={{ borderLeft: '6px solid #2ecc71', padding: '1.5rem 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ fontSize: '2.5rem' }}>💰</div>
                        <div>
                            <div className="metric-title" style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Net Monthly Spend</div>
                            <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800, color: '#2ecc71' }}>
                                ₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-heavy responsive-grid grid-min-180" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--border-glass-bright)' }}>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-main)', fontWeight: '600', letterSpacing: '0.5px' }}>CATEGORY</label>
                    <select 
                        className="form-input" 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="all">📋 All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-main)', fontWeight: '600', letterSpacing: '0.5px' }}>PURCHASE TYPE</label>
                    <select 
                        className="form-input" 
                        value={purchaseType} 
                        onChange={(e) => setPurchaseType(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="all">🌐 All Types</option>
                        <option value="REGULAR">📦 Regular Purchase</option>
                        <option value="SPECIAL_EVENT">🎉 Special Event</option>
                    </select>
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-main)', fontWeight: '600', letterSpacing: '0.5px' }}>MONTH</label>
                    <select 
                        className="form-input" 
                        value={month} 
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    >
                        {months.map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-main)', fontWeight: '600', letterSpacing: '0.5px' }}>YEAR</label>
                    <select 
                        className="form-input" 
                        value={year} 
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div className="grid-action-align">
                    <button 
                        className="action-btn glow-button" 
                        onClick={fetchReport}
                        disabled={loading}
                    >
                        {loading ? 'GENERATING...' : 'VIEW ANALYTICS'}
                    </button>
                </div>
            </div>

            <div className="report-container themed-scroll" style={{ marginTop: '1rem', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '6rem' }}>
                        <div className="loading-spinner"></div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', color: 'var(--color-secondary)', fontWeight: '600' }}>AGGREGATING PROCUREMENT DATA...</div>
                    </div>
                ) : Object.keys(groupedData).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>No records found for the selected period.</p>
                    </div>
                ) : (
                    <table className="tracker-table themed-tracker">
                        <thead>
                            <tr>
                                <th rowSpan="2" className="sticky-col first-col header-glow">Purchased Items</th>
                                {daysArray.map(day => (
                                    <th key={`name-${day}`} className="day-name">{getDayName(day)}</th>
                                ))}
                                <th rowSpan="2" className="sticky-col total-col header-glow">Item Total</th>
                            </tr>
                            <tr>
                                {daysArray.map(day => (
                                    <th key={`num-${day}`} className="day-num">{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(groupedData).map((item) => (
                                <tr key={item.name} className="trend-row-item themed-row">
                                    <td className="sticky-col first-col item-name-cell">
                                        {item.name}
                                        <div className="uom-label">UOM: {item.unit}</div>
                                    </td>
                                    {daysArray.map(day => {
                                        const dData = item.days[day];
                                        return (
                                            <td key={`cell-${day}`} className={`trend-data-cell ${dData ? 'active-cell' : ''}`}>
                                                {dData && (dData.total !== 0 || dData.qty !== 0) ? (
                                                    <div className="total-summary-box">
                                                        <div className="grand-total-amount" style={{ color: dData.total < 0 ? '#f7768e' : 'var(--text-success)' }}>
                                                            {dData.total < 0 ? '-' : ''}₹{Math.abs(dData.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                        <div className="total-qty-label">{dData.qty.toFixed(2)} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>{item.unit}</span></div>
                                                        {dData.price > 0 && <div className="avg-price-tag">₹{dData.price.toFixed(2)}/UOM</div>}
                                                    </div>
                                                ) : ''}
                                            </td>
                                        );
                                    })}
                                    <td className="sticky-col total-col row-total-cell">
                                        <div className="total-summary-box">
                                            <div className="grand-total-amount">₹{item.itemMonthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            <div className="total-qty-label">{item.itemMonthlyQty.toFixed(2)} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>{item.unit}</span></div>
                                            <div className="avg-price-tag" style={{ background: 'var(--gradient-2)', color: 'var(--color-secondary)' }}>
                                                Rate: ₹{(item.itemMonthlyTotal / item.itemMonthlyQty).toFixed(2)}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="footer-total-row">
                                <td className="sticky-col first-col footer-label" colSpan="1">DAILY EXPENDITURE (₹)</td>
                                {daysArray.map(day => (
                                    <td key={`footer-total-${day}`} className="footer-cell">
                                        {dayTotals[day] > 0 ? dayTotals[day].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                    </td>
                                ))}
                                <td className="sticky-col total-col grand-total-cell">
                                    ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>

            {Object.keys(groupedData).length > 0 && !loading && (
                <div className="grand-total-banner glow-border">
                    <span className="label">NET MONTHLY EXPENDITURE:</span>
                    <span className="value">₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .glow-text {
                    color: var(--text-main);
                    text-shadow: 0 0 10px var(--border-glass-bright);
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }

                .glow-button {
                    background: linear-gradient(135deg, var(--color-primary), var(--color-accent)) !important;
                    box-shadow: 0 0 15px rgba(244, 121, 32, 0.4);
                    transition: all 0.3s ease;
                    border: none !important;
                }

                .glow-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 0 25px rgba(244, 121, 32, 0.6);
                    filter: brightness(1.1);
                }

                .themed-tracker {
                    width: max-content !important;
                    min-width: 100%;
                    table-layout: auto !important;
                    border-collapse: collapse;
                    color: var(--text-main);
                    background: var(--bg-glass);
                }

                .themed-tracker th, .themed-tracker td {
                    border: 0.5px solid rgba(255, 255, 255, 0.1);
                    padding: 0.6rem 0.4rem;
                    text-align: center;
                    min-width: 85px !important;
                }

                .themed-tracker thead th {
                    background: var(--bg-navbar);
                    color: var(--text-main);
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 1px;
                }

                .header-glow {
                    color: var(--color-secondary) !important;
                    text-shadow: 0 0 8px rgba(0, 150, 214, 0.4);
                }

                .day-name { color: var(--text-muted); font-size: 0.7rem; }
                .day-num { color: var(--color-primary); font-size: 1.1rem; font-weight: 800; }

                .report-container {
                    max-height: 500px;
                    overflow: auto !important;
                    position: relative;
                }

                .themed-tracker thead th {
                    position: sticky;
                    top: 0;
                    z-index: 200;
                    background: var(--bg-navbar) !important;
                }

                /* Ensure row-span cells stay on top */
                .themed-tracker thead tr:first-child th[rowSpan="2"] {
                    z-index: 300;
                    top: 0;
                }

                /* Second header row needs a precise offset to prevent gaps */
                .themed-tracker thead tr:nth-child(2) th {
                    top: 34px; /* Calibrated based on browser rendering (~34px height for day names) */
                    z-index: 190;
                    border-top: none !important; /* Prevent double-border gap */
                    background-clip: padding-box;
                }

                /* Intersection: Sticky Column + Sticky Header */
                .themed-tracker thead th.sticky-col {
                    z-index: 400;
                }
                
                .themed-tracker thead tr:nth-child(2) th.sticky-col {
                    z-index: 390;
                }

                .sticky-col {
                    position: sticky;
                    background: var(--bg-navbar) !important;
                    z-index: 100;
                }

                .first-col { left: 0; width: 220px !important; min-width: 220px !important; max-width: 220px !important; box-sizing: border-box; text-align: left !important; padding-left: 1.5rem !important; }

                @media (max-width: 480px) {
                    .first-col { width: 160px !important; min-width: 160px !important; max-width: 160px !important; }
                }

                .total-col {
                    right: 0;
                    z-index: 101;
                    min-width: 140px !important;
                    background: var(--bg-navbar) !important;
                    padding-right: 1.5rem !important;
                }

                .themed-row:hover td {
                    background: var(--bg-glass) !important;
                }

                /* Prevent sticky columns from becoming transparent on hover */
                .themed-row:hover .sticky-col {
                    background: var(--bg-navbar) !important;
                    filter: brightness(1.1);
                }

                .uom-label {
                    color: var(--color-secondary);
                    font-weight: 500;
                    font-size: 0.75rem;
                }

                .item-name-cell {
                    color: var(--text-main);
                    font-weight: 700;
                    font-size: 1.1rem;
                }

                .tax-cell { color: var(--text-muted); font-family: monospace; }
                
                .total-summary-box {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    align-items: center;
                }

                .grand-total-amount { color: var(--text-success); font-weight: 800; font-size: 1.1rem; }
                .total-qty-label { font-size: 0.75rem; color: var(--text-main); }
                .avg-price-tag { 
                    font-size: 0.65rem; 
                    background: var(--status-success-bg); 
                    color: var(--text-success); 
                    padding: 2px 6px; 
                    border-radius: 4px;
                    display: inline-block;
                }

                .active-cell { 
                    background: var(--bg-glass) !important;
                    border: 1px solid var(--status-success-bg) !important;
                }

                .row-total-cell .grand-total-amount {
                    font-size: 1.2rem;
                }

                .footer-total-row td {
                    position: sticky;
                    bottom: 0;
                    background: var(--bg-navbar) !important;
                    padding: 1.2rem 0.8rem;
                    border-top: 2px solid var(--color-primary);
                    font-weight: 800;
                    z-index: 200;
                }

                .footer-total-row .sticky-col {
                    background: var(--bg-navbar) !important;
                    z-index: 300;
                }

                .footer-total-row .grand-total-cell {
                    right: 0;
                    z-index: 301;
                    background: var(--bg-navbar) !important;
                }

                .grand-total-label { color: var(--color-primary); letter-spacing: 1px; }

                .form-input option {
                    background-color: var(--bg-navbar);
                    color: var(--text-main);
                }

                .loading-spinner-container {
                    margin-top: 2rem;
                    padding: 1.5rem 3rem;
                    background: var(--bg-glass);
                    border-radius: var(--radius-md);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid var(--color-success);
                }

                .grand-total-banner .label {
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    font-weight: 700;
                    color: var(--text-muted);
                }

                .grand-total-banner .value {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: var(--text-success);
                    text-shadow: 0 0 20px var(--status-success-bg);
                }

                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid var(--border-glass);
                    border-top: 5px solid var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .report-container::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }
                .report-container::-webkit-scrollbar-track {
                    background: var(--bg-glass);
                }
                .report-container::-webkit-scrollbar-thumb {
                    background: var(--border-glass-bright);
                    border-radius: 10px;
                }
                .report-container::-webkit-scrollbar-thumb:hover {
                    background: var(--text-muted);
                }
            `}} />
        </div>
    );
};

export default PurchaseTracker;
