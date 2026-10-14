import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const VendorReturnReport = () => {
    const location = useLocation();
    const { hasPermission } = useAuth();
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    
    const [filters, setFilters] = useState({
        vendor: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const vendorsData = await api.getVendors();
                setVendors(vendorsData);
            } catch (error) {
                console.error("Error fetching vendors", error);
            }
        };
        fetchVendors();
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const data = await api.getVendorReturnReport(filters);
            setReportData(data);
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleExport = async () => {
        try {
            const blob = await api.exportVendorReturnReportExcel(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Vendor_Return_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export report. Please try again.");
        }
    };

    const handleReset = () => {
        setFilters({
            vendor: '',
            start_date: '',
            end_date: ''
        });
        setReportData([]);
    };

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

    const grandTotal = reportData.reduce((sum, item) => sum + item.total_amount, 0);

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1>Vendor Return Report</h1>
                <p>Track all items returned to vendors with detailed reasons and costs.</p>
            </header>

            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
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
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>From Date</label>
                        <input type="date" className="form-input" style={{ width: '100%' }} value={filters.start_date} onChange={(e) => handleFilterChange('start_date', e.target.value)} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginBottom: '0.5rem' }}>To Date</label>
                        <input type="date" className="form-input" style={{ width: '100%' }} value={filters.end_date} onChange={(e) => handleFilterChange('end_date', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button 
                            className="action-btn" 
                            onClick={fetchReport} 
                            disabled={loading}
                            style={{ height: '45px', flex: 1 }}
                        >
                            {loading ? 'Searching...' : 'Search'}
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
                        style={{ height: '45px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <span>📥</span> Export Excel
                    </button>
                </div>
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
                        tableLayout: 'auto'
                    }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-glass-heavy)' }}>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Vendor</th>
                                <th style={thStyle}>PR Reference</th>
                                <th style={thStyle}>Item</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                                <th style={thStyle}>Unit</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Unit Price</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                                <th style={thStyle}>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row) => (
                                <tr key={row.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <td style={tdStyle}>{row.return_date}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{row.vendor_name}</td>
                                    <td style={{ ...tdStyle, color: 'var(--color-primary)', fontWeight: 600 }}>{row.pr_reference}</td>
                                    <td style={{ ...tdStyle, fontWeight: 500 }}>{row.item_name}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{row.quantity}</td>
                                    <td style={tdStyle}>{row.unit}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>₹{row.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{row.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ ...tdStyle, fontSize: '0.8rem', opacity: 0.8, whiteSpace: 'normal', minWidth: '200px' }}>{row.reason}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-glass-heavy)', fontWeight: 'bold' }}>
                                <td colSpan="7" style={{ ...tdStyle, textAlign: 'right', fontSize: '0.9rem' }}>GRAND TOTAL</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontSize: '1rem', color: 'var(--color-primary)' }}>₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={tdStyle}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ) : (
                !loading && (
                    <div className="glass" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                        <h3>No return records found</h3>
                        <p>Adjust your filters and click "Search" to view vendor returns.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default VendorReturnReport;
