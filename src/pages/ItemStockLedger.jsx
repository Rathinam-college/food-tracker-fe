import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const ItemStockLedger = () => {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Item name/unit can be passed via location state for instant header render
    const stateItem = location.state || {};

    const [ledgerData, setLedgerData] = useState(null);
    const [sortOrder, setSortOrder] = useState('-batch_date'); // 'batch_date' or '-batch_date'
    const [stockStatus, setStockStatus] = useState('all'); // 'all', 'available', 'consumed'
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState('10');
    const [loading, setLoading] = useState(true);
    const [loadingExport, setLoadingExport] = useState(false);
    const [error, setError] = useState(null);


    useEffect(() => {
        const fetchLedger = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.getItemLedger(itemId, { 
                    page, 
                    page_size: pageSize,
                    ordering: sortOrder,
                    stock_status: stockStatus
                });
                setLedgerData(data);
            } catch (err) {
                setError(err.error || err.message || 'Failed to load ledger');
            } finally {
                setLoading(false);
            }
        };
        fetchLedger();
    }, [itemId, page, pageSize, sortOrder, stockStatus]);

    const handleExportExcel = async () => {
        setLoadingExport(true);
        try {
            const blob = await api.exportItemLedger(itemId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Stock_Ledger_${itemName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export Excel. Please try again.');
        } finally {
            setLoadingExport(false);
        }
    };

    const itemName = stateItem.item_name || ledgerData?.item_name || 'Item';
    const itemUnit = stateItem.unit || ledgerData?.unit || '';

    // Summary totals (from backend summary)
    const summary = ledgerData?.summary || {};
    const totalPurchasedQty = parseFloat(summary.total_purchased || 0);
    const totalIssuedQty = parseFloat(summary.total_issued || 0);
    const totalReturnedQty = parseFloat(summary.total_returned || 0);
    const totalAdjustedQty = parseFloat(summary.total_adjusted || 0);
    const totalPendingQty = parseFloat(summary.remaining_on_procurement || 0);
    
    // Values
    const totalPRValue = parseFloat(summary.total_pr_value || 0);
    const kitchenPushedValue = parseFloat(summary.kitchen_pushed_value || 0);
    const vendorReturnedValue = parseFloat(summary.vendor_returned_value || 0);
    const adjustedWastedValue = parseFloat(summary.adjusted_wasted_value || 0);
    const totalValue = parseFloat(summary.remaining_value_in_procurement || 0);

    return (
        <div className="main-container animate-fade-in">
            {/* ── PAGE HEADER ── */}
            <header className="welcome-header" style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                            borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer',
                            color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        ← Back to Stock
                    </button>

                    <button
                        onClick={handleExportExcel}
                        disabled={loadingExport || loading || !ledgerData}
                        style={{
                            background: 'var(--color-secondary)', border: 'none',
                            borderRadius: '10px', padding: '0.5rem 1.2rem', cursor: (loadingExport || loading) ? 'not-allowed' : 'pointer',
                            color: 'white', fontSize: '0.9rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            opacity: (loadingExport || loading) ? 0.6 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                        }}
                    >
                        {loadingExport ? '⏳ Exporting...' : '📄 Export Excel'}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '3rem' }}>📦</span>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                            {itemName}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
                            Item Stock Ledger &mdash; Full batch-wise purchase &amp; issuance history
                            {itemUnit && (
                                <span style={{
                                    marginLeft: '0.8rem', background: 'var(--bg-glass-heavy)',
                                    padding: '0.2rem 0.7rem', borderRadius: '50px',
                                    fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)',
                                    textTransform: 'uppercase'
                                }}>{itemUnit}</span>
                            )}
                        </p>
                    </div>
                </div>
            </header>

            {/* ── LOADING ── */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.5 }}>⏳</div>
                    <p style={{ fontSize: '1.1rem' }}>Loading batch ledger...</p>
                </div>
            )}

            {/* ── ERROR ── */}
            {!loading && error && (
                <div className="glass" style={{
                    padding: '3rem', textAlign: 'center',
                    borderLeft: '4px solid var(--status-error-text-vibrant)'
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
                    <p style={{ color: 'var(--status-error-text-vibrant)', fontWeight: 600 }}>{error}</p>
                    <button className="action-btn" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            )}

            {/* ── NO DATA ── */}
            {!loading && !error && (!ledgerData || ledgerData.batches.length === 0) && (
                <div className="glass" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', opacity: 0.4 }}>📭</div>
                    <p style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '0.5rem' }}>No batch records found</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Batches are created when stock is received via Purchase Requests.
                    </p>
                </div>
            )}

            {/* ── CONTENT ── */}
            {!loading && !error && ledgerData && ledgerData.batches.length > 0 && (
                <>
                    {/* Summary cards */}
                    <div className="dashboard-grid" style={{
                        marginBottom: '2.5rem',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
                    }}>
                        {[
                            {
                                icon: '🛒', label: 'Purchased',
                                qty: totalPurchasedQty, value: totalPRValue,
                                color: 'var(--color-secondary)'
                            },
                            {
                                icon: '🍳', label: 'Issued to Kitchen',
                                qty: totalIssuedQty, value: kitchenPushedValue,
                                color: 'var(--status-success-text-vibrant)'
                            },
                            {
                                icon: '🔄', label: 'Vendor Returned',
                                qty: totalReturnedQty, value: vendorReturnedValue,
                                color: '#e67e22'
                            },
                            {
                                icon: '🗑️', label: 'Adjusted / Wasted',
                                qty: totalAdjustedQty, value: adjustedWastedValue,
                                color: 'var(--status-error-text-vibrant)'
                            },
                            {
                                icon: '📦', label: 'Remaining in Store',
                                qty: totalPendingQty, value: totalValue,
                                color: 'var(--color-primary)'
                            }
                        ].map(card => (
                            <div key={card.label} className="glass metric-card" style={{
                                borderLeft: `6px solid ${card.color}`, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem'
                            }}>
                                <div style={{ fontSize: '2.5rem' }}>{card.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div className="metric-title" style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {card.label}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: card.color }}>
                                            ₹{card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', opacity: 0.85 }}>
                                            {card.qty.toFixed(3)} <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{itemUnit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section header */}
                    <div className="glass" style={{
                        padding: '1.2rem 2rem', marginBottom: '1.5rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                    }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                            Batch-wise Ledger
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sort By Date</span>
                                <select 
                                    className="glass-input" 
                                    value={sortOrder} 
                                    onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
                                    style={{ padding: '0.3rem 0.8rem', width: 'auto', fontSize: '0.85rem', minWidth: '130px' }}
                                >
                                    <option value="batch_date">📅 Oldest First</option>
                                    <option value="-batch_date">🆕 Recent First</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                                <select 
                                    className="glass-input" 
                                    value={stockStatus} 
                                    onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
                                    style={{ padding: '0.3rem 0.8rem', width: 'auto', fontSize: '0.85rem', minWidth: '130px' }}
                                >
                                    <option value="all">📁 Show All</option>
                                    <option value="available">✅ Available</option>
                                    <option value="consumed">📦 Fully Used</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Show</span>
                                <select 
                                    className="glass-input" 
                                    value={pageSize} 
                                    onChange={(e) => { setPageSize(e.target.value); setPage(1); }}
                                    style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: '0.85rem' }}
                                >
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="all">All</option>
                                </select>
                            </div>
                            <span style={{
                                background: 'var(--bg-glass)', padding: '0.4rem 1rem',
                                borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600,
                                border: '1px solid var(--border-glass)'
                            }}>
                                {ledgerData.batches.length} of {ledgerData.count} Batch{ledgerData.count !== 1 ? 'es' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Batch cards */}
                    {ledgerData.batches.map((batch) => {
                        const pending = parseFloat(batch.remaining_quantity);
                        const issued = parseFloat(batch.total_issued || 0);
                        const adjusted = parseFloat(batch.total_adjusted || 0);
                        const returned = parseFloat(batch.total_returned || 0);
                        const initial = parseFloat(batch.initial_quantity);
                        const isExhausted = pending <= 0;
                        const isLow = !isExhausted && pending < initial * 0.2;
                        const consumed = initial - pending;
                        const pctUsed = initial > 0 ? (consumed / initial) * 100 : 0;
                        const borderColor = isExhausted
                            ? 'var(--status-error-text-vibrant)'
                            : isLow
                            ? 'var(--status-pending-text)'
                            : 'var(--status-success-text-vibrant)';

                        return (
                            <div
                                key={batch.id}
                                className="glass"
                                style={{
                                    marginBottom: '1.5rem', padding: '2rem',
                                    borderRadius: '16px', borderLeft: `5px solid ${borderColor}`
                                }}
                            >
                                {/* Batch header row */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'flex-start', flexWrap: 'wrap',
                                    gap: '1rem', marginBottom: '1.5rem'
                                }}>
                                    <div>
                                        <div style={{
                                            display: 'flex', alignItems: 'center',
                                            gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem'
                                        }}>
                                            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                                                Batch Summary
                                            </span>
                                            <span style={{
                                                background: 'var(--bg-glass-heavy)', padding: '0.25rem 0.8rem',
                                                borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700,
                                                color: 'var(--color-primary)'
                                            }}>
                                                📅 {batch.batch_date}
                                            </span>
                                            {batch.pr_reference && (
                                                <span style={{
                                                    background: 'var(--status-success-bg)', padding: '0.25rem 0.8rem',
                                                    borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700,
                                                    color: 'var(--status-success-text-vibrant)'
                                                }}>
                                                    PR: {batch.pr_reference}
                                                </span>
                                            )}
                                        </div>
                                        {batch.vendor_name && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                🏪 {batch.vendor_name}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{
                                        padding: '0.4rem 1.2rem', borderRadius: '50px',
                                        fontSize: '0.8rem', fontWeight: 800,
                                        background: isExhausted ? 'var(--status-error-bg)' : isLow ? 'var(--status-pending-bg)' : 'var(--status-success-bg)',
                                        color: isExhausted ? 'var(--status-error-text-vibrant)' : isLow ? 'var(--status-pending-text)' : 'var(--status-success-text-vibrant)'
                                    }}>
                                        {isExhausted ? '✓ Fully Used' : isLow ? `⚠ Low — ${pending.toFixed(3)} ${itemUnit}` : `${pending.toFixed(3)} ${itemUnit} Remaining`}
                                    </span>
                                </div>

                                {/* Stats grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                    gap: '1rem', marginBottom: '1.5rem'
                                }}>
                                    {[
                                        { label: 'Purchased', value: `${initial.toFixed(3)}`, unit: itemUnit },
                                        { label: 'Unit Price', value: `₹${parseFloat(batch.unit_price).toFixed(2)}`, unit: '' },
                                        { label: 'Batch Value', value: `₹${parseFloat(batch.batch_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, unit: '' },
                                        { label: 'Issued to Kitchen', value: `${issued.toFixed(3)}`, unit: itemUnit },
                                        { label: 'Vendor Returned', value: `${returned.toFixed(3)}`, unit: itemUnit },
                                        { label: 'Wasted/Adjusted', value: `${adjusted.toFixed(3)}`, unit: itemUnit },
                                        { label: 'Pending in Store', value: `${pending.toFixed(3)}`, unit: itemUnit },
                                    ].map(stat => (
                                        <div key={stat.label} style={{
                                            background: 'var(--bg-glass)', borderRadius: '12px',
                                            padding: '1rem 1.2rem'
                                        }}>
                                            <div style={{
                                                fontSize: '0.68rem', color: 'var(--text-muted)',
                                                fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.5px', marginBottom: '0.4rem'
                                            }}>
                                                {stat.label}
                                            </div>
                                            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                                                {stat.value}{' '}
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {stat.unit}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress bar */}
                                <div style={{ marginBottom: batch.issued.length > 0 ? '1.5rem' : 0 }}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        fontSize: '0.75rem', color: 'var(--text-muted)',
                                        marginBottom: '0.4rem', fontWeight: 600
                                    }}>
                                        <span>Usage</span>
                                        <span>{pctUsed.toFixed(1)}% consumed</span>
                                    </div>
                                    <div style={{
                                        background: 'var(--bg-glass)', borderRadius: '99px',
                                        height: '8px', overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: '99px',
                                            background: isExhausted
                                                ? 'var(--status-error-text-vibrant)'
                                                : isLow
                                                ? 'var(--status-pending-text)'
                                                : 'var(--status-success-text-vibrant)',
                                            width: `${Math.min(pctUsed, 100)}%`,
                                            transition: 'width 0.8s ease'
                                        }} />
                                    </div>
                                </div>

                                {/* Kitchen issuance table */}
                                {batch.issued.length > 0 && (
                                    <div>
                                        <div style={{
                                            fontSize: '0.75rem', color: 'var(--text-muted)',
                                            fontWeight: 700, textTransform: 'uppercase',
                                            letterSpacing: '0.8px', marginBottom: '0.8rem'
                                        }}>
                                            🍳 Kitchen Issuances ({batch.issued.length})
                                        </div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{
                                                width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'
                                            }}>
                                                <thead>
                                                    <tr style={{
                                                        color: 'var(--text-muted)',
                                                        borderBottom: '1px solid var(--border-glass)',
                                                        fontSize: '0.75rem', textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        <th style={{ padding: '0.5rem 0.8rem', textAlign: 'left' }}>MR Number</th>
                                                        <th style={{ padding: '0.5rem 0.8rem', textAlign: 'left' }}>Date Issued</th>
                                                        <th style={{ padding: '0.5rem 0.8rem', textAlign: 'right' }}>Qty Issued</th>
                                                        <th style={{ padding: '0.5rem 0.8rem', textAlign: 'right' }}>Unit Price</th>
                                                        <th style={{ padding: '0.5rem 0.8rem', textAlign: 'right' }}>Line Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {batch.issued.map((iss, i) => (
                                                        <tr key={i} style={{
                                                            borderBottom: '1px solid var(--border-glass)',
                                                            transition: 'background 0.2s'
                                                        }}>
                                                            <td style={{
                                                                padding: '0.6rem 0.8rem',
                                                                color: 'var(--color-secondary)', fontWeight: 600
                                                            }}>
                                                                {iss.mr_number}
                                                            </td>
                                                            <td style={{
                                                                padding: '0.6rem 0.8rem',
                                                                color: 'var(--text-muted)'
                                                            }}>
                                                                {iss.issued_date || '—'}
                                                            </td>
                                                            <td style={{
                                                                padding: '0.6rem 0.8rem', textAlign: 'right',
                                                                fontWeight: 700,
                                                                color: 'var(--status-success-text-vibrant)'
                                                            }}>
                                                                -{parseFloat(iss.quantity_issued).toFixed(3)} {itemUnit}
                                                            </td>
                                                            <td style={{
                                                                padding: '0.6rem 0.8rem', textAlign: 'right'
                                                            }}>
                                                                ₹{parseFloat(iss.unit_price).toFixed(2)}
                                                            </td>
                                                            <td style={{
                                                                padding: '0.6rem 0.8rem', textAlign: 'right',
                                                                fontWeight: 700
                                                            }}>
                                                                ₹{parseFloat(iss.line_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr style={{
                                                        borderTop: '2px solid var(--border-glass)',
                                                        fontWeight: 800, fontSize: '0.9rem'
                                                    }}>
                                                        <td colSpan={2} style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>
                                                            Batch Total Issued
                                                        </td>
                                                        <td style={{
                                                            padding: '0.6rem 0.8rem', textAlign: 'right',
                                                            color: 'var(--status-success-text-vibrant)'
                                                        }}>
                                                            -{issued.toFixed(3)} {itemUnit}
                                                        </td>
                                                        <td />
                                                        <td style={{
                                                            padding: '0.6rem 0.8rem', textAlign: 'right',
                                                            color: 'var(--color-secondary)'
                                                        }}>
                                                            ₹{(issued * parseFloat(batch.unit_price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {batch.issued.length === 0 && (
                                    <div style={{
                                        color: 'var(--text-muted)', fontSize: '0.85rem',
                                        fontStyle: 'italic', marginTop: '0.5rem'
                                    }}>
                                        No kitchen issuances from this batch yet.
                                    </div>
                                )}

                                {/* Vendor returns table */}
                                {batch.returns && batch.returns.length > 0 && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <div style={{
                                            fontSize: '0.75rem', color: 'var(--text-muted)',
                                            fontWeight: 700, textTransform: 'uppercase',
                                            letterSpacing: '0.8px', marginBottom: '0.8rem'
                                        }}>
                                            🔄 Vendor Returns ({batch.returns.length})
                                        </div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{
                                                width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'
                                            }}>
                                                <thead>
                                                    <tr style={{
                                                        color: 'var(--text-muted)',
                                                        borderBottom: '1px solid var(--border-glass)',
                                                        fontSize: '0.75rem', textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        <th style={{ padding: '0.5rem 0.8rem', textAlign: 'left' }}>Date</th>
                                                        <th style={{ padding: '0.5rem 0.8rem', textAlign: 'left' }}>Reason</th>
                                                        <th style={{ padding: '0.5rem 0.8rem', textAlign: 'right' }}>Qty Returned</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {batch.returns.map((ret, i) => (
                                                        <tr key={i} style={{
                                                            borderBottom: '1px solid var(--border-glass)',
                                                            transition: 'background 0.2s'
                                                        }}>
                                                            <td style={{
                                                                padding: '0.6rem 0.8rem',
                                                                color: 'var(--text-muted)'
                                                            }}>
                                                                {ret.date}
                                                            </td>
                                                            <td style={{
                                                                padding: '0.6rem 0.8rem',
                                                                fontStyle: 'italic', color: 'var(--text-muted)'
                                                            }}>
                                                                {ret.reason || 'No reason provided'}
                                                            </td>
                                                            <td style={{
                                                                padding: '0.6rem 0.8rem', textAlign: 'right',
                                                                fontWeight: 700,
                                                                color: '#e67e22'
                                                            }}>
                                                                -{parseFloat(ret.quantity).toFixed(3)} {itemUnit}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr style={{
                                                        borderTop: '2px solid var(--border-glass)',
                                                        fontWeight: 800, fontSize: '0.9rem'
                                                    }}>
                                                        <td colSpan={2} style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>
                                                            Batch Total Returned
                                                        </td>
                                                        <td style={{
                                                            padding: '0.6rem 0.8rem', textAlign: 'right',
                                                            color: '#e67e22'
                                                        }}>
                                                            -{parseFloat(batch.total_returned || 0).toFixed(3)} {itemUnit}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}

                            </div>
                        );
                    })}

                    {pageSize !== 'all' && ledgerData.total_pages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '3rem' }}>
                            <button 
                                className="secondary-btn" 
                                disabled={!ledgerData.previous}
                                onClick={() => {
                                    setPage(p => p - 1);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                            >
                                ◀ Prev
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                Page {page} of {ledgerData.total_pages}
                            </span>
                            <button 
                                className="secondary-btn" 
                                disabled={!ledgerData.next}
                                onClick={() => {
                                    setPage(p => p + 1);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                            >
                                Next ▶
                            </button>
                        </div>
                    )}

                </>
            )}
        </div>
    );
};

export default ItemStockLedger;
