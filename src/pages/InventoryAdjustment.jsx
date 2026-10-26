import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const InventoryAdjustment = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [batches, setBatches] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);


    const [formData, setFormData] = useState({
        action: 'REDUCE',
        quantity: '',
        type: 'WASTAGE',
        batch_id: '',
        remarks: '',
        unit_price: ''
    });

    useEffect(() => {
        const fetchStock = async () => {
            try {
                // Fetch live stock from procurement department
                const res = await api.getInventory({ 
                    department_code: 'procurement',
                    page_size: 1000 
                });
                // Correctly extract the list from the response object
                const stockList = res.results || res || [];
                setItems(Array.isArray(stockList) ? stockList : []);
            } catch {
                setError('Failed to load inventory levels. Please refresh.');
            }
        };
        fetchStock();
    }, []);

    useEffect(() => {
        if (!searchQuery || !Array.isArray(items)) {
            setFilteredItems([]);
            return;
        }
        const filtered = items.filter(it => {
            const name = it.item_name || '';
            const category = it.category_name || '';
            return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   category.toLowerCase().includes(searchQuery.toLowerCase());
        });
        setFilteredItems(filtered.slice(0, 10));
    }, [searchQuery, items]);

    const handleSelectItem = async (item) => {
        setSelectedItem(item);
        setSearchQuery('');
        setFilteredItems([]);
        setFormData(prev => ({ ...prev, batch_id: '' }));
        
        try {
            // Inventory records have the item ID in the 'item' field
            const itemId = item.item;
            const res = await api.getStockBatches({ 
                item: itemId, 
                department_code: 'procurement',
                has_stock: true 
            });
            // Handle both paginated and non-paginated responses
            const batchList = res.results || res || [];
            setBatches(Array.isArray(batchList) ? batchList : []);
        } catch (err) {
            console.error('Failed to load batches', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem || !formData.quantity) return;

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await api.adjustStock({
                item_id: selectedItem.item,
                action: formData.action,
                quantity: formData.quantity,
                type: formData.type,
                batch_id: formData.action === 'REDUCE' ? (formData.batch_id || null) : null,
                remarks: formData.remarks,
                unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null
            });

            if (res.status === 'SUCCESS') {
                setSuccess(res.message);
                setSelectedItem(null);
                setFormData({
                    action: 'REDUCE',
                    quantity: '',
                    type: 'WASTAGE',
                    batch_id: '',
                    remarks: '',
                    unit_price: ''
                });
                // Refresh live stock
                api.getInventory({ department_code: 'procurement', page_size: 1000 }).then(res => {
                    const stockList = res.results || res || [];
                    setItems(Array.isArray(stockList) ? stockList : []);
                });
            }
        } catch (err) {
            console.error('Adjustment error:', err);
            setError(err.error || err.detail || 'Adjustment failed. Please check if enough stock exists in specific batches.');
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <div className="main-container animate-fade-in">
            <header className="welcome-header" style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    <span style={{ marginRight: '1rem' }}>📉</span>
                    Inventory Adjustment
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    Record stock reductions due to wastage, spoilage, or audit corrections.
                </p>
            </header>

            <div className="responsive-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: '3rem' }}>
                {/* Form Section */}
                <div className="glass" style={{ padding: '2.5rem' }}>
                    <form onSubmit={handleSubmit} className="form-stack" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Item Search */}
                        <div className="form-group-stack" style={{ position: 'relative' }}>
                            <label>SEARCH MATERIAL</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Start typing item name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={selectedItem}
                            />
                            {filteredItems.length > 0 && (
                                <div className="animate-fade-in" style={{ 
                                    position: 'absolute', 
                                    width: '100%', 
                                    top: '100%', 
                                    zIndex: 10, 
                                    marginTop: '5px',
                                    background: '#0a0a0a', 
                                    color: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #333',
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.9)',
                                    overflow: 'hidden'
                                }}>
                                    {filteredItems.map(it => (
                                        <div 
                                            key={it.id} 
                                            style={{ 
                                                padding: '1rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #222',
                                                transition: 'background 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            onClick={() => handleSelectItem(it)}
                                        >
                                            <strong style={{ color: '#ffffff', fontSize: '1rem' }}>{it.item_name}</strong>
                                            <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                                                {it.category_name} | Stock: {it.current_quantity} {it.unit}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedItem && (
                            <div className="animate-fade-in" style={{ 
                                background: 'var(--bg-glass-heavy)', 
                                padding: '1.5rem', 
                                borderRadius: '12px',
                                borderLeft: '4px solid var(--color-secondary)',
                                marginBottom: '2rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'var(--color-secondary)' }}>{selectedItem.item_name}</h3>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Unit: {selectedItem.unit} | Current Stock: {selectedItem.current_quantity || 0}
                                        </span>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="text-btn" 
                                        onClick={() => setSelectedItem(null)}
                                        style={{ color: 'var(--status-error-text-vibrant)' }}
                                    >
                                        Change Item
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group-stack">
                                <label>QUANTITY TO REDUCE</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="glass-input"
                                    placeholder="0.00"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group-stack">
                                <label>ADJUSTMENT TYPE</label>
                                <select 
                                    className="glass-input"
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                >
                                    <option value="WASTAGE">🗑️ Wastage</option>
                                    <option value="BREAKAGE">💔 Breakage</option>
                                    <option value="EXPIRED">📅 Expired</option>
                                    <option value="AUDIT">📋 Audit Correction</option>
                                </select>
                            </div>
                        </div>

                        {selectedItem && (
                            <div className="form-group-stack animate-fade-in" style={{ 
                                background: 'rgba(0, 150, 214, 0.05)', 
                                padding: '1.5rem', 
                                borderRadius: '12px',
                                border: '1px dashed var(--color-secondary)'
                            }}>
                                <label style={{ color: 'var(--color-secondary)', fontWeight: 800 }}>
                                    🎯 SELECT SPECIFIC BATCH (REQUIRED)
                                </label>
                                <select 
                                    className="glass-input"
                                    value={formData.batch_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, batch_id: e.target.value }))}
                                    style={{ background: '#000', color: '#fff' }}
                                    required={formData.action === 'REDUCE'}
                                >
                                    <option value="" disabled>-- Select a batch to reduce from --</option>
                                    {batches.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.pr_reference ? `[${b.pr_reference}] ` : ''}📦 Batch #{b.id} ({b.batch_date}) | Stock: {parseFloat(b.remaining_quantity).toFixed(2)} {b.item_unit} | Price: ₹{parseFloat(b.unit_price).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    {batches.length > 0 
                                        ? "You must select the specific batch that this adjustment applies to."
                                        : "No specific batch records found. You cannot reduce stock without a valid batch."}
                                </p>
                            </div>
                        )}

                        <div className="form-group-stack">
                            <label>REMARKS / REASON</label>
                            <textarea
                                className="glass-input"
                                style={{ minHeight: '100px' }}
                                placeholder="Describe why this adjustment is being made..."
                                value={formData.remarks}
                                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                            />
                        </div>

                        {error && (
                            <div className="glass" style={{ padding: '1rem', borderLeft: '4px solid var(--status-error-text-vibrant)', color: 'var(--status-error-text-vibrant)' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {success && (
                            <div className="glass" style={{ padding: '1rem', borderLeft: '4px solid var(--status-success-text-vibrant)', color: 'var(--status-success-text-vibrant)' }}>
                                ✅ {success}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                type="submit" 
                                className="action-btn" 
                                style={{ flex: 1 }}
                                disabled={submitting || !selectedItem || !formData.quantity}
                            >
                                {submitting ? 'Processing...' : 'Confirm Adjustment'}
                            </button>
                            <button 
                                type="button" 
                                className="secondary-btn" 
                                onClick={() => navigate(-1)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                {/* Info Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    <div className="glass" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Adjustment Rules</h3>
                        <ul className="info-list" style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                            <li style={{ marginBottom: '0.8rem' }}>Stock can only be reduced from the **Procurement (Main Store)**.</li>
                            <li style={{ marginBottom: '0.8rem' }}>Adjustments are permanent and will appear in the **Stock Transition Report**.</li>
                            <li style={{ marginBottom: '0.8rem' }}>You MUST select the specific batch to maintain perfect audit tracking.</li>
                        </ul>
                    </div>

                    <div className="glass" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Recent Activity</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Visit the <strong>Stock Transition Report</strong> to see a full history of wastage and audit corrections.
                        </p>
                        <button 
                            className="text-btn" 
                            style={{ padding: 0, fontWeight: 700 }}
                            onClick={() => navigate('/procurement/reports/stock-transition')}
                        >
                            View Report →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryAdjustment;
