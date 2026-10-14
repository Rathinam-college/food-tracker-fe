import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

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
        <span style={{ padding: '0.35rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, background: s.bg, color: s.color }}>
            {labels[status] || status}
        </span>
    );
};

const PRFulfillmentDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const data = await api.getPurchaseRequest(id);
                setOrder(data);
            } catch (err) {
                console.error("Failed to fetch PR details", err);
                alert("Failed to load PR details.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (loading) {
        return <div className="main-container">Loading details...</div>;
    }

    if (!order) {
        return <div className="main-container">Purchase request not found.</div>;
    }

    // Calculations
    const itemsSubtotal = (order.items || []).reduce((acc, i) => acc + (i.quantity_ordered * i.unit_price), 0);
    const itemsTotalDiscount = (order.items || []).reduce((acc, i) => {
        const base = i.quantity_ordered * i.unit_price;
        return acc + (i.discount_type === 'PERCENTAGE' ? (base * i.discount_value / 100) : i.discount_value);
    }, 0);
    const itemsTotalTax = (order.items || []).reduce((acc, i) => {
        const base = i.quantity_ordered * i.unit_price;
        const disc = i.discount_type === 'PERCENTAGE' ? (base * i.discount_value / 100) : i.discount_value;
        return acc + ((base - disc) * (i.tax_rate / 100));
    }, 0);

    const actualSubtotal = (order.procurements || []).reduce((acc, i) => acc + (i.quantity * i.unit_price), 0);
    const actualTotalDiscount = (order.procurements || []).reduce((acc, i) => {
        const base = i.quantity * i.unit_price;
        return acc + (i.discount_type === 'PERCENTAGE' ? (base * i.discount_value / 100) : i.discount_value);
    }, 0);
    const actualTotalTax = (order.procurements || []).reduce((acc, i) => {
        const base = i.quantity * i.unit_price;
        const disc = i.discount_type === 'PERCENTAGE' ? (base * i.discount_value / 100) : i.discount_value;
        return acc + ((base - disc) * (i.tax_rate / 100));
    }, 0);
    const actualPayable = (order.procurements || []).reduce((acc, i) => acc + parseFloat(i.total_price || 0), 0);

    return (
        <div className="main-container animate-fade-in" style={{ paddingBottom: '4rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Top Bar Navigation */}
            <div style={{ marginBottom: '2rem' }}>
                <button 
                    onClick={() => navigate('/procurement/pr-entries')}
                    style={{ 
                        background: 'none', border: 'none', color: 'var(--text-muted)', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '1rem', padding: '0.5rem 0'
                    }}
                    className="hover-text-main"
                >
                    <span>←</span> Back to PR Entries
                </button>
            </div>

            {/* Header Section */}
            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>Fulfillment Detail: {order.pr_reference}</h1>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block' }}>Vendor</span>
                                <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{order.vendor_name}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block' }}>Purchase Type</span>
                                <strong style={{ color: order.purchase_type === 'SPECIAL_EVENT' ? 'var(--color-secondary)' : 'var(--text-main)', fontSize: '1.1rem' }}>
                                    {order.purchase_type === 'SPECIAL_EVENT' ? 'Special Event' : 'Regular Purchase'}
                                </strong>
                            </div>
                            {order.event_name && (
                                <div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block' }}>Event</span>
                                    <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{order.event_name}</strong>
                                </div>
                            )}
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block' }}>Order Date</span>
                                <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{order.order_date}</strong>
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ marginBottom: '1rem' }}>{getStatusBadge(order.status)}</div>
                    </div>
                </div>
            </div>

            {/* Estimated Order Details */}
            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.8rem' }}>
                    📝 Estimated Order Details
                </h2>
                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                                <th style={{ padding: '1rem' }}>ITEM</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>ORDERED</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>RECEIVED</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>REMAINING</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>STATUS</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>EST. UNIT PRICE</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>EST. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.items || []).map(item => {
                                const remaining = item.quantity_ordered - item.quantity_received;
                                const isFullyReceived = remaining <= 0;
                                const isPartial = item.quantity_received > 0 && remaining > 0;
                                
                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{item.item_name}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{item.quantity_ordered} {item.unit}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: item.quantity_received > 0 ? 'var(--status-success-text-vibrant)' : 'inherit' }}>
                                            {item.quantity_received} {item.unit}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: remaining > 0 ? 'var(--status-error-text-vibrant)' : 'inherit' }}>
                                            {remaining > 0 ? `${remaining} ${item.unit}` : '✓'}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '4px',
                                                background: isFullyReceived ? 'var(--status-success-bg)' : isPartial ? 'var(--status-pending-bg)' : 'var(--bg-glass)',
                                                color: isFullyReceived ? 'var(--status-success-text-vibrant)' : isPartial ? 'var(--status-pending-text)' : 'var(--text-muted)',
                                                fontWeight: 600
                                            }}>
                                                {isFullyReceived ? 'FULFILLED' : isPartial ? 'PARTIAL' : 'PENDING'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>₹{parseFloat(item.line_total).toFixed(2)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {item.discount_value > 0 && `(Disc: ${item.discount_type === 'PERCENTAGE' ? `${item.discount_value}%` : `₹${item.discount_value}`}) `}
                                                {`+ Tax: ${parseFloat(item.tax_rate).toFixed(1)}%`}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Estimation Financial Summary */}
                <div style={{ 
                    display: 'flex', justifyContent: 'flex-end', padding: '1rem', 
                    background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.4rem 1.5rem', alignItems: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Estimated Subtotal:</div>
                        <div style={{ fontWeight: 500, textAlign: 'right' }}>₹{itemsSubtotal.toFixed(2)}</div>
                        
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Estimated Discounts:</div>
                        <div style={{ fontWeight: 500, textAlign: 'right', color: 'var(--status-error-text-vibrant)' }}>-₹{itemsTotalDiscount.toFixed(2)}</div>

                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Estimated Tax:</div>
                        <div style={{ fontWeight: 500, textAlign: 'right' }}>₹{itemsTotalTax.toFixed(2)}</div>

                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-glass)', margin: '0.4rem 0' }}></div>

                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>Total Estimated Cost:</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'right' }}>₹{parseFloat(order.total_amount).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Actual Receipts (Procurements) Details */}
            {order.procurements && order.procurements.length > 0 && (
                <div className="glass" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(0, 255, 128, 0.2)' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.8rem', color: 'var(--status-success-text-vibrant)' }}>
                        📦 Actual Receipts (Procurements)
                    </h2>
                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                                    <th style={{ padding: '1rem' }}>DATE</th>
                                    <th style={{ padding: '1rem' }}>INVOICE NO</th>
                                    <th style={{ padding: '1rem' }}>ITEM</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>RECEIVED QTY</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>ACTUAL PRICE</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>ACTUAL COST</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.procurements.map(proc => (
                                    <tr key={proc.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <td style={{ padding: '1rem' }}>{new Date(proc.purchase_date || proc.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{proc.invoice_number || '—'}</td>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{proc.item_name}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--status-success-text-vibrant)', fontWeight: 'bold' }}>
                                            {proc.quantity} {proc.item_unit}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>₹{parseFloat(proc.unit_price).toFixed(2)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>₹{parseFloat(proc.total_price).toFixed(2)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {proc.discount_value > 0 && `(Disc: ${proc.discount_type === 'PERCENTAGE' ? `${proc.discount_value}%` : `₹${proc.discount_value}`}) `}
                                                {proc.tax_rate > 0 && `+ Tax: ${parseFloat(proc.tax_rate).toFixed(1)}%`}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Actual Receipts Financial Summary */}
                    <div style={{ 
                        display: 'flex', justifyContent: 'flex-end', padding: '1.5rem', 
                        background: 'rgba(0, 255, 128, 0.05)', borderRadius: '12px',
                        border: '1px solid rgba(0, 255, 128, 0.1)'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.6rem 2.5rem', alignItems: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Actual Subtotal:</div>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>₹{actualSubtotal.toFixed(2)}</div>
                            
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Total Actual Discounts:</div>
                            <div style={{ fontWeight: 600, textAlign: 'right', color: 'var(--status-error-text-vibrant)' }}>-₹{actualTotalDiscount.toFixed(2)}</div>

                            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Total Actual Tax:</div>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>₹{actualTotalTax.toFixed(2)}</div>

                            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(0, 255, 128, 0.2)', margin: '0.5rem 0' }}></div>

                            <div style={{ color: 'var(--status-success-text-vibrant)', fontSize: '1.2rem', fontWeight: 700 }}>Total Payable Amount:</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-success-text-vibrant)', textAlign: 'right' }}>₹{actualPayable.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approval History */}
            {(order.approved_by_l1_name || order.approved_by_l2_name) && (
                <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approval History</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        {order.approved_by_l1_name ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--status-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>✅</div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Level 1 Approved by</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{order.approved_by_l1_name}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{order.approved_at_l1 ? new Date(order.approved_at_l1).toLocaleString() : 'N/A'}</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.5 }}>
                                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>⏳</div>
                                <div>
                                    <div style={{ fontSize: '0.8rem' }}>Level 1 Approval</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>Awaiting...</div>
                                </div>
                            </div>
                        )}

                        {order.approved_by_l2_name ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--status-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>✅</div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Level 2 Approved by</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{order.approved_by_l2_name}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{order.approved_at_l2 ? new Date(order.approved_at_l2).toLocaleString() : 'N/A'}</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.5 }}>
                                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>⏳</div>
                                <div>
                                    <div style={{ fontSize: '0.8rem' }}>Level 2 Approval</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>Awaiting...</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PRFulfillmentDetails;
