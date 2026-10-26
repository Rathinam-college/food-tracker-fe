import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';


const StockAvailability = ({ departmentCode }) => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [totalTaxValue, setTotalTaxValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    status: '',
    department_code: departmentCode,
    sort: '',
    page: 1,
    pageSize: '20'
  });
  const [paginationData, setPaginationData] = useState({ count: 0, total_pages: 1, has_next: false, has_previous: false });

  // Sync filters if departmentCode prop changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, department_code: departmentCode }));
  }, [departmentCode]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([
        api.getInventory({
          category: filters.category,
          search: filters.search,
          department_code: filters.department_code,
          sort: filters.sort,
          status: filters.status,
          page: filters.page,
          page_size: filters.pageSize
        }),
        api.getCategories()
      ]);
      setInventory(invRes.results || []);
      setTotalInventoryValue(invRes.total_inventory_value || 0);
      setTotalTaxValue(invRes.total_tax_value || 0);
      setPaginationData({
        count: invRes.count || 0,
        total_pages: Math.ceil((invRes.count || 0) / (filters.pageSize === 'all' ? (invRes.count || 1) : parseInt(filters.pageSize))),
        has_next: !!invRes.next,
        has_previous: !!invRes.previous
      });
      setCategories(catRes || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.search, filters.department_code, filters.sort, filters.page, filters.pageSize, filters.status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportInventoryExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = departmentCode === 'kitchen' ? 'Kitchen_Stock' : 'Procurement_Stock';
      link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export stock report');
    } finally {
      setExporting(false);
    }
  };

  const openLedger = (item) => {
    navigate(`item/${item.item}`, { state: { item_name: item.item_name, unit: item.unit } });
  };

  const getStockStatus = (item) => {
    const qty = parseFloat(item.current_quantity);
    const min = parseFloat(item.min_stock_level);
    if (qty <= 0) return { label: 'Out of Stock', color: 'var(--status-error-text-vibrant)', bg: 'var(--status-error-bg)', value: 'OUT_STOCK' };
    
    // Only show Low Stock for Procurement
    if (!isKitchen && qty <= min) {
      return { label: 'Low Stock', color: 'var(--status-pending-text)', bg: 'var(--status-pending-bg)', value: 'LOW_STOCK' };
    }
    
    return { label: 'In Stock', color: 'var(--status-success-text-vibrant)', bg: 'var(--status-success-bg)', value: 'IN_STOCK' };
  };

  const isKitchen = departmentCode === 'kitchen';

  return (
    <div className="main-container animate-fade-in">
      <header className="welcome-header" style={{ marginBottom: '3.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '3rem' }}>{isKitchen ? '🍳' : '📦'}</span>
          {isKitchen ? 'Kitchen Material Stock' : 'Procurement Stock Availability'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          {isKitchen 
            ? 'Inventory of materials currently in the kitchen department for daily operations.' 
            : 'Consolidated view of all food materials currently held in the central storehouse.'}
        </p>
      </header>

      {/* Stats Summary Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="glass metric-card" style={{ borderLeft: '6px solid var(--color-secondary)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>📊</div>
            <div>
              <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7 }}>Stocked Materials</div>
              <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800 }}>{inventory.filter(i => parseFloat(i.current_quantity) > 0).length}</div>
            </div>
          </div>
        </div>
        
        {!isKitchen && (
          <div className="glass metric-card" style={{ borderLeft: '6px solid var(--color-primary)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>⚠️</div>
              <div>
                <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7 }}>Low Stock Alerts</div>
                <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {inventory.filter(i => parseFloat(i.current_quantity) <= parseFloat(i.min_stock_level) && parseFloat(i.current_quantity) > 0).length}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="glass metric-card" style={{ borderLeft: '6px solid var(--status-error-text-vibrant)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🚫</div>
            <div>
              <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7 }}>Out of Stock</div>
              <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-error-text-vibrant)' }}>
                {inventory.filter(i => parseFloat(i.current_quantity) <= 0).length}
              </div>
            </div>
          </div>
        </div>

        <div className="glass metric-card" style={{ borderLeft: '6px solid #f1c40f', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>💰</div>
            <div>
              <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7 }}>Total Stock Value</div>
              <div className="metric-value" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1c40f', whiteSpace: 'nowrap' }}>
                ₹{totalInventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>

        <div className="glass metric-card" style={{ borderLeft: '6px solid #e67e22', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🧾</div>
            <div>
              <div className="metric-title" style={{ fontSize: '0.75rem', opacity: 0.7 }}>Total Tax Value</div>
              <div className="metric-value" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e67e22', whiteSpace: 'nowrap' }}>
                ₹{totalTaxValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="glass" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem 2rem', marginBottom: '2.5rem', alignItems: 'flex-end' }}>
        <div className="form-group-stack" style={{ flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEARCH</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Search..."
              className="glass-input"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="form-group-stack" style={{ flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CATEGORY</label>
          <select
            className="glass-input"
            style={{ width: '100%' }}
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group-stack" style={{ flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STOCK STATUS</label>
          <select
            className="glass-input"
            style={{ width: '100%' }}
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
          >
            <option value="">All Statuses</option>
            <option value="IN_STOCK">✅ In Stock</option>
            {!isKitchen && <option value="LOW_STOCK">⚠️ Low Stock</option>}
            <option value="OUT_STOCK">🚫 Out of Stock</option>
          </select>
        </div>

        <div className="form-group-stack" style={{ flex: '1 1 220px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SORT BY</label>
          <select
            className="glass-input"
            style={{ width: '100%' }}
            value={filters.sort}
            onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value, page: 1 }))}
          >
            <option value="">🔤 Item Name (A-Z)</option>
            <option value="stock_high">📈 Stock: High to Low</option>
            <option value="stock_low">📉 Stock: Low to High</option>
            <option value="value_high">💰 Total Value: High to Low</option>
          </select>
        </div>

        <div className="mobile-stack-buttons" style={{ display: 'flex', gap: '0.8rem', flex: '1 1 180px' }}>
          <button
            onClick={() => fetchData()}
            className="glass"
            style={{ 
              flex: '0 0 48px',
              height: '48px',
              borderRadius: '12px',
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}
            title="Refresh Data"
          >
            <span className={loading ? 'animate-spin' : ''} style={{ display: 'inline-block' }}>🔄</span>
          </button>
          
          <button
            onClick={handleExport}
            disabled={exporting}
            className="action-btn"
            style={{ flex: 1, height: '48px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
          >
            {exporting ? '⌛' : '📥'}
            <span style={{ whiteSpace: 'nowrap' }}>{exporting ? '...' : 'Excel'}</span>
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="glass" style={{ padding: '2rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.4rem' }}>Department Stock Register</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SHOW</span>
              <select 
                className="glass-input" 
                value={filters.pageSize} 
                onChange={(e) => setFilters(prev => ({ ...prev, pageSize: e.target.value, page: 1 }))}
                style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: '0.85rem' }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="all">All</option>
              </select>
            </div>
            <span style={{ fontSize: '0.8rem', background: 'var(--bg-glass)', padding: '0.4rem 1rem', borderRadius: '50px', fontWeight: 600 }}>
              Showing {inventory.length} of {paginationData.count} Items
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '1rem' }}>NAME</th>
                <th style={{ padding: '1rem' }}>CATEGORY</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>CURRENT STOCK</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>UOM</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>MIN STOCK</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>TAX %</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>TOTAL VALUE</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} style={{ opacity: 0.3 }}>
                    <td colSpan="8" style={{ padding: '1.5rem' }}>
                      <div className="animate-pulse" style={{ background: 'var(--bg-glass-heavy)', height: '40px', borderRadius: '12px' }}></div>
                    </td>
                  </tr>
                ))
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.4 }}>🔎</div>
                    <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>No materials found in current records.</p>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const status = getStockStatus(item);
                  const isOutOfStock = parseFloat(item.current_quantity) <= 0;
                  
                  return (
                    <tr key={item.item} style={{ background: 'var(--bg-glass)', transition: 'all 0.3s' }}>
                      <td style={{ padding: '1rem', fontWeight: 600, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                        {departmentCode !== 'kitchen' ? (
                          <button
                            onClick={() => openLedger(item)}
                            style={{
                              background: 'none', border: 'none', padding: 0,
                              color: 'var(--color-secondary)', fontWeight: 700,
                              cursor: 'pointer', fontSize: 'inherit',
                              textDecoration: 'underline dotted',
                              textUnderlineOffset: '3px', transition: 'color 0.2s'
                            }}
                            title={`View batch ledger for ${item.item_name}`}
                          >
                            {item.item_name}
                          </button>
                        ) : (
                          item.item_name
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: 'var(--color-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
                          {item.category_name || 'UNGROUPED'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <span style={{ 
                            fontSize: '1.4rem', 
                            fontWeight: 800, 
                            color: isOutOfStock ? 'var(--status-error-text-vibrant)' : 'var(--text-main)',
                            textShadow: isOutOfStock ? '0 0 15px var(--status-error-bg)' : 'none'
                          }}>
                            {parseFloat(item.current_quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.unit}</span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                          {parseFloat(item.min_stock_level || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ background: 'var(--status-success-bg)', color: 'var(--status-success-text-vibrant)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                          {item.current_tax_rate}%
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{ color: 'var(--color-secondary)', fontWeight: 800, fontSize: '1.2rem' }}>
                          ₹{parseFloat(item.inventory_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                        <span style={{ 
                          padding: '0.5rem 1.2rem', 
                          borderRadius: '50px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          background: status.bg, 
                          color: status.color,
                          border: `1px solid ${status.color}40`,
                          textTransform: 'uppercase',
                          display: 'inline-block'
                        }}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filters.pageSize !== 'all' && paginationData.total_pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button 
              className="secondary-btn" 
              disabled={!paginationData.has_previous}
              onClick={() => {
                setFilters(prev => ({ ...prev, page: prev.page - 1 }));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              ◀ Prev
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Page {filters.page} of {paginationData.total_pages}
            </span>
            <button 
              className="secondary-btn" 
              disabled={!paginationData.has_next}
              onClick={() => {
                setFilters(prev => ({ ...prev, page: prev.page + 1 }));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              Next ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAvailability;
