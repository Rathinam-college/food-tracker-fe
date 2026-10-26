import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Modal = ({ isOpen, onClose, title, children, color }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <div className="glass modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ borderLeft: `6px solid ${color}` }}>
                <button className="modal-close" onClick={onClose}>✕</button>
                <div style={{ padding: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        {title}
                    </h2>
                    {children}
                </div>
            </div>
        </div>
    );
};

const MasterData = () => {
    const { hasPermission } = useAuth();
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [vendorCategories, setVendorCategories] = useState([]);
    const [showItemForm, setShowItemForm] = useState(false);
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showVendorCategoryForm, setShowVendorCategoryForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingVendorCategory, setEditingVendorCategory] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [vendorCategoryName, setVendorCategoryName] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Pagination states for items
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [nextUrl, setNextUrl] = useState(null);
    const [prevUrl, setPrevUrl] = useState(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    
    // Determine view mode from URL
    const viewMode = location.pathname.includes('/vendor-categories') ? 'vendor-categories' :
                     location.pathname.includes('/categories') ? 'categories' : 'items';

    const [newItem, setNewItem] = useState({
        name: '', category: '', unit: '', min_stock_level: 0
    });


    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterCategory, debouncedSearch]);

    async function fetchData() {
        try {
            setLoading(true);
            const [itemsResponse, catsData, vCatsData] = await Promise.all([
                api.getItems(currentPage, pageSize, filterCategory, debouncedSearch),
                api.getCategories(),
                api.getVendorCategories()
            ]);
            
            if (itemsResponse.results) {
                setItems(itemsResponse.results);
                setTotalCount(itemsResponse.count);
                setNextUrl(itemsResponse.next);
                setPrevUrl(itemsResponse.previous);
            } else {
                setItems(itemsResponse);
            }
            
            setCategories(catsData);
            setVendorCategories(vCatsData);
        } catch (error) {
            console.error("Error fetching master data", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, [viewMode, currentPage, pageSize, filterCategory, debouncedSearch]);

    const handleItemSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.updateItem(editingItem.id, newItem);
            } else {
                await api.createItem(newItem);
            }
            setShowItemForm(false);
            setEditingItem(null);
            setNewItem({ name: '', category: '', unit: '', min_stock_level: 0 });
            fetchData();
        } catch (error) {
            console.error("Error saving item", error);
        }
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await api.updateCategory(editingCategory.id, { name: categoryName });
            } else {
                await api.createCategory({ name: categoryName });
            }
            setCategoryName('');
            setEditingCategory(null);
            setShowCategoryForm(false);
            fetchData();
        } catch (error) {
            console.error("Error saving category", error);
        }
    };

    const handleVendorCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingVendorCategory) {
                await api.updateVendorCategory(editingVendorCategory.id, { name: vendorCategoryName });
            } else {
                await api.createVendorCategory({ name: vendorCategoryName });
            }
            setVendorCategoryName('');
            setEditingVendorCategory(null);
            setShowVendorCategoryForm(false);
            fetchData();
        } catch (error) {
            console.error("Error saving vendor category", error);
        }
    };


    const handleEditCategory = (cat) => {
        setEditingCategory(cat);
        setCategoryName(cat.name);
        setShowCategoryForm(true);
    };

    const handleDeleteCategory = async (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await api.deleteCategory(id);
                fetchData();
            } catch (error) {
                console.error("Error deleting category", error);
            }
        }
    };

    const handleEditVendorCategory = (cat) => {
        setEditingVendorCategory(cat);
        setVendorCategoryName(cat.name);
        setShowVendorCategoryForm(true);
    };

    const handleDeleteVendorCategory = async (id) => {
        if (window.confirm('Are you sure you want to delete this vendor category?')) {
            try {
                await api.deleteVendorCategory(id);
                fetchData();
            } catch (error) {
                console.error("Error deleting vendor category", error);
            }
        }
    };

    const handleEditItem = (item) => {
        setEditingItem(item);
        setNewItem({
            name: item.name,
            category: item.category,
            unit: item.unit,
            min_stock_level: item.min_stock_level || 0
        });
        setShowItemForm(true);
    };

    const handleDeleteItem = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await api.deleteItem(id);
                fetchData();
            } catch (error) {
                console.error("Error deleting item", error);
            }
        }
    };

    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    };

    const handleExportItems = async () => {
        try {
            const blob = await api.exportItems();
            downloadBlob(blob, `Material_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err) {
            console.error("Error exporting items", err);
            alert('Failed to export Material Registry');
        }
    };

    const handleImportItems = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (window.confirm(`Are you sure you want to import items from ${file.name}? Existing items with the same name will be updated.`)) {
            try {
                setLoading(true);
                const result = await api.importItems(file);
                alert(`Import Complete!\nCreated: ${result.created}\nUpdated: ${result.updated}\nErrors: ${result.errors.length}`);
                if (result.errors.length > 0) {
                    console.error("Import Errors:", result.errors);
                }
                fetchData();
            } catch (err) {
                console.error("Error importing items", err);
                alert(err.error || 'Failed to import Material Registry');
            } finally {
                setLoading(false);
                e.target.value = ''; // Reset input
            }
        }
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Are you sure you want to delete ${selectedItems.length} selected items?`)) {
            try {
                setLoading(true);
                await api.bulkDeleteItems(selectedItems);
                alert('Successfully deleted selected items');
                setSelectedItems([]);
                fetchData();
            } catch (err) {
                console.error("Error in bulk delete", err);
                alert(err.error || 'Failed to delete some items. They may be linked to existing transactions.');
            } finally {
                setLoading(false);
            }
        }
    };

    const getFilteredDisplayData = () => {
        if (viewMode === 'items') return items;
        if (viewMode === 'categories') {
            return categories.filter(cat => {
                if (!searchQuery) return true;
                const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
                return terms.every(term => cat.name.toLowerCase().includes(term));
            });
        }
        if (viewMode === 'vendor-categories') {
            return vendorCategories.filter(cat => {
                if (!searchQuery) return true;
                const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
                return terms.every(term => cat.name.toLowerCase().includes(term));
            });
        }
        return [];
    };

    const filteredItems = getFilteredDisplayData();
    const totalPages = Math.ceil(totalCount / pageSize);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    const handleToggleSelectAll = () => {
        if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredItems.map(i => i.id));
        }
    };

    const handleToggleSelectItem = (id) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(itemId => itemId !== id));
        } else {
            setSelectedItems([...selectedItems, id]);
        }
    };


    return (
        <div className="main-container">
            {loading && (
                <div className="loading-overlay">
                    <div className="loader"></div>
                    <p style={{ color: 'white', fontWeight: 600 }}>Processing Request...</p>
                </div>
            )}
            <header className="welcome-header" style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.5rem' }}>
                    {viewMode === 'items' ? 'Material Registry' : 
                    viewMode === 'categories' ? 'Item Categories Management' : 'Vendor Categories Management'}
                </h1>
                <p>
                    {viewMode === 'items' ? 'View and manage all food items in the system.' : 
                     viewMode === 'categories' ? 'Organize your items into custom categories.' : 
                     'Organize your vendors into custom categories.'}
                </p>
            </header>

            <div className="flex-stack" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {viewMode === 'items' && (
                    <>
                        {hasPermission('can_manage_items') && (
                            <button className="glass metric-card" style={{ width: 'auto', padding: '1rem 2rem', border: '1px solid var(--color-primary)' }} onClick={() => { setShowItemForm(true); setEditingItem(null); setNewItem({ name: '', category: '', unit: '', min_stock_level: 0 }); }}>
                                <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>📦</span> Register New Item
                            </button>
                        )}
                        <button className="glass metric-card" style={{ width: 'auto', padding: '1rem 2rem', border: '1px solid var(--status-success-text-vibrant)' }} onClick={handleExportItems}>
                            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>📤</span> Export Registry
                        </button>
                        {hasPermission('can_manage_items') && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImportItems}
                                    style={{ display: 'none' }}
                                    accept=".xlsx, .xls"
                                />
                                <button 
                                    className="glass metric-card" 
                                    style={{ width: 'auto', padding: '1rem 2rem', border: '1px solid #ff9800' }} 
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>📥</span> Import Registry
                                </button>
                            </>
                        )}
                    </>
                )}
                {viewMode === 'categories' && hasPermission('can_manage_categories') && (
                    <button className="glass metric-card" style={{ width: 'auto', padding: '1rem 2rem', border: '1px solid var(--color-accent)' }} onClick={() => { setShowCategoryForm(true); setEditingCategory(null); setCategoryName(''); }}>
                        <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>📁</span> Add New Category
                    </button>
                )}
                {viewMode === 'vendor-categories' && hasPermission('can_manage_vendors') && (
                    <button className="glass metric-card" style={{ width: 'auto', padding: '1rem 2rem', border: '1px solid var(--color-secondary)' }} onClick={() => { setShowVendorCategoryForm(true); setEditingVendorCategory(null); setVendorCategoryName(''); }}>
                        <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>📂</span> Add Vendor Category
                    </button>
                )}
            </div>

            <Modal 
                isOpen={showCategoryForm} 
                onClose={() => setShowCategoryForm(false)} 
                title={editingCategory ? '✏️ Edit Category' : '📁 Create New Category'}
                color="var(--color-accent)"
            >
                <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category Name</label>
                        <input 
                            className="form-input" 
                            placeholder="Enter category name..." 
                            required 
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="action-btn" style={{ flex: 2, '--accent-color': 'var(--color-success)' }}>
                            {editingCategory ? 'Update Category' : 'Save Category'}
                        </button>
                        <button type="button" className="action-btn" style={{ flex: 1, background: 'var(--bg-glass)', color: 'var(--text-main)' }} onClick={() => setShowCategoryForm(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal 
                isOpen={showVendorCategoryForm} 
                onClose={() => setShowVendorCategoryForm(false)} 
                title={editingVendorCategory ? '✏️ Edit Vendor Category' : '📂 Create Vendor Category'}
                color="var(--color-secondary)"
            >
                <form onSubmit={handleVendorCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category Name</label>
                        <input 
                            className="form-input" 
                            placeholder="Enter vendor category name..." 
                            required 
                            value={vendorCategoryName}
                            onChange={(e) => setVendorCategoryName(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="action-btn" style={{ flex: 2, '--accent-color': 'var(--color-success)' }}>
                            {editingVendorCategory ? 'Update Category' : 'Save Category'}
                        </button>
                        <button type="button" className="action-btn" style={{ flex: 1, background: 'var(--bg-glass)', color: 'var(--text-main)' }} onClick={() => setShowVendorCategoryForm(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>
            <Modal 
                isOpen={showItemForm} 
                onClose={() => setShowItemForm(false)} 
                title={editingItem ? '✏️ Edit Food Material' : '📦 Register New Item'}
                color="var(--color-primary)"
            >
                <form onSubmit={handleItemSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Item Name</label>
                        <input 
                            className="form-input" 
                            placeholder="Basmati Rice" 
                            required 
                            value={newItem.name}
                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                        />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category</label>
                        <select 
                            className="form-input"
                            value={newItem.category}
                            onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>UOM</label>
                            <input 
                                className="form-input" 
                                placeholder="e.g. Kg, Nos" 
                                value={newItem.unit}
                                onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                            />
                        </div>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Min Stock Level (Procurement Target)</label>
                            <input 
                                type="number"
                                step="0.001"
                                className="form-input" 
                                placeholder="e.g. 10.000" 
                                value={newItem.min_stock_level}
                                onChange={(e) => setNewItem({...newItem, min_stock_level: e.target.value})}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="action-btn" style={{ flex: 2 }}>
                            {editingItem ? 'Update Item' : 'Register Item'}
                        </button>
                        <button type="button" className="action-btn" style={{ flex: 1, background: 'var(--bg-glass)', color: 'var(--text-main)' }} onClick={() => setShowItemForm(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>


            <div className="animate-fade-in" style={{ marginTop: '1rem' }}>
                {viewMode === 'vendor-categories' && (
                    <div className="glass" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Vendor Categories List</h2>
                            <span style={{ fontSize: '0.75rem', background: 'var(--bg-glass)', padding: '0.2rem 0.6rem', borderRadius: '50px' }}>{vendorCategories.length} Types</span>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <input 
                                className="form-input" 
                                style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
                                placeholder="🔍 Search vendor categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {vendorCategories
                                .filter(cat => {
                                    if (!searchQuery) return true;
                                    const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
                                    return terms.every(term => cat.name.toLowerCase().includes(term));
                                })
                                .map(cat => (
                                    <div key={cat.id} className="history-card" style={{ padding: '1rem', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</span>
                                        {hasPermission('can_manage_vendors') && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleEditVendorCategory(cat)} className="icon-btn">✏️</button>
                                                <button onClick={() => handleDeleteVendorCategory(cat.id)} className="icon-btn">🗑️</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {viewMode === 'categories' && (
                    <div className="glass" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Categories List</h2>
                            <span style={{ fontSize: '0.75rem', background: 'var(--bg-glass)', padding: '0.2rem 0.6rem', borderRadius: '50px' }}>{categories.length} Types</span>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <input 
                                className="form-input" 
                                style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
                                placeholder="🔍 Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {categories
                                .filter(cat => {
                                    if (!searchQuery) return true;
                                    const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
                                    return terms.every(term => cat.name.toLowerCase().includes(term));
                                })
                                .map(cat => (
                                    <div key={cat.id} className="history-card" style={{ padding: '1rem', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</span>
                                        {hasPermission('can_manage_categories') && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleEditCategory(cat)} className="icon-btn">✏️</button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="icon-btn">🗑️</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {viewMode === 'items' && (
                    <div className="glass" style={{ padding: '2rem' }}>
                        <div className="flex-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem' }}>Items Registry</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                        {filterCategory 
                                            ? `📦 ${totalCount} items in ${categories.find(c => c.id === parseInt(filterCategory))?.name || ''}`
                                            : `📦 Total ${totalCount} materials registered`
                                        }
                                    </span>
                                    {selectedItems.length > 0 && hasPermission('can_manage_items') && (
                                        <button 
                                            onClick={handleBulkDelete}
                                            className="action-btn" 
                                            style={{ 
                                                height: '32px', 
                                                padding: '0 1rem', 
                                                fontSize: '0.75rem', 
                                                '--accent-color': 'var(--status-error-text-vibrant)' 
                                            }}
                                        >
                                            🗑️ Delete Selected ({selectedItems.length})
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-stack" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                                    <input 
                                        className="form-input" 
                                        style={{ width: '100%', paddingLeft: '2.5rem', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
                                        placeholder="🔍 Search items or categories..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <select 
                                    className="form-input" 
                                    style={{ width: 'auto', minWidth: '180px', padding: '0.5rem', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        <th style={{ padding: '1rem', width: '40px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                                                onChange={handleToggleSelectAll}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </th>
                                        <th style={{ padding: '1rem' }}>NAME</th>
                                        <th style={{ padding: '1rem' }}>CATEGORY</th>
                                        <th style={{ padding: '1rem' }}>UOM</th>
                                        <th style={{ padding: '1rem' }}>MIN STOCK</th>
                                        <th style={{ padding: '1rem' }}>TAX %</th>
                                        <th style={{ padding: '1rem' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map(item => (
                                        <tr key={item.id} style={{ 
                                            background: selectedItems.includes(item.id) ? 'rgba(244, 121, 32, 0.1)' : 'var(--bg-glass)', 
                                            transition: 'var(--transition)' 
                                        }}>
                                            <td style={{ padding: '1rem', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => handleToggleSelectItem(item.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{item.name}</td>
                                            <td style={{ padding: '1rem' }}><span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>{item.category_name}</span></td>
                                            <td style={{ padding: '1rem' }}>{item.unit}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                                                    {parseFloat(item.min_stock_level || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ background: 'var(--status-success-bg)', color: 'var(--status-success-text-vibrant)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                                                    {item.current_tax_rate}%
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                {hasPermission('can_manage_items') && (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={() => handleEditItem(item)} className="icon-btn">✏️</button>
                                                        <button onClick={() => handleDeleteItem(item.id)} className="icon-btn">🗑️</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Component */}
                        {totalPages > 1 && (
                            <div className="glass" style={{ marginTop: '1rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button 
                                        className="secondary-btn" 
                                        style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                        disabled={!prevUrl}
                                        onClick={() => handlePageChange(currentPage - 1)}
                                    >◀</button>

                                    {(() => {
                                        const pages = [];
                                        const startP = Math.max(1, currentPage - 2);
                                        const endP = Math.min(totalPages, currentPage + 2);

                                        if (startP > 1) {
                                            pages.push(<button key={1} className="secondary-btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }} onClick={() => handlePageChange(1)}>1</button>);
                                            if (startP > 2) pages.push(<span key="dots-start">...</span>);
                                        }

                                        for (let p = startP; p <= endP; p++) {
                                            pages.push(
                                                <button 
                                                    key={p} 
                                                    className={p === currentPage ? 'action-btn' : 'secondary-btn'} 
                                                    style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', fontWeight: p === currentPage ? 700 : 400 }}
                                                    onClick={() => handlePageChange(p)}
                                                >{p}</button>
                                            );
                                        }

                                        if (endP < totalPages) {
                                            if (endP < totalPages - 1) pages.push(<span key="dots-end">...</span>);
                                            pages.push(<button key={totalPages} className="secondary-btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }} onClick={() => handlePageChange(totalPages)}>{totalPages}</button>);
                                        }
                                        return pages;
                                    })()}

                                    <button 
                                        className="secondary-btn" 
                                        style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                        disabled={!nextUrl}
                                        onClick={() => handlePageChange(currentPage + 1)}
                                    >▶</button>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Rows:</span>
                                    <select 
                                        className="form-input" 
                                        style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default MasterData;
