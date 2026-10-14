import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRPlacement = () => {
    const { hasPermission } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [items, setItems] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [prNumber, setPRNumber] = useState('');
    const [purchaseType, setPurchaseType] = useState('REGULAR');
    const [eventName, setEventName] = useState('');
    const [focusId, setFocusId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [isAutoFilled, setIsAutoFilled] = useState(false);
    const location = useLocation();
    const searchInputRef = React.useRef(null);
    const qtyRefs = React.useRef(new Map());

    const fetchData = useCallback(async (isEdit = false) => {
        try {
            const requests = [
                api.getVendors(),
                api.getItems(1, 1000)
            ];
            
            // Only fetch next PR number if not editing
            if (!isEdit) {
                requests.push(api.getNextPRNumber(orderDate));
            }

            const results = await Promise.all(requests);
            
            setVendors(results[0].results || results[0]);
            setItems(results[1].results || results[1]);
            
            if (!isEdit && results[2]) {
                setPRNumber(results[2].next_pr_number);
            }
        } catch (error) {
            console.error("Error fetching data for PO", error);
        }
    }, [orderDate]);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const editId = queryParams.get('edit');
        
        if (editId) {
            setEditingId(editId);
            fetchData(true); // Load master data for edit mode
            const loadDraft = async () => {
                try {
                    const data = await api.getPurchaseRequest(editId);
                    setSelectedVendor(data.vendor);
                    setOrderDate(data.order_date);
                    setDeliveryDate(data.delivery_date || '');
                    setPRNumber(data.pr_reference);
                    setPurchaseType(data.purchase_type || 'REGULAR');
                    setEventName(data.event_name || '');
                    setCart(data.items.map(item => ({
                        id: item.item,
                        name: item.item_name,
                        quantity: parseFloat(item.quantity_ordered),
                        unit_price: parseFloat(item.unit_price),
                        unit: item.unit,
                        current_tax_rate: parseFloat(item.tax_rate),
                        discount_type: item.discount_type,
                        discount_value: parseFloat(item.discount_value)
                    })));
                } catch (error) {
                    console.error("Error loading draft:", error);
                    alert("Failed to load draft data.");
                }
            };
            loadDraft();
        } else {
            fetchData(false);
        }
    }, [location.search, fetchData]);

    useEffect(() => {
        const refreshPRNumber = async () => {
            const nextPRData = await api.getNextPRNumber(orderDate);
            setPRNumber(nextPRData.next_pr_number);
        };
        if (orderDate) {
            refreshPRNumber();
        }
    }, [orderDate]);

    useEffect(() => {
        if (items.length > 0 && location.state?.autoFill && !editingId) {
            const currentCart = [...cart];
            let addedCount = 0;
            
            location.state.autoFill.items.forEach(reqItem => {
                const fullItem = items.find(i => i.id === reqItem.id);
                if (fullItem && !currentCart.find(c => c.id === fullItem.id)) {
                    currentCart.push({
                        ...fullItem,
                        quantity: reqItem.quantity,
                        unit_price: 0,
                        discount_type: 'PERCENTAGE',
                        discount_value: 0,
                        unit: reqItem.unit || fullItem.unit || ''
                    });
                    addedCount++;
                }
            });
            
            if (addedCount > 0) {
                setCart(currentCart);
                if (location.state.autoFill.targetDate) {
                    setDeliveryDate(location.state.autoFill.targetDate);
                }
                if (location.state.autoFill.orderDate) {
                    setOrderDate(location.state.autoFill.orderDate);
                }
                setIsAutoFilled(true);
                
                // Clear state so it doesn't run again on reload
                window.history.replaceState({}, document.title);
            }
        }
    }, [items, location.state, editingId]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredItems = items.filter(i => {
        if (!searchQuery) return false;
        if (cart.find(c => c.id === i.id)) return false;
        
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
        return terms.every(term => 
            i.name.toLowerCase().includes(term) || 
            (i.category_name && i.category_name.toLowerCase().includes(term))
        );
    });

    const addToCart = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { 
                ...item, 
                quantity: 1, 
                unit_price: 0, 
                unit: item.unit, 
                discount_type: 'PERCENTAGE', 
                discount_value: 0, 
                current_tax_rate: item.current_tax_rate || 0 
            }]);
        }
        setFocusId(item.id);
        setSearchQuery('');
        setSelectedIndex(0);
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
        setSelectedIndex(0);
    }, [searchQuery]);

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
        setCart(cart.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const calculateLineTotal = (c) => {
        const basePrice = c.quantity * c.unit_price;
        let discountAmount = 0;
        if (c.discount_type === 'PERCENTAGE') {
            discountAmount = basePrice * (c.discount_value / 100);
        } else {
            discountAmount = c.discount_value;
        }
        const discountedPrice = basePrice - discountAmount;
        const taxAmount = discountedPrice * ((c.current_tax_rate || 0) / 100);
        return discountedPrice + taxAmount;
    };

    const itemTotal = cart.reduce((acc, curr) => {
        const basePrice = (curr.quantity || 0) * (curr.unit_price || 0);
        let discountAmount = 0;
        if (curr.discount_type === 'PERCENTAGE') {
            discountAmount = basePrice * ((curr.discount_value || 0) / 100);
        } else {
            discountAmount = (curr.discount_value || 0);
        }
        const discountedPrice = basePrice - discountAmount;
        const taxAmount = discountedPrice * ((curr.current_tax_rate || 0) / 100);
        return acc + discountedPrice + taxAmount;
    }, 0);

    const taxTotal = 0;
    const hasNegativeTotal = cart.some(c => calculateLineTotal(c) < 0);
    const cartTotal = itemTotal + taxTotal;

    const handleSubmit = async (status = 'PLACED') => {
        if (!selectedVendor || cart.length === 0) {
            alert("Please select a vendor and add items.");
            return;
        }

        if (!deliveryDate) {
            alert("Please enter the target delivery date.");
            return;
        }

        if (new Date(deliveryDate) < new Date(orderDate)) {
            alert("Target Delivery Date cannot be earlier than the Order Date.");
            return;
        }

        const prData = {
            pr_reference: prNumber,
            vendor: selectedVendor,
            order_date: orderDate,
            delivery_date: deliveryDate || null,
            purchase_type: purchaseType,
            event_name: eventName,
            status: status,
            items: cart.map(c => ({
                item: c.id,
                quantity_ordered: Number((parseFloat(c.quantity) || 0).toFixed(3)),
                unit_price: Number((parseFloat(c.unit_price) || 0).toFixed(2)),
                tax_rate: Number((parseFloat(c.current_tax_rate) || 0).toFixed(2)),
                unit: c.unit,
                discount_type: c.discount_type,
                discount_value: Number((parseFloat(c.discount_value) || 0).toFixed(2))
            }))
        };

        try {
            if (editingId) {
                await api.updatePurchaseRequest(editingId, prData);
            } else {
                await api.createPurchaseRequest(prData);
            }
            
            const successMsg = status === 'DRAFT' ? 'Saved as Draft' : 'Placed';
            alert(`Purchase Request ${successMsg} Successfully!`);
            
            if (!editingId || status === 'PLACED') {
                setCart([]);
                setSelectedVendor('');
                setPurchaseType('REGULAR');
                setEventName('');
                setEditingId(null);
                setDeliveryDate('');
                // Refresh PR number for next entry
                const nextPRData = await api.getNextPRNumber(orderDate);
                setPRNumber(nextPRData.next_pr_number);
            }
        } catch (err) {
            console.error("Error saving purchase request:", err);
            let errorMsg = "Unknown error occurred";
            
            if (err.error) {
                errorMsg = err.error;
            } else if (err.detail) {
                errorMsg = err.detail;
            } else if (typeof err === 'object') {
                // If it's a field-level error object, stringify it
                errorMsg = Object.entries(err)
                    .map(([field, msgs]) => {
                        if (field === 'items' && Array.isArray(msgs)) {
                            // Drill down into items errors
                            const itemErrors = msgs
                                .map((itemErr, idx) => {
                                    if (Object.keys(itemErr).length > 0) {
                                        const item = cart[idx];
                                        const errDetails = Object.entries(itemErr)
                                            .map(([f, m]) => `${f}: ${m}`)
                                            .join(', ');
                                        return `Row ${idx + 1} (${item?.name}): ${errDetails}`;
                                    }
                                    return null;
                                })
                                .filter(Boolean);
                            return `Items Validation Errors:\n${itemErrors.join('\n')}`;
                        }
                        return `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`;
                    })
                    .join('\n');
            } else if (typeof err === 'string') {
                errorMsg = err;
            }
            
            alert(`Failed to ${status === 'DRAFT' ? 'save draft' : 'place material purchase request'}.\n\nReason: ${errorMsg}`);
        }
    };
    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await api.parsePRBulkExcel(file);
            const newCartItems = data.items;
            const skippedItems = data.skipped;

            if (newCartItems.length > 0) {
                setCart(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const uniqueNewItems = newCartItems.filter(n => !existingIds.has(n.id));
                    return [...prev, ...uniqueNewItems];
                });
            }

            if (skippedItems.length > 0) {
                alert(`Uploaded ${newCartItems.length} items. \nSkipped ${skippedItems.length} items (not found in registry):\n${skippedItems.join(', ')}`);
            } else {
                alert(`Successfully loaded ${newCartItems.length} items from Excel.`);
            }
        } catch (error) {
            console.error("Error uploading excel:", error);
            alert(error.error || "Failed to upload excel file.");
        }
        e.target.value = '';
    };

    const downloadTemplate = async () => {
        try {
            const blob = await api.getPRBulkTemplate();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'pr_bulk_template.xlsx');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading template:", error);
            alert("Failed to download template.");
        }
    };

    return (
        <div className="main-container">
            <header className="welcome-header">
                <div>
                    <h1>{editingId ? 'Edit Material Purchase Request' : 'Place Material Purchase Request'}</h1>
                    <p>{editingId ? `Editing draft: ${prNumber}. Continue building your request.` : 'Quick-add items to create a vendor procurement request.'}</p>
                    {isAutoFilled && (
                        <div className="animate-fade-in" style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.3rem 0.8rem', background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                            ✨ Auto-filled from Kitchen Material Request
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button 
                        onClick={downloadTemplate}
                        style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '0.6rem 1.2rem', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        📥 Download Excel Template
                    </button>
                    <label style={{ background: 'var(--color-secondary)', padding: '0.6rem 1.2rem', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                        📤 Bulk Upload Excel
                        <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleExcelUpload} />
                    </label>
                </div>
            </header>

            <div className="flex-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '3rem' }}>
                <div className="glass" style={{ padding: '2.5rem' }}>
                    <div className="responsive-grid grid-4" style={{ marginBottom: '1rem' }}>
                        <div className="form-group-stack">
                            <label style={{ color: 'var(--text-muted)' }}>PR Number</label>
                            <input 
                                className="form-input" 
                                type="text" 
                                value={prNumber} 
                                onChange={(e) => setPRNumber(e.target.value)} 
                                style={{ width: '100%' }} 
                            />
                        </div>
                        <div className="form-group-stack">
                            <label style={{ color: 'var(--text-muted)' }}>Vendor</label>
                            <select 
                                className="form-input" 
                                style={{ width: '100%' }}
                                value={selectedVendor}
                                onChange={(e) => setSelectedVendor(e.target.value)}
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group-stack">
                            <label style={{ color: 'var(--text-muted)' }}>Order Date</label>
                            <input className="form-input" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div className="form-group-stack">
                            <label style={{ color: 'var(--text-muted)' }}>Target Delivery *</label>
                            <input className="form-input" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div className="form-group-stack">
                            <label style={{ color: 'var(--text-muted)' }}>Purchase Type</label>
                            <select 
                                className="form-input" 
                                style={{ width: '100%' }}
                                value={purchaseType}
                                onChange={(e) => setPurchaseType(e.target.value)}
                            >
                                <option value="REGULAR">Regular Purchase</option>
                                <option value="SPECIAL_EVENT">Special Event</option>
                            </select>
                        </div>
                        <div className="form-group-stack">
                            <label style={{ color: 'var(--text-muted)' }}>Event / Function Name</label>
                            <input 
                                className="form-input" 
                                type="text" 
                                value={eventName} 
                                onChange={(e) => setEventName(e.target.value)} 
                                placeholder={purchaseType === 'SPECIAL_EVENT' ? "e.g. Annual Day" : "Optional details"}
                                style={{ width: '100%' }} 
                            />
                        </div>
                    </div>

                    <div style={{ position: 'relative', margin: '1rem 0 1.5rem 0' }}>
                        <input 
                            ref={searchInputRef}
                            className="form-input" 
                            style={{ width: '100%', paddingLeft: '3.5rem' }} 
                            placeholder="🔍 Search items (Arrow keys to navigate, Enter to add)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
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
                                            alignItems: 'center',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={() => setSelectedIndex(index)}
                                    >
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{item.name}</div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    ({item.category_name})
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                                    • Current Qty: {item.current_stock} {item.unit}
                                                </span>
                                            </div>
                                        </div>
                                        {index === selectedIndex && (
                                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>↵ Press Enter</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                                    <th style={{ padding: '1rem' }}>ITEM</th>
                                    <th style={{ padding: '1rem' }}>QTY</th>
                                    <th style={{ padding: '1rem' }}>UOM</th>
                                    <th style={{ padding: '1rem' }}>PRICE</th>
                                    <th style={{ padding: '1rem' }}>DISCOUNT</th>
                                    <th style={{ padding: '1rem' }}>TOTAL</th>
                                    <th style={{ padding: '1rem' }}></th>
                                </tr>
                            </thead>
                        <tbody>
                            {cart.map(c => {
                                const lineTotal = calculateLineTotal(c);
                                const isNegative = lineTotal < 0;
                                return (
                                    <tr key={c.id} style={{ 
                                        borderBottom: '1px solid var(--border-glass)',
                                        backgroundColor: isNegative ? 'rgba(255, 0, 0, 0.05)' : 'transparent'
                                    }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            current qty: <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{c.current_stock} {c.unit}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <input 
                                            ref={el => qtyRefs.current.set(c.id, el)}
                                            type="number" 
                                            className="form-input" 
                                            style={{ width: '80px', padding: '0.4rem' }} 
                                            value={c.quantity}
                                            onChange={(e) => updateCart(c.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            style={{ width: '100px', padding: '0.4rem' }} 
                                            value={c.unit}
                                            placeholder="UOM (Kg, Ltr...)"
                                            onChange={(e) => updateCart(c.id, 'unit', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <input 
                                            type="number" 
                                            className="form-input" 
                                            style={{ width: '100px', padding: '0.4rem' }} 
                                            value={c.unit_price}
                                            onChange={(e) => updateCart(c.id, 'unit_price', parseFloat(e.target.value))}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div className="discount-toggle">
                                                <button 
                                                    className={`toggle-opt ${c.discount_type === 'PERCENTAGE' ? 'active' : ''}`}
                                                    onClick={() => updateCart(c.id, 'discount_type', 'PERCENTAGE')}
                                                >
                                                    %
                                                </button>
                                                <button 
                                                    className={`toggle-opt ${c.discount_type === 'AMOUNT' ? 'active' : ''}`}
                                                    onClick={() => updateCart(c.id, 'discount_type', 'AMOUNT')}
                                                >
                                                    ₹
                                                </button>
                                            </div>
                                            <input 
                                                type="number" 
                                                className="form-input" 
                                                style={{ width: '80px', padding: '0.3rem', fontSize: '0.8rem' }} 
                                                value={c.discount_value}
                                                onChange={(e) => updateCart(c.id, 'discount_value', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 600, color: isNegative ? '#ff4444' : 'inherit' }}>
                                        ₹{lineTotal.toFixed(2)}
                                        {isNegative && (
                                            <div style={{ fontSize: '0.65rem', fontWeight: 400 }}>Total cannot be negative</div>
                                        )}
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => setCart(cart.filter(x => x.id !== c.id))}
                                            style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                    </tr>
                                );
                            })}
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
                </div>

                <div className="glass" style={{ padding: '2rem', height: 'fit-content' }}>
                    <h3>Order Summary</h3>
                    <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Item Total</span>
                            <span>₹{itemTotal.toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', marginTop: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                            <span>Grand Total</span>
                            <span style={{ color: 'var(--color-primary)' }}>₹{cartTotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            {((!editingId && hasPermission('can_place_po')) || (editingId && hasPermission('can_edit_po'))) ? (
                                <>
                                    <button 
                                        className="action-btn" 
                                        style={{ 
                                            flex: 1,
                                            background: 'var(--bg-glass)',
                                            border: '1px solid var(--border-glass)',
                                            color: 'var(--text-main)',
                                            opacity: hasNegativeTotal ? 0.5 : 1,
                                            cursor: hasNegativeTotal ? 'not-allowed' : 'pointer'
                                        }}
                                        onClick={() => handleSubmit('DRAFT')}
                                        disabled={hasNegativeTotal}
                                    >
                                        📥 Save as Draft
                                    </button>
                                    <button 
                                        className="action-btn" 
                                        style={{ 
                                            flex: 1,
                                            opacity: hasNegativeTotal ? 0.5 : 1,
                                            cursor: hasNegativeTotal ? 'not-allowed' : 'pointer'
                                        }}
                                        onClick={() => handleSubmit('PLACED')}
                                        disabled={hasNegativeTotal}
                                    >
                                        🚀 Place PR
                                    </button>
                                </>
                            ) : (
                                <div style={{ 
                                    flex: 1, 
                                    padding: '1rem', 
                                    background: 'rgba(239, 68, 68, 0.1)', 
                                    color: '#ef4444', 
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    textAlign: 'center',
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                    ⚠️ You do not have permission to {editingId ? 'edit' : 'place'} Purchase Requests.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PRPlacement;
