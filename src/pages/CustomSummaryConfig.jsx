import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CustomSummaryConfig = () => {
    const [configs, setConfigs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state for adding/editing
    const [showModal, setShowModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        config_type: 'CATEGORY',
        display_name: '',
        category: '',
        item: '',
        display_order: 0,
        show_total_only: true,
        specific_items: []
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [configRes, catRes, itemRes] = await Promise.all([
                api.getCustomSummaryConfigs(),
                api.getCategories(),
                api.getItems(1, 1000)
            ]);
            setConfigs(configRes.results || configRes);
            setCategories(catRes.results || catRes);
            setItems(itemRes.results || itemRes);
        } catch (error) {
            console.error("Error loading config data", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        if (!searchTerm) return true;
        const tokens = searchTerm.toLowerCase().split(' ').filter(t => t.trim() !== '');
        return tokens.every(token => 
            item.name.toLowerCase().includes(token) || 
            item.category_name.toLowerCase().includes(token)
        );
    });

    const handleAdd = () => {
        setEditingConfig(null);
        setSearchTerm('');
        setFormData({
            config_type: 'CATEGORY',
            custom_name: '',
            display_name: '',
            category: '',
            item: '',
            display_order: configs.length > 0 ? Math.max(...configs.map(c => c.display_order)) + 1 : 1,
            show_total_only: true,
            specific_items: []
        });
        setShowModal(true);
    };

    const handleEdit = (config) => {
        setEditingConfig(config);
        setSearchTerm('');
        setFormData({
            config_type: config.config_type || 'CATEGORY',
            custom_name: config.custom_name || '',
            display_name: config.display_name || '',
            category: config.category || '',
            item: config.item || '',
            display_order: config.display_order,
            show_total_only: config.show_total_only,
            specific_items: config.specific_items || []
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this configuration?")) return;
        try {
            await api.deleteCustomSummaryConfig(id);
            await loadData();
        } catch (error) {
            alert("Error deleting config");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        // Clean up data based on type
        const dataToSave = { ...formData };
        if (formData.config_type === 'CATEGORY') {
            dataToSave.item = null;
            dataToSave.custom_name = '';
        } else if (formData.config_type === 'ITEM') {
            dataToSave.category = null;
            dataToSave.custom_name = '';
            dataToSave.specific_items = [];
            dataToSave.show_total_only = true;
        } else if (formData.config_type === 'GROUP') {
            dataToSave.category = null;
            dataToSave.item = null;
            dataToSave.show_total_only = true;
        }

        try {
            if (editingConfig) {
                await api.updateCustomSummaryConfig(editingConfig.id, dataToSave);
            } else {
                await api.createCustomSummaryConfig(dataToSave);
            }
            setShowModal(false);
            await loadData();
        } catch (error) {
            console.error("Save error", error);
            alert("Error saving configuration");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleItemSelection = (itemId) => {
        setFormData(prev => {
            const items = [...prev.specific_items];
            const index = items.indexOf(itemId);
            if (index > -1) {
                items.splice(index, 1);
            } else {
                items.push(itemId);
            }
            return { ...prev, specific_items: items };
        });
    };

    if (loading) return (
        <div className="main-container">
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1 className="glow-text">Custom Summary Config</h1>
                <p>Define the structure and order of your custom monthly report rows.</p>
            </header>

            <div className="glass-heavy" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Report Blocks</h2>
                    <button className="action-btn glow-button" onClick={handleAdd}>+ ADD NEW BLOCK</button>
                </div>

                <div className="config-grid">
                    {configs.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                            No report blocks configured yet. Add your first category to start building your custom summary.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {configs.map(config => (
                                <div key={config.id} className="glass" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div className="order-badge">{config.display_order}</div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                                                {config.display_name || (config.config_type === 'CATEGORY' ? config.category_name : (config.config_type === 'ITEM' ? config.item_name : config.custom_name))}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>
                                                {config.config_type === 'CATEGORY' 
                                                    ? (config.show_total_only ? 'Total Category Summary' : `Itemized: ${config.item_details?.length || 0} items selected`)
                                                    : (config.config_type === 'ITEM' ? 'Standalone Item Row' : `Custom Group: ${config.item_details?.length || 0} items combined`)}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        <button className="icon-btn" title="Edit" onClick={() => handleEdit(config)}>✏️</button>
                                        <button className="icon-btn" title="Delete" onClick={() => handleDelete(config.id)}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-heavy modal-content animate-fade-in" style={{ width: '600px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
                            <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>{editingConfig ? 'Edit Block' : 'Add New Block'}</h2>
                        </div>
                        
                        <form onSubmit={handleSave} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                            <div className="form-group">
                                <label>BLOCK TYPE</label>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button 
                                        type="button" 
                                        className={formData.config_type === 'CATEGORY' ? 'action-btn glow-button' : 'secondary-btn'}
                                        style={{ flex: 1 }}
                                        onClick={() => setFormData({...formData, config_type: 'CATEGORY'})}
                                    >CATEGORY</button>
                                    <button 
                                        type="button" 
                                        className={formData.config_type === 'ITEM' ? 'action-btn glow-button' : 'secondary-btn'}
                                        style={{ flex: 1 }}
                                        onClick={() => setFormData({...formData, config_type: 'ITEM'})}
                                    >SINGLE ITEM</button>
                                    <button 
                                        type="button" 
                                        className={formData.config_type === 'GROUP' ? 'action-btn glow-button' : 'secondary-btn'}
                                        style={{ flex: 1 }}
                                        onClick={() => setFormData({...formData, config_type: 'GROUP'})}
                                    >CUSTOM GROUP</button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>REPORT DISPLAY NAME (OVERRIDE)</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Leave blank to use original name"
                                    value={formData.display_name}
                                    onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                                />
                            </div>

                            {formData.config_type === 'GROUP' && (
                                <div className="form-group">
                                    <label>GROUP NAME</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="e.g. Rice Varieties"
                                        required
                                        value={formData.custom_name}
                                        onChange={(e) => setFormData({...formData, custom_name: e.target.value})}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>SEARCH ITEMS</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. 'veg tomato' or 'rice'"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ border: searchTerm ? '1px solid var(--color-primary)' : '' }}
                                />
                            </div>

                            {formData.config_type === 'CATEGORY' && (
                                <div className="form-group">
                                    <label>SELECT CATEGORY</label>
                                    <select 
                                        className="form-input" 
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.config_type === 'ITEM' && (
                                <div className="form-group">
                                    <label>SELECT ITEM</label>
                                    <select 
                                        className="form-input" 
                                        required
                                        value={formData.item}
                                        onChange={(e) => setFormData({...formData, item: e.target.value})}
                                    >
                                        <option value="">Select Item</option>
                                        {filteredItems.map(item => (
                                            <option key={item.id} value={item.id}>{item.name} ({item.category_name})</option>
                                        ))}
                                    </select>
                                    {searchTerm && filteredItems.length === 0 && (
                                        <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginTop: '5px' }}>No items match your search.</p>
                                    )}
                                </div>
                            )}

                            <div className="form-group">
                                <label>DISPLAY ORDER</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    required
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                                />
                            </div>

                            {formData.config_type === 'CATEGORY' && (
                                <>
                                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                                        <input 
                                            type="checkbox" 
                                            id="showTotalOnly"
                                            checked={formData.show_total_only}
                                            onChange={(e) => setFormData({...formData, show_total_only: e.target.checked})}
                                            style={{ width: '20px', height: '20px' }}
                                        />
                                        <label htmlFor="showTotalOnly" style={{ margin: 0 }}>Show Category Grand Total Only</label>
                                    </div>

                                    {!formData.show_total_only && formData.category && (
                                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                            <label>SELECT ITEMS TO DISPLAY {searchTerm && `(Filtered by "${searchTerm}")`}</label>
                                            <div className="items-selector-grid">
                                                {filteredItems.filter(item => item.category === parseInt(formData.category)).map(item => (
                                                    <div 
                                                        key={item.id} 
                                                        className={`item-select-chip ${formData.specific_items.includes(item.id) ? 'selected' : ''}`}
                                                        onClick={() => toggleItemSelection(item.id)}
                                                    >
                                                        {item.name}
                                                        {formData.specific_items.includes(item.id) && <span style={{ marginLeft: '8px' }}>✓</span>}
                                                    </div>
                                                ))}
                                            </div>
                                            {searchTerm && filteredItems.filter(item => item.category === parseInt(formData.category)).length === 0 && (
                                                <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginTop: '5px' }}>No items in this category match your search.</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {formData.config_type === 'GROUP' && (
                                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                    <label>SELECT ITEMS IN GROUP {searchTerm && `(Filtered by "${searchTerm}")`}</label>
                                    <div className="items-selector-grid" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {filteredItems.map(item => (
                                            <div 
                                                key={item.id} 
                                                className={`item-select-chip ${formData.specific_items.includes(item.id) ? 'selected' : ''}`}
                                                onClick={() => toggleItemSelection(item.id)}
                                            >
                                                {item.name} <small style={{ opacity: 0.6 }}>({item.category_name})</small>
                                                {formData.specific_items.includes(item.id) && <span style={{ marginLeft: '8px' }}>✓</span>}
                                            </div>
                                        ))}
                                    </div>
                                    {searchTerm && filteredItems.length === 0 && (
                                        <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginTop: '5px' }}>No items match your search.</p>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingBottom: '1rem' }}>
                                <button type="submit" className="action-btn glow-button" style={{ flex: 1 }} disabled={isSaving}>
                                    {isSaving ? 'SAVING...' : 'SAVE CONFIGURATION'}
                                </button>
                                <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={() => setShowModal(false)}>CANCEL</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .glow-text {
                    color: var(--text-main);
                    text-shadow: 0 0 10px var(--border-glass-bright);
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }
                .light-theme .glow-text, .sky-theme .glow-text, .google-theme .glow-text {
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.5);
                    background: linear-gradient(to bottom, var(--color-primary), var(--text-main));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .order-badge {
                    background: var(--color-primary);
                    color: #fff;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    box-shadow: 0 0 10px rgba(244, 121, 32, 0.4);
                }
                .icon-btn {
                    background: var(--bg-glass);
                    border: 1px solid var(--border-glass);
                    padding: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .icon-btn:hover { background: var(--bg-glass-heavy); transform: scale(1.1); }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(5px);
                }
                .items-selector-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 8px;
                    margin-top: 10px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 4px;
                }
                .item-select-chip {
                    padding: 8px 12px;
                    background: var(--bg-glass);
                    border: 1px solid var(--border-glass);
                    border-radius: 20px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--text-muted);
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .item-select-chip:hover { border-color: var(--color-secondary); }
                .item-select-chip.selected {
                    background: var(--color-secondary);
                    border-color: var(--color-secondary);
                    color: #fff;
                    font-weight: 600;
                }
            `}} />
        </div>
    );
};

export default CustomSummaryConfig;
