import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const VendorReturnForm = () => {
  console.log('VendorReturnForm: Rendering with full logic but no icons');
  const { prId } = useParams();
  const navigate = useNavigate();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const fetchPRDetails = useCallback(async () => {
    console.log('VendorReturnForm: fetchPRDetails called for prId:', prId);
    try {
      const data = await api.getPurchaseRequest(prId);
      console.log('VendorReturnForm: PR data fetched:', data);
      setPr(data);
      if (data && data.items) {
        // Fetch specific batches for this PR
        const batches = await api.getStockBatches({ pr_id: prId });
        
        const bItems = batches.map(batch => {
          const prItem = data.items.find(i => i.item === batch.item) || {};
          return {
            id: batch.item, 
            batch_id: batch.id,
            name: `${prItem.item_name || batch.item_name} (Batch ${batch.id})`,
            available: parseFloat(batch.remaining_quantity),
            quantity: 0,
            unit_price: batch.unit_price,
            tax_rate: prItem.received_tax_rate || prItem.tax_rate || 0,
            discount_type: prItem.discount_type || 'PERCENTAGE',
            discount_value: prItem.discount_value || 0,
            original_qty: prItem.quantity_ordered || 1,
            reason: ''
          };
        });
        
        setReturnItems(bItems.filter(i => i.available > 0));
      }
    } catch (error) {
      console.error('VendorReturnForm: Error fetching PR details:', error);
      setError('Failed to load purchase request details or batches.');
    } finally {
      console.log('VendorReturnForm: Setting loading to false');
      setLoading(false);
    }
  }, [prId]);

  useEffect(() => {
    fetchPRDetails();
  }, [prId, fetchPRDetails]);

  const handleQtyChange = (batchId, val) => {
    setReturnItems(prev => prev.map(item => {
      if (item.batch_id === batchId) {
        const newQty = Math.max(0, Math.min(item.available, Number(val)));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleReasonChange = (batchId, val) => {
    setReturnItems(prev => prev.map(item => {
      if (item.batch_id === batchId) return { ...item, reason: val };
      return item;
    }));
  };

  const handleSubmit = async () => {
    const activeItems = returnItems.filter(i => i.quantity > 0);
    if (activeItems.length === 0) {
      setError('Please specify at least one item to return.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        vendor: pr.vendor,
        purchase_request: pr.id,
        remarks: remarks,
        items: activeItems.map(i => ({
          item: i.id,
          batch_id: i.batch_id,
          quantity: Number(parseFloat(i.quantity).toFixed(3)),
          unit_price: Number(parseFloat(i.unit_price).toFixed(2)),
          tax_rate: i.tax_rate,
          discount_type: i.discount_type,
          discount_value: i.discount_value,
          reason: i.reason
        }))
      };
      await api.createVendorReturn(payload);
      setSuccess(true);
      setTimeout(() => navigate('/procurement/vendor-returns'), 2000);
    } catch (err) {
      console.error('Error creating return:', err);
      const errorMsg = err.detail || 
                       (err.items ? 'Validation error in items.' : null) ||
                       (typeof err === 'object' ? JSON.stringify(err) : 'Failed to process return. Please try again.');
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="main-container" style={{ textAlign: 'center', opacity: 0.5 }}>Loading PR details...</div>;
  if (!pr) return <div className="main-container" style={{ textAlign: 'center', opacity: 0.5 }}>PR not found.</div>;

  return (
    <div className="main-container animate-fade-in">
      <button 
        onClick={() => navigate('/procurement/vendor-returns')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '2rem', fontWeight: 700 }}
      >
        ← Back to Selection
      </button>

      <header className="welcome-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1>Process Return</h1>
          <span style={{ background: 'var(--status-info-bg)', color: 'var(--status-info-text)', padding: '0.4rem 1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800 }}>
            {pr.pr_reference}
          </span>
          {pr.receipts && pr.receipts.length > 0 && (
            <span style={{ background: 'rgba(244, 121, 32, 0.1)', color: 'var(--color-primary)', padding: '0.4rem 1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800 }}>
              Inv: {pr.receipts.map(r => r.invoice_number).filter(Boolean).join(', ') || 'N/A'}
            </span>
          )}
        </div>
        <p>Return items from <strong>{pr.vendor_name}</strong> to update inventory and records.</p>
      </header>

      {error && (
        <div className="glass" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--status-error-text-vibrant)', background: 'var(--status-error-bg)' }}>
          ⚠️ <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {success && (
        <div className="glass" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--status-success-text-vibrant)', background: 'var(--status-success-bg)' }}>
          ✅ <span style={{ fontWeight: 600 }}>Return processed successfully! Redirecting...</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr style={{ background: 'var(--bg-glass-heavy)', borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Item Details</th>
                  <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Available</th>
                  <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Return Qty</th>
                  <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tax %</th>
                  <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total</th>
                  <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map(item => (
                  <tr key={item.batch_id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '1.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-glass-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          📦
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>₹ {Number(item.unit_price).toLocaleString()}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem' }}>
                      <span style={{ fontWeight: 800, opacity: 0.8 }}>{item.available}</span>
                    </td>
                    <td style={{ padding: '1.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '0.3rem', width: 'fit-content' }}>
                        <button onClick={() => handleQtyChange(item.batch_id, item.quantity - 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'none', color: 'inherit', cursor: 'pointer' }}>-</button>
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleQtyChange(item.batch_id, e.target.value)} 
                          style={{ width: '50px', textAlign: 'center', background: 'none', border: 'none', color: 'inherit', fontWeight: 800, outline: 'none' }} 
                        />
                        <button onClick={() => handleQtyChange(item.batch_id, item.quantity + 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'none', color: 'inherit', cursor: 'pointer' }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem' }}>
                      <span style={{ background: 'var(--status-info-bg)', color: 'var(--status-info-text)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800 }}>
                        {item.tax_rate}%
                      </span>
                    </td>
                    <td style={{ padding: '1.2rem' }}>
                      <span style={{ fontWeight: 800 }}>
                        ₹ {(() => {
                          const base = item.quantity * item.unit_price;
                          let discount = 0;
                          if (item.discount_type === 'PERCENTAGE') {
                            discount = base * (item.discount_value / 100);
                          } else {
                            discount = (item.discount_value / item.original_qty) * item.quantity || 0;
                          }
                          const tax = (base - discount) * (item.tax_rate / 100);
                          return (base - discount + tax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </td>
                    <td style={{ padding: '1.2rem' }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}>💬</span>
                        <input 
                          type="text" 
                          placeholder="Reason for return..." 
                          className="form-input" 
                          style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.85rem' }} 
                          value={item.reason}
                          onChange={(e) => handleReasonChange(item.batch_id, e.target.value)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            ↩️ Return Remarks
          </h3>
          <textarea 
            placeholder="Additional notes for the vendor return record..."
            className="form-input"
            style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          ></textarea>

          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Total Return Value</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                ₹ {returnItems.reduce((acc, item) => {
                  const base = item.quantity * item.unit_price;
                  let discount = 0;
                  if (item.discount_type === 'PERCENTAGE') {
                    discount = base * (item.discount_value / 100);
                  } else {
                    discount = (item.discount_value / item.original_qty) * item.quantity || 0;
                  }
                  const tax = (base - discount) * (item.tax_rate / 100);
                  return acc + (base - discount + tax);
                }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-secondary" 
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button 
                className="action-btn glow-button" 
                onClick={handleSubmit}
                disabled={submitting || success || returnItems.filter(i => i.quantity > 0).length === 0}
                style={{ padding: '1rem 3rem' }}
              >
                {submitting ? 'Processing...' : 'Complete Return'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorReturnForm;
