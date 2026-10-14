import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

const ConsumptionCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [dailyData, setDailyData] = useState({});
    const [mealType, setMealType] = useState('');
    
    // Chart toggle states
    const [showProduction, setShowProduction] = useState(true);
    const [showExpense, setShowExpense] = useState(true);
    const [showAverage, setShowAverage] = useState(true);

    useEffect(() => {
        const fetchMonthData = async () => {
            setLoading(true);
            try {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                
                // Format to YYYY-MM-DD
                const start_date = `${year}-${month.toString().padStart(2, '0')}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                const end_date = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
                const data = await api.getKitchenConsumptions({ 
                    start_date, 
                    end_date, 
                    page_size: 'all',
                    ...(mealType ? { meal_type: mealType } : {})
                });
    
                // Aggregate data by date
                const aggregated = {};
                if (data.results && data.results.length > 0) {
                    data.results.forEach(r => {
                        const date = r.date;
                        if (!aggregated[date]) {
                            aggregated[date] = { total_cost: 0, unique_mrs: {} };
                        }
                        aggregated[date].total_cost += parseFloat(r.total_cost || 0);
                        // To avoid double counting people served for multiple items in same MR, group by mr_number
                        if (r.mr_number) {
                            aggregated[date].unique_mrs[r.mr_number] = parseInt(r.user_count || 0);
                        }
                    });
                }
    
                // Calculate final metrics for each day
                const finalData = {};
                Object.keys(aggregated).forEach(date => {
                    const d = aggregated[date];
                    const total_people = Object.values(d.unique_mrs).reduce((sum, val) => sum + val, 0);
                    const avg_per_head = total_people > 0 ? d.total_cost / total_people : 0;
                    
                    finalData[date] = {
                        total_cost: d.total_cost,
                        total_people: total_people,
                        avg_per_head: avg_per_head
                    };
                });
    
                setDailyData(finalData);
            } catch (err) {
                console.error("Failed to fetch calendar data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMonthData();
    }, [currentDate, mealType]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleMonthChange = (e) => {
        if (!e.target.value) return;
        const [year, month] = e.target.value.split('-');
        setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
    };

    // Calendar Grid Generation
    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
        
        const days = [];
        
        // Empty slots for days before the 1st
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }
        
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            days.push({
                dayNumber: i,
                dateStr: dateStr,
                data: dailyData[dateStr] || null
            });
        }
        
        return days;
    };

    const days = getDaysInMonth();
    const monthYearString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Prepare data for the chart
    const chartData = days.filter(d => d !== null).map(d => {
        // Find if this date is past today or not, or just pass the values
        // For simplicity, we just use 0 if no data is found
        return {
            date: d.dayNumber.toString(),
            fullDate: d.dateStr,
            production: d.data ? d.data.total_people : null,
            expense: d.data ? d.data.total_cost : null,
            average: d.data ? d.data.avg_per_head : null
        };
    });

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.85rem', zIndex: 1000, background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(10px)' }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#f8fafc', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.4rem' }}>Date: {label}</p>
                    {payload.map((entry, index) => {
                        let formattedValue = entry.value;
                        if (entry.name.includes('Exp') || entry.name.includes('Avg')) {
                            formattedValue = `₹${entry.value.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
                        } else {
                            formattedValue = entry.value.toLocaleString();
                        }
                        return (
                            <p key={`item-${index}`} style={{ color: entry.color, margin: '0.4rem 0 0 0', fontWeight: '600', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                <span>{entry.name}:</span> <span>{formattedValue}</span>
                            </p>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="main-container animate-fade-in">
            <style>
                {`
                    .calendar-page-container {
                        display: flex;
                        flex-direction: column;
                        min-height: calc(100vh - 140px);
                    }
                    .calendar-glass-wrapper {
                        padding: 0.5rem;
                        flex-grow: 1;
                        display: flex;
                        flex-direction: column;
                        overflow-x: auto;
                        overflow-y: visible;
                    }
                    .calendar-grid-container {
                        min-width: 750px; /* Force scroll if screen is too narrow to fit 7 columns comfortably */
                        display: flex;
                        flex-direction: column;
                        flex-grow: 1;
                    }
                    .calendar-grid-header {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        gap: 6px;
                        margin-bottom: 6px;
                        flex-shrink: 0;
                    }
                    .calendar-grid-body {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        gap: 6px;
                        flex-grow: 1;
                        grid-auto-rows: minmax(110px, 1fr); /* Ensure cells are tall enough for 3 rows */
                    }
                    .day-cell {
                        border-radius: 6px;
                        padding: 0.4rem;
                        display: flex;
                        flex-direction: column;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: hidden;
                    }
                    .day-cell-active {
                        background: var(--bg-card);
                        border: 1px solid var(--glass-border);
                        box-shadow: var(--shadow-sm);
                    }
                    .day-cell-active:hover {
                        transform: translateY(-2px) scale(1.02);
                        box-shadow: var(--shadow-lg), inset 0 0 0 1px var(--color-primary);
                        z-index: 10;
                    }
                    .day-cell-empty {
                        background: transparent;
                        border: 1px dashed var(--glass-border);
                    }
                    .day-number {
                        font-size: 1rem;
                        font-weight: 900;
                        margin-bottom: 0.2rem;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        flex-shrink: 0;
                    }
                    .metrics-container {
                        display: flex;
                        flex-direction: column;
                        gap: 0.2rem;
                        flex: 1;
                        justify-content: center;
                    }
                    .metric-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.15rem 0.3rem;
                        border-radius: 4px;
                    }
                    .metric-label {
                        font-size: 0.65rem;
                        font-weight: 600;
                        color: var(--text-color);
                        white-space: nowrap;
                    }
                    .metric-value {
                        font-weight: 800;
                        font-size: 0.75rem;
                        white-space: nowrap;
                        margin-left: 0.3rem;
                    }

                    @media (max-width: 768px) {
                        .calendar-page-container {
                            padding: 0.5rem;
                            min-height: calc(100vh - 100px);
                        }
                        .calendar-glass-wrapper {
                            overflow: visible;
                        }
                        .calendar-grid-container {
                            min-width: 0; /* Let it shrink on mobile */
                        }
                        .calendar-grid-header, .calendar-grid-body {
                            gap: 4px;
                        }
                        .calendar-grid-body {
                            grid-auto-rows: 1fr; /* Height dictated by content on mobile */
                        }
                        .day-cell {
                            padding: 0.3rem;
                            border-radius: 4px;
                        }
                        .day-number {
                            font-size: 0.9rem;
                            margin-bottom: 0.2rem;
                        }
                        .metric-row {
                            padding: 0.1rem 0.2rem;
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 0;
                            background: transparent !important;
                        }
                        .metric-label {
                            display: none;
                        }
                        .metric-value {
                            font-size: 0.65rem;
                            text-align: right;
                            width: 100%;
                            margin-left: 0;
                        }
                        .day-cell-active:hover {
                            transform: none;
                        }
                        .val-prod { color: #3498db !important; }
                        .val-exp { color: #2ecc71 !important; }
                        .val-avg { color: #f1c40f !important; }
                        
                        .high-badge {
                            display: none !important;
                        }
                    }
                `}
            </style>
            <div className="calendar-page-container">
                <div className="glass" style={{ padding: '1.5rem', marginBottom: '1rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.2rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '2rem' }}>📅</span> Production Calendar
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Daily breakdown of production counts and expenditures</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                        <select 
                            value={mealType} 
                            onChange={(e) => setMealType(e.target.value)}
                            className="glass-input"
                            style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="">All Meals</option>
                            <option value="BREAKFAST">Breakfast</option>
                            <option value="LUNCH">Lunch</option>
                            <option value="DINNER">Dinner</option>
                            <option value="SNACKS">Snacks</option>
                            <option value="DAILY">Daily Requirements</option>
                            <option value="SPECIAL">Special Events</option>
                        </select>
                        <button onClick={handlePrevMonth} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>◀ Prev</button>
                        <input 
                            type="month" 
                            className="glass-input" 
                            value={monthYearString}
                            onChange={handleMonthChange}
                            style={{ padding: '0.5rem 1rem', fontSize: '1.1rem', fontWeight: 'bold', width: '180px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-color)' }}
                        />
                        <button onClick={handleNextMonth} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Next ▶</button>
                    </div>
                </div>
            </div>

            <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', flexShrink: 0, width: '100%' }}>
                <div style={{ height: '280px', width: '100%', overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--glass-border)' }} />
                            
                            {showProduction && <YAxis yAxisId="left" stroke="#3498db" fontSize={11} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} tickLine={false} axisLine={false} width={40} />}
                            {showExpense && <YAxis yAxisId="right" orientation="right" stroke="#2ecc71" fontSize={11} tickFormatter={(val) => val >= 1000 ? `₹${(val/1000).toFixed(0)}k` : `₹${val}`} tickLine={false} axisLine={false} width={50} />}
                            {showAverage && <YAxis yAxisId="avg" orientation="right" stroke="#f1c40f" fontSize={11} tickFormatter={(val) => `₹${val}`} tickLine={false} axisLine={false} width={40} />}
                            
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            
                            {showProduction && <Line yAxisId="left" type="monotone" dataKey="production" name="Prod. Count" stroke="#3498db" strokeWidth={3} dot={{r: 2, fill: '#3498db', strokeWidth: 0}} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls={true} />}
                            {showExpense && <Line yAxisId="right" type="monotone" dataKey="expense" name="Total Exp." stroke="#2ecc71" strokeWidth={3} dot={{r: 2, fill: '#2ecc71', strokeWidth: 0}} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls={true} />}
                            {showAverage && <Line yAxisId="avg" type="monotone" dataKey="average" name="Avg/Prod" stroke="#f1c40f" strokeWidth={3} dot={{r: 2, fill: '#f1c40f', strokeWidth: 0}} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls={true} />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Custom Toggles */}
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                    <button 
                        onClick={() => setShowProduction(!showProduction)}
                        style={{ 
                            background: showProduction ? 'rgba(52, 152, 219, 0.15)' : 'transparent',
                            border: `1px solid ${showProduction ? '#3498db' : 'var(--glass-border)'}`,
                            color: showProduction ? '#3498db' : 'var(--text-muted)',
                            opacity: showProduction ? 1 : 0.6,
                            padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                    >
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: showProduction ? '#3498db' : 'var(--text-muted)' }}></div>
                        Prod. Count
                    </button>
                    <button 
                        onClick={() => setShowExpense(!showExpense)}
                        style={{ 
                            background: showExpense ? 'rgba(46, 204, 113, 0.15)' : 'transparent',
                            border: `1px solid ${showExpense ? '#2ecc71' : 'var(--glass-border)'}`,
                            color: showExpense ? '#2ecc71' : 'var(--text-muted)',
                            opacity: showExpense ? 1 : 0.6,
                            padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                    >
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: showExpense ? '#2ecc71' : 'var(--text-muted)' }}></div>
                        Total Exp.
                    </button>
                    <button 
                        onClick={() => setShowAverage(!showAverage)}
                        style={{ 
                            background: showAverage ? 'rgba(241, 196, 15, 0.15)' : 'transparent',
                            border: `1px solid ${showAverage ? '#f1c40f' : 'var(--glass-border)'}`,
                            color: showAverage ? '#f1c40f' : 'var(--text-muted)',
                            opacity: showAverage ? 1 : 0.6,
                            padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem'
                        }}
                    >
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: showAverage ? '#f1c40f' : 'var(--text-muted)' }}></div>
                        Avg/Prod
                    </button>
                </div>
            </div>

            <div className="glass calendar-glass-wrapper">
                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                        Fetching calendar data...
                    </div>
                ) : (
                    <div className="calendar-grid-container">
                        {/* Days Header */}
                        <div className="calendar-grid-header">
                            {weekDays.map((d, index) => (
                                <div key={d} style={{ 
                                    textAlign: 'center', 
                                    fontWeight: '800', 
                                    padding: '0.4rem', 
                                    background: 'var(--bg-glass)', 
                                    borderRadius: '8px', 
                                    color: (index === 0 || index === 6) ? 'var(--color-primary)' : 'var(--text-color)', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1px',
                                    fontSize: 'clamp(0.6rem, 1.5vw, 0.85rem)'
                                }}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="calendar-grid-body">
                            {days.map((dayObj, idx) => {
                                const hasData = dayObj && dayObj.data;
                                const isDay = !!dayObj;
                                return (
                                    <div key={idx} className={`day-cell ${isDay ? (hasData ? 'day-cell-active' : 'day-cell-empty') : ''}`}>
                                        {isDay && (
                                            <>
                                                <div className="day-number">
                                                    <span style={{
                                                        color: hasData ? 'var(--color-primary)' : 'var(--text-muted)',
                                                        padding: '0.1rem',
                                                        display: 'inline-block'
                                                    }}>
                                                        {dayObj.dayNumber}
                                                    </span>
                                                    {hasData && dayObj.data.total_people > 10000 && (
                                                        <span className="high-badge" style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', borderRadius: '10px' }}>High</span>
                                                    )}
                                                </div>
                                                
                                                {hasData ? (
                                                    <div className="metrics-container">
                                                        <div className="metric-row" style={{ background: 'rgba(52, 152, 219, 0.1)' }}>
                                                            <span className="metric-label">Prod. Count</span>
                                                            <span className="metric-value val-prod" style={{ color: '#3498db' }}>{dayObj.data.total_people.toLocaleString()}</span>
                                                        </div>
                                                        <div className="metric-row" style={{ background: 'rgba(46, 204, 113, 0.1)' }}>
                                                            <span className="metric-label">Total Exp.</span>
                                                            <span className="metric-value val-exp" style={{ color: '#2ecc71' }}>₹{dayObj.data.total_cost.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                                        </div>
                                                        <div className="metric-row" style={{ background: 'rgba(241, 196, 15, 0.1)' }}>
                                                            <span className="metric-label">Avg/Prod</span>
                                                            <span className="metric-value val-avg" style={{ color: '#f1c40f' }}>₹{dayObj.data.avg_per_head.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.5 }}>
                                                        <span className="metric-label">-</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default ConsumptionCalendar;
