import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const OpexEntries = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [entries, setEntries] = useState([]);
    const [prs, setPrs] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState('LIST'); // 'LIST', 'FORM', or 'VIEW'
    const [editingId, setEditingId] = useState(null);
    const { user, hasPermission } = useAuth();
    const isAdmin = user?.is_staff || hasPermission('can_access_admin_panel');
    
    // Filters
    const [filters, setFilters] = useState({
        opex_no: '',
        payment_status: '',
        date_after: '',
        date_before: ''
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // New Entry Form State
    const [formData, setFormData] = useState({
        opex_no: '',
        purchase_requests: [], // Plural for grouped entries
        purchase_request: '',   // Legacy singular
        opex_date: new Date().toISOString().split('T')[0],
        opex_value: '',
        bill_no: '',
        bill_date: new Date().toISOString().split('T')[0],
        payment_status: 'PENDING',
        bill_status: 'PENDING',
        remarks: '',
        bill_image: null,
        purchase_type: 'REGULAR',
        event_name: ''
    });

    const [selectedPR, setSelectedPR] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [availablePRs, setAvailablePRs] = useState([]);
    const [prSearch, setPrSearch] = useState('');
    const [selectedVendorFilter, setSelectedVendorFilter] = useState('');

    // Callbacks/Functions
    const fetchEntries = useCallback(async (currentFilters = filters, page = currentPage, size = pageSize) => {
        try {
            const params = {
                ...currentFilters,
                page,
                page_size: size
            };
            const data = await api.getOpexEntries(params);
            console.log("OPEX Entries data received:", data);
            if (data && data.results) {
                setEntries(data.results);
                setTotalCount(data.count);
            } else {
                setEntries(Array.isArray(data) ? data : []);
                setTotalCount(Array.isArray(data) ? data.length : 0);
            }
        } catch (err) {
            console.error("Error fetching opex entries", err);
        }
    }, [filters, currentPage, pageSize]);

    const fetchAvailablePRs = useCallback(async () => {
        try {
            const data = await api.getPurchaseRequests({ page_size: 100 }); 
            console.log("Available PRs fetched:", data);
            const prList = data.results || (Array.isArray(data) ? data : []);
            setPrs(prList);
            
            const prIdFromUrl = searchParams.get('pr_id');
            if (prIdFromUrl && viewMode === 'FORM' && !editingId) {
                const pr = Array.isArray(prList) ? prList.find(p => p.id === parseInt(prIdFromUrl)) : null;
                if (pr) {
                    const actualVal = parseFloat(pr.received_total || 0);
                    const estimateVal = parseFloat(pr.total_amount || 0);
                    setSelectedPR(pr);
                    setFormData(prev => ({
                        ...prev,
                        purchase_request: pr.id,
                        opex_value: (actualVal > 0 ? actualVal : estimateVal).toFixed(2)
                    }));
                }
            }
        } catch (err) {
            console.error("Error fetching PRs", err);
        }
    }, [searchParams, viewMode, editingId]);

    const handlePRSelect = (prId) => {
        const pr = prs.find(p => p.id === parseInt(prId));
        setSelectedPR(pr);
        if (pr) {
            const actualVal = parseFloat(pr.received_total || 0);
            const estimateVal = parseFloat(pr.total_amount || 0);
            setFormData(prev => ({
                ...prev,
                purchase_request: pr.id,
                opex_value: (actualVal > 0 ? actualVal : estimateVal).toFixed(2)
            }));
        }
    };

    const handleEdit = useCallback(async (entry) => {
        setEditingId(entry.id);
        const prIds = entry.purchase_requests || (entry.purchase_request ? [entry.purchase_request] : []);
        
        setFormData({
            opex_no: entry.opex_no,
            purchase_requests: prIds,
            purchase_request: entry.purchase_request || '',
            opex_date: entry.opex_date,
            opex_value: entry.opex_value,
            bill_no: entry.bill_no,
            bill_date: entry.bill_date,
            payment_status: entry.payment_status,
            bill_status: entry.bill_status,
            remarks: entry.remarks || '',
            bill_image: null,
            purchase_type: entry.purchase_type || 'REGULAR',
            event_name: entry.event_name || ''
        });

        const vendorId = entry.pr_details?.[0]?.vendor;
        if (vendorId) {
            try {
                // Pass entry.id as includeOpexId to get PRs already linked to this entry
                const settlable = await api.getSettlablePRs(vendorId, entry.id); 
                console.log("Settlable PRs for edit:", settlable);
                const validPRs = (Array.isArray(settlable) ? settlable : []).filter(pr => parseFloat(pr.received_total || 0) > 0);
                setAvailablePRs(validPRs);
            } catch (err) {
                console.error("Error fetching settlable PRs for edit", err);
                setAvailablePRs([]);
            }
        }
        
        if (entry.purchase_request) {
            const pr = prs.find(p => p.id === entry.purchase_request);
            setSelectedPR(pr);
        } else {
            setSelectedPR(null);
        }

        setImagePreview(entry.bill_image);
        setViewMode('FORM');
        setSearchParams({ edit: entry.id });
    }, [prs, setSearchParams]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this OPEX entry? This will unlink it from any received items.")) {
            try {
                await api.deleteOpexEntry(id);
                fetchEntries();
            } catch (err) {
                console.error("Error deleting entry", err);
                alert("Failed to delete entry");
            }
        }
    };

    const handleToggleLock = async (id) => {
        try {
            await api.toggleOpexLock(id);
            fetchEntries();
        } catch (err) {
            console.error("Error toggling lock", err);
            alert("Failed to toggle lock status");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const data = new FormData();
            data.append('opex_no', formData.opex_no);
            data.append('opex_date', formData.opex_date);
            const formattedOpexValue = formData.opex_value ? parseFloat(formData.opex_value).toFixed(2) : '';
            data.append('opex_value', formattedOpexValue);
            data.append('bill_no', formData.bill_no);
            data.append('bill_date', formData.bill_date);
            data.append('payment_status', formData.payment_status);
            data.append('bill_status', formData.bill_status);
            data.append('remarks', formData.remarks);
            data.append('purchase_type', formData.purchase_type);
            data.append('event_name', formData.event_name);
            
            if (formData.purchase_requests && formData.purchase_requests.length > 0) {
                formData.purchase_requests.forEach(pid => {
                    data.append('purchase_requests', pid);
                });
            } else if (formData.purchase_request) {
                data.append('purchase_requests', formData.purchase_request);
            }

            if (formData.bill_image instanceof File) {
                data.append('bill_image', formData.bill_image);
            } else if (editingId && formData.bill_image === null && !imagePreview) {
                // User explicitly removed the image
                data.append('clear_bill_image', 'true');
            }

            if (editingId) {
                await api.updateOpexEntry(editingId, data);
                alert("OPEX entry updated successfully!");
            } else {
                await api.createOpexEntry(data);
                alert("OPEX entry created successfully!");
            }
            
            setFormData({
                opex_no: '',
                purchase_requests: [],
                purchase_request: '',
                opex_date: new Date().toISOString().split('T')[0],
                opex_value: '',
                bill_no: '',
                bill_date: new Date().toISOString().split('T')[0],
                payment_status: 'PENDING',
                bill_status: 'PENDING',
                remarks: '',
                bill_image: null,
                purchase_type: 'REGULAR',
                event_name: ''
            });
            setImagePreview(null);
            setSelectedPR(null);
            setSearchParams({}, { replace: true });
            fetchEntries();
        } catch (err) {
            console.error("Error saving opex entry", err);
            alert(err.opex_no ? "OPEX Number already exists!" : "Failed to save OPEX entry");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
        fetchEntries(filters, 1, newSize);
    };

    const handleExport = async () => {
        try {
            const blob = await api.exportOpexEntries(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `OPEX_Entries_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to export Excel file");
        }
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchEntries(filters, newPage, pageSize);
    };

    const toggleView = (mode) => {
        if (mode === 'FORM') {
            setSearchParams({ create: 'true' });
        } else {
            setSearchParams({});
            setSelectedPR(null);
        }
        setViewMode(mode);
    };

    const handleViewDetails = (id) => {
        window.open(`/food_tracker/procurement/opex/${id}`, '_blank');
    };

    // Effects
    useEffect(() => {
        fetchEntries();
        fetchAvailablePRs();
    }, [fetchEntries, fetchAvailablePRs]);

    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setViewMode('FORM');
            setEditingId(null);
        } else if (searchParams.get('edit')) {
            const editId = parseInt(searchParams.get('edit'));
            if (editId && entries.length > 0) {
                const entry = entries.find(e => e.id === editId);
                if (entry && editingId !== editId) {
                    handleEdit(entry);
                }
            }
        } else {
            setViewMode('LIST');
            setEditingId(null);
        }
    }, [searchParams, entries, editingId, handleEdit]);

    const batchTotal = React.useMemo(() => {
        const prIds = formData.purchase_requests || [];
        if (prIds.length === 0 && !formData.purchase_request) return 0;
        
        // Sum from selected IDs using availablePRs data
        let total = 0;
        prIds.forEach(id => {
            const pr = availablePRs.find(p => p.id === id);
            if (pr) {
                const actualVal = parseFloat(pr.received_total || 0);
                const estimateVal = parseFloat(pr.total_amount || 0);
                total += (actualVal > 0 ? actualVal : estimateVal);
            }
        });

        // Legacy singular fallback if nothing in list
        if (total === 0 && formData.purchase_request) {
            const pr = prs.find(p => p.id === parseInt(formData.purchase_request));
            if (pr) {
                const actualVal = parseFloat(pr.received_total || 0);
                const estimateVal = parseFloat(pr.total_amount || 0);
                total = (actualVal > 0 ? actualVal : estimateVal);
            }
        }

        return total;
    }, [formData.purchase_requests, formData.purchase_request, availablePRs, prs]);

    if (viewMode === 'FORM') {
        return (
            <div className="main-container animate-fade-in">
                <header className="page-header" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button 
                            className="secondary-btn" 
                            onClick={() => toggleView('LIST')}
                            style={{ padding: '0.6rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            ←
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <h1>{editingId ? `Edit OPEX: ${formData.opex_no}` : 'New OPEX Entry'}</h1>
                                {editingId && <span className="badge-paid" style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}>MODERNIZED V2</span>}
                            </div>
                            <p style={{ color: 'var(--text-muted)' }}>Link financial details to Purchase Request(s).</p>
                        </div>
                    </div>
                </header>

                <div className="glass" style={{ padding: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="responsive-grid" style={{ marginBottom: '2rem', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)', marginBottom: '0.8rem', display: 'block' }}>
                                    {editingId ? 'Link/Unlink PRs in this Group' : 'Link to Purchase Request'}
                                </label>
                                {editingId ? (
                                    <div className="glass" style={{ 
                                        padding: '1rem', 
                                        background: 'rgba(255,255,255,0.02)', 
                                        border: '1px solid var(--border-glass)',
                                        borderRadius: '12px',
                                        maxHeight: '220px',
                                        overflowY: 'auto'
                                    }}>
                                        {Array.isArray(availablePRs) && availablePRs.length > 0 ? availablePRs.map(pr => (
                                            <div 
                                                key={pr.id} 
                                                onClick={() => {
                                                    setFormData(prev => {
                                                        const currentPRs = prev.purchase_requests || [];
                                                        const exists = currentPRs.includes(pr.id);
                                                        const newPRs = exists 
                                                            ? currentPRs.filter(id => id !== pr.id)
                                                            : [...currentPRs, pr.id];
                                                        return { ...prev, purchase_requests: newPRs };
                                                    });
                                                }}
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    marginBottom: '0.5rem', 
                                                    gap: '1rem',
                                                    padding: '0.6rem 0.8rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    background: formData.purchase_requests.includes(pr.id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                    border: `1px solid ${formData.purchase_requests.includes(pr.id) ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '20px', 
                                                    height: '20px', 
                                                    borderRadius: '4px', 
                                                    border: '2px solid' + (formData.purchase_requests.includes(pr.id) ? ' var(--color-primary)' : ' var(--border-glass)'),
                                                    background: formData.purchase_requests.includes(pr.id) ? 'var(--color-primary)' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '0.7rem'
                                                }}>
                                                    {formData.purchase_requests.includes(pr.id) && '✓'}
                                                </div>
                                                <div style={{ flexGrow: 1 }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{pr.pr_reference}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        ₹{(() => {
                                                            const actualVal = parseFloat(pr.received_total || 0);
                                                            const estimateVal = parseFloat(pr.total_amount || 0);
                                                            return (actualVal > 0 ? actualVal : estimateVal).toLocaleString();
                                                        })()}
                                                        <span style={{ marginLeft: '0.5rem', color: pr.received_total > 0 ? 'var(--text-success)' : 'inherit', fontSize: '0.65rem' }}>
                                                            ({pr.received_total > 0 ? 'Actual Bill' : 'Estimated PO'})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ opacity: 0.5, padding: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>
                                                No other PRs available for this vendor.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                            <select 
                                                className="form-input" 
                                                style={{ flex: 1 }}
                                                value={selectedVendorFilter}
                                                onChange={(e) => {
                                                    setSelectedVendorFilter(e.target.value);
                                                    setFormData(prev => ({ ...prev, purchase_request: '' }));
                                                }}
                                            >
                                                <option value="">All Vendors</option>
                                                {Array.from(new Set(prs.map(p => p.vendor_name))).filter(Boolean).sort().map(v => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))}
                                            </select>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                style={{ flex: 1 }}
                                                placeholder="Search PR Reference..." 
                                                value={prSearch}
                                                onChange={(e) => {
                                                    setPrSearch(e.target.value);
                                                }}
                                            />
                                        </div>
                                        <select 
                                            className="form-input" 
                                            required
                                            value={formData.purchase_request}
                                            onChange={(e) => handlePRSelect(e.target.value)}
                                        >
                                            <option value="">Select a Purchase Request</option>
                                            {Array.isArray(prs) ? prs.filter(pr => {
                                                const matchesVendor = selectedVendorFilter ? pr.vendor_name === selectedVendorFilter : true;
                                                const matchesSearch = prSearch ? pr.pr_reference?.toLowerCase().includes(prSearch.toLowerCase()) : true;
                                                return matchesVendor && matchesSearch;
                                            }).map(pr => (
                                                <option key={pr.id} value={pr.id}>{pr.pr_reference} ({pr.vendor_name})</option>
                                            )) : null}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>OPEX NUMBER (External Reference)</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required
                                    maxLength={1000}
                                    placeholder="e.g. OPEX-2024-001"
                                    value={formData.opex_no}
                                    onChange={(e) => setFormData({...formData, opex_no: e.target.value})}
                                />
                                {editingId && (
                                    <div style={{ 
                                        marginTop: '1.5rem', 
                                        padding: '1.2rem', 
                                        borderRadius: '12px', 
                                        background: 'rgba(99, 102, 241, 0.05)',
                                        border: '1px solid rgba(99, 102, 241, 0.1)' 
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Batch Summary Total</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹{batchTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        <div style={{ fontSize: '0.7rem', marginTop: '0.4rem', opacity: 0.7 }}>
                                            Linking {formData.purchase_requests.length} PRs
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedPR && (
                            <div style={{ 
                                background: 'rgba(99, 102, 241, 0.05)', 
                                padding: '1.5rem', 
                                borderRadius: '12px', 
                                marginBottom: '2rem',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}>
                                <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primary)' }}>
                                    <span style={{ fontSize: '1.4rem' }}>🛒</span> Purchase Request Details
                                </h4>
                                <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', fontSize: '0.9rem' }}>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Vendor:</span> <br/><strong>{selectedPR.vendor_name}</strong></div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>PO Date:</span> <br/><strong>{selectedPR.order_date}</strong></div>
                                    <div>
                                        <span style={{ color: 'var(--text-muted)' }}>{parseFloat(selectedPR.received_total) > 0 ? 'Actual Received:' : 'Estimated Total:'}</span> <br/>
                                        <strong>₹{(() => {
                                            const actualVal = parseFloat(selectedPR.received_total || 0);
                                            const estimateVal = parseFloat(selectedPR.total_amount || 0);
                                            return (actualVal > 0 ? actualVal : estimateVal).toLocaleString();
                                        })()}</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="responsive-grid" style={{ marginBottom: '2rem' }}>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>OPEX DATE</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    required
                                    value={formData.opex_date}
                                    onChange={(e) => setFormData({...formData, opex_date: e.target.value})}
                                />
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>OPEX VALUE (Actual Billed Amount)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="form-input" 
                                        style={{ paddingLeft: '2rem' }}
                                        required
                                        placeholder="0.00"
                                        value={formData.opex_value}
                                        onChange={(e) => setFormData({...formData, opex_value: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="responsive-grid" style={{ marginBottom: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>BILL NO</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required
                                    maxLength={1000}
                                    value={formData.bill_no}
                                    onChange={(e) => setFormData({...formData, bill_no: e.target.value})}
                                />
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>BILL DATE</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    required
                                    value={formData.bill_date}
                                    onChange={(e) => setFormData({...formData, bill_date: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="responsive-grid" style={{ marginBottom: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>BILL STATUS</label>
                                <select 
                                    className="form-input"
                                    value={formData.bill_status}
                                    onChange={(e) => setFormData({...formData, bill_status: e.target.value})}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="RECEIVED">Received</option>
                                </select>
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>PAYMENT STATUS</label>
                                <select 
                                    className="form-input"
                                    value={formData.payment_status}
                                    onChange={(e) => setFormData({...formData, payment_status: e.target.value})}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="PAID">Paid</option>
                                </select>
                            </div>
                        </div>

                        <div className="responsive-grid" style={{ marginBottom: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>PURCHASE TYPE</label>
                                <select 
                                    className="form-input"
                                    value={formData.purchase_type}
                                    onChange={(e) => setFormData({...formData, purchase_type: e.target.value})}
                                >
                                    <option value="REGULAR">Regular Purchase</option>
                                    <option value="SPECIAL_EVENT">Special Event</option>
                                </select>
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>EVENT / FUNCTION NAME</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. Annual Day"
                                    disabled={formData.purchase_type !== 'SPECIAL_EVENT'}
                                    required={formData.purchase_type === 'SPECIAL_EVENT'}
                                    value={formData.event_name}
                                    onChange={(e) => setFormData({...formData, event_name: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="responsive-grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>BILL ATTACHMENT (Image)</label>
                                <div style={{ 
                                    border: '2px dashed var(--border-glass)', 
                                    borderRadius: '12px', 
                                    padding: '1.5rem', 
                                    textAlign: 'center',
                                    position: 'relative',
                                    transition: 'all 0.3s ease',
                                    background: 'rgba(255,255,255,0.02)'
                                }}>
                                    {imagePreview ? (
                                        <div style={{ position: 'relative' }}>
                                            {imagePreview === 'PDF_PLACEHOLDER' ? (
                                                <div style={{ padding: '2rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '3rem' }}>📄</span>
                                                    <span style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--text-main)' }}>PDF Document Selected</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formData.bill_image?.name}</span>
                                                </div>
                                            ) : (
                                                <img 
                                                    src={imagePreview} 
                                                    alt="Bill Preview" 
                                                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }} 
                                                />
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setFormData({...formData, bill_image: null});
                                                    setImagePreview(null);
                                                }}
                                                style={{ 
                                                    position: 'absolute', top: '-10px', right: '-10px', 
                                                    background: 'var(--status-error-text-vibrant)', color: 'white', 
                                                    border: 'none', borderRadius: '50%', width: '25px', height: '25px', 
                                                    cursor: 'pointer', fontWeight: 'bold' 
                                                }}
                                            >×</button>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '1rem' }}>
                                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📤</span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click to upload bill image</span>
                                            <input 
                                                type="file" 
                                                accept="image/*,.pdf"
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setFormData({...formData, bill_image: file});
                                                        const isImage = file.type.startsWith('image/');
                                                        if (isImage) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => setImagePreview(reader.result);
                                                            reader.readAsDataURL(file);
                                                        } else {
                                                            setImagePreview('PDF_PLACEHOLDER');
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="form-group-stack">
                                <label style={{ color: 'var(--text-muted)' }}>REMARKS</label>
                                <textarea 
                                    className="form-input" 
                                    rows="6"
                                    style={{ height: '100%' }}
                                    placeholder="Add any additional notes here..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '2rem' }}>
                            <button type="button" className="secondary-btn" onClick={() => toggleView('LIST')} style={{ padding: '0.8rem 2rem' }}>Cancel</button>
                            <button type="submit" className="action-btn" disabled={isSubmitting} style={{ padding: '0.8rem 2.5rem' }}>
                                {isSubmitting ? 'Saving...' : editingId ? 'Update Entry' : 'Create Entry'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="main-container animate-fade-in">
            <header className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>OPEX Entries</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Review and manage operational expenditures linked to your Purchase Requests.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        className="secondary-btn" 
                        onClick={() => navigate('/procurement/opex-entries/new')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                    >
                        <span>📂</span> Group Multi-PR OPEX
                    </button>
                    <button className="action-btn" onClick={() => toggleView('FORM')}>
                        + New Single OPEX
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                    <div className="form-group-stack">
                        <label className="filter-label">OPEX NUMBER</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Search..."
                            value={filters.opex_no}
                            onChange={(e) => setFilters({...filters, opex_no: e.target.value})}
                        />
                    </div>
                    <div className="form-group-stack">
                        <label className="filter-label">PAYMENT</label>
                        <select 
                            className="form-input"
                            value={filters.payment_status}
                            onChange={(e) => setFilters({...filters, payment_status: e.target.value})}
                        >
                            <option value="">All</option>
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                        </select>
                    </div>
                    <div className="form-group-stack">
                        <label className="filter-label">FROM</label>
                        <input 
                            type="date" 
                            className="form-input"
                            value={filters.date_after}
                            onChange={(e) => setFilters({...filters, date_after: e.target.value})}
                        />
                    </div>
                    <div className="form-group-stack">
                        <label className="filter-label">TO</label>
                        <input 
                            type="date" 
                            className="form-input"
                            value={filters.date_before}
                            onChange={(e) => setFilters({...filters, date_before: e.target.value})}
                        />
                    </div>
                </div>

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '1rem', 
                    marginTop: '1.5rem', 
                    paddingTop: '1.2rem', 
                    borderTop: '1px solid var(--border-glass)' 
                }}>
                    <button 
                        className="secondary-btn" 
                        onClick={handleExport}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem' }}
                    >
                        <span>📊</span> Export Excel
                    </button>
                    <button 
                        className="secondary-btn" 
                        onClick={() => {
                            const reset = { opex_no: '', payment_status: '', date_after: '', date_before: '' };
                            setFilters(reset);
                            setCurrentPage(1);
                            fetchEntries(reset, 1, pageSize);
                        }}
                        style={{ padding: '0.7rem 1.5rem' }}
                    >
                        Reset
                    </button>
                    <button 
                        className="action-btn" 
                        onClick={() => { setCurrentPage(1); fetchEntries(); }}
                        style={{ padding: '0.7rem 2rem' }}
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* List Table */}
            <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '1.2rem 1rem' }}>OPEX NO</th>
                                <th style={{ padding: '1.2rem 1rem' }}>DATE</th>
                                <th style={{ padding: '1.2rem 1rem' }}>TYPE / EVENT</th>
                                <th style={{ padding: '1rem' }}>VENDOR</th>
                                <th style={{ padding: '1rem' }}>VALUE</th>
                                <th style={{ padding: '1rem' }}>PAYMENT</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(entries) && entries.length > 0 ? entries.map(entry => (
                                <tr key={entry.id} style={{ borderTop: '1px solid var(--border-glass)' }} className="hover-row">
                                    <td style={{ padding: '1.2rem 1rem', fontWeight: 600 }}>{entry.opex_no || 'N/A'}</td>
                                    <td style={{ padding: '1rem' }}>{entry.opex_date || 'N/A'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{entry.purchase_type === 'SPECIAL_EVENT' ? 'EVENT' : 'REGULAR'}</div>
                                        {entry.purchase_type === 'SPECIAL_EVENT' && <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{entry.event_name}</div>}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {entry.vendor_name || 'N/A'}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                                        ₹{entry.opex_value ? Number(entry.opex_value).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`badge-${(entry.payment_status || 'PENDING').toLowerCase()}`} style={{ 
                                            padding: '0.3rem 0.8rem', 
                                            borderRadius: '20px', 
                                            fontSize: '0.7rem', 
                                            fontWeight: 700,
                                            background: (entry.payment_status || 'PENDING') === 'PAID' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                                            color: (entry.payment_status || 'PENDING') === 'PAID' ? '#2ecc71' : '#e74c3c',
                                            border: `1px solid ${(entry.payment_status || 'PENDING') === 'PAID' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'}`
                                        }}>
                                            {entry.payment_status || 'PENDING'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                                            <button 
                                                className="secondary-btn" 
                                                style={{ padding: '0.4rem', borderRadius: '6px' }}
                                                onClick={() => handleViewDetails(entry.id)}
                                                title="View Details"
                                            >👁️</button>
                                            
                                            {!entry.is_locked ? (
                                                <>
                                                    <button 
                                                        className="secondary-btn" 
                                                        style={{ padding: '0.4rem', borderRadius: '6px' }}
                                                        onClick={() => handleEdit(entry)}
                                                        title="Edit Entry"
                                                    >✏️</button>
                                                    <button 
                                                        className="secondary-btn" 
                                                        style={{ padding: '0.4rem', borderRadius: '6px', color: 'var(--status-error-text-vibrant)' }}
                                                        onClick={() => handleDelete(entry.id)}
                                                        title="Delete Entry"
                                                    >🗑️</button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '1.1rem', margin: '0 0.5rem', cursor: 'default' }} title="Entry Locked">🔒</span>
                                            )}

                                            {isAdmin && (
                                                <button 
                                                    className="secondary-btn" 
                                                    style={{ 
                                                        padding: '0.4rem', 
                                                        borderRadius: '6px', 
                                                        marginLeft: '0.5rem',
                                                        border: `1px solid ${entry.is_locked ? 'var(--color-primary)' : 'var(--border-glass)'}`,
                                                        background: entry.is_locked ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                                                    }}
                                                    onClick={() => handleToggleLock(entry.id)}
                                                    title={entry.is_locked ? "Unlock Entry (Admin)" : "Lock Entry (Admin)"}
                                                >
                                                    {entry.is_locked ? '🔓' : '🔐'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📂</div>
                                        <p>No OPEX entries found matching your filters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Standardized Pagination Bar */}
                {totalCount > 0 && (
                    <div style={{ 
                        padding: '1.5rem', 
                        borderTop: '1px solid var(--border-glass)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> entries
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button 
                                className="secondary-btn" 
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(1)}
                            >
                                ⟪
                            </button>
                            <button 
                                className="secondary-btn" 
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                ◀
                            </button>

                            {/* Page Numbers */}
                            {(Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                                let pageNum;
                                const totalPages = Math.ceil(totalCount / pageSize);
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = currentPage - 2 + i;

                                return (
                                    <button 
                                        key={pageNum}
                                        className={currentPage === pageNum ? "action-btn" : "secondary-btn"}
                                        style={{ 
                                            padding: '0.4rem 0.7rem', 
                                            fontSize: '0.8rem', 
                                            minWidth: '36px',
                                            fontWeight: currentPage === pageNum ? 700 : 400
                                        }}
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            }))}

                            <button 
                                className="secondary-btn" 
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                ▶
                            </button>
                            <button 
                                className="secondary-btn" 
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', minWidth: '36px' }}
                                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                                onClick={() => handlePageChange(Math.ceil(totalCount / pageSize))}
                            >
                                ⟫
                            </button>
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
        </div>
    );
};

export default OpexEntries;
