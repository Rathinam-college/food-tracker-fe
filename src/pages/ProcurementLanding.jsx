import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// --- STYLES & COMPONENTS FROM MANAGEMENT ---
const styles = {
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
    },
    card: {
        padding: '2rem',
        borderRadius: '24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
    },
    filterRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
    },
    select: {
        padding: '0.5rem 1rem',
        borderRadius: '10px',
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-navbar)',
        color: 'var(--text-main)',
        fontSize: '0.85rem',
        outline: 'none',
        cursor: 'pointer'
    }
};

const VendorStackedChart = ({ data, loading }) => {
    const [hoverInfo, setHoverInfo] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>Loading Analysis...</div>;
    if (!data || data.length === 0) return <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>No data found for the selected period.</div>;

    const colors = ['#7aa2f7', '#9ece6a', '#bb9af7', '#e0af68', '#f7768e', '#7dcfff', '#2ac3de', '#b4f9f8'];
    const maxSpend = Math.max(...data.map(v => v.total_spend)) || 1;

    return (
        <div className="chart-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem', position: 'relative' }}>
            {data.map((vendor) => (
                <div key={vendor.vendor_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-main)' }}>{vendor.vendor_name}</span>
                        <span style={{ color: 'var(--color-primary)' }}>₹{Math.round(vendor.total_spend).toLocaleString()}</span>
                    </div>
                    <div style={{ 
                        height: '14px', 
                        width: '100%', 
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        display: 'flex',
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative'
                    }}>
                        {vendor.items.map((item, i) => {
                            const wPct = (item.spend / maxSpend) * 100;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        width: `${wPct}%`,
                                        height: '100%',
                                        background: colors[i % colors.length],
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        filter: hoverInfo?.item?.name === item.name && hoverInfo?.vendor?.vendor_id === vendor.vendor_id ? 'brightness(1.3) saturate(1.2)' : 'none',
                                        borderRight: '1px solid rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.closest('.chart-container').getBoundingClientRect();
                                        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                                        setHoverInfo({ vendor, item });
                                    }}
                                    onMouseMove={(e) => {
                                        const rect = e.currentTarget.closest('.chart-container').getBoundingClientRect();
                                        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                                        setHoverInfo({ vendor, item });
                                    }}
                                    onMouseLeave={() => setHoverInfo(null)}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
            {hoverInfo && (
                <div style={{
                    position: 'absolute',
                    left: mousePos.x - 20,
                    transform: 'translateX(-100%)',
                    top: mousePos.y - 40,
                    background: 'rgba(26, 27, 38, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-glass)',
                    padding: '0.8rem 1.2rem',
                    borderRadius: '12px',
                    zIndex: 1000,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                    minWidth: '180px'
                }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{hoverInfo.vendor.vendor_name}</p>
                    <p style={{ margin: '0.2rem 0', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{hoverInfo.item.name}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#9ece6a', fontWeight: 800 }}>₹{Math.round(hoverInfo.item.spend).toLocaleString()}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{((hoverInfo.item.spend / hoverInfo.vendor.total_spend) * 100).toFixed(1)}% of total</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const WastageSummary = ({ data, loading }) => {
    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>Loading Wastage Data...</div>;
    if (!data) return null;

    const { comparison, top_items, top_categories } = data;
    const diff = comparison.this_month - comparison.last_month;
    const isUp = diff > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)' }}>
                <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Monthly Comparison</p>
                    <h2 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 800, color: isUp ? '#f7768e' : '#9ece6a' }}>
                        ₹{comparison.this_month.toLocaleString()}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>
                        vs Last Month: <span style={{ fontWeight: 600 }}>₹{comparison.last_month.toLocaleString()}</span>
                        <span style={{ marginLeft: '8px', color: isUp ? '#f7768e' : '#9ece6a', fontWeight: 700 }}>
                            {isUp ? '▲' : '▼'} {Math.abs(comparison.last_month > 0 ? (diff / comparison.last_month * 100) : 0).toFixed(1)}%
                        </span>
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ background: 'rgba(247, 118, 142, 0.1)', color: '#f7768e', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        Loss Analysis
                    </span>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                    <h4 style={{ fontSize: '0.8rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Top Items by Value</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {top_items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Qty: {item.qty}</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f7768e' }}>₹{Math.round(item.value).toLocaleString()}</span>
                            </div>
                        ))}
                        {top_items.length === 0 && <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>No wastage recorded this month.</p>}
                    </div>
                </div>
                <div>
                    <h4 style={{ fontSize: '0.8rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Category Breakdown</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {top_categories.map((cat, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cat.name}</span>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{Math.round(cat.value).toLocaleString()}</span>
                                    <div style={{ height: '3px', width: '40px', background: '#bb9af7', borderRadius: '2px', marginTop: '2px', marginLeft: 'auto' }}></div>
                                </div>
                            </div>
                        ))}
                        {top_categories.length === 0 && <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>No categories affected.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProcurementLanding = () => {
    const { hasPermission } = useAuth();
    const [pendingMRCount, setPendingMRCount] = useState(0);
    const [reconcileMRCount, setReconcileMRCount] = useState(0);
    const [acceptedMRs, setAcceptedMRs] = useState([]);

    // Analytics States
    const [topItems, setTopItems] = useState([]);
    const [topItemsLoading, setTopItemsLoading] = useState(true);
    const [itemCategory, setItemCategory] = useState('');
    const [categories, setCategories] = useState([]);

    const [vendorData, setVendorData] = useState([]);
    const [vendorLoading, setVendorLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7');
    const [topVendorsCount, setTopVendorsCount] = useState('5');

    const [wastageData, setWastageData] = useState(null);
    const [wastageLoading, setWastageLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardInfo = async () => {
            try {
                if (hasPermission('can_manage_mr')) {
                    const [manageData, reconcileData, acceptedData, cats] = await Promise.all([
                        api.getMaterialRequests({ status: 'MGMT_APPROVED' }),
                        api.getMaterialRequests({ status: 'PENDING_RECONCILE' }),
                        api.getMaterialRequests({ status: 'ACCEPTED' }),
                        api.getCategories()
                    ]);
                    
                    setPendingMRCount(manageData ? (manageData.count !== undefined ? manageData.count : (manageData.results ? manageData.results.length : manageData.length || 0)) : 0);
                    setReconcileMRCount(reconcileData ? (reconcileData.count !== undefined ? reconcileData.count : (reconcileData.results ? reconcileData.results.length : reconcileData.length || 0)) : 0);
                    setAcceptedMRs(acceptedData ? (acceptedData.results || acceptedData || []) : []);
                    setCategories(cats);
                } else {
                    const cats = await api.getCategories();
                    setCategories(cats);
                }
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
        };
        fetchDashboardInfo();
    }, [hasPermission]);

    // Fetch Top Items
    useEffect(() => {
        const fetchTopItems = async () => {
            try {
                setTopItemsLoading(true);
                const data = await api.getTopPurchasedItems({ category: itemCategory });
                setTopItems(data);
            } catch (err) {
                console.error("Top items fetch error:", err);
            } finally {
                setTopItemsLoading(false);
            }
        };
        fetchTopItems();
    }, [itemCategory]);

    // Fetch Vendor Analysis
    useEffect(() => {
        const fetchVendorAnalysis = async () => {
            try {
                setVendorLoading(true);
                const data = await api.getVendorSpendAnalysis({ 
                    days: timeRange, 
                    top_n: topVendorsCount 
                });
                setVendorData(data);
            } catch (err) {
                console.error("Vendor analysis fetch error:", err);
            } finally {
                setVendorLoading(false);
            }
        };
        fetchVendorAnalysis();
    }, [timeRange, topVendorsCount]);

    // Fetch Wastage Analytics
    useEffect(() => {
        const fetchWastage = async () => {
            try {
                setWastageLoading(true);
                const data = await api.getWastageAnalytics();
                setWastageData(data);
            } catch (err) {
                console.error("Wastage fetch error:", err);
            } finally {
                setWastageLoading(false);
            }
        };
        fetchWastage();
    }, []);

    return (
        <div className="main-container">
            <header className="welcome-header animate-fade-in">
                <h1>Procurement Dashboard</h1>
                <p>Monitor your modules and real-time expenditure analytics.</p>
            </header>
            
            {pendingMRCount > 0 && (
                <div className="glass animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--color-success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(46, 204, 113, 0.05)' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--color-success)' }}>📦 Ready for Procurement</h3>
                        <p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>There are <strong>{pendingMRCount}</strong> management-approved requests ready to be fulfilled.</p>
                    </div>
                    <Link to="/procurement/kitchen-mrs">
                        <button className="action-btn" style={{ background: 'var(--color-success)' }}>Process Requests</button>
                    </Link>
                </div>
            )}

            {reconcileMRCount > 0 && (
                <div className="glass animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #f39c12', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(243, 156, 18, 0.05)' }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#f39c12' }}>🔄 Pending Reconciliation</h3>
                        <p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>There are <strong>{reconcileMRCount}</strong> requests awaiting final audit.</p>
                    </div>
                    <Link to="/procurement/kitchen-mrs?status=PENDING_RECONCILE">
                        <button className="action-btn" style={{ background: '#f39c12' }}>Confirm Reconciliations</button>
                    </Link>
                </div>
            )}

            {acceptedMRs.length > 0 && (
                <div className="glass animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #bb9af7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(187, 154, 247, 0.05)' }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#bb9af7' }}>✅ Stock Accepted by Kitchen</h3>
                        <p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>
                            Kitchen has confirmed receipt for <strong>{acceptedMRs.length}</strong> request(s): {' '}
                            {acceptedMRs.slice(0, 3).map((mr, i) => (
                                <span key={mr.id}>
                                    <Link to={`/procurement/kitchen-mrs/view/${mr.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>{mr.mr_number}</Link>
                                    {i < Math.min(acceptedMRs.length, 3) - 1 ? ', ' : ''}
                                </span>
                            ))}
                            {acceptedMRs.length > 3 && ` and ${acceptedMRs.length - 3} more...`}
                        </p>
                    </div>
                    <Link to="/procurement/kitchen-mrs?status=ACCEPTED">
                        <button className="action-btn" style={{ background: '#bb9af7' }}>View Accepted</button>
                    </Link>
                </div>
            )}

            {/* ANALYTICS GRIDS */}
            <div style={styles.gridContainer}>
                {/* Top Items */}
                <div className="glass animate-fade-in" style={styles.card}>
                    <div style={styles.filterRow}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Top 10 Purchased Items</h3>
                        <select style={styles.select} value={itemCategory} onChange={(e) => setItemCategory(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {topItemsLoading ? <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>Loading Items...</div> : (
                        <div style={{ overflowX: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <th style={{ padding: '1rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', width: '30%' }}>Item Name</th>
                                        <th style={{ padding: '1rem 1rem', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'right', width: '20%' }}>Total Spend</th>
                                        <th style={{ padding: '1rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'right', width: '50%' }}>Price History</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topItems.map((item) => {
                                        const displayPrices = [...item.prices].reverse();
                                        const maxPrice = Math.max(...item.prices.map(p => p.price)) || 1;
                                        const minPrice = Math.min(...item.prices.map(p => p.price)) || 0;
                                        return (
                                            <tr key={item.item_id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                                <td style={{ padding: '1rem 0.8rem', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.item_name}>{item.item_name}</td>
                                                <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: 700, color: '#9ece6a', fontSize: '0.85rem' }}>₹{Math.round(item.total_spend).toLocaleString()}</td>
                                                <td style={{ padding: '1rem 0.8rem' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                        {displayPrices.map((p, i) => {
                                                            const intensity = maxPrice === minPrice ? 0.5 : (p.price - minPrice) / (maxPrice - minPrice);
                                                            const bgOpacity = 0.1 + (intensity * 0.7);
                                                            return (
                                                                <div key={i} title={`${new Date(p.date).toLocaleDateString()}: ₹${p.price}`} style={{ padding: '2px 5px', background: `rgba(122, 162, 247, ${bgOpacity})`, borderRadius: '4px', fontSize: '0.65rem', color: intensity > 0.6 ? '#fff' : 'var(--text-main)', minWidth: '38px', textAlign: 'center' }}>
                                                                    ₹{Math.round(p.price)}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Vendor Analysis */}
                <div className="glass animate-fade-in" style={styles.card}>
                    <div style={styles.filterRow}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Supplier Spend Analysis</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select style={styles.select} value={topVendorsCount} onChange={(e) => setTopVendorsCount(e.target.value)}>
                                <option value="5">Top 5</option>
                                <option value="10">Top 10</option>
                            </select>
                            <select style={styles.select} value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                                <option value="7">7 Days</option>
                                <option value="30">30 Days</option>
                                <option value="90">90 Days</option>
                            </select>
                        </div>
                    </div>
                    <VendorStackedChart data={vendorData} loading={vendorLoading} />
                </div>

                {/* Wastage */}
                <div className="glass animate-fade-in" style={{ ...styles.card, gridColumn: '1 / -1' }}>
                    <div style={styles.filterRow}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Wastage & Loss Analytics</h3>
                        <Link to="/procurement/reports/stock-transition" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>View Full Ledger →</Link>
                    </div>
                    <WastageSummary data={wastageData} loading={wastageLoading} />
                </div>
            </div>

            <div className="actions-grid">
                {hasPermission('can_place_po') || hasPermission('can_edit_po') || hasPermission('can_view_pr_entries') || hasPermission('can_approve_pr_l1') || hasPermission('can_approve_pr_l2') ? (
                    <Link to="/procurement/pr" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="glass action-card" style={{ '--accent-color': 'var(--color-primary)' }}>
                            <div className="card-icon-wrapper">🛒</div>
                            <h3>Material Purchase Requests</h3>
                            <p>Place new requests with vendors and tracking incoming shipments.</p>
                            <button className="action-btn">Go to PRs</button>
                        </div>
                    </Link>
                ) : (
                    <div className="glass action-card" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                        <div className="card-icon-wrapper">🛒</div>
                        <h3>Material Purchase Requests</h3>
                        <p style={{ color: '#ef4444' }}>🚫 Access Restricted</p>
                    </div>
                )}

                {hasPermission('can_manage_mr') && (
                    <Link to="/procurement/kitchen-mrs" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="glass action-card" style={{ '--accent-color': '#2ecc71' }}>
                            <div className="card-icon-wrapper">🍳</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>Process Kitchen MR</h3>
                                {pendingMRCount > 0 && (
                                    <span style={{ background: '#2ecc71', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                        {pendingMRCount + reconcileMRCount}
                                    </span>
                                )}
                            </div>
                            <p>Fulfill management-approved material requests and audit reconciled consumption.</p>
                            <button className="action-btn">Go to Queue</button>
                        </div>
                    </Link>
                )}

                {hasPermission('can_manage_vendors') ? (
                    <Link to="/procurement/master-data/vendors" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="glass action-card" style={{ '--accent-color': 'var(--color-secondary)' }}>
                            <div className="card-icon-wrapper">🏢</div>
                            <h3>Vendor Registry</h3>
                            <p>Manage your business relationships and supplier contact data.</p>
                            <button className="action-btn">Manage Vendors</button>
                        </div>
                    </Link>
                ) : (
                    <div className="glass action-card" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                        <div className="card-icon-wrapper">🏢</div>
                        <h3>Vendor Registry</h3>
                        <p style={{ color: '#ef4444' }}>🚫 Access Restricted</p>
                    </div>
                )}

                {hasPermission('can_manage_items') || hasPermission('can_manage_categories') || hasPermission('can_manage_tax') ? (
                    <Link to="/procurement/master-data/items" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="glass action-card" style={{ '--accent-color': 'var(--color-accent)' }}>
                            <div className="card-icon-wrapper">⚙️</div>
                            <h3>Master Data</h3>
                            <p>Configure items, categories, and tax rate history.</p>
                            <button className="action-btn">Setup Data</button>
                        </div>
                    </Link>
                ) : (
                    <div className="glass action-card" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                        <div className="card-icon-wrapper">⚙️</div>
                        <h3>Master Data</h3>
                        <p style={{ color: '#ef4444' }}>🚫 Access Restricted</p>
                    </div>
                )}

                {hasPermission('can_view_reports') && (
                    <Link to="/procurement/stock" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="glass action-card" style={{ '--accent-color': '#f39c12' }}>
                            <div className="card-icon-wrapper">📊</div>
                            <h3>Stock Balance Report</h3>
                            <p>Consolidated view of purchases, issuances, returns and current balances.</p>
                            <button className="action-btn">View Report</button>
                        </div>
                    </Link>
                )}

                {hasPermission('can_view_pr_entries') && (
                    <div className="glass action-card" style={{ '--accent-color': '#e74c3c' }}>
                        <div className="card-icon-wrapper">🔄</div>
                        <h3>Vendor Returns</h3>
                        <p>Manage items being sent back to suppliers and view history.</p>
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <Link to="/procurement/vendor-returns" style={{ flex: 1, textDecoration: 'none' }}>
                                <button className="action-btn" style={{ width: '100%', padding: '0.8rem 0' }}>New Return</button>
                            </Link>
                            <Link to="/procurement/vendor-returns/history" style={{ flex: 1, textDecoration: 'none' }}>
                                <button className="action-btn" style={{ background: 'var(--bg-glass-heavy)', width: '100%', padding: '0.8rem 0' }}>History</button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProcurementLanding;
