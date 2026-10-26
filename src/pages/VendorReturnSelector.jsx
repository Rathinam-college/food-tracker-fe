import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Search, 
  RotateCcw, 
  Package, 
  User, 
  Calendar,
  ChevronRight
} from 'lucide-react';

const VendorReturnSelector = () => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prLoading, setPrLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [prSearchTerm, setPrSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const data = await api.getVendors();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

    const handleVendorSelect = async (vendor) => {
    setSelectedVendor(vendor);
    setPrLoading(true);
    try {
      const res1 = await api.getPurchaseRequests({ 
        vendor: vendor.id,
        status: 'COMPLETED',
        has_returnable_stock: 'true'
      });
      const res2 = await api.getPurchaseRequests({
          vendor: vendor.id,
          status: 'RECEIVED',
          has_returnable_stock: 'true'
      });
      
      const list1 = res1.results || res1;
      const list2 = res2.results || res2;
      
      setPrs([...list1, ...list2].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error('Error fetching PRs:', error);
    } finally {
      setPrLoading(false);
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPrs = prs.filter(pr => {
    const term = prSearchTerm.toLowerCase();
    if (!term) return true;
    
    // Search in PR reference
    if (pr.pr_reference.toLowerCase().includes(term)) return true;
    
    // Search in Invoice numbers
    if (pr.receipts && pr.receipts.some(r => r.invoice_number && r.invoice_number.toLowerCase().includes(term))) return true;
    
    return false;
  });

  return (
    <div className="main-container animate-fade-in">
      <header className="welcome-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Vendor Returns</h1>
          <p>Select a vendor and purchase request to initiate a return.</p>
        </div>
        <button 
          className="action-btn" 
          onClick={() => navigate('/procurement/vendor-returns/history')}
          style={{ background: 'var(--bg-glass-heavy)', padding: '0.8rem 1.5rem' }}
        >
          📜 View Return History
        </button>
      </header>

      <div className="responsive-grid" style={{ gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '2rem' }}>
        {/* Vendor Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', opacity: 0.5 }} />
            <input 
              type="text"
              placeholder="Search vendors..."
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.8rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="glass custom-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading vendors...</div>
            ) : filteredVendors.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No vendors found.</div>
            ) : (
              filteredVendors.map(vendor => (
                <div
                  key={vendor.id}
                  onClick={() => handleVendorSelect(vendor)}
                  style={{ 
                    padding: '1.2rem', 
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-glass)',
                    transition: 'var(--transition)',
                    backgroundColor: selectedVendor?.id === vendor.id ? 'var(--color-primary)' : 'transparent',
                    color: selectedVendor?.id === vendor.id ? '#fff' : 'inherit'
                  }}
                  className={selectedVendor?.id === vendor.id ? "" : "hover-bright"}
                >
                  <div style={{ fontWeight: 700 }}>{vendor.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.3rem' }}>{vendor.contact_person || 'No contact'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PR Selection */}
        <div>
          {!selectedVendor ? (
            <div className="glass justify-center" style={{ height: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5, borderStyle: 'dashed' }}>
              <RotateCcw style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.2 }} />
              <p>Select a vendor to view purchase requests</p>
            </div>
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>Selected Vendor</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedVendor.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '300px' }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', opacity: 0.5 }} />
                    <input 
                      type="text"
                      placeholder="Search PR or Invoice #..."
                      className="form-input"
                      style={{ width: '100%', paddingLeft: '2.8rem' }}
                      value={prSearchTerm}
                      onChange={(e) => setPrSearchTerm(e.target.value)}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Total PRs</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{prs.length}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {prLoading ? (
                  <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>Fetching purchase requests...</div>
                ) : filteredPrs.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                    {prSearchTerm ? "No matching PRs found for this search." : "No returnable purchase requests found for this vendor."}
                  </div>
                ) : (
                  filteredPrs.map(pr => (
                    <div 
                      key={pr.id}
                      className="glass hover-bright"
                      style={{ padding: '1.5rem', cursor: 'pointer' }}
                      onClick={() => navigate(`/procurement/vendor-returns/new/${pr.id}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-glass-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package style={{ opacity: 0.7 }} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{pr.pr_reference}</span>
                              <span style={{ 
                                fontSize: '0.65rem', 
                                padding: '0.2rem 0.6rem', 
                                borderRadius: '50px', 
                                fontWeight: 800,
                                background: pr.status === 'COMPLETED' ? 'var(--status-success-bg)' : 'var(--status-info-bg)',
                                color: pr.status === 'COMPLETED' ? 'var(--status-success-text-vibrant)' : 'var(--status-info-text)'
                              }}>{pr.status}</span>
                              
                              {pr.receipts && pr.receipts.length > 0 && (
                                <span style={{ 
                                  fontSize: '0.65rem', 
                                  padding: '0.2rem 0.6rem', 
                                  borderRadius: '50px', 
                                  fontWeight: 800,
                                  background: 'rgba(244, 121, 32, 0.1)',
                                  color: 'var(--color-primary)'
                                }}>
                                  Inv: {pr.receipts.map(r => r.invoice_number).filter(Boolean).join(', ') || 'N/A'}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', opacity: 0.6 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12} /> {new Date(pr.order_date).toLocaleDateString()}</span>
                              <span style={{ fontWeight: 700 }}>₹ {Number(pr.total_amount).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                          Initiate Return <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorReturnSelector;
