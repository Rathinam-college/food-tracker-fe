import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const ComprehensiveAudit = () => {
    const [activeTab, setActiveTab] = useState('purchases');
    
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    // Filters
    const [itemFilter, setItemFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState(''); // Only for transitions/adjustments
    
    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState('20');
    const [totalPages, setTotalPages] = useState(1);
    const [nextUrl, setNextUrl] = useState(null);
    const [prevUrl, setPrevUrl] = useState(null);

    // Data State
    const [auditData, setAuditData] = useState([]);

    // Column Visibility State
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const columnMenuRef = useRef(null);

    const ALL_COLUMNS = {
        purchases: [
            { id: 'dates', label: 'Order / Purch Date' },
            { id: 'item_name', label: 'Item Name' },
            { id: 'pr_number', label: 'PR Number' },
            { id: 'vendor_name', label: 'Vendor' },
            { id: 'purchase_type', label: 'Purchase Type' },
            { id: 'purchased_qty', label: 'Purchased Qty' },
            { id: 'unit_price_base', label: 'Unit Price (Base)' },
            { id: 'tax_rate', label: 'Tax Rate' },
            { id: 'discount_value', label: 'Discount' },
            { id: 'unit_price_incl_tax', label: 'Unit Price (Incl Tax)' },
            { id: 'total_pr_value', label: 'Total Value' },
            { id: 'tax_paid', label: 'Tax Paid' },
            { id: 'pushed_qty', label: 'Pushed Qty' },
            { id: 'pushed_value', label: 'Pushed Value' },
            { id: 'vendor_returned_qty', label: 'Returned Qty' },
            { id: 'vendor_returned_value', label: 'Returned Value' },
            { id: 'adjusted_qty', label: 'Adjusted/Wasted Qty' },
            { id: 'adjusted_value', label: 'Adjusted/Wasted Value' },
            { id: 'remaining_qty', label: 'Remaining Qty' },
            { id: 'remaining_value', label: 'Remaining Value' },
            { id: 'action_by', label: 'Action By' },
        ],
        mrs: [
            { id: 'target_date', label: 'Target Date' },
            { id: 'item_name', label: 'Item Name' },
            { id: 'mr_number', label: 'MR Number' },
            { id: 'status', label: 'Status' },
            { id: 'person_count', label: 'Person Count' },
            { id: 'requested_qty', label: 'Requested Qty' },
            { id: 'issued_qty', label: 'Issued Qty' },
            { id: 'returned_qty', label: 'Returned Qty' },
            { id: 'consumed_qty', label: 'Consumed Qty' },
            { id: 'consumption_cost', label: 'Total Cost' },
            { id: 'per_head_cost', label: 'Cost / Head' },
            { id: 'pushed_from_pr', label: 'Source PRs' },
        ],
        adjustments: [
            { id: 'date', label: 'Date / Time' },
            { id: 'item_name', label: 'Item Name' },
            { id: 'quantity', label: 'Quantity (UOM)' },
            { id: 'adjustment_value', label: 'Value' },
            { id: 'adjustment_type', label: 'Adjustment Type' },
            { id: 'batch_details', label: 'Batch Details' },
            { id: 'remarks', label: 'Remarks' },
            { id: 'user', label: 'User' },
        ],
        transitions: [
            { id: 'date', label: 'Date / Time' },
            { id: 'type', label: 'Action Type' },
            { id: 'item_name', label: 'Item Name' },
            { id: 'quantity', label: 'Quantity Changed' },
            { id: 'reference_id', label: 'Reference ID' },
            { id: 'remarks', label: 'Remarks' },
            { id: 'user', label: 'User' },
        ]
    ,
        item_summary: [
            { id: 'item_name', label: 'Item Name' },
            { id: 'purchased_qty', label: 'Purchased Qty' },
            { id: 'purchased_value', label: 'Purchased Value' },
            { id: 'pushed_qty', label: 'Pushed Qty' },
            { id: 'pushed_value', label: 'Pushed Value' },
            { id: 'vendor_returned_qty', label: 'Returned Qty' },
            { id: 'vendor_returned_value', label: 'Returned Value' },
            { id: 'adjusted_qty', label: 'Adjusted/Wasted Qty' },
            { id: 'adjusted_value', label: 'Adjusted/Wasted Value' },
            { id: 'remaining_qty', label: 'Remaining Qty' },
            { id: 'remaining_value', label: 'Remaining Value' }
        ],
        vendor_returns: [
            { id: 'return_date', label: 'Return Date' },
            { id: 'vendor_name', label: 'Vendor' },
            { id: 'pr_number', label: 'PR Number' },
            { id: 'item_name', label: 'Item Name' },
            { id: 'return_qty', label: 'Return Qty' },
            { id: 'unit_price', label: 'Unit Price' },
            { id: 'return_value', label: 'Return Value' },
            { id: 'reason', label: 'Reason' },
            { id: 'action_by', label: 'Action By' }
        ],
    };

    const DEFAULT_VISIBLE = {
        purchases: ['dates', 'item_name', 'pr_number', 'vendor_name', 'purchased_qty', 'total_pr_value', 'pushed_qty', 'remaining_qty', 'action_by'],
        mrs: ['target_date', 'item_name', 'mr_number', 'person_count', 'issued_qty', 'returned_qty', 'consumed_qty', 'per_head_cost'],
        adjustments: ['date', 'item_name', 'quantity', 'adjustment_value', 'adjustment_type', 'batch_details', 'user'],
        transitions: ['date', 'type', 'item_name', 'quantity', 'reference_id', 'remarks', 'user']
    ,
        item_summary: [
            { id: 'item_name', label: 'Item Name' },
            { id: 'purchased_qty', label: 'Purchased Qty' },
            { id: 'purchased_value', label: 'Purchased Value' },
            { id: 'pushed_qty', label: 'Pushed Qty' },
            { id: 'pushed_value', label: 'Pushed Value' },
            { id: 'vendor_returned_qty', label: 'Returned Qty' },
            { id: 'vendor_returned_value', label: 'Returned Value' },
            { id: 'adjusted_qty', label: 'Adjusted/Wasted Qty' },
            { id: 'adjusted_value', label: 'Adjusted/Wasted Value' },
            { id: 'remaining_qty', label: 'Remaining Qty' },
            { id: 'remaining_value', label: 'Remaining Value' }
        ],
        vendor_returns: [
            { id: 'return_date', label: 'Return Date' },
            { id: 'vendor_name', label: 'Vendor' },
            { id: 'pr_number', label: 'PR Number' },
            { id: 'item_name', label: 'Item Name' },
            { id: 'return_qty', label: 'Return Qty' },
            { id: 'unit_price', label: 'Unit Price' },
            { id: 'return_value', label: 'Return Value' },
            { id: 'reason', label: 'Reason' },
            { id: 'action_by', label: 'Action By' }
        ],
    };

    const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE);

    const toggleColumn = (tab, colId) => {
        setVisibleColumns(prev => {
            const current = prev[tab];
            const updated = current.includes(colId)
                ? current.filter(id => id !== colId)
                : [...current, colId];
            return { ...prev, [tab]: updated };
        });
    };

    const isVisible = (colId) => visibleColumns[activeTab].includes(colId);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
                setShowColumnMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        api.getItems(1, 1000)
            .then(res => {
                if (res.results) setItems(res.results);
                else if (Array.isArray(res)) setItems(res);
            })
            .catch(err => console.error("Error fetching items:", err));
    }, []);

    useEffect(() => {
        setPage(1);
        fetchAuditData();
    }, [activeTab]);

    useEffect(() => {
        fetchAuditData();
    }, [page, pageSize, itemFilter, typeFilter, startDate, endDate]);

    const fetchAuditData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                page_size: pageSize,
                ...(itemFilter && { item: itemFilter }),
                ...(startDate && { start_date: startDate }),
                ...(endDate && { end_date: endDate }),
                ...(typeFilter && { type: typeFilter })
            };
            
            let data;
            const token = localStorage.getItem('ft_token');
            const headers = { 'Authorization': `Token ${token}` };
            const queryParams = new URLSearchParams(params).toString();
            
            let endpoint = '';
            if (activeTab === 'purchases') endpoint = `/food_tracker/api/audit/purchases/?${queryParams}`;
            else if (activeTab === 'mrs') endpoint = `/food_tracker/api/audit/material-requests/?${queryParams}`;
                        else if (activeTab === 'adjustments') endpoint = `/food_tracker/api/audit/adjustments/?${queryParams}`;
            else if (activeTab === 'item_summary') endpoint = `/food_tracker/api/audit/item-summary/?${queryParams}`;
            else if (activeTab === 'vendor_returns') endpoint = `/food_tracker/api/audit/vendor-returns/?${queryParams}`;
            else if (activeTab === 'transitions') endpoint = `/food_tracker/api/stock-movements/?${queryParams}`;

            const response = await fetch(endpoint, { headers });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            data = await response.json();

            if (data.results) {
                setAuditData(data.results);
                setTotalPages(Math.ceil((data.count || data.results.length) / parseInt(pageSize)));
                setNextUrl(data.next);
                setPrevUrl(data.previous);
            } else {
                setAuditData(data);
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
            a.download = `Comprehensive_Audit_${new Date().toISOString().split('T')[0]}.xlsx`;
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

    const formatType = (type) => type ? type.replace(/_/g, ' ') : '';

    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '3rem' }}>📜</span>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                                Comprehensive Audit Dashboard
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: '0.2rem 0 0 0' }}>
                                Interactive ledger of all historical system transactions and operations.
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
                        {exporting ? '⏳ Exporting Full File...' : '📄 Download Full Excel Audit'}
                    </button>
                </div>
            </header>
            
            <div className="glass" style={{
                padding: '0.5rem', marginBottom: '1.5rem',
                display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center'
            }}>
                <button 
                    onClick={() => setActiveTab('purchases')}
                    className={`secondary-btn ${activeTab === 'purchases' ? 'active-tab-btn' : ''}`}
                    style={{ flex: 1, minWidth: '150px', fontWeight: 700, padding: '0.75rem', background: activeTab === 'purchases' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'purchases' ? '#fff' : 'var(--text-main)', border: activeTab === 'purchases' ? 'none' : '1px solid var(--border-glass)', borderRadius: '6px' }}>
                    📦 Purchase Data
                </button>
                <button 
                    onClick={() => setActiveTab('mrs')}
                    className={`secondary-btn ${activeTab === 'mrs' ? 'active-tab-btn' : ''}`}
                    style={{ flex: 1, minWidth: '150px', fontWeight: 700, padding: '0.75rem', background: activeTab === 'mrs' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'mrs' ? '#fff' : 'var(--text-main)', border: activeTab === 'mrs' ? 'none' : '1px solid var(--border-glass)', borderRadius: '6px' }}>
                    🍳 Material Requests
                </button>
                <button 
                    onClick={() => setActiveTab('adjustments')}
                    className={`secondary-btn ${activeTab === 'adjustments' ? 'active-tab-btn' : ''}`}
                    style={{ flex: 1, minWidth: '150px', fontWeight: 700, padding: '0.75rem', background: activeTab === 'adjustments' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'adjustments' ? '#fff' : 'var(--text-main)', border: activeTab === 'adjustments' ? 'none' : '1px solid var(--border-glass)', borderRadius: '6px' }}>
                    ⚠️ Adjustments
                </button>
                <button 
                    onClick={() => setActiveTab('transitions')}
                    className={`secondary-btn ${activeTab === 'transitions' ? 'active-tab-btn' : ''}`}
                    style={{ flex: 1, minWidth: '150px', fontWeight: 700, padding: '0.75rem', background: activeTab === 'transitions' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'transitions' ? '#fff' : 'var(--text-main)', border: activeTab === 'transitions' ? 'none' : '1px solid var(--border-glass)', borderRadius: '6px' }}>
                    🔄 Stock Transitions
                </button>
                <button 
                    onClick={() => setActiveTab('item_summary')}
                    className={`secondary-btn ${activeTab === 'item_summary' ? 'active-tab-btn' : ''}`}
                    style={{ flex: 1, minWidth: '150px', fontWeight: 700, padding: '0.75rem', background: activeTab === 'item_summary' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'item_summary' ? '#fff' : 'var(--text-main)', border: activeTab === 'item_summary' ? 'none' : '1px solid var(--border-glass)', borderRadius: '6px' }}>
                    📊 Item Summary
                </button>
                <button 
                    onClick={() => setActiveTab('vendor_returns')}
                    className={`secondary-btn ${activeTab === 'vendor_returns' ? 'active-tab-btn' : ''}`}
                    style={{ flex: 1, minWidth: '150px', fontWeight: 700, padding: '0.75rem', background: activeTab === 'vendor_returns' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'vendor_returns' ? '#fff' : 'var(--text-main)', border: activeTab === 'vendor_returns' ? 'none' : '1px solid var(--border-glass)', borderRadius: '6px' }}>
                    📤 Vendor Returns
                </button>
            </div>

            <div className="glass" style={{
                padding: '1.2rem 1.5rem', marginBottom: '1.5rem',
                display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', position: 'relative'
            }}>
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
                {activeTab === 'transitions' && (
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
                )}
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
                
                {/* Column Toggle Button */}
                <div style={{ flex: '0 0 auto', position: 'relative' }} ref={columnMenuRef}>
                    <button
                        onClick={() => setShowColumnMenu(!showColumnMenu)}
                        style={{
                            background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)',
                            borderRadius: '8px', padding: '0.65rem 1.2rem', cursor: 'pointer',
                            color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        ⚙️ Columns
                    </button>
                    {showColumnMenu && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                            background: 'var(--bg-main)', // Use solid background instead of glass card
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px', padding: '1rem', zIndex: 9999, minWidth: '220px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxHeight: '400px', overflowY: 'auto'
                        }}>
                            <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>Toggle Columns</h4>
                            {ALL_COLUMNS[activeTab].map(col => (
                                <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isVisible(col.id)} 
                                        onChange={() => toggleColumn(activeTab, col.id)}
                                        style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{col.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
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
                <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-glass-heavy)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {ALL_COLUMNS[activeTab].filter(c => isVisible(c.id)).map(col => (
                                <th key={col.id} style={{ padding: '1.2rem 1rem', textAlign: col.id.includes('qty') || col.id.includes('value') || col.id.includes('price') || col.id.includes('cost') || col.id.includes('count') ? 'right' : 'left', borderBottom: '2px solid var(--border-glass)' }}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={ALL_COLUMNS[activeTab].filter(c => isVisible(c.id)).length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    ⏳ Loading audit records...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={ALL_COLUMNS[activeTab].filter(c => isVisible(c.id)).length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--status-error-text-vibrant)' }}>
                                    ⚠️ {error}
                                </td>
                            </tr>
                        ) : auditData.length === 0 ? (
                            <tr>
                                <td colSpan={ALL_COLUMNS[activeTab].filter(c => isVisible(c.id)).length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    📭 No audit records found for the given criteria.
                                </td>
                            </tr>
                        ) : (
                            auditData.map((row, idx) => (
                                <tr key={row.id || idx} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                                    {activeTab === 'purchases' && (
                                        <>
                                            {isVisible('dates') && <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                <div><strong style={{color: 'var(--text-main)'}}>Ord:</strong> {row.order_date || 'N/A'}</div>
                                                <div><strong style={{color: 'var(--text-main)'}}>Pur:</strong> {row.purchase_date || 'N/A'}</div>
                                            </td>}
                                            {isVisible('item_name') && <td style={{ padding: '1rem', fontWeight: 600 }}>{row.item_name}</td>}
                                            {isVisible('pr_number') && <td style={{ padding: '1rem', color: 'var(--color-primary)' }}>{row.pr_number}</td>}
                                            {isVisible('vendor_name') && <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{row.vendor_name}</td>}
                                            {isVisible('purchase_type') && <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{row.purchase_type}</td>}
                                            {isVisible('purchased_qty') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{parseFloat(row.purchased_qty || 0).toFixed(2)}</td>}
                                            {isVisible('unit_price_base') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.unit_price_base || 0).toFixed(2)}</td>}
                                            {isVisible('tax_rate') && <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem' }}>{row.tax_rate}</td>}
                                            {isVisible('discount_value') && <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem' }}>{row.discount_value}</td>}
                                            {isVisible('unit_price_incl_tax') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.unit_price_incl_tax || 0).toFixed(2)}</td>}
                                            {isVisible('total_pr_value') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--status-success-text-vibrant)' }}>₹{parseFloat(row.total_pr_value || 0).toFixed(2)}</td>}
                                            {isVisible('tax_paid') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.tax_paid || 0).toFixed(2)}</td>}
                                            {isVisible('pushed_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.pushed_qty || 0).toFixed(2)}</td>}
                                            {isVisible('pushed_value') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.pushed_value || 0).toFixed(2)}</td>}
                                            {isVisible('vendor_returned_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.vendor_returned_qty || 0).toFixed(2)}</td>}
                                            {isVisible('vendor_returned_value') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.vendor_returned_value || 0).toFixed(2)}</td>}
                                            {isVisible('adjusted_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.adjusted_qty || 0).toFixed(2)}</td>}
                                            {isVisible('adjusted_value') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.adjusted_value || 0).toFixed(2)}</td>}
                                            {isVisible('remaining_qty') && <td style={{ padding: '1rem', textAlign: 'right', color: row.remaining_qty > 0 ? 'var(--status-warning-text-vibrant)' : 'inherit' }}>{parseFloat(row.remaining_qty || 0).toFixed(2)}</td>}
                                            {isVisible('remaining_value') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.remaining_value || 0).toFixed(2)}</td>}
                                            {isVisible('action_by') && <td style={{ padding: '1rem', fontStyle: 'italic', fontSize: '0.85rem' }}>{row.action_by}</td>}
                                        </>
                                    )}
                                    {activeTab === 'mrs' && (
                                        <>
                                            {isVisible('target_date') && <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.target_date || 'N/A'}</td>}
                                            {isVisible('item_name') && <td style={{ padding: '1rem', fontWeight: 600 }}>{row.item_name}</td>}
                                            {isVisible('mr_number') && <td style={{ padding: '1rem', color: 'var(--color-primary)' }}>{row.mr_number}</td>}
                                            {isVisible('status') && <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{row.status}</td>}
                                            {isVisible('person_count') && <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{row.person_count}</td>}
                                            {isVisible('requested_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.requested_qty || 0).toFixed(2)}</td>}
                                            {isVisible('issued_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.issued_qty || 0).toFixed(2)}</td>}
                                            {isVisible('returned_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.returned_qty || 0).toFixed(2)}</td>}
                                            {isVisible('consumed_qty') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{parseFloat(row.consumed_qty || 0).toFixed(2)}</td>}
                                            {isVisible('consumption_cost') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.consumption_cost || 0).toFixed(2)}</td>}
                                            {isVisible('per_head_cost') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--status-success-text-vibrant)' }}>₹{parseFloat(row.per_head_cost || 0).toFixed(2)}</td>}
                                            {isVisible('pushed_from_pr') && <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{row.pushed_from_pr}</td>}
                                        </>
                                    )}
                                    {activeTab === 'adjustments' && (
                                        <>
                                            {isVisible('date') && <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.date}</td>}
                                            {isVisible('item_name') && <td style={{ padding: '1rem', fontWeight: 600 }}>{row.item_name}</td>}
                                            {isVisible('quantity') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{parseFloat(row.quantity || 0).toFixed(2)} {row.uom}</td>}
                                            {isVisible('adjustment_value') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--status-error-text-vibrant)' }}>₹{parseFloat(row.adjustment_value || 0).toFixed(2)}</td>}
                                            {isVisible('adjustment_type') && <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    background: 'var(--bg-glass-heavy)', color: getTypeColor(row.adjustment_type?.replace(' ', '_')), padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, border: `1px solid ${getTypeColor(row.adjustment_type?.replace(' ', '_'))}40`
                                                }}>{row.adjustment_type}</span>
                                            </td>}
                                            {isVisible('batch_details') && <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{row.batch_details}</td>}
                                            {isVisible('remarks') && <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{row.remarks}</td>}
                                            {isVisible('user') && <td style={{ padding: '1rem', fontStyle: 'italic', fontSize: '0.85rem' }}>{row.user}</td>}
                                        </>
                                    )}
                                    {activeTab === 'transitions' && (
                                        <>
                                            {isVisible('date') && <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(row.movement_date).toLocaleString()}</td>}
                                            {isVisible('type') && <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    background: 'var(--bg-glass-heavy)', color: getTypeColor(row.type), padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, border: `1px solid ${getTypeColor(row.type)}40`
                                                }}>{formatType(row.type)}</span>
                                            </td>}
                                            {isVisible('item_name') && <td style={{ padding: '1rem', fontWeight: 600 }}>{row.item_name || row.item?.name}</td>}
                                            {isVisible('quantity') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: getTypeColor(row.type) }}>
                                                {['STORE_TO_KITCHEN', 'WASTAGE', 'BREAKAGE', 'EXPIRED', 'VENDOR_RETURN'].includes(row.type) ? '-' : '+'}{parseFloat(row.quantity).toFixed(3)}
                                            </td>}
                                            {isVisible('reference_id') && <td style={{ padding: '1rem', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{row.reference_id || '—'}</td>}
                                            {isVisible('remarks') && <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.remarks || '—'}</td>}
                                            {isVisible('user') && <td style={{ padding: '1rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>{row.username || row.user || 'System'}</td>}
                                        </>
                                    )}
                                    {activeTab === 'item_summary' && (
                                        <>
                                            {isVisible('item_name') && <td style={{ padding: '1rem', fontWeight: 600 }}>{row.item_name}</td>}
                                            {isVisible('purchased_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.purchased_qty || 0).toFixed(2)}</td>}
                                            {isVisible('purchased_value') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--status-success-text-vibrant)' }}>₹{parseFloat(row.purchased_value || 0).toFixed(2)}</td>}
                                            {isVisible('pushed_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.pushed_qty || 0).toFixed(2)}</td>}
                                            {isVisible('pushed_value') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.pushed_value || 0).toFixed(2)}</td>}
                                            {isVisible('vendor_returned_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.vendor_returned_qty || 0).toFixed(2)}</td>}
                                            {isVisible('vendor_returned_value') && <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--status-error-text-vibrant)' }}>₹{parseFloat(row.vendor_returned_value || 0).toFixed(2)}</td>}
                                            {isVisible('adjusted_qty') && <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(row.adjusted_qty || 0).toFixed(2)}</td>}
                                            {isVisible('adjusted_value') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.adjusted_value || 0).toFixed(2)}</td>}
                                            {isVisible('remaining_qty') && <td style={{ padding: '1rem', textAlign: 'right', color: row.remaining_qty > 0 ? 'var(--status-warning-text-vibrant)' : 'inherit' }}>{parseFloat(row.remaining_qty || 0).toFixed(2)}</td>}
                                            {isVisible('remaining_value') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.remaining_value || 0).toFixed(2)}</td>}
                                        </>
                                    )}
                                    {activeTab === 'vendor_returns' && (
                                        <>
                                            {isVisible('return_date') && <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.return_date || 'N/A'}</td>}
                                            {isVisible('vendor_name') && <td style={{ padding: '1rem', fontWeight: 600 }}>{row.vendor_name}</td>}
                                            {isVisible('pr_number') && <td style={{ padding: '1rem', color: 'var(--color-primary)' }}>{row.pr_number}</td>}
                                            {isVisible('item_name') && <td style={{ padding: '1rem', fontWeight: 600 }}>{row.item_name}</td>}
                                            {isVisible('return_qty') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{parseFloat(row.return_qty || 0).toFixed(2)}</td>}
                                            {isVisible('unit_price') && <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(row.unit_price || 0).toFixed(2)}</td>}
                                            {isVisible('return_value') && <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--status-error-text-vibrant)' }}>₹{parseFloat(row.return_value || 0).toFixed(2)}</td>}
                                            {isVisible('reason') && <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{row.reason}</td>}
                                            {isVisible('action_by') && <td style={{ padding: '1rem', fontStyle: 'italic', fontSize: '0.85rem' }}>{row.action_by}</td>}
                                        </>
                                    )}
                                </tr>
                            ))
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

export default ComprehensiveAudit;
