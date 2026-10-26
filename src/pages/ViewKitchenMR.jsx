import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const ViewKitchenMR = () => {
    const { id } = useParams();
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState({});
    
    const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
    const [returningQuantities, setReturningQuantities] = useState({});
    const [finalUserCount, setFinalUserCount] = useState(0);
    
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchData, setBatchData] = useState({});
    const [batchLoading, setBatchLoading] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getMaterialRequest(id);
            setRequest(data);
            
            // Initializing reconciliation states if needed
            setFinalUserCount(data.user_count || 0);
            const initialReturns = {};
            data.items.forEach(item => initialReturns[item.id] = 0);
            setReturningQuantities(initialReturns);

            try {
                // Fetch inventory - separate try/catch so it doesn't block main MR loading
                if (hasPermission('can_view_stock') || hasPermission('can_manage_mr') || hasPermission('can_place_po')) {
                    // Fetch a large enough page to ensure all items in the MR are found
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
            } catch (invErr) {
                console.warn("Failed to fetch inventory for fulfillment check:", invErr);
                // Non-blocking error
            }

            setLoading(false);
        } catch (err) {
            console.error("Error fetching MR details:", err);
            alert("Failed to load request details: " + (err.error || "Unknown error"));
            setLoading(false);
        }
    }, [id, hasPermission]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (action) => {
        try {
            if (action === 'place') await api.placeMaterialRequest(id);
            else if (action === 'acknowledge') await api.acknowledgeMaterialRequest(id);
            else if (action === 'kitchen_accept') {
                if (!window.confirm("Confirm receipt of all issued items in the kitchen?")) return;
                await api.kitchenAcceptMaterialRequest(id);
            }
            else if (action === 'reject') await api.rejectMaterialRequest(id);
            else if (action === 'undo') await api.undoMaterialRequest(id);
            else if (action === 'confirm_reconcile') await api.confirmReconcileMaterialRequest(id);

            const actionLabel = action === 'kitchen_accept' ? 'Stock accepted' : (action === 'undo' ? 'Action undone' : action + (action === 'acknowledge' ? 'd' : 'ed'));
            alert(`${actionLabel} successfully!`);
            fetchData();
        } catch (err) {
            console.error(`Error performing ${action} on MR`, err);
            alert(`Failed to ${action.replace('_', ' ')} request: ` + (err.error || JSON.stringify(err)));
        }
    };

    const handleUpdateHeadcount = async (newCount) => {
        try {
            await api.updateMRHeadcount(id, { actual_user_count: newCount });
            alert('Headcount updated successfully!');
            fetchData();
        } catch (err) {
            console.error('Error updating headcount', err);
            alert('Failed to update headcount: ' + (err.error || JSON.stringify(err)));
        }
    };

    const openBatchModal = async () => {
        setBatchLoading(true);
        setIsBatchModalOpen(true);
        try {
            const newBatchData = {};
            for (const mrItem of request.items) {
                const batches = await api.getStockBatches({ 
                    item: mrItem.item,
                    max_date: request.order_date
                });
                let remaining = parseFloat(mrItem.quantity);
                const allocations = {};
                for (const batch of batches) {
                    if (remaining <= 0) break;
                    const available = parseFloat(batch.remaining_quantity);
                    const take = Math.min(remaining, available);
                    allocations[batch.id] = take;
                    remaining -= take;
                }
                newBatchData[mrItem.id] = { batches, allocations };
            }
            setBatchData(newBatchData);
        } catch (err) {
            alert('Failed to load stock batches: ' + (err.error || err.message || 'Unknown error'));
            setIsBatchModalOpen(false);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleBatchAccept = async () => {
        const batchAllocations = [];
        for (const mrItem of request.items) {
            const itemBatchData = batchData[mrItem.id];
            if (!itemBatchData) continue;
            const allocations = [];
            for (const [batchId, qty] of Object.entries(itemBatchData.allocations)) {
                const parsedQty = parseFloat(qty);
                if (parsedQty > 0) {
                    allocations.push({ batch_id: parseInt(batchId), quantity: Number(parsedQty.toFixed(3)) });
                }
            }
            batchAllocations.push({ mr_item_id: mrItem.id, allocations });
        }
        try {
            await api.acceptMaterialRequest(id, batchAllocations);
            alert('Request accepted and stock issued via selected batches!');
            setIsBatchModalOpen(false);
            fetchData();
        } catch (err) {
            alert('Failed to accept: ' + (err.error || JSON.stringify(err)));
        }
    };

    const handleReconcile = async () => {
        try {
            const items = request.items.map(item => ({
                id: item.id,
                returned_quantity: Number((parseFloat(returningQuantities[item.id]) || 0).toFixed(3))
            }));

            await api.reconcileMaterialRequest(id, {
                items,
                actual_user_count: finalUserCount
            });
            alert("Request reconciled and submitted for confirmation!");
            setIsReconcileModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Error reconciling MR", err);
            alert("Failed to reconcile request.");
        }
    };

    const handleGeneratePR = (mode) => {
        const generateItems = [];
        request.items.forEach(item => {
            const reqQty = parseFloat(item.quantity) || 0;
            const invObj = inventory[item.item] || { quantity: 0, min_stock_level: 0 };
            const available = invObj.quantity;
            const minStock = invObj.min_stock_level;

            let purchaseQty = 0;
            if (mode === 'deficit') purchaseQty = Math.max(0, reqQty - available);
            else if (mode === 'deficit_min_stock') purchaseQty = Math.max(0, reqQty - available) + minStock;
            else if (mode === 'original') purchaseQty = reqQty;

            if (purchaseQty > 0) {
                generateItems.push({ id: item.item, quantity: purchaseQty, unit: item.unit });
            }
        });

        if (generateItems.length === 0) {
            alert("No items need to be purchased under this option.");
            return;
        }

        navigate('/procurement/pr', {
            state: { 
                autoFill: { 
                    items: generateItems, 
                    targetDate: request.target_date,
                    orderDate: request.order_date 
                } 
            }
        });
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

    if (loading) return <div className="main-container">Loading Request Details...</div>;
    if (!request) return <div className="main-container">Request not found.</div>;

    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <button 
                        className="secondary-btn" 
                        onClick={() => {
                            if (location.pathname.startsWith('/management/')) navigate('/management/kitchen-requests/history');
                            else if (location.pathname.startsWith('/kitchen/')) navigate('/kitchen/mr-entries');
                            else navigate('/procurement/kitchen-mrs');
                        }} 
                        style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                        ← Back to List
                    </button>
                    <h1>{request.mr_number}</h1>
                    <p>Detailed view of kitchen material requirement.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                        className="action-btn" 
                        onClick={handlePrint}
                        style={{ 
                            background: 'var(--bg-glass)', 
                            border: '1px solid var(--border-glass)',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🖨️</span> Print MR
                    </button>
                    <div style={{
                        padding: '0.5rem 1.2rem',
                        borderRadius: '30px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        ...getStatusStyle(request.status)
                    }}>
                        {request.status.replace('_', ' ')}
                    </div>
                </div>
            </header>

            <div className="responsive-grid grid-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Request Timeline</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div><strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created On</strong> {request.order_date}</div>
                        <div><strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required By (Target)</strong> <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{request.target_date}</span></div>
                    </div>
                </div>
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Meal Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div><strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meal Type</strong> {request.meal_type}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Head Count</strong>
                                {request.user_count || 0}
                            </div>
                            <div>
                                <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Head Count</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{request.actual_user_count !== null ? request.actual_user_count : 'Not Set'}</span>
                                    {request.status === 'COMPLETED' && hasPermission('can_manage_mr') && (
                                        <button 
                                            onClick={() => {
                                                const newCount = prompt('Enter new actual headcount:', request.actual_user_count !== null ? request.actual_user_count : (request.user_count || 0));
                                                if (newCount !== null && newCount !== '' && !isNaN(parseInt(newCount))) {
                                                    handleUpdateHeadcount(parseInt(newCount));
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--status-info-text)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', padding: 0 }}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Personnel</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div><strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requested By</strong> {request.requested_by_username}</div>
                        {request.action_by_username && <div><strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Processed By</strong> {request.action_by_username}</div>}
                    </div>
                </div>
            </div>

            {request.mgmt_remarks && (
                <div style={{
                    marginBottom: '2rem',
                    padding: '1.2rem',
                    background: 'var(--status-error-bg)',
                    border: '1px solid var(--status-error-text-vibrant)',
                    borderRadius: '12px'
                }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--status-error-text-vibrant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Management Correction Required</p>
                    <p style={{ margin: '0.5rem 0 0', fontWeight: 600, fontSize: '1rem' }}>{request.mgmt_remarks}</p>
                </div>
            )}

            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Material List</h3>
                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '0.5rem 1rem' }}>Item Description</th>
                                <th style={{ padding: '0.5rem 1rem' }}>Kitchen Original</th>
                                <th style={{ padding: '0.5rem 1rem' }}>Revised Req</th>
                                <th style={{ padding: '0.5rem 1rem' }}>Adj. Reason</th>
                                <th style={{ padding: '0.5rem 1rem' }}>Issued</th>
                                <th style={{ padding: '0.5rem 1rem' }}>Returned</th>
                                <th style={{ padding: '0.5rem 1rem' }}>Store Stock</th>
                                <th style={{ padding: '0.5rem 1rem' }}>Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {request.items.map(item => {
                                const invObj = inventory[item.item] || { quantity: 0 };
                                const available = invObj.quantity;
                                const insufficient = parseFloat(item.quantity) > available;
                                const isAdjusted = item.original_quantity && parseFloat(item.original_quantity) !== parseFloat(item.quantity);
                                
                                return (
                                    <tr key={item.id} style={{ background: 'var(--bg-navbar)', border: '1px solid var(--border-glass)' }}>
                                        <td style={{ padding: '1rem', borderRadius: '8px 0 0 8px', fontWeight: 600 }}>{item.item_name}</td>
                                        <td style={{ padding: '1rem', opacity: isAdjusted ? 0.7 : 1 }}>{item.original_quantity || item.quantity}</td>
                                        <td style={{ 
                                            padding: '1rem', 
                                            fontWeight: isAdjusted ? 800 : 400,
                                            color: isAdjusted ? 'var(--color-primary)' : 'inherit'
                                        }}>
                                            {item.quantity}
                                            {isAdjusted && <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', background: 'var(--color-primary)', color: 'white', padding: '1px 4px', borderRadius: '4px' }}>EDITED</span>}
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '200px' }}>
                                            {item.mgmt_adjustment_remarks || '—'}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{item.quantity_issued || '—'}</td>
                                        <td style={{ 
                                            padding: '1rem', 
                                            color: parseFloat(item.quantity_returned) > 0 ? 'var(--status-info-text, #7aa2f7)' : 'var(--text-muted)',
                                            fontWeight: parseFloat(item.quantity_returned) > 0 ? 700 : 400
                                        }}>
                                            {parseFloat(item.quantity_returned) > 0 ? item.quantity_returned : '—'}
                                        </td>
                                        <td style={{
                                            padding: '1rem',
                                            color: insufficient ? 'var(--status-error-text-vibrant)' : 'var(--status-success-text-vibrant)',
                                            fontWeight: insufficient ? 700 : 400
                                        }}>
                                            {parseFloat(available).toLocaleString()}
                                            {insufficient && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>⚠️ LOW</span>}
                                        </td>
                                        <td style={{ padding: '1rem', borderRadius: '0 8px 8px 0', color: 'var(--text-muted)' }}>{item.unit}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {request.remarks && (
                <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Kitchen Remarks</strong>
                    <div style={{ opacity: 0.9 }}>{request.remarks}</div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <button 
                        className="action-btn" 
                        onClick={handlePrint}
                        style={{ 
                            background: 'var(--bg-glass)', 
                            border: '1px solid var(--border-glass)',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.5rem'
                        }}
                    >
                        🖨️ Print Request
                    </button>
                    {/* Procurement Actions (Fulfillment & Rejection) */}
                    {hasPermission('can_manage_mr') && (
                        <>
                            {request.status === 'MGMT_APPROVED' && (
                                <>
                                    {!request.is_acknowledged && (
                                        <button className="action-btn" onClick={() => handleAction('acknowledge')} style={{ background: 'var(--status-pending-text)' }}>Acknowledge</button>
                                    )}
                                    <button className="action-btn" onClick={openBatchModal} style={{ background: 'var(--status-success-text-vibrant)' }}>Issue Stock</button>
                                </>
                            )}
                            
                            {/* Reject button available for any status that can be rejected in the backend */}
                            {['PLACED', 'MGMT_APPROVED'].includes(request.status) && (
                                <button 
                                    className="action-btn" 
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to REJECT this request? This will cancel the request and restore any issued stock.")) {
                                            handleAction('reject');
                                        }
                                    }} 
                                    style={{ background: '#e74c3c' }}
                                >
                                    Reject Request
                                </button>
                            )}


                        </>
                    )}

                    {/* Kitchen Accept Stock */}
                    {request.status === 'ISSUED' && hasPermission('can_place_mr') && (
                        <button className="action-btn" onClick={() => handleAction('kitchen_accept')} style={{ background: 'var(--status-success-text-vibrant)' }}>Accept Stock</button>
                    )}

                    {/* Reconcile (Kitchen side) */}
                    {request.status === 'ACCEPTED' && (hasPermission('can_place_mr')) && (
                        <button className="action-btn" onClick={() => setIsReconcileModalOpen(true)} style={{ background: 'var(--status-accent-text)' }}>Reconcile & Close</button>
                    )}
                
                {request.status === 'PENDING_RECONCILE' && hasPermission('can_manage_mr') && (
                    <button className="action-btn" onClick={() => {
                        if (window.confirm('Confirm and finalize reconciliation? This updates Store inventory.')) handleAction('confirm_reconcile');
                    }} style={{ background: '#f39c12', color: 'white', marginLeft: 'auto' }}>Confirm Reconcile</button>
                )}

                {hasPermission('can_place_po') && !['ISSUED', 'ACCEPTED', 'PENDING_RECONCILE', 'COMPLETED', 'REJECTED'].includes(request.status) && (
                    <div style={{ background: 'var(--bg-glass)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.8rem' }}>Generate Purchase Request</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="secondary-btn" style={{ fontSize: '0.8rem' }} onClick={() => handleGeneratePR('deficit')}>Deficit Only</button>
                            <button className="secondary-btn" style={{ fontSize: '0.8rem' }} onClick={() => handleGeneratePR('deficit_min_stock')}>Deficit + Min</button>
                            <button className="secondary-btn" style={{ fontSize: '0.8rem' }} onClick={() => handleGeneratePR('original')}>Full Original</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Print View (Hidden on screen, visible during print) */}
            <div className="mr-print-view">
                <style>{`
                    @media screen {
                        .mr-print-view { display: none; }
                    }
                    @media print {
                        @page { size: A4; margin: 1cm; }
                        body * { visibility: hidden; }
                        .mr-print-view, .mr-print-view * { visibility: visible; }
                        .mr-print-view {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            color: black !important;
                            background: white !important;
                            font-family: 'Inter', -apple-system, sans-serif;
                            font-size: 11pt;
                        }
                        .print-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            border-bottom: 2pt solid #333;
                            padding-bottom: 10pt;
                            margin-bottom: 20pt;
                        }
                        .print-logo { height: 40pt; }
                        .print-title { text-align: right; }
                        .print-title h1 { margin: 0; font-size: 18pt; }
                        .print-title p { margin: 2pt 0; font-size: 10pt; color: #666; }
                        
                        .print-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 15pt;
                            margin-bottom: 20pt;
                        }
                        .print-section {
                            border: 1pt solid #ddd;
                            padding: 8pt;
                            border-radius: 4pt;
                        }
                        .print-section h3 {
                            margin: 0 0 5pt 0;
                            font-size: 9pt;
                            text-transform: uppercase;
                            color: #666;
                            border-bottom: 0.5pt solid #eee;
                        }
                        .print-detail {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 3pt;
                            font-size: 10pt;
                        }
                        .print-detail strong { font-weight: 600; }
                        
                        .print-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10pt;
                        }
                        .print-table th {
                            background: #f5f5f5;
                            border: 1pt solid #ddd;
                            padding: 4pt 6pt;
                            font-size: 8pt;
                            text-align: left;
                            text-transform: uppercase;
                        }
                        .print-table td {
                            border: 1pt solid #ddd;
                            padding: 4pt 6pt;
                            font-size: 9pt;
                        }
                        .print-footer {
                            margin-top: 30pt;
                            display: flex;
                            justify-content: space-between;
                            font-size: 9pt;
                            color: #666;
                        }
                        .print-signature {
                            margin-top: 50pt;
                            display: flex;
                            justify-content: space-between;
                        }
                        .sig-line {
                            border-top: 1pt solid #333;
                            width: 150pt;
                            text-align: center;
                            padding-top: 5pt;
                            font-size: 9pt;
                        }
                    }
                `}</style>
                
                <div className="print-header">
                    <img src={logo} alt="Logo" className="print-logo" />
                    <div className="print-title">
                        <h1>Material Request</h1>
                        <p>{request.mr_number}</p>
                        <p>Status: {request.status.replace('_', ' ')}</p>
                    </div>
                </div>

                <div className="print-grid">
                    <div className="print-section">
                        <h3>Request Timeline</h3>
                        <div className="print-detail"><strong>Created On:</strong> <span>{request.order_date}</span></div>
                        <div className="print-detail"><strong>Required By:</strong> <span>{request.target_date}</span></div>
                    </div>
                    <div className="print-section">
                        <h3>Meal Details</h3>
                        <div className="print-detail"><strong>Meal Type:</strong> <span style={{ fontWeight: 700 }}>{request.meal_type}</span></div>
                        <div className="print-detail"><strong>Head Count:</strong> <span>{request.user_count || 0}</span></div>
                    </div>
                    <div className="print-section">
                        <h3>Personnel</h3>
                        <div className="print-detail"><strong>Requested By:</strong> <span>{request.requested_by_username}</span></div>
                        {request.action_by_username && <div className="print-detail"><strong>Processed By:</strong> <span>{request.action_by_username}</span></div>}
                    </div>
                    <div className="print-section">
                        <h3>Department</h3>
                        <div className="print-detail"><strong>Source:</strong> <span>{request.department_name || 'Kitchen'}</span></div>
                    </div>
                </div>

                {request.remarks && (
                    <div className="print-section" style={{ marginBottom: '15pt' }}>
                        <h3>Kitchen Remarks</h3>
                        <p style={{ margin: 0, fontSize: '10pt' }}>{request.remarks}</p>
                    </div>
                )}

                <table className="print-table">
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>#</th>
                            <th>Item Description</th>
                            <th style={{ textAlign: 'right' }}>Quantity</th>
                            <th>Unit</th>
                            {request.status !== 'PLACED' && <th style={{ textAlign: 'right' }}>Issued</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {request.items.map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td><strong>{item.item_name}</strong></td>
                                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                                <td>{item.unit}</td>
                                {request.status !== 'PLACED' && <td style={{ textAlign: 'right' }}>{item.quantity_issued || '—'}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="print-signature">
                    <div className="sig-line">Requested By Signature</div>
                    <div className="sig-line">Store In-Charge</div>
                    <div className="sig-line">Management Approval</div>
                </div>

                <div className="print-footer">
                    <span>Generated on: {new Date().toLocaleString('en-IN')}</span>
                    <span>System Generated Document - Food Tracker</span>
                </div>
            </div>

            {/* Reconciliation Modal */}
            {isReconcileModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
                    <div className="glass-heavy animate-fade-in" style={{ width: '90%', maxWidth: '700px', maxHeight: '85vh', padding: '2.5rem', position: 'relative', overflowY: 'auto' }}>
                        <button onClick={() => setIsReconcileModalOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                        <h2>Reconcile Consumption</h2>
                        <div className="glass" style={{ padding: '1.5rem', margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--gradient-1)' }}>
                            <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Count</label><div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{request.user_count}</div></div>
                            <div style={{ fontSize: '1.5rem', opacity: 0.3 }}>➜</div>
                            <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-primary)' }}>Actual Count</label>
                                <input type="number" className="form-input" style={{ width: '100%', fontSize: '1.2rem', fontWeight: 700 }} value={finalUserCount} onChange={(e) => setFinalUserCount(parseInt(e.target.value) || 0)} min="0" />
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                            <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}><th style={{ padding: '0.8rem' }}>ITEM</th><th style={{ padding: '0.8rem' }}>ISSUED</th><th style={{ padding: '0.8rem' }}>RETURNED</th><th style={{ padding: '0.8rem' }}>CONSUMED</th></tr></thead>
                            <tbody>{request.items.map(item => {
                                const issued = parseFloat(item.quantity_issued || item.quantity);
                                const returned = parseFloat(returningQuantities[item.id] || 0);
                                const consumed = Math.max(0, issued - returned);
                                return (<tr key={item.id} style={{ borderBottom: '1px solid var(--border-glass)' }}><td style={{ padding: '0.8rem', fontWeight: 600 }}>{item.item_name}</td><td style={{ padding: '0.8rem' }}>{issued}</td><td style={{ padding: '0.8rem' }}><input type="number" className="form-input" style={{ width: '80px', padding: '0.3rem' }} value={returningQuantities[item.id]} onChange={(e) => setReturningQuantities({...returningQuantities, [item.id]: e.target.value})} min="0" max={issued} /></td><td style={{ padding: '0.8rem', color: 'var(--color-primary)', fontWeight: 700 }}>{consumed.toFixed(2)}</td></tr>);
                            })}</tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="secondary-btn" onClick={() => setIsReconcileModalOpen(false)}>Cancel</button>
                            <button className="action-btn" style={{ background: 'var(--status-accent-text)' }} onClick={handleReconcile}>Submit Reconciliation</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Selection Modal */}
            {isBatchModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(10px)' }}>
                    <div className="glass-heavy animate-fade-in" style={{ width: '95%', maxWidth: '900px', maxHeight: '85vh', overflowY: 'auto', padding: '2.5rem', position: 'relative' }}>
                        <button onClick={() => setIsBatchModalOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                        <h2>Select Stock Batches</h2>
                        {batchLoading ? <div style={{ textAlign: 'center', padding: '3rem' }}>Loading stock batches...</div> : (
                            request.items.map(mrItem => {
                                const itemData = batchData[mrItem.id] || { batches: [], allocations: {} };
                                const totalAllocated = Object.values(itemData.allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                                const required = parseFloat(mrItem.quantity);
                                const isExact = Math.abs(totalAllocated - required) < 0.001;
                                return (
                                    <div key={mrItem.id} className="glass" style={{ marginBottom: '1.5rem', padding: '1.5rem', border: `1px solid ${isExact ? 'var(--status-success-text-vibrant)' : 'var(--status-error-text-vibrant)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <strong>{mrItem.item_name} ({mrItem.unit})</strong>
                                            <div style={{ textAlign: 'right' }}>
                                                <div>Required: {required}</div>
                                                <div style={{ color: isExact ? 'var(--status-success-text-vibrant)' : 'var(--status-error-text-vibrant)', fontWeight: 700 }}>Allocated: {totalAllocated.toFixed(3)}</div>
                                            </div>
                                        </div>
                                        <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>BATCH DATE</th>
                                                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>BATCH PRICE</th>
                                                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>AVAILABLE</th>
                                                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>ALLOCATE</th>
                                                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>ALLOCATED VALUE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemData.batches.map(batch => {
                                                    const allocatedQty = parseFloat(itemData.allocations[batch.id] || 0);
                                                    const allocatedValue = allocatedQty * (parseFloat(batch.unit_price) || 0);
                                                    return (
                                                        <tr key={batch.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '0.6rem 0' }}>{batch.batch_date}</td>
                                                            <td style={{ textAlign: 'right', padding: '0.6rem 0' }}>₹{parseFloat(batch.unit_price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                            <td style={{ textAlign: 'right', padding: '0.6rem 0' }}>{parseFloat(batch.remaining_quantity).toFixed(3)}</td>
                                                            <td style={{ textAlign: 'right', padding: '0.6rem 0' }}>
                                                                <input 
                                                                    type="number" 
                                                                    className="form-input" 
                                                                    style={{ width: '90px', padding: '0.2rem', textAlign: 'right' }} 
                                                                    min="0" 
                                                                    max={parseFloat(batch.remaining_quantity)} 
                                                                    step="0.001" 
                                                                    value={itemData.allocations[batch.id] ?? ''} 
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        setBatchData(prev => ({...prev, [mrItem.id]: {...prev[mrItem.id], allocations: {...prev[mrItem.id].allocations, [batch.id]: val}}}));
                                                                    }} 
                                                                />
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '0.6rem 0', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                                ₹{allocatedValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                                                    <td colSpan="4" style={{ textAlign: 'right', padding: '1rem 0' }}>Total Estimated Value:</td>
                                                    <td style={{ textAlign: 'right', padding: '1rem 0', color: 'var(--status-success-text-vibrant)', fontSize: '1rem' }}>
                                                        ₹{Object.entries(itemData.allocations).reduce((sum, [bId, qty]) => {
                                                            const b = itemData.batches.find(x => x.id === parseInt(bId));
                                                            return sum + (parseFloat(qty) || 0) * (parseFloat(b?.unit_price) || 0);
                                                        }, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                );
                            })
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="secondary-btn" onClick={() => setIsBatchModalOpen(false)}>Cancel</button>
                            <button 
                                className="action-btn" 
                                style={{ background: 'var(--status-success-text-vibrant)' }} 
                                onClick={() => {
                                    const isAllAllocated = request.items.every(mrItem => {
                                        const itemData = batchData[mrItem.id] || { allocations: {} };
                                        const totalAllocated = Object.values(itemData.allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                                        return Math.abs(totalAllocated - parseFloat(mrItem.quantity)) <= 0.001;
                                    });
                                    if (!isAllAllocated) {
                                        alert("You must allocate the exact requested quantity for all items before issuing.");
                                        return;
                                    }
                                    handleBatchAccept();
                                }}
                            >
                                Confirm & Issue Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewKitchenMR;
