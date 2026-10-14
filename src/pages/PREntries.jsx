import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const toLocalDateString = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

const getWeekDateRange = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d);
    start.setDate(diff);
    const end = new Date(d);
    end.setDate(diff + 6);
    return {
        start: toLocalDateString(start),
        end: toLocalDateString(end)
    };
};

const getInitialFilters = () => ({
    pr_reference: '',
    status: '',
    vendor: '',
    order_date: '',
    delivery_date_after: getWeekDateRange().start,
    delivery_date_before: getWeekDateRange().end,
    invoice_number: '',
    purchase_type: '',
    category: '',
});

const PREntries = () => {
    const { hasPermission, user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingOrder, setEditingOrder] = useState(null);
    const [viewingReceiptsOrder, setViewingReceiptsOrder] = useState(null);
    const [filters, setFilters] = useState(getInitialFilters());
    // Applied filters are what actually trigger the API call
    const [appliedFilters, setAppliedFilters] = useState(getInitialFilters());

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [grandTotalReceived, setGrandTotalReceived] = useState(0);
    const [nextUrl, setNextUrl] = useState(null);
    const [prevUrl, setPrevUrl] = useState(null);
    const isAdmin = user?.is_superuser || ['Admin', 'Super Admin'].includes(user?.profile?.role_details?.name);

    const fetchOrders = useCallback(async (currentFilters = appliedFilters, page = currentPage, size = pageSize) => {
        try {
            setLoading(true);
            const params = {
                ...currentFilters,
                page,
                page_size: size
            };

            const data = await api.getPurchaseRequests(params);
            
            // Handle both paginated and non-paginated responses for safety
            if (data && data.results !== undefined) {
                setOrders(data.results);
                setTotalCount(data.count || 0);
                setNextUrl(data.next);
                setPrevUrl(data.previous);
                if (data.grand_total_received !== undefined) {
                    setGrandTotalReceived(data.grand_total_received);
                } else {
                    setGrandTotalReceived(0);
                }
            } else {
                setOrders(data || []);
                setTotalCount(data ? data.length : 0);
                setNextUrl(null);
                setPrevUrl(null);
                setGrandTotalReceived(0);
            }
            
            setLoading(false);
        } catch (err) {
            console.error("Error fetching purchase requests", err);
            setLoading(false);
        }
    }, [appliedFilters, currentPage, pageSize]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchOrders(appliedFilters, newPage, pageSize);
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
        fetchOrders(appliedFilters, 1, newSize);
    };

    const fetchVendors = useCallback(async () => {
        try {
            const data = await api.getVendors();
            setVendors(data);
        } catch (err) {
            console.error("Error fetching vendors", err);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const data = await api.getCategories();
            setCategories(data);
        } catch (err) {
            console.error("Error fetching categories", err);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchOrders(), fetchVendors(), fetchCategories()]);
        };
        init();
    }, [fetchOrders, fetchVendors, fetchCategories]);

    const handleDeleteOrder = async (order) => {
        const isDraft = order.status === 'DRAFT';
        const msg = isDraft 
            ? 'Are you sure you want to delete this purchase request?' 
            : `⚠️ WARNING: This PR is in ${order.status} state. \n\nDeleting it will:\n- Subtract received items from Inventory\n- Delete all linked Stock Batches\n- Revert Kitchen Allocations (creating a deficit)\n- Delete uploaded bill files\n\nThis action cannot be undone. Are you absolutely sure?`;

        if (window.confirm(msg)) {
            try {
                await api.deletePurchaseRequest(order.id);
                fetchOrders();
            } catch (err) {
                console.error("Error deleting PR", err);
                const errorMsg = err.response?.data?.error || err.message || 'Failed to delete purchase request';
                alert('Error: ' + errorMsg);
            }
        }
    };

    const handleUpdateOrder = async (e) => {
        e.preventDefault();
        
        // Find the original order to check for status changes
        const originalOrder = orders.find(o => o.id === editingOrder.id);
        const wasReceived = originalOrder && ['RECEIVED', 'COMPLETED'].includes(originalOrder.status);
        const willBeReset = !['RECEIVED', 'COMPLETED'].includes(editingOrder.status);

        if (wasReceived && willBeReset && isAdmin) {
            const confirmMsg = `⚠️ WARNING: Changing status from ${originalOrder.status} to ${editingOrder.status} will REVERT all inventory updates, delete stock batches, and remove linked bill files for this PR.\n\nAre you sure you want to proceed with this status override?`;
            if (!window.confirm(confirmMsg)) return;
        }

        try {
            await api.updatePurchaseRequest(editingOrder.id, {
                pr_reference: editingOrder.pr_reference,
                vendor: editingOrder.vendor,
                order_date: editingOrder.order_date,
                delivery_date: editingOrder.delivery_date,
                status: editingOrder.status,
                items: editingOrder.items
            });
            setEditingOrder(null);
            fetchOrders();
            alert('Purchase Request updated successfully!');
        } catch (err) {
            console.error("Error updating PR", err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to update purchase request';
            alert('Error: ' + errorMsg);
        }
    };

    const updateItem = (itemId, field, value) => {
        setEditingOrder({
            ...editingOrder,
            items: editingOrder.items.map(item => 
                item.id === itemId ? { ...item, [field]: value } : item
            )
        });
    };

    const handleReceiveClick = (order) => {
        navigate(`/procurement/pr-entries/receive/${order.id}`);
    };



    const handleShortClose = async (id) => {
        if (window.confirm('Are you sure you want to short-close this PR? It will be marked as Completed and no further items can be received.')) {
            try {
                await api.shortClosePurchaseRequest(id);
                fetchOrders();
                alert('Purchase Request short-closed successfully!');
            } catch (err) {
                console.error("Error short-closing PR", err);
                alert(err.error || 'Failed to short-close purchase request');
            }
        }
    };

    const handleRevertStatus = async (id) => {
        if (window.confirm('This will undo all receipts and return items from inventory. Are you sure?')) {
            try {
                await api.revertPRStatus(id);
                fetchOrders();
                alert('Purchase Request reverted to PLACED successfully!');
            } catch (err) {
                console.error("Error reverting PR", err);
                alert('Failed to revert purchase request');
            }
        }
    };
    const handleSubmitForApproval = async (id) => {
        if (window.confirm('Submit this PR for approval?')) {
            try {
                await api.submitPRForApproval(id);
                fetchOrders();
            } catch (err) {
                alert(err.error || 'Failed to submit for approval');
            }
        }
    };

    const handleApproveL1 = async (id) => {
        if (window.confirm('Approve this PR (Level 1)?')) {
            try {
                await api.approvePRL1(id);
                fetchOrders();
            } catch (err) {
                alert(err.error || 'Failed to approve (L1)');
            }
        }
    };

    const handleApproveL2 = async (id) => {
        if (window.confirm('Approve this PR (Level 2)? This will mark it as PLACED.')) {
            try {
                await api.approvePRL2(id);
                fetchOrders();
            } catch (err) {
                alert(err.error || 'Failed to approve (L2)');
            }
        }
    };

    const handleRejectApproval = async (id) => {
        if (window.confirm('Reject this PR back to Draft?')) {
            try {
                await api.rejectPRApproval(id);
                fetchOrders();
            } catch (err) {
                alert(err.error || 'Failed to reject');
            }
        }
    };

    const handleDeleteReceiptFile = async (fileId) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            try {
                await api.deleteReceiptFile(fileId);
                // Refresh the current order in the modal
                const updatedOrder = await api.getPurchaseRequest(viewingReceiptsOrder.id);
                setViewingReceiptsOrder(updatedOrder);
                fetchOrders(); // Refresh the main list too
            } catch (err) {
                console.error("Error deleting file", err);
                alert("Failed to delete file.");
            }
        }
    };

    const handleUploadMoreFiles = async (receiptId, files) => {
        if (!files || files.length === 0) return;
        
        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        try {
            await api.uploadReceiptFiles(receiptId, formData);
            // Refresh the current order in the modal
            const updatedOrder = await api.getPurchaseRequest(viewingReceiptsOrder.id);
            setViewingReceiptsOrder(updatedOrder);
            fetchOrders(); // Refresh the main list too
        } catch (err) {
            console.error("Error uploading files", err);
            alert("Failed to upload files.");
        }
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            DRAFT: { bg: 'var(--status-draft-bg)', color: 'var(--status-draft-text)' },
            AWAITING_L1: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' },
            AWAITING_L2: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' },
            AWAITING_APPROVAL: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' },
            PLACED: { bg: 'var(--status-info-bg)', color: 'var(--status-info-text)' },
            RECEIVED: { bg: 'var(--status-accent-bg)', color: 'var(--status-accent-text)' },
            COMPLETED: { bg: 'var(--status-success-bg)', color: 'var(--status-success-text-vibrant)' },
            CANCELLED: { bg: 'var(--status-error-bg)', color: 'var(--status-error-text-vibrant)' },
        };
        const labels = {
            DRAFT: 'Draft',
            AWAITING_L1: '⏳ Awaiting L1',
            AWAITING_L2: '⏳ Awaiting L2',
            AWAITING_APPROVAL: '⏳ Awaiting Approval',
            PLACED: 'Placed',
            RECEIVED: 'Partial',
            COMPLETED: 'Completed',
            CANCELLED: 'Cancelled',
        };
        const s = statusColors[status] || statusColors.DRAFT;
        return (
            <span style={{ padding: '0.25rem 0.7rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, background: s.bg, color: s.color }}>
                {labels[status] || status}
            </span>
        );
    };


    const handleExportExcel = async () => {
        try {
            const blob = await api.exportPurchaseRequests(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PR_Entries_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Error exporting excel", err);
            alert('Failed to export Excel');
        }
    };

    if (loading) return <div className="main-container">Loading entries...</div>;

    return (
        <div className="main-container">
            <header className="welcome-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Purchase Request Entries</h1>
                    <p>View, edit, and manage your procurement records.</p>
                </div>
                <button 
                    className="secondary-btn" 
                    onClick={() => navigate('/procurement/opex-entries/new')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                >
                    <span>💳</span> Group Multi-PR OPEX
                </button>
            </header>

            {/* Grand Total Indicator */}
            {(appliedFilters.delivery_date_after || appliedFilters.delivery_date_before) && grandTotalReceived > 0 && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <div className="glass" style={{ padding: '1rem 2rem', borderLeft: '4px solid var(--status-success-bg)', display: 'inline-block' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>GRAND TOTAL RECEIVED</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success-text-vibrant)' }}>
                            ₹{parseFloat(grandTotalReceived).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div className="responsive-grid" style={{ 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                    gap: '1.5rem', 
                    alignItems: 'end' 
                }}>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PR REFERENCE</label>
                        <input 
                            type="text" 
                            placeholder="Search..."
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.pr_reference}
                            onChange={(e) => setFilters({...filters, pr_reference: e.target.value})}
                        />
                    </div>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.status}
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                        >
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="AWAITING_APPROVAL">Awaiting Approval(s)</option>
                            <option value="PLACED">Placed</option>
                            <option value="RECEIVED">Partially Received</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>VENDOR</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.vendor}
                            onChange={(e) => setFilters({...filters, vendor: e.target.value})}
                        >
                            <option value="">All Vendors</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CATEGORY</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.category}
                            onChange={(e) => setFilters({...filters, category: e.target.value})}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ORDER DATE</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.order_date}
                            onChange={(e) => setFilters({...filters, order_date: e.target.value})}
                        />
                    </div>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DELIVERY FROM</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.delivery_date_after}
                            onChange={(e) => setFilters({...filters, delivery_date_after: e.target.value})}
                        />
                    </div>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DELIVERY TO</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.delivery_date_before}
                            onChange={(e) => setFilters({...filters, delivery_date_before: e.target.value})}
                        />
                    </div>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>INVOICE NO</label>
                        <input 
                            type="text" 
                            placeholder="Search..."
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.invoice_number}
                            onChange={(e) => setFilters({...filters, invoice_number: e.target.value})}
                        />
                    </div>
                    <div className="form-group-stack">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PURCHASE TYPE</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={filters.purchase_type}
                            onChange={(e) => setFilters({...filters, purchase_type: e.target.value})}
                        >
                            <option value="">All Types</option>
                            <option value="REGULAR">Regular Purchase</option>
                            <option value="SPECIAL_EVENT">Special Event</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                        <button 
                            className="action-btn" 
                            onClick={() => { 
                                setCurrentPage(1); 
                                setAppliedFilters(filters); 
                            }}
                            style={{ flex: 1, minWidth: '100px' }}
                        >
                            Filter
                        </button>
                        <button 
                            className="secondary-btn" 
                            onClick={() => {
                                const reset = getInitialFilters();
                                setFilters(reset);
                                setAppliedFilters(reset);
                                setCurrentPage(1);
                            }}
                            style={{ flex: 1, minWidth: '100px' }}
                        >
                            Reset
                        </button>
                        <button 
                            className="action-btn" 
                            style={{ 
                                background: 'var(--status-success-text-vibrant)', 
                                flex: 1, 
                                minWidth: '110px' 
                            }}
                            onClick={handleExportExcel}
                            title="Export filtered entries to Excel"
                        >
                            📄 Export
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass" style={{ padding: '2rem' }}>
                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                                <th style={{ padding: '0.6rem' }}>PR REFERENCE</th>
                                <th style={{ padding: '0.6rem' }}>TYPE / EVENT</th>
                                <th style={{ padding: '0.6rem' }}>INVOICE NO</th>
                                <th style={{ padding: '0.6rem' }}>VENDOR</th>
                                <th style={{ padding: '0.6rem' }}>ORDER DATE</th>
                                <th className="mobile-hide" style={{ padding: '0.6rem' }}>DELIVERY</th>
                                <th style={{ padding: '0.6rem' }}>STATUS</th>
                                 <th style={{ padding: '0.6rem' }}>TOTAL</th>
                                 <th style={{ padding: '0.6rem' }}>ACTIONS</th>
                            </tr>
                        </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem' }}>
                                <td style={{ padding: '0.6rem', fontWeight: 600 }}>
                                    <button 
                                        onClick={() => navigate('/procurement/pr-entries/fulfillment/' + order.id)}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            color: 'var(--color-primary)', 
                                            cursor: 'pointer', 
                                            padding: 0,
                                            textAlign: 'left',
                                            fontWeight: 'inherit',
                                            textDecoration: 'none',
                                            transition: 'all 0.2s ease'
                                        }}
                                        className="pr-link"
                                    >
                                        {order.pr_reference}
                                    </button>
                                </td>
                                <td style={{ padding: '0.6rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: order.purchase_type === 'SPECIAL_EVENT' ? 'var(--color-secondary)' : 'var(--text-muted)' }}>
                                        {order.purchase_type === 'SPECIAL_EVENT' ? 'EVENT' : 'REGULAR'}
                                    </div>
                                    {order.event_name && <div style={{ fontSize: '0.7rem', color: 'var(--text-main)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.event_name}>{order.event_name}</div>}
                                </td>
                                <td style={{ padding: '0.6rem', fontSize: '0.8rem' }}>
                                    {order.receipts && order.receipts.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                            {Array.from(new Set(order.receipts.map(r => r.invoice_number).filter(n => n && n.trim() !== ''))).map((inv, idx) => (
                                                <span key={idx} style={{ 
                                                    background: 'rgba(255, 255, 255, 0.1)', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border-glass)',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {inv}
                                                </span>
                                            ))}
                                            {order.receipts.every(r => !r.invoice_number || r.invoice_number.trim() === '') && '—'}
                                        </div>
                                    ) : '—'}
                                </td>
                                <td style={{ padding: '0.6rem' }}>{order.vendor_name}</td>
                                <td style={{ padding: '0.6rem' }}>{order.order_date}</td>
                                <td className="mobile-hide" style={{ padding: '0.6rem' }}>{order.delivery_date || 'N/A'}</td>
                                <td style={{ padding: '0.6rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {getStatusBadge(order.status)}
                                        {['AWAITING_APPROVAL', 'AWAITING_L1', 'AWAITING_L2', 'PLACED', 'RECEIVED', 'COMPLETED'].includes(order.status) && (
                                            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '1px' }}>
                                                <div style={{ 
                                                    fontSize: '0.6rem', 
                                                    padding: '1px 4px', 
                                                    borderRadius: '3px',
                                                    background: order.approved_by_l1_name ? 'var(--status-success-bg)' : 'var(--bg-glass)',
                                                    color: order.approved_by_l1_name ? 'var(--status-success-text-vibrant)' : 'var(--text-muted)',
                                                    border: `1px solid ${order.approved_by_l1_name ? 'var(--status-success-bg)' : 'var(--border-glass)'}`,
                                                    cursor: order.approved_at_l1 ? 'help' : 'default'
                                                }} title={order.approved_at_l1 ? `Approved by ${order.approved_by_l1_name} on ${new Date(order.approved_at_l1).toLocaleString()}` : 'Awaiting Level 1'}>
                                                    {order.approved_by_l1_name ? `L1: ${order.approved_by_l1_name}` : 'L1?'}
                                                </div>
                                                <div style={{ 
                                                    fontSize: '0.6rem', 
                                                    padding: '1px 4px', 
                                                    borderRadius: '3px',
                                                    background: order.approved_by_l2_name ? 'var(--status-success-bg)' : 'var(--bg-glass)',
                                                    color: order.approved_by_l2_name ? 'var(--status-success-text-vibrant)' : 'var(--text-muted)',
                                                    border: `1px solid ${order.approved_by_l2_name ? 'var(--status-success-bg)' : 'var(--border-glass)'}`,
                                                    cursor: order.approved_at_l2 ? 'help' : 'default'
                                                }} title={order.approved_at_l2 ? `Approved by ${order.approved_by_l2_name} on ${new Date(order.approved_at_l2).toLocaleString()}` : 'Awaiting Level 2'}>
                                                    {order.approved_by_l2_name ? `L2: ${order.approved_by_l2_name}` : 'L2?'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                 <td style={{ padding: '0.6rem' }}>
                                     <div style={{ fontWeight: 600 }}>₹{parseFloat(order.total_amount).toFixed(2)}</div>
                                     <div style={{ fontSize: '0.7rem', color: 'var(--status-success-text-vibrant)' }}>Rec: ₹{parseFloat(order.received_total || 0).toFixed(2)}</div>
                                 </td>
                                 <td style={{ padding: '0.6rem' }}>
                                    {/* Edit - strictly for DRAFT */}
                                    {order.status === 'DRAFT' && hasPermission('can_edit_po') && (
                                        <button 
                                            onClick={() => setEditingOrder(order)}
                                            style={{ marginRight: '0.5rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}
                                        >
                                            Edit
                                        </button>
                                    )}
                                    {/* Delete option removed completely to maintain PR numbering continuity */}
                                    {/* Submit for Approval - DRAFT only */}
                                    {order.status === 'DRAFT' && hasPermission('can_place_po') && (
                                        <button 
                                            onClick={() => handleSubmitForApproval(order.id)}
                                            style={{ marginRight: '0.5rem', background: 'none', border: 'none', color: 'var(--status-pending-text)', cursor: 'pointer', fontWeight: 600 }}
                                            title="Submit for L1 approval"
                                        >
                                            🚀 Submit
                                        </button>
                                    )}
                                    {/* Approval Buttons - Parallel Support */}
                                    {['AWAITING_APPROVAL', 'AWAITING_L1', 'AWAITING_L2'].includes(order.status) && (
                                        <>
                                            {hasPermission('can_approve_pr_l1') && !order.approved_by_l1_name && (
                                                <button 
                                                    onClick={() => handleApproveL1(order.id)}
                                                    style={{ marginRight: '0.5rem', background: 'none', border: 'none', color: 'var(--status-success-text-vibrant)', cursor: 'pointer', fontWeight: 600 }}
                                                    title="Approve Level 1"
                                                >
                                                    ✅ L1
                                                </button>
                                            )}
                                            {hasPermission('can_approve_pr_l2') && !order.approved_by_l2_name && (
                                                <button 
                                                    onClick={() => handleApproveL2(order.id)}
                                                    style={{ marginRight: '0.5rem', background: 'none', border: 'none', color: 'var(--status-success-text-vibrant)', cursor: 'pointer', fontWeight: 600 }}
                                                    title="Approve Level 2"
                                                >
                                                    ✅ L2
                                                </button>
                                            )}
                                            {(hasPermission('can_approve_pr_l1') || hasPermission('can_approve_pr_l2')) && (
                                                <button 
                                                    onClick={() => handleRejectApproval(order.id)}
                                                    style={{ marginRight: '0.5rem', background: 'none', border: 'none', color: 'var(--status-error-text-vibrant)', cursor: 'pointer', fontWeight: 600 }}
                                                    title="Reject back to Draft"
                                                >
                                                    ❌ Reject
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {/* Receive - only PLACED or RECEIVED */}
                                    {['PLACED', 'RECEIVED'].includes(order.status) && hasPermission('can_confirm_receive') && (
                                        <button 
                                            onClick={() => handleReceiveClick(order)}
                                            style={{ marginRight: '0.5rem', background: 'none', border: 'none', color: 'var(--status-success-text-vibrant)', cursor: 'pointer' }}
                                            title="Confirm receiving material"
                                        >
                                            Receive
                                        </button>
                                    )}

                                    {/* Short Close Action - directly from list */}
                                    {['PLACED', 'RECEIVED'].includes(order.status) && hasPermission('can_confirm_receive') && (
                                        <button 
                                            onClick={() => handleShortClose(order.id)}
                                            style={{ marginRight: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                            title="Force complete this PR (Short Close)"
                                        >
                                            Close
                                        </button>
                                    )}

                                    {/* Continue editing draft */}
                                    {order.status === 'DRAFT' && hasPermission('can_place_po') && (
                                        <button 
                                            onClick={() => window.location.href = `/food_tracker/procurement/pr?edit=${order.id}`}
                                            style={{ marginRight: '0.5rem', background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600 }}
                                            title="Continue editing draft"
                                        >
                                            📝 Continue
                                        </button>
                                    )}
                                    {['AWAITING_L1', 'AWAITING_L2', 'PLACED', 'RECEIVED', 'COMPLETED'].includes(order.status) && (hasPermission('can_generate_po') || hasPermission('can_approve_pr_l1') || hasPermission('can_approve_pr_l2')) && (
                                        <button 
                                            onClick={() => window.open(`/food_tracker/procurement/po/${order.id}`, '_blank')}
                                            style={{ marginLeft: '1rem', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
                                            title="Print Purchase Order"
                                        >
                                            🖨️ PO
                                        </button>
                                    )}
                                    {/* View Documents - only if there are receipts */}
                                    {order.receipts && order.receipts.length > 0 && (
                                        <button 
                                            onClick={() => setViewingReceiptsOrder(order)}
                                            style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                                            title="View receipt documents"
                                        >
                                            📄 Docs
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        padding: '1.5rem 1rem 0.5rem',
                        borderTop: '1px solid var(--border-glass)',
                        marginTop: '1rem'
                    }}>
                        {/* Left — entry count */}
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Showing{' '}
                            <strong style={{ color: 'var(--text-main)' }}>
                                {Math.min((currentPage - 1) * pageSize + 1, totalCount)}
                            </strong>
                            –
                            <strong style={{ color: 'var(--text-main)' }}>
                                {Math.min(currentPage * pageSize, totalCount)}
                            </strong>
                            {' '}of{' '}
                            <strong style={{ color: 'var(--color-primary)' }}>{totalCount}</strong> entries
                        </div>

                        {/* Center — page buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                                className="secondary-btn"
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                disabled={currentPage <= 1}
                                onClick={() => handlePageChange(1)}
                                title="First Page"
                            >
                                ⟪
                            </button>
                            <button
                                className="secondary-btn"
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                disabled={!prevUrl}
                                onClick={() => handlePageChange(currentPage - 1)}
                                title="Previous Page"
                            >
                                ◀
                            </button>

                            {/* Page number buttons */}
                            {(() => {
                                const totalPages = Math.ceil(totalCount / pageSize);
                                const pages = [];
                                let startP = Math.max(1, currentPage - 2);
                                let endP = Math.min(totalPages, currentPage + 2);
                                if (currentPage <= 2) endP = Math.min(totalPages, 5);
                                if (currentPage >= totalPages - 1) startP = Math.max(1, totalPages - 4);

                                if (startP > 1) {
                                    pages.push(
                                        <button key={1} className="secondary-btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }} onClick={() => handlePageChange(1)}>1</button>
                                    );
                                    if (startP > 2) pages.push(<span key="dots-start" style={{ color: 'var(--text-muted)', padding: '0 0.25rem' }}>…</span>);
                                }

                                for (let p = startP; p <= endP; p++) {
                                    pages.push(
                                        <button
                                            key={p}
                                            className={p === currentPage ? 'action-btn' : 'secondary-btn'}
                                            style={{
                                                padding: '0.4rem 0.7rem',
                                                fontSize: '0.8rem',
                                                minWidth: '36px',
                                                fontWeight: p === currentPage ? 700 : 400,
                                            }}
                                            onClick={() => handlePageChange(p)}
                                        >
                                            {p}
                                        </button>
                                    );
                                }

                                if (endP < totalPages) {
                                    if (endP < totalPages - 1) pages.push(<span key="dots-end" style={{ color: 'var(--text-muted)', padding: '0 0.25rem' }}>…</span>);
                                    pages.push(
                                        <button key={totalPages} className="secondary-btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }} onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
                                    );
                                }
                                return pages;
                            })()}

                            <button
                                className="secondary-btn"
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                disabled={!nextUrl}
                                onClick={() => handlePageChange(currentPage + 1)}
                                title="Next Page"
                            >
                                ▶
                            </button>
                            <button
                                className="secondary-btn"
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                                onClick={() => handlePageChange(Math.ceil(totalCount / pageSize))}
                                title="Last Page"
                            >
                                ⟫
                            </button>
                        </div>

                        {/* Right — page size selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Rows:</span>
                            <select
                                className="form-input"
                                style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                )}
        </div>

            {editingOrder && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'var(--bg-modal)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(8px)'
                }}>
                    <div className="glass-heavy animate-fade-in" style={{
                        width: '90%', maxWidth: '1000px', maxHeight: '90vh',
                        overflowY: 'auto', padding: '2.5rem', position: 'relative'
                    }}>
                        <button 
                            onClick={() => setEditingOrder(null)}
                            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer' }}
                        >✕</button>
                        
                        <h2 style={{ marginBottom: '2rem' }}>Edit Purchase Request: {editingOrder.pr_reference}</h2>
                        
                        <div className="responsive-grid grid-min-180" style={{ marginBottom: '2rem' }}>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>Vendor</label>
                                <select 
                                    className="form-input" 
                                    style={{ width: '100%' }}
                                    value={editingOrder.vendor}
                                    onChange={(e) => setEditingOrder({...editingOrder, vendor: e.target.value})}
                                >
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>Order Date</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    style={{ width: '100%' }}
                                    value={editingOrder.order_date}
                                    onChange={(e) => setEditingOrder({...editingOrder, order_date: e.target.value})}
                                />
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>Target Delivery</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    style={{ width: '100%' }}
                                    value={editingOrder.delivery_date || ''}
                                    onChange={(e) => setEditingOrder({...editingOrder, delivery_date: e.target.value})}
                                />
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>Status</label>
                                <select 
                                    className="form-input" 
                                    style={{ 
                                        width: '100%',
                                        borderColor: (orders.find(o => o.id === editingOrder.id)?.status !== editingOrder.status && ['RECEIVED', 'COMPLETED'].includes(orders.find(o => o.id === editingOrder.id)?.status) && !['RECEIVED', 'COMPLETED'].includes(editingOrder.status)) ? 'var(--status-error-text-vibrant)' : 'inherit'
                                    }}
                                    value={editingOrder.status}
                                    onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="AWAITING_L1">Awaiting L1 Approval</option>
                                    <option value="AWAITING_L2">Awaiting L2 Approval</option>
                                    <option value="PLACED">Placed</option>
                                    <option value="RECEIVED">Partially Received</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                {(orders.find(o => o.id === editingOrder.id)?.status !== editingOrder.status && ['RECEIVED', 'COMPLETED'].includes(orders.find(o => o.id === editingOrder.id)?.status) && !['RECEIVED', 'COMPLETED'].includes(editingOrder.status)) && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--status-error-text-vibrant)', marginTop: '0.2rem' }}>
                                        ⚠️ Reverts Inventory
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                                        <th style={{ padding: '0.8rem' }}>ITEM</th>
                                        <th style={{ padding: '0.8rem' }}>QTY</th>
                                        <th style={{ padding: '0.8rem' }}>UOM</th>
                                        <th style={{ padding: '0.8rem' }}>PRICE</th>
                                        <th style={{ padding: '0.8rem', width: '120px' }}>DISCOUNT</th>
                                        <th style={{ padding: '0.8rem' }}>TOTAL</th>
                                    </tr>
                                </thead>
                            <tbody>
                                {(editingOrder.items || []).map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <td style={{ padding: '0.8rem' }}>{item.item_name}</td>
                                        <td style={{ padding: '0.8rem' }}>
                                            <input 
                                                type="number" 
                                                className="form-input" 
                                                style={{ width: '80px', padding: '0.4rem' }}
                                                value={item.quantity_ordered}
                                                onChange={(e) => updateItem(item.id, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem' }}>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                style={{ width: '80px', padding: '0.4rem' }}
                                                value={item.unit || ''}
                                                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem' }}>
                                            <input 
                                                type="number" 
                                                className="form-input" 
                                                style={{ width: '100px', padding: '0.4rem' }}
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <div className="discount-toggle">
                                                    <button 
                                                        className={`toggle-opt ${item.discount_type === 'PERCENTAGE' ? 'active' : ''}`}
                                                        onClick={() => updateItem(item.id, 'discount_type', 'PERCENTAGE')}
                                                    >
                                                        %
                                                    </button>
                                                    <button 
                                                        className={`toggle-opt ${item.discount_type === 'AMOUNT' ? 'active' : ''}`}
                                                        onClick={() => updateItem(item.id, 'discount_type', 'AMOUNT')}
                                                    >
                                                        ₹
                                                    </button>
                                                </div>
                                                <input 
                                                    type="number" 
                                                    className="form-input" 
                                                    style={{ width: '80px', padding: '0.3rem', fontSize: '0.8rem' }} 
                                                    value={item.discount_value}
                                                    onChange={(e) => updateItem(item.id, 'discount_value', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.8rem' }}>
                                            {(() => {
                                                const base = item.quantity_ordered * item.unit_price;
                                                const disc = item.discount_type === 'PERCENTAGE' ? (base * item.discount_value / 100) : item.discount_value;
                                                return `₹${(base - disc).toFixed(2)}`;
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Estimated Total</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                                    ₹{(editingOrder.items || []).reduce((acc, item) => {
                                        const base = item.quantity_ordered * item.unit_price;
                                        const disc = item.discount_type === 'PERCENTAGE' ? (base * item.discount_value / 100) : item.discount_value;
                                        return acc + (base - disc);
                                    }, 0).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="secondary-btn" onClick={() => setEditingOrder(null)}>Cancel</button>
                            <button className="action-btn" onClick={handleUpdateOrder}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}


            {/* View Receipts/Documents Modal */}
            {viewingReceiptsOrder && (
                <div className="modal-overlay" onClick={() => setViewingReceiptsOrder(null)}>
                    <div className="modal-content" style={{ width: '900px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)' }}>
                                📄 Receipt Documents
                                <span style={{ marginLeft: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                    {viewingReceiptsOrder.pr_reference}
                                </span>
                            </h2>
                            <button 
                                className="secondary-btn" 
                                style={{ padding: '0.4rem 0.8rem', borderRadius: '50%' }} 
                                onClick={() => setViewingReceiptsOrder(null)}
                            >
                                ✕
                            </button>
                        </div>

                        {viewingReceiptsOrder.receipts && viewingReceiptsOrder.receipts.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {viewingReceiptsOrder.receipts.map((receipt, index) => (
                                    <div key={receipt.id} style={{ 
                                        background: 'var(--bg-glass)', 
                                        padding: '1.25rem', 
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-glass)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                    Receipt #{index + 1}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                    Received on: <strong>{new Date(receipt.purchase_date).toLocaleDateString('en-GB')}</strong>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                {receipt.invoice_number && (
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice No</div>
                                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{receipt.invoice_number}</div>
                                                    </div>
                                                )}
                                                <label className="secondary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <span style={{ fontSize: '1.1rem' }}>+</span> Upload
                                                    <input 
                                                        type="file" 
                                                        multiple 
                                                        hidden 
                                                        accept="image/*,.pdf"
                                                        onChange={(e) => handleUploadMoreFiles(receipt.id, e.target.files)} 
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {receipt.files && receipt.files.length > 0 ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                                {receipt.files.map((file, fIndex) => {
                                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.file);
                                                    let fileUrl = file.file;
                                                    if (fileUrl.startsWith('http://')) {
                                                        fileUrl = fileUrl.replace('http://', 'https://');
                                                    } else if (!fileUrl.startsWith('https://')) {
                                                        // Handle relative paths correctly if needed, or assume it's missing protocol
                                                        if (fileUrl.startsWith('/')) {
                                                            fileUrl = window.location.origin + fileUrl;
                                                            if (fileUrl.startsWith('http://')) {
                                                                fileUrl = fileUrl.replace('http://', 'https://');
                                                            }
                                                        } else {
                                                            fileUrl = `https://${fileUrl.replace(/^\/\//, '')}`;
                                                        }
                                                    }
                                                    return (
                                                        <div key={file.id} style={{ 
                                                            border: '1px solid var(--border-glass)', 
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            transition: 'transform 0.2s',
                                                            position: 'relative'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                        >
                                                            {/* Delete Button */}
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteReceiptFile(file.id);
                                                                }}
                                                                style={{ 
                                                                    position: 'absolute', 
                                                                    top: '5px', 
                                                                    right: '5px', 
                                                                    background: 'rgba(255,0,0,0.7)', 
                                                                    color: 'white', 
                                                                    border: 'none', 
                                                                    borderRadius: '4px', 
                                                                    width: '24px', 
                                                                    height: '24px', 
                                                                    cursor: 'pointer',
                                                                    zIndex: 10,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '14px'
                                                                }}
                                                                title="Delete this document"
                                                            >
                                                                ✕
                                                            </button>

                                                            <div onClick={() => window.open(fileUrl, '_blank')} style={{ cursor: 'pointer' }}>
                                                                {isImage ? (
                                                                    <img 
                                                                        src={fileUrl} 
                                                                        alt={`Receipt File`}
                                                                        style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                                                                    />
                                                                ) : (
                                                                    <div 
                                                                        style={{ height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                                                    >
                                                                        <span style={{ fontSize: '2.5rem' }}>📄</span>
                                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PDF / Document</span>
                                                                    </div>
                                                                )}
                                                                <div style={{ 
                                                                    padding: '0.6rem', 
                                                                    fontSize: '0.75rem', 
                                                                    textAlign: 'center', 
                                                                    background: 'var(--bg-glass)',
                                                                    borderTop: '1px solid var(--border-glass)',
                                                                    fontWeight: 600,
                                                                    color: 'var(--color-primary)'
                                                                }}>
                                                                    View Document {fIndex + 1}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                                                No documents uploaded for this receipt.
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.5 }}>📂</div>
                                <div style={{ fontSize: '1.1rem' }}>No receipt documents found for this order.</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
                            <button className="action-btn" onClick={() => setViewingReceiptsOrder(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PREntries;
