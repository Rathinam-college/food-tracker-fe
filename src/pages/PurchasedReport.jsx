import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const PurchasedReport = () => {
    const [reportData, setReportData] = useState({ results: [], summary: { total_qty: 0, total_tax: 0, total_price: 0, count: 0 } });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState('20');
    
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const [categories, setCategories] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [items, setItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedVendor, setSelectedVendor] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [purchaseType, setPurchaseType] = useState('');
    const [eventName, setEventName] = useState('');

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getPurchasedReport(
                month, 
                year, 
                selectedCategory, 
                selectedVendor, 
                selectedItem, 
                page, 
                pageSize,
                undefined,
                purchaseType,
                eventName
            );
            setReportData(data);
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    }, [month, year, page, pageSize, selectedCategory, selectedVendor, selectedItem, purchaseType, eventName]);

    const fetchData = useCallback(async () => {
        try {
            const [catData, vendData, itemData] = await Promise.all([
                api.getCategories(),
                api.getVendors(),
                api.getItems(1, 1000)
            ]);
            setCategories(catData.results || catData);
            setVendors(vendData.results || vendData);
            setItems(itemData.results || itemData);
        } catch (error) {
            console.error("Error fetching filter data", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // Auto-reset page when filters change (except page/pageSize)
    useEffect(() => {
        setPage(1);
    }, [month, year, selectedCategory, selectedVendor, selectedItem, purchaseType, eventName]);

    const getTotals = () => {
        if (reportData.summary) {
            return {
                qty: parseFloat(reportData.summary.total_qty || 0),
                tax: parseFloat(reportData.summary.total_tax || 0),
                total: parseFloat(reportData.summary.total_price || 0),
                gross_total: parseFloat(reportData.summary.gross_total_price || 0),
                total_returned: parseFloat(reportData.summary.total_returned || 0),
                count: reportData.summary.count || 0
            };
        }
        return { qty: 0, tax: 0, total: 0, gross_total: 0, total_returned: 0, count: 0 };
    };

    const handleExportExcel = async () => {
        try {
            const blob = await api.exportPurchasedReport(
                month, 
                year, 
                selectedCategory, 
                selectedVendor, 
                selectedItem,
                purchaseType,
                eventName
            );
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Purchased_Report_${months[month-1]}_${year}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Error exporting excel", err);
            alert('Failed to export Excel');
        }
    };

    const totals = getTotals();
    const results = reportData.results || [];
    const hasNext = !!reportData.next;
    const hasPrev = !!reportData.previous;
    const totalPages = Math.ceil((reportData.count || 0) / (pageSize === 'all' ? (reportData.count || 1) : parseInt(pageSize)));

    return (
        <div className="main-container">
            <header className="welcome-header">
                <div className="mobile-wrap-header">
                    <div>
                        <h1>Purchased Report</h1>
                        <p>Track your expenditures and stock additions by month.</p>
                    </div>
                    <button 
                        className="action-btn" 
                        style={{ background: 'var(--status-success-text-vibrant)' }}
                        onClick={handleExportExcel}
                    >
                        📄 Export Excel
                    </button>
                </div>
            </header>

            {/* Stats Summary Cards */}
            <div className="dashboard-grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', display: 'grid', gap: '1.5rem' }}>
                <div className="glass metric-card" style={{ borderLeft: '6px solid var(--color-secondary)', padding: '1.5rem 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ fontSize: '2.5rem' }}>📊</div>
                        <div>
                            <div className="metric-title" style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Total Line Items</div>
                            <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800 }}>{totals.count}</div>
                        </div>
                    </div>
                </div>

                <div className="glass metric-card" style={{ borderLeft: '6px solid #2ecc71', padding: '1.5rem 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ fontSize: '2.5rem' }}>💰</div>
                        <div>
                            <div className="metric-title" style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Net Monthly Spend</div>
                            <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800, color: '#2ecc71' }}>
                                ₹{totals.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            {totals.total_returned > 0 && (
                                <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Gross: ₹{totals.gross_total.toLocaleString()}</span>
                                    <span style={{ marginLeft: '10px', color: '#f7768e' }}>Returns: -₹{totals.total_returned.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass responsive-grid grid-min-180" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Month</label>
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Year</label>
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
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Vendor</label>
                    <select 
                        className="form-input" 
                        value={selectedVendor} 
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="">All Vendors</option>
                        {vendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Category</label>
                    <select 
                        className="form-input" 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Item</label>
                    <select 
                        className="form-input" 
                        value={selectedItem} 
                        onChange={(e) => setSelectedItem(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="">All Items</option>
                        {items.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Purchase Type</label>
                    <select 
                        className="form-input" 
                        value={purchaseType} 
                        onChange={(e) => setPurchaseType(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="">All Types</option>
                        <option value="REGULAR">Regular Purchase</option>
                        <option value="SPECIAL_EVENT">Special Event</option>
                    </select>
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Function / Event</label>
                    <input 
                        type="text" 
                        className="form-input" 
                        value={eventName} 
                        onChange={(e) => setEventName(e.target.value)}
                        placeholder="Search event..."
                        style={{ width: '100%' }}
                    />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                        className="secondary-btn" 
                        style={{ width: '100%', height: '45px' }}
                        onClick={() => {
                            setSelectedVendor('');
                            setSelectedCategory('');
                            setSelectedItem('');
                            setPurchaseType('');
                            setEventName('');
                        }}
                    >
                        🔄 Reset Filters
                    </button>
                </div>
            </div>

            {/* Pagination & Page Size */}
            <div className="glass" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SHOW</span>
                        <select 
                            className="form-input" 
                            value={pageSize} 
                            onChange={(e) => { setPageSize(e.target.value); setPage(1); }}
                            style={{ padding: '0.3rem 0.5rem', width: 'auto' }}
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Showing <strong>{results.length}</strong> of <strong>{reportData.count || 0}</strong> records
                    </div>
                </div>

                {pageSize !== 'all' && totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button 
                            className="action-btn-secondary" 
                            disabled={!hasPrev}
                            onClick={() => setPage(p => p - 1)}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            ◀ Prev
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            Page {page} of {totalPages}
                        </span>
                        <button 
                            className="action-btn-secondary" 
                            disabled={!hasNext}
                            onClick={() => setPage(p => p + 1)}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            Next ▶
                        </button>
                    </div>
                )}
            </div>

            <div className="glass" style={{ padding: '2rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Loading report data...</div>
                ) : results.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>No records found for the selected period.</div>
                ) : (
                    <>
                        <div className="table-responsive table-scroll-lg">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                                        <th style={{ padding: '1rem' }}>DATE</th>
                                        <th style={{ padding: '1rem' }}>VENDOR</th>
                                        <th style={{ padding: '1rem' }}>INVOICE NO</th>
                                        <th style={{ padding: '1rem' }}>TYPE / EVENT</th>
                                        <th style={{ padding: '1rem' }}>ITEM</th>
                                        <th style={{ padding: '1rem' }}>QTY</th>
                                        <th className="mobile-hide" style={{ padding: '1rem' }}>UOM</th>
                                        <th style={{ padding: '1rem' }}>UNIT PRICE</th>
                                        <th className="mobile-hide" style={{ padding: '1rem' }}>TAX %</th>
                                        <th className="mobile-hide" style={{ padding: '1rem' }}>TAX AMT</th>
                                        <th style={{ padding: '1rem' }}>TOTAL (GROSS)</th>
                                        <th style={{ padding: '1rem' }}>RETURNED</th>
                                    </tr>
                                </thead>
                            <tbody>
                                    {results.map(record => {
                                        const taxAmt = parseFloat(record.total_price) / (1 + (parseFloat(record.tax_rate) / 100)) * (parseFloat(record.tax_rate) / 100);
                                        return (
                                            <tr key={record.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                                <td style={{ padding: '1rem' }}>{record.purchase_date}</td>
                                                <td style={{ padding: '1rem' }}>{record.vendor_name}</td>
                                                <td style={{ padding: '1rem' }}>{record.invoice_number || '—'}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: record.purchase_type === 'SPECIAL_EVENT' ? 'var(--color-secondary)' : 'var(--text-muted)' }}>
                                                        {record.purchase_type === 'SPECIAL_EVENT' ? 'EVENT' : 'REGULAR'}
                                                    </div>
                                                    {record.event_name && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{record.event_name}</div>}
                                                </td>
                                                <td style={{ padding: '1rem', fontWeight: 600 }}>{record.item_name}</td>
                                                <td style={{ padding: '1rem' }}>{record.quantity}</td>
                                                <td className="mobile-hide" style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{record.unit || record.item_unit}</td>
                                                <td style={{ padding: '1rem' }}>₹{parseFloat(record.unit_price).toFixed(2)}</td>
                                                <td className="mobile-hide" style={{ padding: '1rem' }}>{record.tax_rate}%</td>
                                                <td className="mobile-hide" style={{ padding: '1rem' }}>₹{taxAmt.toFixed(2)}</td>
                                                <td style={{ padding: '1rem', color: 'var(--color-primary)', fontWeight: 700, whiteSpace: 'nowrap' }}>₹{parseFloat(record.total_price).toFixed(2)}</td>
                                                <td style={{ padding: '1rem', color: '#f7768e', fontWeight: 600, whiteSpace: 'nowrap' }}>{record.returned_value > 0 ? `-₹${parseFloat(record.returned_value).toFixed(2)}` : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ fontWeight: 800, background: 'var(--bg-glass)' }}>
                                        <td colSpan="5" style={{ padding: '1.5rem 1rem', textAlign: 'right', letterSpacing: '1px' }}>TOTALS</td>
                                        <td></td> {/* QTY */}
                                        <td className="mobile-hide"></td> {/* UOM */}
                                        <td></td> {/* UNIT PRICE */}
                                        <td className="mobile-hide"></td> {/* TAX % */}
                                        <td className="mobile-hide"></td> {/* TAX AMT */}
                                        <td style={{ padding: '1.5rem 1rem', color: 'var(--color-primary)', fontSize: '1.2rem', whiteSpace: 'nowrap' }}>₹{totals.gross_total.toFixed(2)}</td>
                                        <td style={{ padding: '1.5rem 1rem', color: '#f7768e', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>-₹{totals.total_returned.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .form-group label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
            `}} />
        </div>
    );
};

export default PurchasedReport;
