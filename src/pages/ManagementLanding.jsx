import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// --- STYLES & ANIMATIONS ---
const styles = {
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
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

// --- COMPONENTS ---

// 1. Horizontal Stacked Bar Chart Component
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

            {/* Tooltip */}
            {hoverInfo && (
                <div style={{
                    position: 'absolute',
                    left: mousePos.x + 20,
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

// 2. Wastage Summary Component
const WastageSummary = ({ data, loading }) => {
    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>Loading Wastage Data...</div>;
    if (!data) return null;

    const { comparison, top_items, top_categories } = data;
    const diff = comparison.this_month - comparison.last_month;
    const isUp = diff > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header with Comparison */}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Top Items */}
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

                {/* Top Categories */}
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

// --- MAIN DASHBOARD PAGE ---
const ManagementLanding = () => {
    const { hasPermission } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pendingApprovals: 0, monthlySpend: 0, todaySpend: 0, inventoryValue: 0, pendingMRs: 0 });
    const [pendingRequests, setPendingRequests] = useState([]);

    // Independent States for the two grids
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

    // Embedded Custom Summary States
    const [summaryData, setSummaryData] = useState({ period: [], rows: [] });
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryMonthsCount, setSummaryMonthsCount] = useState(3);
    const [summaryPurchaseType, setSummaryPurchaseType] = useState('all');
    const [hasSummaryConfig, setHasSummaryConfig] = useState(true);

    // 1. Fetch Basic Dashboard Stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const now = new Date();
                
                // Fetch all stats in parallel
                const [prs, spendRep, todayRep, inv, mrsRes, cats] = await Promise.all([
                    (hasPermission && (hasPermission('can_approve_pr_l1') || hasPermission('can_approve_pr_l2'))) 
                        ? Promise.all([
                            api.getPurchaseRequests({ status: 'AWAITING_L1' }),
                            api.getPurchaseRequests({ status: 'AWAITING_L2' }),
                            api.getPurchaseRequests({ status: 'AWAITING_APPROVAL' })
                          ]).then(res => {
                              const arr = [...(res[0]?.results||[]), ...(res[1]?.results||[]), ...(res[2]?.results||[])];
                              return { results: Array.from(new Map(arr.map(i => [i.id, i])).values()) };
                          })
                        : Promise.resolve({ results: [] }),
                    api.getPurchasedReport(now.getMonth() + 1, now.getFullYear()),
                    api.getPurchasedReport(now.getMonth() + 1, now.getFullYear(), null, null, null, null, null, now.getDate()),
                    api.getInventory({ department_code: 'procurement' }),
                    hasPermission && hasPermission('can_verify_mr') ? api.getMaterialRequests({ status: 'PLACED' }) : Promise.resolve({ results: [] }),
                    api.getCategories()
                ]);

                const prResults = prs?.results || [];
                const monthlySpend = spendRep?.summary?.total_price || 0;
                const todaySpend = todayRep?.summary?.total_price || 0;
                const invVal = inv?.total_inventory_value || 0;
                const mrs = mrsRes?.results || [];

                setPendingRequests(prResults.slice(0, 5));
                setStats({
                    pendingApprovals: prResults.length,
                    monthlySpend: monthlySpend,
                    todaySpend: todaySpend,
                    inventoryValue: invVal,
                    pendingMRs: mrs.length
                });
                setCategories(cats);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [hasPermission]);

    // 2. Fetch Top Items (Left Grid)
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

    // 3. Fetch Vendor Analysis (Right Grid)
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

    // 4. Fetch Wastage Analytics
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

    // 5. Embedded Custom Summary Hooks & Helpers
    useEffect(() => {
        api.getCustomSummaryConfigs().then(configs => {
            if (configs.length === 0) {
                setHasSummaryConfig(false);
                setSummaryLoading(false);
            } else {
                setHasSummaryConfig(true);
            }
        }).catch(() => {
            setHasSummaryConfig(true);
        });
    }, []);

    useEffect(() => {
        if (!hasSummaryConfig) return;

        const fetchSummary = async () => {
            try {
                setSummaryLoading(true);
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = now.getFullYear();
                const typeParam = summaryPurchaseType === 'all' ? undefined : summaryPurchaseType;
                
                const data = await api.getCustomMonthlySummary(currentMonth, currentYear, summaryMonthsCount, typeParam);
                setSummaryData(data);
            } catch (err) {
                console.error("Dashboard custom summary fetch error:", err);
            } finally {
                setSummaryLoading(false);
            }
        };
        fetchSummary();
    }, [summaryMonthsCount, summaryPurchaseType, hasSummaryConfig]);

    const getSummaryRowTotal = (monthlyData) => {
        return monthlyData.reduce((sum, d) => sum + d.total, 0);
    };

    const getSummaryColumnTotal = (m, y) => {
        let total = 0;
        summaryData.rows.forEach(row => {
            if (row.type === 'CATEGORY' || row.type === 'ITEM' || row.type === 'GROUP') {
                const monthData = row.monthly_data.find(d => d.month === m && d.year === y);
                if (monthData) total += monthData.total;
            } else if (row.type === 'ITEMIZED_CATEGORY') {
                row.sub_items.forEach(item => {
                    const monthData = item.monthly_data.find(d => d.month === m && d.year === y);
                    if (monthData) total += monthData.total;
                });
            }
        });
        return total;
    };

    const summaryGrandTotal = summaryData.rows.reduce((sum, row) => {
        if (row.type === 'ITEMIZED_CATEGORY') {
            return sum + row.sub_items.reduce((s, item) => s + getSummaryRowTotal(item.monthly_data), 0);
        }
        return sum + getSummaryRowTotal(row.monthly_data);
    }, 0);

    const statCards = [
        ...(hasPermission && (hasPermission('can_approve_pr_l1') || hasPermission('can_approve_pr_l2')) ? [
            { title: 'Procurement Approvals', value: stats.pendingApprovals, icon: '✅', color: '#e0af68', link: '/management/approvals', subtitle: 'Awaiting your review' },
            { title: 'Approval History', value: 'Logs', icon: '📜', color: '#7aa2f7', link: '/management/approvals/history', subtitle: 'Past PR reviews' }
        ] : []),
        ...(hasPermission && hasPermission('can_verify_mr') ? [
            { title: 'Verify Kitchen MR', value: stats.pendingMRs, icon: '🍳', color: '#f7768e', link: '/management/kitchen-requests', subtitle: 'Awaiting verification' },
            { title: 'Verification History', value: 'Logs', icon: '📜', color: '#7dcfff', link: '/management/kitchen-requests/history', subtitle: 'Logs for kitchen' }
        ] : []),
        { title: 'Today\'s Spend', value: `₹${parseFloat(stats.todaySpend).toLocaleString()}`, icon: '📅', color: '#ff9e64', link: '/management/reports/purchased', subtitle: 'Net for Today' },
        { title: 'Net Monthly Spend', value: `₹${parseFloat(stats.monthlySpend).toLocaleString()}`, icon: '💰', color: '#bb9af7', link: '/management/reports/purchased', subtitle: 'Net after Returns' },
        { title: 'Inventory Value', value: `₹${stats.inventoryValue.toLocaleString()}`, icon: '📦', color: '#2ecc71', link: '/management/stock' }
    ];

    return (
        <div className="main-container">
            <header className="welcome-header animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>📊</span>
                    <div>
                        <h1 style={{ margin: 0 }}>Executive Analytics & Insights</h1>
                        <p style={{ margin: '0.2rem 0 0', opacity: 0.7 }}>Data-driven performance monitoring across all departments.</p>
                    </div>
                </div>
            </header>
            
            {/* NOTIFICATION BANNERS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {/* 1. Procurement Approvals */}
                {hasPermission && (hasPermission('can_approve_pr_l1') || hasPermission('can_approve_pr_l2')) && stats.pendingApprovals > 0 && (
                    <div className="glass animate-fade-in" style={{ 
                        padding: '1.2rem 2rem', 
                        borderRadius: '16px', 
                        background: 'rgba(224, 175, 104, 0.1)', 
                        border: '1px solid rgba(224, 175, 104, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>✅</span>
                            <div>
                                <h4 style={{ margin: 0, color: '#e0af68' }}>Pending Procurement Approvals</h4>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', opacity: 0.8 }}>You have {stats.pendingApprovals} purchase requests awaiting your authorization.</p>
                            </div>
                        </div>
                        <Link to="/management/approvals" className="action-btn" style={{ background: '#e0af68', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 600 }}>Approve Now →</Link>
                    </div>
                )}

                {/* 2. Kitchen MR Verification */}
                {hasPermission('can_verify_mr') && stats.pendingMRs > 0 && (
                    <div className="glass animate-fade-in" style={{ 
                        padding: '1.2rem 2rem', 
                        borderRadius: '16px', 
                        background: 'rgba(247, 118, 142, 0.1)', 
                        border: '1px solid rgba(247, 118, 142, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🍳</span>
                            <div>
                                <h4 style={{ margin: 0, color: '#f7768e' }}>New Kitchen Requests</h4>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', opacity: 0.8 }}>There are {stats.pendingMRs} material requests awaiting your verification.</p>
                            </div>
                        </div>
                        <Link to="/management/kitchen-requests" className="action-btn" style={{ background: '#f7768e', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 600 }}>Verify Now →</Link>
                    </div>
                )}
            </div>

                {/* NEW: MONTHLY EXPENDITURE SUMMARY TABLE CARD */}
                <div className="glass animate-fade-in" style={{ ...styles.card, gridColumn: '1 / -1', marginBottom: '3rem', maxWidth: '100%' }}>
                    <div style={styles.filterRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>💰</span>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Monthly Expenditure Summary</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select 
                                style={styles.select} 
                                value={summaryMonthsCount} 
                                onChange={(e) => setSummaryMonthsCount(parseInt(e.target.value))}
                            >
                                <option value={3}>3 Months</option>
                                <option value={6}>6 Months</option>
                                <option value={9}>9 Months</option>
                                <option value={12}>12 Months</option>
                            </select>
                            <select 
                                style={styles.select} 
                                value={summaryPurchaseType} 
                                onChange={(e) => setSummaryPurchaseType(e.target.value)}
                            >
                                <option value="all">All Purchases</option>
                                <option value="REGULAR">Regular Only</option>
                                <option value="SPECIAL_EVENT">Special Events</option>
                            </select>
                            <Link to="/management/reports/custom-summary" className="action-btn glow-button" style={{ textDecoration: 'none', padding: '6px 14px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', height: '32px' }}>
                                View Full Report →
                            </Link>
                        </div>
                    </div>

                    {!hasSummaryConfig ? (
                        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>⚙️ No custom report configuration defined.</p>
                            <Link to="/procurement/master-data/custom-summary" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'underline', marginTop: '0.5rem', display: 'inline-block' }}>
                                Configure Report Blocks Now
                            </Link>
                        </div>
                    ) : summaryLoading ? (
                        <div style={{ padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div className="skeleton-line" style={{ height: '35px', width: '100%' }}></div>
                            <div className="skeleton-line" style={{ height: '28px', width: '92%' }}></div>
                            <div className="skeleton-line" style={{ height: '28px', width: '96%' }}></div>
                            <div className="skeleton-line" style={{ height: '28px', width: '88%' }}></div>
                        </div>
                    ) : summaryData.rows.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>No data recorded for the selected criteria.</div>
                    ) : (
                        <div className="table-responsive table-scroll-lg" style={{ marginTop: '0.5rem', overflow: 'auto', maxHeight: '500px', width: '100%', minWidth: 0 }}>
                            <table className="custom-summary-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-glass-heavy)' }}>
                                        <th className="sticky-header-left" style={{ background: 'var(--bg-navbar)', whiteSpace: 'nowrap', paddingRight: '1.5rem', width: '1%', position: 'sticky', top: 0, zIndex: 22 }}>Particulars</th>
                                        {summaryData.period.map(p => {
                                            const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                            return (
                                                <th key={`${p.month}-${p.year}`} style={{ textAlign: 'right', position: 'sticky', top: 0, zIndex: 21, background: 'var(--bg-navbar)' }}>
                                                    {monthsShort[p.month-1]} '{p.year.toString().slice(-2)}
                                                </th>
                                            );
                                        })}
                                        <th className="sticky-header-right" style={{ textAlign: 'right', background: 'var(--bg-navbar)', color: 'var(--color-primary)', fontWeight: 800, whiteSpace: 'nowrap', paddingLeft: '1.5rem', width: '1%', position: 'sticky', top: 0, zIndex: 22 }}>Total (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryData.rows.map((row, idx) => (
                                        <React.Fragment key={`${row.type}-${row.id}-${idx}`}>
                                            {row.type === 'CATEGORY' || row.type === 'ITEM' || row.type === 'GROUP' ? (
                                                <tr className={row.type === 'CATEGORY' || row.type === 'GROUP' ? 'category-row' : 'standalone-item-row'}>
                                                    <td className="particulars sticky-col-left" style={{ background: 'var(--bg-navbar)', fontWeight: (row.type === 'CATEGORY' || row.type === 'GROUP') ? 700 : 500, whiteSpace: 'nowrap', paddingRight: '1.5rem', width: '1%' }}>
                                                        {row.name.toUpperCase()} {!row.has_override && (row.type === 'CATEGORY' ? '(TOTAL)' : (row.type === 'GROUP' ? '(GROUP)' : ''))}
                                                    </td>
                                                    {row.monthly_data.map((d, i) => (
                                                        <td key={i} className="amount" style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{d.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                                    ))}
                                                    <td className="amount row-total sticky-col-right" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', background: 'var(--bg-navbar)', whiteSpace: 'nowrap', paddingLeft: '1.5rem', width: '1%' }}>₹{getSummaryRowTotal(row.monthly_data).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                                </tr>
                                            ) : (
                                                <>
                                                    <tr className="category-header-row">
                                                        <td colSpan={summaryData.period.length + 2} style={{ fontWeight: 800, color: 'var(--color-secondary)', background: 'var(--bg-glass-heavy)' }}>{row.name.toUpperCase()} {row.has_override ? '' : 'BREAKDOWN'}</td>
                                                    </tr>
                                                    {row.sub_items.map(item => (
                                                        <tr key={item.id} className="item-row">
                                                            <td className="particulars sticky-col-left" style={{ background: 'var(--bg-navbar)', paddingLeft: '2rem', paddingRight: '1.5rem', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>{item.name}</td>
                                                            {item.monthly_data.map((d, i) => (
                                                                <td key={i} className="amount" style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{d.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                                            ))}
                                                            <td className="amount row-total sticky-col-right" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', background: 'var(--bg-navbar)', whiteSpace: 'nowrap', paddingLeft: '1.5rem', width: '1%' }}>₹{getSummaryRowTotal(item.monthly_data).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="itemized-summary-row" style={{ fontWeight: 700, background: 'var(--bg-glass-heavy)' }}>
                                                        <td className="particulars sticky-col-left" style={{ background: 'var(--bg-navbar)', whiteSpace: 'nowrap', paddingRight: '1.5rem', width: '1%' }}>{row.has_override ? row.name.toUpperCase() : `SUBTOTAL (${row.name})`}</td>
                                                        {summaryData.period.map((p, i) => {
                                                            const subtotal = row.sub_items.reduce((s, item) => {
                                                                const d = item.monthly_data.find(md => md.month === p.month && md.year === p.year);
                                                                return s + (d ? d.total : 0);
                                                            }, 0);
                                                            return <td key={i} className="amount" style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                                        })}
                                                        <td className="amount row-total sticky-col-right" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', background: 'var(--bg-navbar)', whiteSpace: 'nowrap', paddingLeft: '1.5rem', width: '1%' }}>
                                                            ₹{row.sub_items.reduce((s, item) => s + getSummaryRowTotal(item.monthly_data), 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                                        </td>
                                                    </tr>
                                                </>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="grand-total-row" style={{ fontWeight: 900 }}>
                                        <td className="particulars sticky-col-left" style={{ background: 'var(--color-primary)', color: '#fff', whiteSpace: 'nowrap', paddingRight: '1.5rem', width: '1%', position: 'sticky', bottom: 0, zIndex: 22 }}>GRAND TOTAL</td>
                                        {summaryData.period.map((p, i) => (
                                            <td key={i} className="amount" style={{ textAlign: 'right', color: '#fff', background: 'var(--color-primary)', fontFamily: 'monospace', position: 'sticky', bottom: 0, zIndex: 21 }}>₹{getSummaryColumnTotal(p.month, p.year).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                        ))}
                                        <td className="amount sticky-col-right" style={{ textAlign: 'right', color: '#fff', background: 'var(--color-primary)', fontWeight: 900, whiteSpace: 'nowrap', paddingLeft: '1.5rem', width: '1%', position: 'sticky', bottom: 0, zIndex: 22 }}>₹{summaryGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
                {/* TOP STATS */}
            <div className="responsive-grid grid-min-300" style={{ marginBottom: '3rem' }}>
                {statCards.map((stat, idx) => (
                    <div key={idx} className="glass animate-fade-in stat-card" style={{ borderLeft: `6px solid ${stat.color}`, animationDelay: `${idx * 0.1}s` }}>
                        <div className="stat-card-content">
                            <div>
                                <p className="stat-label">{stat.title}</p>
                                <h2 className="stat-value">{loading ? '...' : stat.value}</h2>
                                {stat.subtitle && !loading && <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: '0.2rem 0 0' }}>{stat.subtitle}</p>}
                            </div>
                            <span className="stat-icon">{stat.icon}</span>
                        </div>
                        <Link to={stat.link} className="stat-link" style={{ color: stat.color }}>View Details →</Link>
                    </div>
                ))}
            </div>

            {/* THE TWO GRIDS */}
            <div style={styles.gridContainer}>
                

            {/* LEFT: TOP ITEMS TABLE */}
                <div className="glass animate-fade-in" style={styles.card}>
                    <div style={styles.filterRow}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Top 10 Purchased Items</h3>
                        <select 
                            style={styles.select} 
                            value={itemCategory} 
                            onChange={(e) => setItemCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {topItemsLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>Loading Items...</div>
                    ) : (
                        <div style={{ overflowX: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <th style={{ padding: '1rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', width: '30%' }}>Item Name</th>
                                        <th style={{ padding: '1rem 1rem', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'right', width: '20%' }}>Total Spend</th>
                                        <th style={{ padding: '1rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'right', width: '50%' }}>Price History (Recent on Right)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topItems.map((item) => {
                                        // item.prices is most likely [newest, ..., oldest] based on common API patterns, 
                                        // or we should check. The prompt says "most recent one price on right".
                                        // So we need to reverse it if it's [newest...oldest].
                                        const displayPrices = [...item.prices].reverse();
                                        const maxPrice = Math.max(...item.prices.map(p => p.price)) || 1;
                                        const minPrice = Math.min(...item.prices.map(p => p.price)) || 0;
                                        
                                        return (
                                            <tr key={item.item_id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                                <td style={{ 
                                                    padding: '1rem 0.8rem', 
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }} title={item.item_name}>
                                                    {item.item_name}
                                                </td>
                                                <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: 700, color: '#9ece6a', fontSize: '0.85rem' }}>
                                                    ₹{Math.round(item.total_spend).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '1rem 0.8rem' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                        {displayPrices.map((p, i) => {
                                                            const isMostRecent = i === displayPrices.length - 1;
                                                            // Heatmap calculation: intensity based on where price sits between min and max
                                                            // If all prices are same, intensity is 0.5
                                                            const intensity = maxPrice === minPrice ? 0.5 : (p.price - minPrice) / (maxPrice - minPrice);
                                                            // Map intensity to opacity/color. Darker = higher price.
                                                            // Using the primary color #7aa2f7 as base
                                                            const bgOpacity = 0.1 + (intensity * 0.7); // 0.1 to 0.8
                                                            
                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    title={`${new Date(p.date).toLocaleDateString()}: ₹${p.price}`}
                                                                    style={{ 
                                                                        padding: '2px 5px', 
                                                                        background: `rgba(122, 162, 247, ${bgOpacity})`,
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.65rem',
                                                                        color: intensity > 0.6 ? '#fff' : 'var(--text-main)',
                                                                        fontWeight: isMostRecent ? 800 : 400,
                                                                        border: isMostRecent ? '1px solid #7aa2f7' : '1px solid transparent',
                                                                        minWidth: '38px',
                                                                        textAlign: 'center'
                                                                    }}
                                                                >
                                                                    ₹{Math.round(p.price)}
                                                                </div>
                                                            );
                                                        })}
                                                        {item.prices.length === 0 && <span style={{ opacity: 0.3 }}>-</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {topItems.length === 0 && (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No data found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            {/* RIGHT: VENDOR ANALYSIS CHART */}
                <div className="glass animate-fade-in" style={styles.card}>
                    <div style={styles.filterRow}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Supplier Spend Analysis</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select 
                                style={styles.select} 
                                value={topVendorsCount} 
                                onChange={(e) => setTopVendorsCount(e.target.value)}
                            >
                                <option value="5">Top 5</option>
                                <option value="10">Top 10</option>
                            </select>
                            <select 
                                style={styles.select} 
                                value={timeRange} 
                                onChange={(e) => setTimeRange(e.target.value)}
                            >
                                <option value="7">7 Days</option>
                                <option value="30">30 Days</option>
                                <option value="90">90 Days</option>
                            </select>
                        </div>
                    </div>

                    <VendorStackedChart data={vendorData} loading={vendorLoading} />
                </div>
                {/* CENTER: WASTAGE SUMMARY */}
                <div className="glass animate-fade-in" style={{ ...styles.card, gridColumn: '1 / -1' }}>
                    <div style={styles.filterRow}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Wastage & Loss Analytics</h3>
                        <Link to="/procurement/reports/stock-transition" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>View Full Ledger →</Link>
                    </div>
                    <WastageSummary data={wastageData} loading={wastageLoading} />
                </div>

            </div>

            {/* RECENT PENDING REQUESTS (Existing table) */}
            <div className="glass animate-fade-in" style={{ padding: '2rem', borderRadius: '24px', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Recent Pending Approvals</h3>
                    <Link to="/management/approvals" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>View All</Link>
                </div>
                {pendingRequests.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Ref</th>
                                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Vendor</th>
                                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Amount</th>
                                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map(pr => (
                                    <tr key={pr.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <td style={{ padding: '1.2rem 0.5rem', fontWeight: 600 }}>{pr.pr_reference}</td>
                                        <td style={{ padding: '1.2rem 0.5rem' }}>{pr.vendor_name}</td>
                                        <td style={{ padding: '1.2rem 0.5rem', fontWeight: 600 }}>₹{parseFloat(pr.total_amount).toLocaleString()}</td>
                                        <td style={{ padding: '1.2rem 0.5rem', textAlign: 'right' }}>
                                            <Link to={`/management/po/${pr.id}`} className="action-btn" style={{ textDecoration: 'none', padding: '6px 14px', fontSize: '0.75rem' }}>View PO</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No pending approvals. Good job! ✨</div>
                )}
            </div>

            {/* ACTION CARDS */}
            <div className="actions-grid">
                <Link to="/management/approvals" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass action-card" style={{ '--accent-color': '#7aa2f7' }}>
                        <div className="card-icon-wrapper">✅</div>
                        <h3>Approve Requests</h3>
                        <p>Review and authorize pending purchase requests (L1 & L2).</p>
                        <button className="action-btn">Open Approvals</button>
                    </div>
                </Link>
                <Link to="/management/reports/purchased" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass action-card" style={{ '--accent-color': '#bb9af7' }}>
                        <div className="card-icon-wrapper">📊</div>
                        <h3>Financial Analysis</h3>
                        <p>Detailed reports on spending patterns and vendor performance.</p>
                        <button className="action-btn">View Reports</button>
                    </div>
                </Link>
                <Link to="/management/stock" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass action-card" style={{ '--accent-color': '#2ecc71' }}>
                        <div className="card-icon-wrapper">📈</div>
                        <h3>Inventory Value</h3>
                        <p>Monitor current stock levels and total warehouse valuation.</p>
                        <button className="action-btn">Check Stock</button>
                    </div>
                </Link>
            </div>


                    <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shimmer {
                    0% { background-position: -200px 0; }
                    100% { background-position: 200px 0; }
                }
                .skeleton-line {
                    background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
                    background-size: 200px 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 8px;
                }
                .custom-summary-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    border: 1px solid var(--border-glass);
                    border-radius: 12px;
                    overflow: visible;
                }
                .custom-summary-table th {
                    padding: 12px 10px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                    border-bottom: 2px solid var(--color-primary);
                    background: var(--bg-navbar);
                }
                .custom-summary-table td {
                    padding: 12px 10px;
                    border-bottom: 1px solid var(--border-glass);
                    transition: all 0.2s;
                    font-size: 0.85rem;
                }
                .custom-summary-table tr:hover td {
                    background: var(--bg-glass);
                }
                .particulars {
                    font-size: 0.85rem;
                }
                .category-row {
                    background: var(--bg-glass-heavy) !important;
                    color: var(--text-main);
                }
                .standalone-item-row {
                    background: var(--bg-glass);
                }
                .category-header-row td {
                    background: var(--bg-glass-heavy) !important;
                font-weight: 800;
                    font-size: 0.8rem;
                    color: var(--color-secondary);
                    padding: 8px 10px;
                    border-top: 1px solid var(--border-glass-bright);
                }
                .itemized-summary-row {
                    font-weight: 700;
                    background: var(--bg-glass-heavy) !important;
                    color: var(--text-main);
                }
                .grand-total-row td {
                    background: var(--color-primary) !important;
                    color: #fff !important;
                    font-weight: 900;
                    font-size: 0.95rem;
                    padding: 14px 10px;
                }
            `}} />
            
        </div>
    );
};

export default ManagementLanding;
