import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

const OpexReport = () => {
    const location = useLocation();
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    const [filters, setFilters] = useState({
        item: '',
        vendor_category: '',
        vendor: '',
        payment_status: '',
        opex_no: '',
        start_date: firstOfMonth,
        end_date: today,
        purchase_type: '',
        event_name: '',
        page: 1,
        pageSize: '20'
    });

    const [paginationData, setPaginationData] = useState({
        count: 0,
        total_pages: 1,
        next: false,
        previous: false,
        summary: {
            total_pr_value: 0,
            total_tax: 0,
            total_amount: 0,
            total_opex_value: 0
        }
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [vendorsData] = await Promise.all([
                    api.getVendors()
                ]);
                setVendors(vendorsData.results || vendorsData);
            } catch (error) {
                console.error("Error fetching filter data", error);
            }
        };
        fetchInitialData();
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const data = await api.getOpexReport(filters);
            setReportData(data.results || []);
            setPaginationData({
                count: data.count || 0,
                total_pages: data.total_pages || 1,
                next: data.next || false,
                previous: data.previous || false,
                summary: data.summary || {
                    total_pr_value: 0,
                    total_tax: 0,
                    total_amount: 0,
                    total_opex_value: 0
                }
            });
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleViewDetails = (id) => {
        const path = location.pathname.startsWith('/management') ? '/management/opex/' : '/procurement/opex/';
        window.open(`/food_tracker${path}${id}`, '_blank');
    };

    const handleExport = async () => {
        try {
            const blob = await api.exportOpexReportExcel(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Opex_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export report. Please try again.");
        }
    };

    const totals = paginationData.summary;

    const thStyle = {
        padding: '1.5rem 2rem',
        fontSize: '0.75rem',
        fontWeight: '700',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        borderBottom: '1px solid var(--border-glass)',
        textAlign: 'left',
        whiteSpace: 'nowrap'
    };

    const tdStyle = {
        padding: '1.2rem 2rem',
        fontSize: '0.85rem',
        color: 'var(--text-main)',
        borderBottom: '1px solid var(--border-glass)',
        whiteSpace: 'nowrap'
    };

    const handleReset = () => {
        setFilters({
            item: '',
            vendor_category: '',
            vendor: '',
            payment_status: '',
            opex_no: '',
            start_date: firstOfMonth,
            end_date: today,
            purchase_type: '',
            event_name: '',
            page: 1,
            pageSize: '20'
        });
        setReportData([]);
        setPaginationData({
            count: 0,
            total_pages: 1,
            next: false,
            previous: false,
            summary: {
                total_pr_value: 0,
                total_tax: 0,
                total_amount: 0,
                total_opex_value: 0
            }
        });
    };

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1>Opex Report</h1>
                <p>Comprehensive operational expense tracking with PR integration.</p>
            </header>

            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: '1.2rem', 
                    alignItems: 'end' 
                }}>

                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>Vendor</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%', textOverflow: 'ellipsis' }} 
                            value={filters.vendor} 
                            onChange={(e) => handleFilterChange('vendor', e.target.value)}
                        >
                            <option value="">All Vendors</option>
                            {vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                        </select>
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>OPEX No</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Search OPEX No..." 
                            style={{ width: '100%' }} 
                            value={filters.opex_no} 
                            onChange={(e) => handleFilterChange('opex_no', e.target.value)} 
                        />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>Payment</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%' }} 
                            value={filters.payment_status} 
                            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                        </select>
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>From Date</label>
                        <input type="date" className="form-input" style={{ width: '100%' }} value={filters.start_date} onChange={(e) => handleFilterChange('start_date', e.target.value)} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>To Date</label>
                        <input type="date" className="form-input" style={{ width: '100%' }} value={filters.end_date} onChange={(e) => handleFilterChange('end_date', e.target.value)} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>Purchase Type</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%' }} 
                            value={filters.purchase_type} 
                            onChange={(e) => handleFilterChange('purchase_type', e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="REGULAR">Regular Purchase</option>
                            <option value="SPECIAL_EVENT">Special Event</option>
                        </select>
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>Event Name</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. Annual Day" 
                            style={{ width: '100%' }} 
                            value={filters.event_name} 
                            onChange={(e) => handleFilterChange('event_name', e.target.value)} 
                        />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>Show</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%' }} 
                            value={filters.pageSize} 
                            onChange={(e) => setFilters(prev => ({ ...prev, pageSize: e.target.value, page: 1 }))}
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', gridColumn: 'span 2' }}>
                        <button 
                            className="action-btn" 
                            onClick={fetchReport} 
                            disabled={loading}
                            style={{ height: '45px', flex: 1 }}
                        >
                            {loading ? 'Generating...' : 'Generate Report'}
                        </button>
                        <button 
                            className="secondary-btn" 
                            onClick={handleReset} 
                            disabled={loading}
                            style={{ height: '45px', flex: 1 }}
                        >
                            Reset
                        </button>
                    </div>
                    <button 
                        className="secondary-btn" 
                        onClick={handleExport} 
                        disabled={loading || reportData.length === 0}
                        style={{ height: '45px', gridColumn: 'span 1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <span>📥</span> Export Excel
                    </button>
                </div>
                {!loading && reportData.length > 0 && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', background: 'var(--bg-glass)', padding: '0.4rem 1rem', borderRadius: '50px', fontWeight: 600 }}>
                            Showing {reportData.length} of {paginationData.count} Records
                        </span>
                    </div>
                )}
            </div>

            {reportData.length > 0 ? (
                <div className="animate-fade-in" style={{ 
                    overflowX: 'auto', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    boxShadow: 'var(--shadow-premium)'
                }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        minWidth: '1800px',
                        tableLayout: 'auto'
                    }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-glass-heavy)' }}>
                                <th style={thStyle}>SL</th>
                                <th style={thStyle}>OPEX NO</th>
                                <th style={thStyle}>Vendor</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>PR Value (Base)</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Tax</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Total (PR)</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Bill Status</th>
                                <th style={thStyle}>Type / Event</th>
                                <th style={thStyle}>OPEX Date</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>OPEX Value</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Payment</th>
                                <th style={thStyle}>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row, index) => (
                                <tr key={row.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <td style={tdStyle}>{index + 1}</td>
                                    <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => handleViewDetails(row.id)}>
                                        <div style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'underline' }}>{row.opex_no}</div>
                                    </td>
                                    <td style={{ ...tdStyle, fontWeight: 500 }}>{row.vendor_name}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>₹{row.pr_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>₹{row.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{row.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <span className={`status-badge ${row.bill_status.toLowerCase()}`}>
                                            {row.bill_status}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{row.purchase_type === 'SPECIAL_EVENT' ? 'EVENT' : 'REGULAR'}</div>
                                        {row.purchase_type === 'SPECIAL_EVENT' && <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{row.event_name}</div>}
                                    </td>
                                    <td style={tdStyle}>{row.opex_date}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>₹{row.opex_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                            <span className={`status-badge ${row.payment_status.toLowerCase()}`}>
                                                {row.payment_status}
                                            </span>
                                            {row.is_locked && <span style={{ fontSize: '1rem' }} title="Locked">🔒</span>}
                                        </div>
                                    </td>
                                    <td style={{ ...tdStyle, fontSize: '0.8rem', opacity: 0.8 }}>{row.remarks || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-glass-heavy)', fontWeight: 'bold' }}>
                                <td colSpan="3" style={{ ...tdStyle, textAlign: 'right', paddingRight: '2rem', fontSize: '0.9rem' }}>GRAND TOTAL</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontSize: '0.9rem' }}>₹{totals.total_pr_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontSize: '0.9rem' }}>₹{totals.total_tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontSize: '0.9rem' }}>₹{totals.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={tdStyle}></td>
                                <td style={tdStyle}></td>
                                <td style={tdStyle}></td>
                                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-primary)', fontSize: '1rem' }}>₹{totals.total_opex_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={tdStyle}></td>
                                <td style={tdStyle}></td>
                            </tr>
                        </tfoot>
                    </table>
                {!loading && filters.pageSize !== 'all' && paginationData.total_pages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
                        <button 
                            className="secondary-btn" 
                            disabled={!paginationData.previous}
                            onClick={() => {
                                setFilters(prev => ({ ...prev, page: prev.page - 1 }));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            ◀ Prev
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            Page {filters.page} of {paginationData.total_pages}
                        </span>
                        <button 
                            className="secondary-btn" 
                            disabled={!paginationData.next}
                            onClick={() => {
                                setFilters(prev => ({ ...prev, page: prev.page + 1 }));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            Next ▶
                        </button>
                    </div>
                )}
                </div>
            ) : (
                !loading && (
                    <div className="glass" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                        <h3>No records found</h3>
                        <p>Adjust your filters and click "Generate Report" to view operational expenses.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default OpexReport;
