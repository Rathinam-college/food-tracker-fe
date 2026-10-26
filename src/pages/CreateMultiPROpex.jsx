import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateMultiPROpex = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [settlablePRs, setSettlablePRs] = useState([]);
    const [selectedPRIds, setSelectedPRIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [billImage, setBillImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const [formData, setFormData] = useState({
        opex_no: '',
        opex_date: new Date().toISOString().split('T')[0],
        bill_no: '',
        bill_date: new Date().toISOString().split('T')[0],
        payment_status: 'PENDING',
        bill_status: 'PENDING',
        remarks: '',
        purchase_type: 'REGULAR',
        event_name: ''
    });

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const data = await api.getVendors();
                setVendors(Array.isArray(data) ? data : data.results || []);
            } catch (err) {
                console.error("Error fetching vendors", err);
            }
        };
        fetchVendors();
    }, []);

    const fetchPRs = useCallback(async (vendorId) => {
        if (!vendorId) {
            setSettlablePRs([]);
            return;
        }
        try {
            setLoading(true);
            const data = await api.getSettlablePRs(vendorId);
            const validPRs = (data || []).filter(pr => parseFloat(pr.received_total || 0) > 0);
            setSettlablePRs(validPRs);
            setSelectedPRIds([]); // Reset selection when vendor changes
        } catch (err) {
            console.error("Error fetching settlable PRs", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleVendorChange = (e) => {
        const vendorId = e.target.value;
        setSelectedVendor(vendorId);
        fetchPRs(vendorId);
    };

    const togglePRSelection = (prId) => {
        setSelectedPRIds(prev => 
            prev.includes(prId) 
                ? prev.filter(id => id !== prId) 
                : [...prev, prId]
        );
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBillImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const totalAmount = settlablePRs
        .filter(pr => selectedPRIds.includes(pr.id))
        .reduce((sum, pr) => {
            // Use received_total (actual bill) if available, otherwise fallback to total_amount (estimate)
            const actualVal = parseFloat(pr.received_total || 0);
            const estimateVal = parseFloat(pr.total_amount || 0);
            return sum + (actualVal > 0 ? actualVal : estimateVal);
        }, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedPRIds.length === 0) {
            alert("Please select at least one Purchase Request.");
            return;
        }

        try {
            setIsSubmitting(true);
            const data = new FormData();
            data.append('opex_no', formData.opex_no);
            data.append('opex_date', formData.opex_date);
            data.append('bill_no', formData.bill_no);
            data.append('bill_date', formData.bill_date);
            data.append('payment_status', formData.payment_status);
            data.append('bill_status', formData.bill_status);
            data.append('remarks', formData.remarks);
            data.append('purchase_type', formData.purchase_type);
            data.append('event_name', formData.event_name);
            data.append('opex_value', totalAmount.toFixed(2));
            
            // Append multiple PR IDs
            selectedPRIds.forEach(id => {
                data.append('purchase_requests', id);
            });

            if (billImage) {
                data.append('bill_image', billImage);
            }
            console.log("Submitting Grouped OPEX...", data);
            const response = await api.createOpexEntry(data);
            console.log("OPEX Entry created successfully:", response);
            alert("Grouped OPEX entry created successfully!");
            navigate('/procurement/opex-entries');
        } catch (err) {
            console.error("Error creating grouped opex entry:", err);
            alert("Error creating entry: " + (err.error || err.detail || JSON.stringify(err)));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="main-container animate-fade-in">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button 
                        className="secondary-btn" 
                        onClick={() => navigate('/procurement/opex-entries')}
                        style={{ padding: '0.6rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        ←
                    </button>
                    <div>
                        <h1>Create Grouped OPEX</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Combine multiple Purchase Requests into a single financial entry.</p>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <div className="glass" style={{ padding: '0.8rem 1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Batch Value</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹{totalAmount.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
                <div className="glass" style={{ padding: '2rem' }}>
                    <div className="form-group-stack" style={{ marginBottom: '2rem' }}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>1. Select Vendor</label>
                        <select 
                            className="form-input" 
                            style={{ fontSize: '1.1rem', fontWeight: 600 }}
                            value={selectedVendor}
                            onChange={handleVendorChange}
                        >
                            <option value="">Choose a vendor to see pending PRs...</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedVendor && (
                        <div className="animate-fade-in">
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', display: 'block' }}>
                                2. Select Purchase Requests to Group ({selectedPRIds.length} selected)
                            </label>
                            
                            {loading ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading pending requests...</div>
                            ) : settlablePRs.length > 0 ? (
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {settlablePRs.map(pr => (
                                        <div 
                                            key={pr.id}
                                            onClick={() => togglePRSelection(pr.id)}
                                            className="glass hover-row"
                                            style={{ 
                                                padding: '1.2rem', 
                                                cursor: 'pointer',
                                                border: selectedPRIds.includes(pr.id) ? '2px solid var(--color-primary)' : '1px solid var(--border-glass)',
                                                background: selectedPRIds.includes(pr.id) ? 'rgba(244, 121, 32, 0.05)' : 'var(--bg-glass)',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.5rem'
                                            }}
                                        >
                                            <div style={{ 
                                                width: '24px', 
                                                height: '24px', 
                                                borderRadius: '6px', 
                                                border: '2px solid' + (selectedPRIds.includes(pr.id) ? ' var(--color-primary)' : ' var(--border-glass)'),
                                                background: selectedPRIds.includes(pr.id) ? 'var(--color-primary)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '0.8rem'
                                            }}>
                                                {selectedPRIds.includes(pr.id) && '✓'}
                                            </div>
                                            <div style={{ flexGrow: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{pr.pr_reference}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    Date: {pr.order_date}
                                                    {pr.receipts && pr.receipts.length > 0 && (
                                                        <span style={{ marginLeft: '1rem' }}>
                                                            | Inv: <strong style={{ color: 'var(--text-main)' }}>{pr.receipts[0].invoice_number || 'N/A'}</strong> 
                                                            <span style={{ marginLeft: '0.5rem' }}>({pr.receipts[0].purchase_date})</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                                                    ₹{(() => {
                                                        const actualVal = parseFloat(pr.received_total || 0);
                                                        const estimateVal = parseFloat(pr.total_amount || 0);
                                                        return (actualVal > 0 ? actualVal : estimateVal).toLocaleString();
                                                    })()}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: pr.received_total > 0 ? 'var(--text-success)' : 'var(--text-muted)', fontWeight: 600 }}>
                                                    {pr.received_total > 0 ? 'Actual Bill' : 'Estimated PO'}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{pr.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>🙌</span>
                                    No pending Purchase Requests found for this vendor.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>3. Financial Details</h3>
                        <form onSubmit={handleSubmit} id="multi-opex-form">
                            <div className="form-group-stack" style={{ marginBottom: '1.2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>OPEX NO</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    placeholder="Reference #"
                                    value={formData.opex_no}
                                    onChange={e => setFormData({...formData, opex_no: e.target.value})}
                                />
                            </div>
                            <div className="form-group-stack" style={{ marginBottom: '1.2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>OPEX DATE</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    required
                                    value={formData.opex_date}
                                    onChange={e => setFormData({...formData, opex_date: e.target.value})}
                                />
                            </div>
                            <div className="form-group-stack" style={{ marginBottom: '1.2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>BILL NO AND BILL DATE</label>
                                <textarea 
                                    className="form-input" 
                                    required
                                    placeholder="Enter Vendor Bill # and Bill Date"
                                    value={formData.bill_no}
                                    onChange={e => setFormData({...formData, bill_no: e.target.value})}
                                    rows="2"
                                />
                            </div>
                            
                            <div className="form-group-stack" style={{ marginBottom: '1.2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>PAYMENT STATUS</label>
                                <select 
                                    className="form-input"
                                    value={formData.payment_status}
                                    onChange={e => setFormData({...formData, payment_status: e.target.value})}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="PAID">Paid</option>
                                </select>
                            </div>

                            <div className="form-group-stack" style={{ marginBottom: '1.2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>BILL STATUS</label>
                                <select 
                                    className="form-input"
                                    value={formData.bill_status}
                                    onChange={e => setFormData({...formData, bill_status: e.target.value})}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="RECEIVED">Received</option>
                                </select>
                            </div>

                            <div className="form-group-stack" style={{ marginBottom: '1.2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>PURCHASE TYPE</label>
                                <select 
                                    className="form-input"
                                    value={formData.purchase_type}
                                    onChange={e => setFormData({...formData, purchase_type: e.target.value})}
                                >
                                    <option value="REGULAR">Regular Purchase</option>
                                    <option value="SPECIAL_EVENT">Special Event</option>
                                </select>
                            </div>

                            {formData.purchase_type === 'SPECIAL_EVENT' && (
                                <div className="form-group-stack" style={{ marginBottom: '1.2rem' }}>
                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>EVENT / FUNCTION NAME</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        required
                                        placeholder="e.g. Annual Day"
                                        value={formData.event_name}
                                        onChange={e => setFormData({...formData, event_name: e.target.value})}
                                    />
                                </div>
                            )}
                            
                            <div className="form-group-stack" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>CONSOLIDATED BILL IMAGE</label>
                                <div 
                                    style={{ 
                                        border: '2px dashed var(--border-glass)', 
                                        borderRadius: '12px', 
                                        padding: '1rem', 
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        height: '120px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: imagePreview ? 'none' : 'rgba(255,255,255,0.02)'
                                    }}
                                    onClick={() => document.getElementById('bill-upload').click()}
                                >
                                    {imagePreview ? (
                                        billImage && billImage.type === 'application/pdf' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <span style={{ fontSize: '2.5rem' }}>📄</span>
                                                <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--color-primary)', wordBreak: 'break-all', padding: '0 10px' }}>{billImage.name}</span>
                                            </div>
                                        ) : (
                                            <img 
                                                src={imagePreview} 
                                                alt="Preview" 
                                                style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', objectFit: 'contain' }} 
                                            />
                                        )
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '1.5rem' }}>📷/📄</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to upload bill (Image/PDF)</span>
                                        </>
                                    )}
                                    <input 
                                        id="bill-upload" 
                                        type="file" 
                                        accept="image/*,application/pdf" 
                                        onChange={handleImageChange} 
                                        style={{ display: 'none' }} 
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="action-btn" 
                                disabled={isSubmitting || selectedPRIds.length === 0}
                                style={{ width: '100%', height: '55px', fontSize: '1rem' }}
                            >
                                {isSubmitting ? 'Processing...' : 'Create Entry'}
                            </button>
                        </form>
                    </div>

                    <div className="glass" style={{ padding: '1.5rem', background: 'rgba(244, 121, 32, 0.03)' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Batch Summary</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <span>Items to Link:</span>
                            <strong>{selectedPRIds.length} PRs</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, borderTop: '1px solid var(--border-glass)', paddingTop: '0.8rem', marginTop: '0.5rem' }}>
                            <span>Total Value:</span>
                            <span style={{ color: 'var(--color-primary)' }}>₹{totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateMultiPROpex;
