import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const KitchenConsumptionReport = () => {
    const [consumptions, setConsumptions] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Filters
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const [selectedItem, setSelectedItem] = useState('');
    const [startDate, setStartDate] = useState(firstOfMonth);
    const [endDate, setEndDate] = useState(today);
    const [mealType, setMealType] = useState('');
    const [reportData, setReportData] = useState({ results: [], summary: { total_cost: 0, total_people: 0, avg_per_head: 0 }, count: 0 });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState('20');

    const [expandedMrs, setExpandedMrs] = useState({});

    const MEAL_TYPES = {
        'BREAKFAST': 'Breakfast',
        'LUNCH': 'Lunch',
        'DINNER': 'Dinner',
        'SNACKS': 'Snacks',
        'DAILY': 'Daily Requirement',
        'SPECIAL': 'Special Events'
    };

    const toggleMr = (mrNo) => {
        setExpandedMrs(prev => ({
            ...prev,
            [mrNo]: !prev[mrNo]
        }));
    };

    const handleUpdateHeadcount = async (mrId, newCount) => {
        try {
            await api.updateMRHeadcount(mrId, { actual_user_count: newCount });
            alert('Headcount updated successfully!');
            fetchConsumptions();
        } catch (err) {
            console.error('Error updating headcount', err);
            alert('Failed to update headcount: ' + (err.error || JSON.stringify(err)));
        }
    };

    // ... existing fetch functions ...

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchConsumptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItem, startDate, endDate, mealType, page, pageSize]);

    const fetchInitialData = async () => {
        try {
            const itemsData = await api.getItems(1, 1000);
            setItems(itemsData.results || itemsData);
        } catch (err) {
            console.error("Failed to load items:", err);
            setError("Failed to load initial data.");
        }
    };

    const fetchConsumptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: page,
                page_size: pageSize
            };
            if (selectedItem) params.item_id = selectedItem;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (mealType) params.meal_type = mealType;

            const data = await api.getKitchenConsumptions(params);
            setReportData(data);
            setConsumptions(data.results || []);
        } catch (err) {
            console.error("Failed to fetch consumptions:", err);
            setError("Failed to load kitchen consumption data.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {};
            if (selectedItem) params.item_id = selectedItem;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (mealType) params.meal_type = mealType;

            const blob = await api.exportKitchenConsumptionsExcel(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Kitchen_Consumption_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to export Excel file.");
        } finally {
            setExporting(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header">
                <div className="mobile-wrap-header">
                    <div>
                        <h1>
                            <span>🔥</span>
                            Consumption Report
                        </h1>
                        <p>
                            Track daily ingredient consumption (Issued vs Returned).
                        </p>
                    </div>

                </div>
            </header>

            {/* Filter Bar */}
            <div className="glass responsive-grid grid-min-180" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
                <div className="form-group-stack">
                    <label>MATERIAL</label>
                    <select 
                        className="glass-input"
                        style={{ width: '100%' }}
                        value={selectedItem} 
                        onChange={(e) => setSelectedItem(e.target.value)}
                    >
                        <option value="">All Materials</option>
                        {items.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-group-stack">
                    <label>MEAL TYPE</label>
                    <select 
                        className="glass-input"
                        value={mealType} 
                        onChange={(e) => setMealType(e.target.value)}
                    >
                        <option value="">All Meal Types</option>
                        {Object.entries(MEAL_TYPES).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group-stack">
                    <label>START DATE</label>
                    <input 
                        type="date" 
                        className="glass-input"
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className="form-group-stack">
                    <label>END DATE</label>
                    <input 
                        type="date" 
                        className="glass-input"
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div className="grid-action-align" style={{ gridColumn: '1 / -1' }}>
                    <div className="mobile-stack-buttons" style={{ justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => {
                                setSelectedItem('');
                                setMealType('');
                                setStartDate(firstOfMonth);
                                setEndDate(today);
                                setPage(1);
                            }}
                            className="secondary-btn"
                        >
                            Clear Filters
                        </button>
                        
                        <button
                            onClick={fetchConsumptions}
                            disabled={loading}
                            className="action-btn"
                        >
                            <span className={loading ? 'animate-spin' : ''} style={{ display: 'inline-block', marginRight: '8px' }}>🔄</span>
                            {loading ? 'Refreshing...' : 'Refresh Data'}
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={exporting || consumptions.length === 0}
                            className="action-btn"
                            style={{ background: 'var(--status-success-text-vibrant)' }}
                        >
                            <span style={{ marginRight: '8px' }}>📥</span>
                            {exporting ? 'Exporting...' : 'Export Excel'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="glass error-alert animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '6px solid var(--status-error-text-vibrant)' }}>
                    <span className="icon">⚠️</span> {error}
                </div>
            )}

            {/* Summary Cards */}
            {!loading && consumptions.length > 0 && (
                <div className="responsive-grid grid-3" style={{ marginBottom: '2.5rem' }}>
                    {[
                        { 
                            label: 'Total Expenditure', 
                            value: `₹${parseFloat(reportData.summary?.total_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
                            icon: '💰',
                            color: '#2ecc71'
                        },
                        { 
                            label: 'Total Production Count', 
                            value: parseFloat(reportData.summary?.total_people || 0).toLocaleString(),
                            icon: '👥',
                            color: '#3498db'
                        },
                        { 
                            label: 'Avg. Expense / Production', 
                            value: `₹${parseFloat(reportData.summary?.avg_per_head || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
                            icon: '📊',
                            color: '#f1c40f'
                        }
                    ].map((stat, idx) => (
                        <div 
                            key={idx} 
                            className="glass animate-fade-in" 
                            style={{ 
                                padding: '1.5rem', 
                                borderRadius: '20px', 
                                borderLeft: `5px solid ${stat.color}`, 
                                animationDelay: `${idx * 0.1}s`,
                                cursor: stat.label === 'Total Production Count' ? 'pointer' : 'default',
                                transition: 'all 0.2s ease',
                                transform: stat.label === 'Total Production Count' ? undefined : 'none'
                            }}
                            onClick={() => {
                                if (stat.label === 'Total Production Count') {
                                    navigate(location.pathname.replace('kitchen-consumption', 'production-calendar'));
                                }
                            }}
                            onMouseEnter={(e) => {
                                if (stat.label === 'Total Production Count') {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (stat.label === 'Total Production Count') {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-glass)';
                                }
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{stat.label}</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stat.value}</div>
                                </div>
                                <span style={{ fontSize: '2.5rem', opacity: 0.8 }}>{stat.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Data Table */}
            <div className="glass" style={{ padding: '2rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.4rem' }}>Daily Consumption Ledger</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SHOW</span>
                            <select 
                                className="glass-input" 
                                value={pageSize} 
                                onChange={(e) => { setPageSize(e.target.value); setPage(1); }}
                                style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: '0.85rem' }}
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                        <span style={{ fontSize: '0.8rem', background: 'var(--bg-glass)', padding: '0.4rem 1rem', borderRadius: '50px', fontWeight: 600 }}>
                            Showing {consumptions.length} of {reportData.count || 0} Record{reportData.count !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="table-responsive table-scroll-lg">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.8rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                <th style={{ padding: '0.5rem 1.5rem' }}>Date & Meal</th>
                                <th style={{ padding: '0.5rem 1.5rem' }}>Material</th>
                                <th style={{ padding: '0.5rem 1.5rem', textAlign: 'center' }}>Total Issued</th>
                                <th style={{ padding: '0.5rem 1.5rem', textAlign: 'center' }}>Total Returned</th>
                                <th style={{ padding: '0.5rem 1.5rem', textAlign: 'center' }}>Net Consumed</th>
                                <th style={{ padding: '0.5rem 1.5rem', textAlign: 'right' }}>Unit Cost</th>
                                <th style={{ padding: '0.5rem 1.5rem', textAlign: 'right' }}>Total Cost</th>
                                <th style={{ padding: '0.5rem 1.5rem', textAlign: 'center' }}>Count</th>
                                <th style={{ padding: '0.5rem 1.5rem', textAlign: 'right' }}>Exp/Production</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && consumptions.length === 0 ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} style={{ opacity: 0.3 }}>
                                        <td colSpan="9" style={{ padding: '1.5rem' }}>
                                            <div className="animate-pulse" style={{ background: 'var(--bg-glass-heavy)', height: '40px', borderRadius: '12px' }}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : consumptions.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.4 }}>🍽️</div>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>No consumption records match your filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                (() => {
                                    // Group by MR Number
                                    const groups = {};
                                    consumptions.forEach(row => {
                                        if (!groups[row.mr_number]) groups[row.mr_number] = [];
                                        groups[row.mr_number].push(row);
                                    });

                                    return Object.keys(groups).map(mrNo => {
                                        const groupRows = groups[mrNo];
                                        const mealTotalCost = groupRows.reduce((sum, row) => sum + parseFloat(row.total_cost || 0), 0);
                                        const userCount = parseInt(groupRows[0].user_count || 0);
                                        const mealExpPerHead = userCount > 0 ? mealTotalCost / userCount : 0;
                                        const isExpanded = expandedMrs[mrNo];

                                        return (
                                            <React.Fragment key={mrNo}>
                                                {/* MR Summary Row (Collapsible Toggle) */}
                                                <tr 
                                                    onClick={() => toggleMr(mrNo)}
                                                    className="hover-bright"
                                                    style={{ 
                                                        background: isExpanded ? 'var(--bg-glass-heavy)' : 'var(--bg-glass)', 
                                                        cursor: 'pointer',
                                                        transition: 'var(--transition)',
                                                        borderLeft: isExpanded ? '4px solid var(--color-primary)' : '4px solid transparent'
                                                    }}
                                                >
                                                    <td style={{ padding: '1.2rem 1.5rem', borderTopLeftRadius: '16px', borderBottomLeftRadius: isExpanded ? '0' : '16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <span style={{ 
                                                                display: 'inline-block', 
                                                                transition: 'transform 0.3s ease',
                                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                                fontSize: '1.2rem',
                                                                color: isExpanded ? 'var(--color-primary)' : 'var(--text-muted)'
                                                            }}>▶</span>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                                                                    {formatDate(groupRows[0].date)}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                                    {groupRows[0].meal_type}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                                        <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.9rem' }}>MR: {mrNo}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{groupRows.length} Items</div>
                                                    </td>
                                                    <td colSpan="4" style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL MEAL COST:</span>
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>
                                                            ₹{mealTotalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                <div style={{ fontWeight: 800, color: 'var(--color-secondary)', fontSize: '1rem' }}>{userCount}</div>
                                                                {groupRows[0].status === 'COMPLETED' && hasPermission('can_manage_mr') && (
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newCount = prompt('Enter new headcount:', userCount);
                                                                            if (newCount !== null && newCount !== '' && !isNaN(parseInt(newCount))) {
                                                                                handleUpdateHeadcount(groupRows[0].mr_id, parseInt(newCount));
                                                                            }
                                                                        }}
                                                                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                                                                        title="Edit Headcount"
                                                                    >✏️</button>
                                                                )}
                                                            </div>
                                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>PEOPLE</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', borderTopRightRadius: '16px', borderBottomRightRadius: isExpanded ? '0' : '16px' }}>
                                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-success)' }}>
                                                            ₹{mealExpPerHead.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                        </div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PER HEAD</div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Item Details */}
                                                {isExpanded && groupRows.map((row, idx) => (
                                                    <tr key={`${mrNo}-${row.id}`} className="animate-slide-down" style={{ background: 'rgba(255, 255, 255, 0.03)', borderLeft: '4px solid var(--color-primary)' }}>
                                                        <td style={{ padding: '1rem 1.5rem', opacity: 0.6, fontSize: '0.85rem' }}>
                                                            {/* Placeholder for Date & Meal column in nested view */}
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>{row.item_name}</div>
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                                {parseFloat(row.issued).toLocaleString()} <span style={{fontSize: '0.7rem'}}>{row.unit}</span>
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                            <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                                                                {parseFloat(row.returned).toLocaleString()} <span style={{fontSize: '0.7rem'}}>{row.unit}</span>
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-success)' }}>
                                                                {parseFloat(row.consumed).toLocaleString()} <span style={{fontSize: '0.7rem'}}>{row.unit}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                ₹{parseFloat(row.unit_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                                                ₹{parseFloat(row.total_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </div>
                                                        </td>
                                                        <td colSpan="2" style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottomRightRadius: idx === groupRows.length - 1 ? '16px' : '0' }}>
                                                            Exp/P: ₹{(parseFloat(row.total_cost || 0) / (row.user_count || 1)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {isExpanded && <tr style={{ height: '0.5rem' }}></tr>} {/* Spacer after expanded group */}
                                            </React.Fragment>
                                        );
                                    });
                                })()
                            )}
                        </tbody>
                        {consumptions.length > 0 && (
                            <tfoot>
                                <tr style={{ background: 'var(--bg-glass-heavy)', borderTop: '2px solid var(--border-glass-bright)' }}>
                                    <td colSpan="6" style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', borderBottomLeftRadius: '16px' }}>
                                        GRAND TOTAL
                                    </td>
                                    <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 900, color: 'var(--color-primary)', fontSize: '1.3rem' }}>
                                        ₹{parseFloat(reportData.summary?.total_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                    <td style={{ padding: '1.5rem', textAlign: 'center', fontWeight: 900, fontSize: '1.3rem' }}>
                                        {parseFloat(reportData.summary?.total_people || 0).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 900, color: 'var(--color-secondary)', fontSize: '1.3rem', borderBottomRightRadius: '16px' }}>
                                        ₹{parseFloat(reportData.summary?.avg_per_head || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {pageSize !== 'all' && reportData.total_pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                    <button 
                        className="secondary-btn" 
                        disabled={!reportData.previous}
                        onClick={() => {
                            setPage(p => p - 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                    >
                        ◀ Prev
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        Page {page} of {reportData.total_pages}
                    </span>
                    <button 
                        className="secondary-btn" 
                        disabled={!reportData.next}
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
        </div>
    );
};

export default KitchenConsumptionReport;
