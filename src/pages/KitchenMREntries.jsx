import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const KitchenMREntries = () => {
    const { hasPermission, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState({}); // Map of itemId -> stock quantity
    const [filters, setFilters] = useState({
        status: '',
        mr_number: '',
        from_date: '',
        to_date: '',
    });
    // Separate local state for text inputs — prevents fetch on every keystroke
    const [inputValues, setInputValues] = useState({
        mr_number: '',
        status: '',
        from_date: '',
        to_date: '',
    });
    const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
    const [selectedMR, setSelectedMR] = useState(null);
    const [returningQuantities, setReturningQuantities] = useState({});
    const [finalUserCount, setFinalUserCount] = useState(0);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [nextUrl, setNextUrl] = useState(null);
    const [prevUrl, setPrevUrl] = useState(null);

    const fetchRequests = useCallback(async (currentFilters, page, size) => {
        try {
            setLoading(true);
            console.log('Fetching MRs with params:', currentFilters);
            const params = { page, page_size: size };
            if (currentFilters.status) params.status = currentFilters.status;
            if (currentFilters.mr_number) params.mr_number = currentFilters.mr_number;
            if (currentFilters.from_date) params.from_date = currentFilters.from_date;
            if (currentFilters.to_date) params.to_date = currentFilters.to_date;

            const data = await api.getMaterialRequests(params);
            setRequests(data.results || []);
            setTotalCount(data.count || 0);
            setNextUrl(data.next);
            setPrevUrl(data.previous);

            // Also fetch inventory for Procurement side to check fulfillment availability
            if (hasPermission('can_view_stock') || hasPermission('can_manage_mr') || hasPermission('can_place_po')) {
                const response = await api.getInventory({ department_code: 'procurement', page_size: 1000 });
                const invData = response.results || response;
                
                if (Array.isArray(invData)) {
                    const invMap = {};
                    invData.forEach(item => {
                        invMap[item.item] = {
                            quantity: parseFloat(item.current_quantity) || 0,
                            min_stock_level: parseFloat(item.min_stock_level) || 0
                        };
                    });
                    setInventory(invMap);
                }
            }

            setLoading(false);
        } catch (err) {
            console.error("Error fetching material requests", err);
            setLoading(false);
        }
    }, [hasPermission]);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const initialStatus = queryParams.get('status') || '';
        const initialMR = queryParams.get('mr_number') || '';
        const initialFrom = queryParams.get('from_date') || '';
        const initialTo = queryParams.get('to_date') || '';
        
        const initialFilters = { status: initialStatus, mr_number: initialMR, from_date: initialFrom, to_date: initialTo };
        setFilters(initialFilters);
        setInputValues(initialFilters);
        
        fetchRequests(initialFilters, 1, pageSize);
    }, [fetchRequests, location.search, pageSize]);

    const handleAction = async (id, action) => {
        try {
            if (action === 'place') await api.placeMaterialRequest(id);
            else if (action === 'acknowledge') await api.acknowledgeMaterialRequest(id);
            else if (action === 'kitchen_accept') {
                if (!window.confirm("Confirm receipt of all issued items in the kitchen?")) return;
                await api.kitchenAcceptMaterialRequest(id);
            }
            else if (action === 'reject') await api.rejectMaterialRequest(id);
            else if (action === 'confirm_reconcile') await api.confirmReconcileMaterialRequest(id);
            else if (action === 'reconcile') {
                const items = selectedMR.items.map(item => ({
                    id: item.id,
                    returned_quantity: Number((parseFloat(returningQuantities[item.id]) || 0).toFixed(3))
                }));
                await api.reconcileMaterialRequest(id, {
                    items,
                    actual_user_count: finalUserCount
                });
                setIsReconcileModalOpen(false);
            }

            const actionLabel = action === 'reconcile' ? 'Reconciliation submitted' : (action === 'kitchen_accept' ? 'Stock accepted' : (action === 'undo' ? 'Action undone' : action + (action === 'acknowledge' ? 'd' : 'ed')));
            alert(`${actionLabel} successfully!`);
            fetchRequests(filters, currentPage, pageSize);
        } catch (err) {
            console.error(`Error performing ${action} on MR`, err);
            alert(`Failed to ${action.replace('_', ' ')} request: ` + (err.error || JSON.stringify(err)));
        }
    };




    const handleDelete = async (id) => {
        const mr = requests.find(r => r.id === id);
        const isProcessed = mr && ['ISSUED', 'ACCEPTED', 'COMPLETED', 'REJECTED'].includes(mr.status);

        const message = isProcessed
            ? `WARNING: MR ${mr.mr_number} has already been processed. \n\nDeleting this record will automatically REVERT stock levels (restore to Store and remove from Kitchen). \n\nAre you sure you want to PERMANENTLY DELETE this record and undo all its stock movements?`
            : "Are you sure you want to delete this material request?";

        if (window.confirm(message)) {
            try {
                await api.deleteMaterialRequest(id);
                fetchRequests(filters, currentPage, pageSize);
            } catch (err) {
                console.error("Error deleting MR", err);
                alert('Failed to delete request: ' + (err.error || 'Check permissions'));
            }
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'DRAFT': return { background: 'var(--status-draft-bg)', color: 'var(--status-draft-text)' };
            case 'PLACED': return { background: 'var(--status-info-bg)', color: 'var(--status-info-text)' };
            case 'MGMT_APPROVED': return { background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' };
            case 'ISSUED': return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
            case 'ACCEPTED': return { background: 'var(--status-success-bg)', color: 'var(--status-success-text-vibrant)' };
            case 'PENDING_RECONCILE': return { background: 'var(--status-info-bg)', color: 'var(--status-info-text)' };
            case 'COMPLETED': return { background: 'var(--status-accent-bg)', color: 'var(--status-accent-text)' };
            case 'REJECTED': return { background: 'var(--status-error-bg)', color: 'var(--status-error-text-vibrant)' };
            default: return {};
        }
    };


    const totalPages = Math.ceil(totalCount / pageSize);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchRequests(filters, newPage, pageSize);
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
        fetchRequests(filters, 1, newSize);
    };

    if (loading) return <div className="main-container">Loading Kitchen Requests...</div>;

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1>Material Request History</h1>
                <p>Track and manage kitchen material requirements.</p>
            </header>

            <div className="glass responsive-grid grid-min-180" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div className="form-group-stack">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEARCH MR #</label>
                    <input
                        className="form-input"
                        placeholder="Search..."
                        style={{ width: '100%' }}
                        value={inputValues.mr_number}
                        onChange={(e) => setInputValues(prev => ({ ...prev, mr_number: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const newFilters = { ...filters, mr_number: inputValues.mr_number };
                                setFilters(newFilters);
                                setCurrentPage(1);
                                fetchRequests(newFilters, 1, pageSize);
                            }
                        }}
                    />
                </div>
                <div className="form-group-stack">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</label>
                    <select
                        className="form-input"
                        style={{ width: '100%' }}
                        value={inputValues.status}
                        onChange={(e) => {
                            const newFilters = { ...filters, status: e.target.value };
                            setInputValues(prev => ({ ...prev, status: e.target.value }));
                            setFilters(newFilters);
                            setCurrentPage(1);
                            fetchRequests(newFilters, 1, pageSize);
                        }}
                    >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PLACED">Placed</option>
                        <option value="MGMT_APPROVED">Mgmt. Approved</option>
                        <option value="ISSUED">Stock Issued</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
                <div className="form-group-stack">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>FROM DATE</label>
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: '100%' }}
                        value={inputValues.from_date}
                        onChange={(e) => setInputValues(prev => ({ ...prev, from_date: e.target.value }))}
                    />
                </div>
                <div className="form-group-stack">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TO DATE</label>
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: '100%' }}
                        value={inputValues.to_date}
                        onChange={(e) => setInputValues(prev => ({ ...prev, to_date: e.target.value }))}
                    />
                </div>
                <div className="grid-action-align">
                    <div className="mobile-stack-buttons" style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <button className="action-btn" onClick={() => {
                            const newFilters = { ...inputValues };
                            setFilters(newFilters);
                            setCurrentPage(1);
                            fetchRequests(newFilters, 1, pageSize);
                        }} style={{ flex: 1, height: '48px' }}>Filter</button>
                        <button
                            className="secondary-btn"
                            style={{ flex: 1, height: '48px' }}
                            onClick={() => {
                                const reset = { status: '', mr_number: '', from_date: '', to_date: '' };
                                setFilters(reset);
                                setInputValues(reset);
                                setCurrentPage(1);
                                fetchRequests(reset, 1, pageSize);
                            }}
                        >
                            Reset
                        </button>
                        <button
                            className="action-btn"
                            style={{ flex: 1, height: '48px', background: '#2E7D32', color: 'white' }}
                            onClick={async () => {
                                try {
                                    const blob = await api.exportMaterialRequestsExcel(filters);
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Kitchen_MRs_Export.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                } catch (err) {
                                    console.error("Failed to export MRs", err);
                                    alert("Export failed");
                                }
                            }}
                        >
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass table-responsive" style={{ padding: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                            <th style={{ padding: '1rem' }}>MR NUMBER</th>
                            <th style={{ padding: '1rem' }}>MEAL TYPE</th>
                            <th style={{ padding: '1rem' }}>DATES</th>
                            <th style={{ padding: '1rem' }}>STATUS</th>
                            <th style={{ padding: '1rem' }}>REQUESTED BY</th>
                            <th style={{ padding: '1rem' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No material requests found.</td>
                            </tr>
                        ) : requests.map(mr => (
                            <tr key={mr.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                <td style={{ padding: '1rem', fontWeight: 700 }}>{mr.mr_number}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{mr.meal_type}</span>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                    <div>Req: {mr.order_date}</div>
                                    <div style={{ color: 'var(--color-primary)' }}>Target: {mr.target_date}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.3rem 0.8rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        ...getStatusStyle(mr.status)
                                    }}>
                                        {mr.status}
                                    </span>
                                    {mr.is_acknowledged && (
                                        <div style={{ marginTop: '0.4rem' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '10px',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                background: 'var(--status-pending-bg)',
                                                color: 'var(--status-pending-text)',
                                                border: '1px solid var(--status-pending-bg)'
                                            }}>
                                                ACKNOWLEDGED
                                            </span>
                                        </div>
                                    )}
                                    {mr.status === 'PLACED' && mr.items?.some(item => parseFloat(item.quantity) > parseFloat(inventory[item.item]?.quantity || 0)) && (
                                        <div style={{ color: 'var(--status-error-text-vibrant)', fontSize: '0.65rem', marginTop: '0.3rem', fontWeight: 700 }}>
                                            ⚠️ INSUFFICIENT STOCK
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                    {mr.requested_by_username}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {!(mr.status === 'MGMT_APPROVED' && hasPermission('can_manage_mr')) && (
                                            <button
                                                className="secondary-btn"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                onClick={() => navigate(`${location.pathname}/view/${mr.id}`)}
                                            >
                                                View
                                            </button>
                                        )}

                                        {/* Kitchen Actions (Place/Edit available for DRAFT) */}
                                        {mr.status === 'DRAFT' && hasPermission('can_place_mr') && (
                                            <>
                                                <button
                                                    className="action-btn"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--status-info-text)' }}
                                                    onClick={() => handleAction(mr.id, 'place')}
                                                >
                                                    Place
                                                </button>
                                                <button
                                                    className="secondary-btn"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                    onClick={() => navigate(`/kitchen/mr?edit=${mr.id}`)}
                                                >
                                                    Edit
                                                </button>
                                            </>
                                        )}

                                        {/* Procurement Action (Process/Acknowledge/Reject available for PLACED or MGMT_APPROVED) */}
                                        {(mr.status === 'PLACED' || mr.status === 'MGMT_APPROVED') && hasPermission('can_manage_mr') && (
                                            <>
                                                <button
                                                    className="action-btn"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                    onClick={() => navigate(`${location.pathname}/view/${mr.id}`)}
                                                >
                                                    {mr.status === 'PLACED' ? 'Review' : 'Process'}
                                                </button>
                                                {mr.status === 'MGMT_APPROVED' && !mr.is_acknowledged && (
                                                    <button
                                                        className="action-btn"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--status-pending-text)', color: 'var(--bg-main)' }}
                                                        onClick={() => handleAction(mr.id, 'acknowledge')}
                                                    >
                                                        Acknowledge
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#e74c3c' }}
                                                    onClick={() => {
                                                        if (window.confirm("Are you sure you want to REJECT this request?")) {
                                                            handleAction(mr.id, 'reject');
                                                        }
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}

                                        {/* Delete Option Removed for Audit Compliance */}
                                        {/* Kitchen Acceptance Action */}
                                        {mr.status === 'ISSUED' && hasPermission('can_place_mr') && (
                                            <button
                                                className="action-btn"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--status-success-text-vibrant)' }}
                                                onClick={() => handleAction(mr.id, 'kitchen_accept')}
                                            >
                                                Accept Stock
                                            </button>
                                        )}

                                        {/* Reconcile (Kitchen side) */}
                                        {mr.status === 'ACCEPTED' && (hasPermission('can_place_mr') || hasPermission('can_manage_mr')) && (
                                            <button 
                                                className="action-btn" 
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--status-accent-text)' }}
                                                onClick={() => {
                                                    setSelectedMR(mr);
                                                    setFinalUserCount(mr.user_count || 0);
                                                    const initialReturns = {};
                                                    mr.items.forEach(item => initialReturns[item.id] = 0);
                                                    setReturningQuantities(initialReturns);
                                                    setIsReconcileModalOpen(true);
                                                }}
                                            >
                                                Reconcile & Close
                                            </button>
                                        )}



                                        {/* Confirm Reconcile Action (Simple 1-click) */}
                                        {mr.status === 'PENDING_RECONCILE' && hasPermission('can_manage_mr') && (
                                            <button
                                                className="action-btn"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#f39c12', color: 'white' }}
                                                onClick={() => {
                                                    if (window.confirm('Confirm and finalize reconciliation for this Material Request? This will update the Store inventory.')) {
                                                        handleAction(mr.id, 'confirm_reconcile');
                                                    }
                                                }}
                                            >
                                                Confirm Reconcile
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 0 && (
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
                                disabled={currentPage >= totalPages}
                                onClick={() => handlePageChange(totalPages)}
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

            {/* Reconciliation Modal */}
            {isReconcileModalOpen && selectedMR && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                    <div className="glass-heavy animate-fade-in" style={{ width: '90%', maxWidth: '700px', maxHeight: '85vh', padding: '2.5rem', position: 'relative', overflowY: 'auto' }}>
                        <button onClick={() => setIsReconcileModalOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                        <h2>Reconcile: {selectedMR.mr_number}</h2>
                        <div className="glass" style={{ padding: '1.5rem', margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--gradient-1)' }}>
                            <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Count</label><div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{selectedMR.user_count}</div></div>
                            <div style={{ fontSize: '1.5rem', opacity: 0.3 }}>➜</div>
                            <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-primary)' }}>Actual Count</label>
                                <input type="number" className="form-input" style={{ width: '100%', fontSize: '1.2rem', fontWeight: 700 }} value={finalUserCount} onChange={(e) => setFinalUserCount(parseInt(e.target.value) || 0)} min="0" />
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                            <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}><th style={{ padding: '0.8rem' }}>ITEM</th><th style={{ padding: '0.8rem' }}>ISSUED</th><th style={{ padding: '0.8rem' }}>RETURNED</th><th style={{ padding: '0.8rem' }}>CONSUMED</th></tr></thead>
                            <tbody>{selectedMR.items.map(item => {
                                const issued = parseFloat(item.quantity_issued || item.quantity);
                                const returned = parseFloat(returningQuantities[item.id] || 0);
                                const consumed = Math.max(0, issued - returned);
                                return (<tr key={item.id} style={{ borderBottom: '1px solid var(--border-glass)' }}><td style={{ padding: '0.8rem', fontWeight: 600 }}>{item.item_name}</td><td style={{ padding: '0.8rem' }}>{issued}</td><td style={{ padding: '0.8rem' }}><input type="number" className="form-input" style={{ width: '80px', padding: '0.3rem' }} value={returningQuantities[item.id]} onChange={(e) => setReturningQuantities({...returningQuantities, [item.id]: e.target.value})} min="0" max={issued} /></td><td style={{ padding: '0.8rem', color: 'var(--color-primary)', fontWeight: 700 }}>{consumed.toFixed(2)}</td></tr>);
                            })}</tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="secondary-btn" onClick={() => setIsReconcileModalOpen(false)}>Cancel</button>
                            <button className="action-btn" style={{ background: 'var(--status-accent-text)' }} onClick={() => handleAction(selectedMR.id, 'reconcile')}>Submit Reconciliation</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KitchenMREntries;
