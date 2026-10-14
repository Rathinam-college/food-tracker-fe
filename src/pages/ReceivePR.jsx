import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ReceivePR = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [shortClose, setShortClose] = useState(false);
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseType, setPurchaseType] = useState('REGULAR');
    const [eventName, setEventName] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [receivedItems, setReceivedItems] = useState([]);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const data = await api.getPurchaseRequest(id);
                setOrder(data);
                setPurchaseType(data.purchase_type || 'REGULAR');
                setEventName(data.event_name || '');
                
                // Initialize items to receive
                setReceivedDate(data.delivery_date || new Date().toISOString().split('T')[0]);
                setReceivedItems(data.items.map(item => ({
                    item_id: item.item,
                    item_name: item.item_name,
                    ordered_qty: parseFloat(item.quantity_ordered),
                    already_received: parseFloat(item.quantity_received || 0),
                    received_qty: parseFloat(item.quantity_ordered) - parseFloat(item.quantity_received || 0),
                    received_price: parseFloat(item.unit_price),
                    tax_rate: parseFloat(item.tax_rate),
                    discount_type: item.discount_type || 'PERCENTAGE',
                    discount_value: parseFloat(item.discount_value || 0),
                    selected: true,
                    unit: item.unit
                })));
                
                setLoading(false);
            } catch (err) {
                console.error("Error fetching order for receipt", err);
                alert("Failed to load purchase request details.");
                navigate('/procurement/pr-entries');
            }
        };

        if (id) fetchOrder();
    }, [id, navigate]);

    const updateReceivedItem = (itemId, field, value) => {
        setReceivedItems(prev => prev.map(item => 
            item.item_id === itemId ? { ...item, [field]: value } : item
        ));
    };

    const submitReceipt = async () => {
        const selectedItems = receivedItems.filter(item => item.selected);
        if (selectedItems.length === 0) {
            alert("Please select at least one item to receive.");
            return;
        }
        
        if (order.order_date && new Date(receivedDate) < new Date(order.order_date)) {
            alert(`Cannot receive on a date before the order was placed (${order.order_date}).`);
            return;
        }
        
        try {
            setSubmitting(true);
            const formData = new FormData();
            const formattedItems = selectedItems.map(item => ({
                ...item,
                received_qty: Number(parseFloat(item.received_qty).toFixed(3)),
                received_price: Number(parseFloat(item.received_price).toFixed(2)),
                discount_value: Number(parseFloat(item.discount_value).toFixed(2)),
                tax_rate: Number(parseFloat(item.tax_rate).toFixed(2))
            }));
            formData.append('items', JSON.stringify(formattedItems));
            formData.append('purchase_date', receivedDate);
            formData.append('invoice_number', invoiceNumber);
            formData.append('short_close', shortClose);
            formData.append('purchase_type', purchaseType);
            formData.append('event_name', eventName);
            
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            await api.receivePurchaseRequest(id, formData);
            alert(shortClose ? "Order received and PR completed (short-closed)." : "Order received successfully!");
            navigate('/procurement/pr-entries');
        } catch (error) {
            console.error("Error receiving PR", error);
            const errorMessage = typeof error === 'string' ? error : (error.error || error.detail || "See console for details.");
            alert("Failed to receive order: " + errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="main-container">Loading order details...</div>;
    if (!order) return <div className="main-container">Order not found.</div>;

    return (
        <div className="main-container">
            <header className="welcome-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <button className="secondary-btn" onClick={() => navigate('/procurement/pr-entries')} style={{ padding: '0.4rem 0.8rem' }}>
                            ← Back
                        </button>
                        <h1 style={{ margin: 0 }}>Confirm Receipt</h1>
                    </div>
                    <p style={{ marginLeft: '4.5rem' }}>Verify materials received against PR: <strong>{order.pr_reference}</strong> from <strong>{order.vendor_name}</strong> (Ordered: {order.order_date})</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>TOTAL PR VALUE</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>₹{parseFloat(order.total_amount).toFixed(2)}</div>
                </div>
            </header>

            <div className="responsive-grid grid-2" style={{ marginBottom: '2rem' }}>
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>RECEIPT DATE</label>
                            <input 
                                type="date" 
                                className="form-input" 
                                style={{ width: '100%', fontSize: '1.1rem' }}
                                value={receivedDate}
                                onChange={(e) => setReceivedDate(e.target.value)}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>PURCHASE TYPE</label>
                            <select 
                                className="form-input" 
                                style={{ width: '100%', fontSize: '1.1rem' }}
                                value={purchaseType}
                                onChange={(e) => setPurchaseType(e.target.value)}
                            >
                                <option value="REGULAR">Regular Purchase</option>
                                <option value="SPECIAL_EVENT">Special Event</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>INVOICE NUMBER</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                style={{ width: '100%', fontSize: '1.1rem' }}
                                placeholder="e.g. INV-001"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                            />
                        </div>
                    </div>
                    {purchaseType === 'SPECIAL_EVENT' && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>EVENT / FUNCTION NAME</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                style={{ width: '100%', fontSize: '1.1rem' }}
                                placeholder="e.g. Annual Day, Sports Meet, Hostel Kitchen"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="glass" style={{ padding: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>UPLOAD BILLS / RECEIPTS (IMAGE/PDF)</label>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*,.pdf"
                            className="form-input"
                            onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                            style={{ width: '100%' }}
                        />
                        {selectedFiles.length > 0 && (
                            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--status-success-text-vibrant)', fontWeight: 600 }}>
                                ✅ {selectedFiles.length} file(s) selected
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📦 Item Verification
                </h3>
                
                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem' }}>
                                <th style={{ padding: '1rem' }}>SELECT</th>
                                <th style={{ padding: '1rem' }}>ITEM DESCRIPTION</th>
                                <th style={{ padding: '1rem' }}>ORDERED</th>
                                <th style={{ padding: '1rem' }}>RCVD TILL DATE</th>
                                <th style={{ padding: '1rem' }}>REMAINING</th>
                                <th style={{ padding: '1rem', width: '150px' }}>RECEIVING NOW</th>
                                <th style={{ padding: '1rem', width: '130px' }}>UNIT PRICE</th>
                                <th style={{ padding: '1rem', width: '150px' }}>DISCOUNT</th>
                                <th style={{ padding: '1rem', width: '100px' }}>TAX (%)</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>LINE TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receivedItems.map(item => (
                                <tr key={item.item_id} style={{ 
                                    borderBottom: '1px solid var(--border-glass)', 
                                    opacity: item.selected ? 1 : 0.4,
                                    background: item.selected ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    transition: 'all 0.2s'
                                }}>
                                    <td style={{ padding: '1rem' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={item.selected}
                                            onChange={(e) => updateReceivedItem(item.item_id, 'selected', e.target.checked)}
                                            style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600 }}>{item.item_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {item.item_id}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{item.ordered_qty} {item.unit}</td>
                                    <td style={{ padding: '1rem', color: 'var(--status-success-text-vibrant)' }}>{item.already_received}</td>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                                        {item.ordered_qty - item.already_received} {item.unit}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input 
                                                type="number" 
                                                className="form-input" 
                                                style={{ width: '100%', padding: '0.5rem', border: item.selected ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)' }}
                                                value={item.received_qty}
                                                disabled={!item.selected}
                                                onChange={(e) => updateReceivedItem(item.item_id, 'received_qty', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <input 
                                            type="number" 
                                            className="form-input" 
                                            style={{ width: '100%', padding: '0.5rem' }}
                                            value={item.received_price}
                                            disabled={!item.selected}
                                            onChange={(e) => updateReceivedItem(item.item_id, 'received_price', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <div className="discount-toggle" style={{ display: 'flex', background: 'var(--bg-glass)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                                                <button 
                                                    style={{ flex: 1, padding: '0.2rem', border: 'none', background: item.discount_type === 'PERCENTAGE' ? 'var(--color-primary)' : 'transparent', color: item.discount_type === 'PERCENTAGE' ? 'white' : 'inherit', fontSize: '0.7rem', cursor: 'pointer' }}
                                                    disabled={!item.selected}
                                                    onClick={() => updateReceivedItem(item.item_id, 'discount_type', 'PERCENTAGE')}
                                                >
                                                    %
                                                </button>
                                                <button 
                                                    style={{ flex: 1, padding: '0.2rem', border: 'none', background: item.discount_type === 'AMOUNT' ? 'var(--color-primary)' : 'transparent', color: item.discount_type === 'AMOUNT' ? 'white' : 'inherit', fontSize: '0.7rem', cursor: 'pointer' }}
                                                    disabled={!item.selected}
                                                    onClick={() => updateReceivedItem(item.item_id, 'discount_type', 'AMOUNT')}
                                                >
                                                    ₹
                                                </button>
                                            </div>
                                            <input 
                                                type="number" 
                                                className="form-input" 
                                                style={{ width: '100%', padding: '0.3rem', fontSize: '0.8rem' }} 
                                                value={item.discount_value}
                                                disabled={!item.selected}
                                                onChange={(e) => updateReceivedItem(item.item_id, 'discount_value', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                         <input 
                                             type="number" 
                                             className="form-input" 
                                             style={{ width: '100%', padding: '0.5rem' }}
                                             value={item.tax_rate}
                                             disabled={!item.selected}
                                             onChange={(e) => updateReceivedItem(item.item_id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                         />
                                     </td>
                                     <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                                        {(() => {
                                            if (!item.selected) return '₹0.00';
                                            const base = item.received_qty * item.received_price;
                                            const disc = item.discount_type === 'PERCENTAGE' ? (base * item.discount_value / 100) : item.discount_value;
                                            return `₹${((base - disc) * (1 + (item.tax_rate / 100))).toFixed(2)}`;
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="glass" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ maxWidth: '400px' }}>
                        <label className="checkbox-container" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer', userSelect: 'none' }}>
                            <input 
                                type="checkbox" 
                                checked={shortClose}
                                onChange={(e) => setShortClose(e.target.checked)}
                                style={{ width: '24px', height: '24px', marginTop: '0.2rem' }}
                            />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: shortClose ? 'var(--status-error-text-vibrant)' : 'inherit' }}>
                                    Short-Close this Purchase Request
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                    Check this if no more items are expected. The PR status will change to <strong>COMPLETED</strong> and it will be removed from the active queue.
                                </div>
                            </div>
                        </label>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>TOTAL RECEIVING VALUE (INCL. TAX)</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--status-success-text-vibrant)', textShadow: '0 0 20px rgba(0, 255, 136, 0.2)' }}>
                            ₹{receivedItems.reduce((acc, item) => {
                                if (!item.selected) return acc;
                                const base = item.received_qty * item.received_price;
                                const disc = item.discount_type === 'PERCENTAGE' ? (base * item.discount_value / 100) : item.discount_value;
                                return acc + ((base - disc) * (1 + (item.tax_rate / 100)));
                            }, 0).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', marginTop: '3rem', borderTop: '1px solid var(--border-glass)', paddingTop: '2rem' }}>
                    <button 
                        className="secondary-btn" 
                        onClick={() => navigate('/procurement/pr-entries')}
                        style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
                        disabled={submitting}
                    >
                        Cancel & Go Back
                    </button>
                    <button 
                        className="action-btn" 
                        onClick={submitReceipt}
                        style={{ padding: '0.8rem 3rem', fontSize: '1rem', minWidth: '250px' }}
                        disabled={submitting}
                    >
                        {submitting ? 'Processing...' : 'Confirm & Post Receipt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceivePR;
