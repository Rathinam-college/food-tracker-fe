import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const KitchenMRPlacement = () => {
    const { hasPermission } = useAuth();
    const [items, setItems] = useState([]);
    const [mrNumber, setMRNumber] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
    const [mealType, setMealType] = useState('DAILY');
    const [userCount, setUserCount] = useState(0);
    const [remarks, setRemarks] = useState('');
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [focusId, setFocusId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    const location = useLocation();
    const navigate = useNavigate();
    const searchInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const qtyRefs = useRef(new Map());

    // Load Items Registry (Whenever orderDate changes to fetch historical stock)
    useEffect(() => {
        const loadItems = async () => {
            try {
                // Pass orderDate to get historical stock availability
                const itemsData = await api.getItems(1, 1000, '', '', orderDate);
                setItems(itemsData.results || itemsData);
            } catch (error) {
                console.error("Error fetching items registry", error);
            }
        };
        loadItems();
    }, [orderDate]);

    // Handle Initial Load (Draft Edit or New MR)
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const editId = queryParams.get('edit');
        
        const init = async () => {
            setLoading(true);
            try {
                if (editId) {
                    setEditingId(editId);
                    const data = await api.getMaterialRequest(editId);
                    
                    if (data.status !== 'DRAFT') {
                        alert("This request is no longer a draft and cannot be edited.");
                        navigate('/kitchen/mr-entries');
                        return;
                    }
                    
                    setMRNumber(data.mr_number);
                    setOrderDate(data.order_date);
                    setTargetDate(data.target_date);
                    setMealType(data.meal_type);
                    setUserCount(data.user_count || 0);
                    setRemarks(data.remarks || '');
                    setCart(data.items.map(item => ({
                        id: item.item,
                        name: item.item_name,
                        quantity: parseFloat(item.quantity || 0),
                        unit: item.unit
                    })));
                } else {
                    // New MR: Just get the next number
                    const nextMRData = await api.getNextMRNumber(orderDate);
                    setMRNumber(nextMRData.next_mr_number);
                }
            } catch (err) {
                console.error("Initialization failed", err);
            } finally {
                setLoading(false);
            }
        };
        
        init();
    }, [location.search, navigate]); // Removed orderDate from here to prevent re-init on date change

    // Background MR Number Refresh on Date Change (New MRs only)
    useEffect(() => {
        let isMounted = true;
        const refreshNumber = async () => {
            if (!editingId && !loading) {
                try {
                    const nextMRData = await api.getNextMRNumber(orderDate);
                    if (isMounted) setMRNumber(nextMRData.next_mr_number);
                } catch (err) {
                    console.error("Silent MR refresh failed", err);
                }
            }
        };
        
        refreshNumber();
        return () => { isMounted = false; };
    }, [orderDate, editingId, loading]);

    // Sync cart stock values when items registry updates (e.g. date change)
    useEffect(() => {
        const syncCart = async () => {
            if (cart.length === 0) return;
            const updatedCart = await Promise.all(cart.map(async (cartItem) => {
                try {
                    const availData = await api.checkItemAvailability(cartItem.id, orderDate);
                    return {
                        ...cartItem,
                        effective_stock: parseFloat(availData.available_stock || 0),
                        current_stock: availData.current_stock,
                        historical_stock: availData.historical_stock,
                        inwards: availData.inwards,
                        outwards: availData.outwards,
                        adjustments: availData.adjustments,
                        vendor_returns: availData.vendor_returns,
                        locked_stock: availData.pending_mrs
                    };
                } catch (e) {
                    return cartItem;
                }
            }));
            setCart(updatedCart);
        };
        syncCart();
    }, [orderDate]);

    const filteredItems = items.filter(i => {
        if (!searchQuery) return false;
        if (cart.find(c => c.id === i.id)) return false;
        
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
        return terms.every(term => 
            i.name.toLowerCase().includes(term) || 
            (i.category_name && i.category_name.toLowerCase().includes(term))
        );
    });

    const addToCart = async (item) => {
        try {
            const availData = await api.checkItemAvailability(item.id, orderDate);
            const available = parseFloat(availData.available_stock || 0);
            
            if (available <= 0) {
                // We no longer block adding to cart so the user can see the detailed breakdown of WHY it is 0.
            }
            setCart([...cart, { 
                ...item, 
                quantity: available > 0 ? 1 : 0,  
                unit: item.unit, 
                effective_stock: available, 
                current_stock: availData.current_stock, 
                historical_stock: availData.historical_stock,
                inwards: availData.inwards,
                outwards: availData.outwards,
                adjustments: availData.adjustments,
                vendor_returns: availData.vendor_returns,
                locked_stock: availData.pending_mrs 
            }]);
            setFocusId(item.id);
            setSearchQuery('');
            setSelectedIndex(0);
        } catch (error) {
            console.error("Failed to fetch availability details", error);
            alert("Error fetching live stock details for this item on the selected date.");
        }
    };

    const handleKeyDown = (e) => {
        if (!searchQuery || filteredItems.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            addToCart(filteredItems[selectedIndex]);
        } else if (e.key === 'Escape') {
            setSearchQuery('');
            setSelectedIndex(0);
        }
    };

    useEffect(() => {
        if (focusId && qtyRefs.current.has(focusId)) {
            const input = qtyRefs.current.get(focusId);
            input.focus();
            input.select();
            setFocusId(null);
        }
    }, [cart.length, focusId]);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.key === '\\') {
                e.preventDefault();
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                    searchInputRef.current.select();
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const updateCart = (id, field, value) => {
        if (field === 'quantity') {
            const cartItem = cart.find(c => c.id === id);
            const effStock = cartItem ? parseFloat(cartItem.effective_stock || 0) : Infinity;
            let qty = parseFloat(value) || 0;
            if (qty > effStock) {
                alert(`Cannot request more than available effective stock (${effStock}) for the selected target date.`);
                qty = effStock;
                value = qty;
            }
        }
        setCart(cart.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const downloadTemplate = async () => {
        try {
            const blob = await api.getMRBulkTemplate();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mr_bulk_template.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Template download failed", error);
            alert("Failed to download template.");
        }
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setLoading(true);
            const data = await api.parseMRBulkExcel(file);
            
            // Merge uploaded items into cart by fetching live stock for each
            const newCart = [...cart];
            for (const newItem of data.items) {
                try {
                    const liveItem = await api.getItem(newItem.id);
                    const effStock = parseFloat(liveItem.effective_stock || 0);
                    
                    let qtyToAdd = parseFloat(newItem.quantity) || 0;
                    if (qtyToAdd > effStock) {
                        qtyToAdd = effStock;
                    }
                    
                    if (qtyToAdd <= 0) continue;

                    const existingIdx = newCart.findIndex(c => c.id === newItem.id);
                    if (existingIdx > -1) {
                        newCart[existingIdx].quantity = qtyToAdd;
                    } else {
                        newCart.push({
                            id: liveItem.id,
                            name: liveItem.name,
                            quantity: qtyToAdd,
                            unit: liveItem.unit,
                            effective_stock: effStock,
                            current_stock: liveItem.current_stock || 0,
                            locked_stock: liveItem.locked_stock || 0,
                            current_price: liveItem.current_price || 0
                        });
                    }
                } catch {
                    console.warn(`Failed to fetch live details for imported item ${newItem.name}`);
                }
            }
            
            setCart(newCart);
            setLoading(false);
            
            if (data.skipped && data.skipped.length > 0) {
                alert(`Upload complete. Skipped ${data.skipped.length} items not found in registry: ${data.skipped.join(', ')}`);
            } else {
                alert("Bulk items added to cart successfully!");
            }
        } catch (error) {
            console.error("Excel upload failed", error);
            alert(error.error || "Failed to parse Excel file.");
            setLoading(false);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (status = 'PLACED') => {
        if (cart.length === 0) {
            alert("Please add at least one item.");
            return;
        }

        const mrData = {
            mr_number: mrNumber,
            order_date: orderDate,
            target_date: targetDate,
            meal_type: mealType,
            user_count: userCount,
            status: status,
            remarks: remarks,
            items: cart.map(c => ({
                item: c.id,
                quantity: Number((parseFloat(c.quantity) || 0).toFixed(3)),
                unit: c.unit
            }))
        };

        try {
            if (editingId) {
                await api.updateMaterialRequest(editingId, mrData);
            } else {
                await api.createMaterialRequest(mrData);
            }
            alert(`Material Request ${status === 'DRAFT' ? 'Saved as Draft' : 'Placed'} Successfully!`);
            navigate('/kitchen/mr-entries');
        } catch (err) {
            console.error("Error saving material request:", err);
            let errMsg = 'Unknown error';
            if (typeof err === 'string') errMsg = err;
            else if (err.non_field_errors) errMsg = err.non_field_errors[0];
            else if (err.error) errMsg = err.error;
            else if (err.detail) errMsg = err.detail;
            else if (Array.isArray(err)) errMsg = err[0];
            else if (typeof err === 'object') {
                const vals = Object.values(err);
                if (vals.length > 0) errMsg = Array.isArray(vals[0]) ? vals[0][0] : vals[0];
            }
            alert(`Failed to ${status === 'DRAFT' ? 'save draft' : 'place request'}: ${errMsg}`);
        }
    };

    if (loading) return <div className="main-container">Loading Kitchen MR Data...</div>;

    return (
        <div className="main-container">
            <header className="welcome-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>{editingId ? 'Edit Material Request' : 'Place Material Request'}</h1>
                    <p>{editingId ? `Editing request: ${mrNumber}` : 'Request raw materials from the main store.'}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="secondary-btn" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📥 Download Template
                    </button>
                    <button className="action-btn" onClick={() => fileInputRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📤 Bulk Upload Excel
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".xlsx, .xls"
                        onChange={handleExcelUpload}
                    />
                </div>
            </header>

            <div className="glass" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
                <div className="responsive-grid grid-5" style={{ marginBottom: '2rem' }}>
                    <div className="form-group-stack">
                        <label style={{ color: 'var(--text-muted)' }}>MR Number</label>
                        <input 
                            className="form-input" 
                            type="text" 
                            value={mrNumber} 
                            onChange={(e) => setMRNumber(e.target.value)} 
                            style={{ width: '100%' }} 
                        />
                    </div>
                    <div className="form-group-stack">
                        <label style={{ color: 'var(--text-muted)' }}>Meal Type</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%' }}
                            value={mealType}
                            onChange={(e) => setMealType(e.target.value)}
                        >
                            <option value="BREAKFAST">Breakfast</option>
                            <option value="LUNCH">Lunch</option>
                            <option value="DINNER">Dinner</option>
                            <option value="SNACKS">Snacks</option>
                            <option value="DAILY">Daily Requirement</option>
                            <option value="SPECIAL">Special Events</option>
                        </select>
                    </div>
                    <div className="form-group-stack">
                        <label style={{ color: 'var(--text-muted)' }}>Order Date</label>
                        <input className="form-input" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div className="form-group-stack">
                        <label style={{ color: 'var(--text-muted)' }}>Target Date</label>
                        <input className="form-input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div className="form-group-stack">
                        <label style={{ color: 'var(--text-muted)' }}>User Count</label>
                        <input className="form-input" type="number" value={userCount} onChange={(e) => setUserCount(parseInt(e.target.value) || 0)} style={{ width: '100%' }} min="0" />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Remarks (Optional)</label>
                    <textarea 
                        className="form-input" 
                        style={{ width: '100%', height: '60px', borderRadius: '8px', padding: '1rem' }}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Add any specific instructions here..."
                    />
                </div>

                <div style={{ position: 'relative', margin: '2.5rem 0' }}>
                    <input 
                        ref={searchInputRef}
                        className="form-input" 
                        style={{ width: '100%', paddingLeft: '3.5rem' }} 
                        placeholder="🔍 Type item name (e.g. Rice, Tomato)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {searchQuery && filteredItems.length > 0 && (
                        <div style={{ 
                            position: 'absolute', 
                            top: '110%', 
                            left: 0, 
                            right: 0, 
                            zIndex: 100, 
                            padding: '0.5rem',
                            background: 'var(--bg-navbar)',
                            border: '1px solid var(--border-glass-bright)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-premium)'
                        }}>
                            {filteredItems.map((item, index) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => addToCart(item)}
                                    style={{ 
                                        padding: '0.8rem', 
                                        cursor: 'pointer', 
                                        borderRadius: '8px',
                                        background: index === selectedIndex ? 'rgba(244, 121, 32, 0.2)' : 'transparent',
                                        color: index === selectedIndex ? 'var(--color-primary)' : 'var(--text-main)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseOver={() => setSelectedIndex(index)}
                                >
                                    <div>
                                        <span style={{ fontWeight: '600' }}>{item.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                            ({item.category_name})
                                        </span>
                                    </div>
                                    {index === selectedIndex && (
                                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>↵ Add Item</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="table-responsive" style={{ minHeight: '200px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                                <th style={{ padding: '1rem' }}>ITEM</th>
                                <th style={{ padding: '1rem' }}>REQUIRED QTY</th>
                                <th style={{ padding: '1rem' }}>UNIT</th>
                                <th style={{ padding: '1rem' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No items added yet. Search and select items to build your request.
                                    </td>
                                </tr>
                            ) : cart.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
                                            <span style={{ 
                                                background: parseFloat(c.effective_stock !== undefined ? c.effective_stock : c.current_stock) > 0 ? 'rgba(244, 121, 32, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                                padding: '4px 8px', 
                                                borderRadius: '4px',
                                                color: parseFloat(c.effective_stock !== undefined ? c.effective_stock : c.current_stock) > 0 ? 'var(--color-primary)' : '#ef4444',
                                                display: 'inline-block'
                                            }}>
                                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '4px', opacity: 0.85, fontSize: '0.7rem' }}>
                                                    <span>Purchased: <strong>{c.inwards !== undefined ? c.inwards : 0} {c.unit}</strong></span>
                                                    <span>Issued: <strong>{c.outwards !== undefined ? c.outwards : 0} {c.unit}</strong></span>
                                                    <span>Wasted/Adj: <strong>{c.adjustments !== undefined ? c.adjustments : 0} {c.unit}</strong></span>
                                                    <span>Returned: <strong>{c.vendor_returns !== undefined ? c.vendor_returns : 0} {c.unit}</strong></span>
                                                </div>
                                                <div>
                                                    Store (on {orderDate}): {c.historical_stock !== undefined ? c.historical_stock : c.current_stock} {c.unit} &nbsp;|&nbsp; 
                                                    Pending MRs: {c.locked_stock || 0} {c.unit} &nbsp;|&nbsp; 
                                                    <strong>Available: {c.effective_stock !== undefined ? c.effective_stock : c.current_stock} {c.unit}</strong>
                                                    {parseFloat(c.effective_stock !== undefined ? c.effective_stock : c.current_stock) <= 0 && (
                                                        <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>⚠️ Not in Stock</span>
                                                    )}
                                                </div>
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <input 
                                            ref={el => qtyRefs.current.set(c.id, el)}
                                            type="number" 
                                            className="form-input" 
                                            style={{ width: '120px' }} 
                                            value={c.quantity}
                                            onChange={(e) => updateCart(c.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            style={{ width: '100px' }} 
                                            value={c.unit}
                                            onChange={(e) => updateCart(c.id, 'unit', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <button 
                                            onClick={() => setCart(cart.filter(x => x.id !== c.id))}
                                            style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1.2rem' }}
                                        >✕</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ 
                    marginTop: '2rem', 
                    padding: '1rem 1.5rem', 
                    background: 'rgba(244, 121, 32, 0.05)', 
                    borderRadius: '12px', 
                    fontSize: '0.9rem', 
                    color: 'var(--text-main)',
                    borderLeft: '4px solid var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <span style={{ fontSize: '1.4rem' }}>💡</span>
                    <span>
                        <strong>Note:</strong> Calculations are based on the Unit of Measure (UOM). 
                        For fractional quantities, please use decimals (e.g., type <strong>0.5</strong> for 0.5kg/Ltr and <strong>5.5</strong> for 5.5kg/Ltr).
                    </span>
                </div>

                <div className="mobile-stack-buttons" style={{ marginTop: '3rem', justifyContent: 'flex-end' }}>
                    {hasPermission('can_place_mr') ? (
                        <>
                            <button 
                                className="secondary-btn" 
                                style={{ padding: '0.8rem 2rem' }}
                                onClick={() => handleSubmit('DRAFT')}
                            >
                                Save as Draft
                            </button>
                            <button 
                                className="action-btn" 
                                style={{ padding: '0.8rem 2.5rem' }}
                                onClick={() => handleSubmit('PLACED')}
                            >
                                🚀 Place Request
                            </button>
                        </>
                    ) : (
                        <div style={{ 
                            padding: '1rem', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: '#ef4444', 
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            ⚠️ You do not have permission to place Material Requests.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KitchenMRPlacement;
