import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const VendorManagement = () => {
    const { hasPermission } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [vendorCategories, setVendorCategories] = useState([]);
    const [newVendor, setNewVendor] = useState({
        name: '', contact_person: '', phone: '', email: '', address: '', description: '', brand: '', category: '', is_active: true
    });
    const [editingId, setEditingId] = useState(null);

    // Document management states
    const [showDocUpload, setShowDocUpload] = useState(false);
    const [showDocViewer, setShowDocViewer] = useState(false);
    const [currentVendor, setCurrentVendor] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docName, setDocName] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchVendors();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await api.getVendorCategories();
            setVendorCategories(data);
        } catch (error) {
            console.error("Failed to fetch vendor categories", error);
        }
    };

    const fetchVendors = async () => {
        try {
            const data = await api.getVendors();
            setVendors(data);
        } catch (error) {
            console.error("Failed to fetch vendors", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let result;
            if (editingId) {
                result = await api.updateVendor(editingId, newVendor);
                setEditingId(null);
            } else {
                result = await api.createVendor(newVendor);
            }
            setShowForm(false);
            setNewVendor({ name: '', contact_person: '', phone: '', email: '', address: '', description: '', brand: '', category: '', is_active: true });
            fetchVendors();
        } catch (error) {
            console.error("Failed to save vendor:", error);
            alert("Error saving vendor. Please check if the name is unique.");
        }
    };

    const handleEdit = (vendor) => {
        setNewVendor({
            name: vendor.name,
            contact_person: vendor.contact_person || '',
            phone: vendor.phone || '',
            email: vendor.email || '',
            address: vendor.address || '',
            description: vendor.description || '',
            brand: vendor.brand || '',
            category: vendor.category || '',
            is_active: vendor.is_active
        });
        setEditingId(vendor.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this vendor? This action cannot be undone.")) {
            try {
                await api.deleteVendor(id);
                fetchVendors();
            } catch (error) {
                console.error("Failed to delete vendor", error);
            }
        }
    };
    
    const handleToggleStatus = async (vendor) => {
        try {
            await api.updateVendor(vendor.id, { ...vendor, is_active: !vendor.is_active });
            fetchVendors();
        } catch (error) {
            console.error("Failed to toggle vendor status", error);
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setNewVendor({ name: '', contact_person: '', phone: '', email: '', address: '', description: '', brand: '', category: '', is_active: true });
    };

    // Document Handlers
    const openDocUpload = (vendor) => {
        setCurrentVendor(vendor);
        setShowDocUpload(true);
        setDocName('');
    };

    const openDocViewer = async (vendor) => {
        setCurrentVendor(vendor);
        setShowDocViewer(true);
        try {
            const docs = await api.getVendorDocuments(vendor.id);
            setDocuments(docs);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        }
    };

    const handleDocUpload = async (e) => {
        e.preventDefault();
        const file = fileInputRef.current.files[0];
        if (!file) return alert("Please select a file");
        if (!docName) return alert("Please enter a document name (e.g. FSSAI License)");

        setUploadingDoc(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', docName);

        try {
            await api.uploadVendorDocument(currentVendor.id, formData);
            setShowDocUpload(false);
            setDocName('');
            alert("Document uploaded successfully");
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDocDelete = async (docId) => {
        if (window.confirm("Are you sure you want to delete this document?")) {
            try {
                await api.deleteVendorDocument(currentVendor.id, docId);
                setDocuments(documents.filter(d => d.id !== docId));
            } catch (error) {
                console.error("Delete failed", error);
                alert("Failed to delete document.");
            }
        }
    };

    const handleExport = async () => {
        try {
            const blob = await api.exportVendors();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'vendors_export.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export vendors.");
        }
    };

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1>Vendor Management</h1>
                <p>Register and manage your food suppliers efficiently.</p>
            </header>

            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{editingId ? 'Edit Supplier' : 'Supplier Registry'}</h2>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="secondary-btn" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📥 Export to Excel
                        </button>
                        {hasPermission('can_manage_vendors') && (
                            <button className="action-btn" onClick={editingId || showForm ? handleCancel : () => setShowForm(true)}>
                                {editingId || showForm ? 'Cancel' : 'Register New Vendor'}
                            </button>
                        )}
                    </div>
                </div>

                {(showForm || editingId) && (
                    <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <input 
                                className="form-input" 
                                placeholder="Vendor Name" 
                                required 
                                value={newVendor.name}
                                onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                            />
                            <select 
                                className="form-input"
                                value={newVendor.category}
                                onChange={(e) => setNewVendor({...newVendor, category: e.target.value})}
                            >
                                <option value="">Select Category</option>
                                {vendorCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <input 
                                className="form-input" 
                                placeholder="Contact Person" 
                                value={newVendor.contact_person}
                                onChange={(e) => setNewVendor({...newVendor, contact_person: e.target.value})}
                            />
                            <input 
                                className="form-input" 
                                placeholder="Phone" 
                                value={newVendor.phone}
                                onChange={(e) => setNewVendor({...newVendor, phone: e.target.value})}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <input 
                                className="form-input" 
                                placeholder="Brand Provided" 
                                value={newVendor.brand}
                                onChange={(e) => setNewVendor({...newVendor, brand: e.target.value})}
                            />
                            <input 
                                className="form-input" 
                                placeholder="Email" 
                                type="email"
                                value={newVendor.email}
                                onChange={(e) => setNewVendor({...newVendor, email: e.target.value})}
                            />
                        </div>
                        <textarea 
                            className="form-input" 
                            placeholder="Description / Remarks" 
                            rows="2"
                            value={newVendor.description}
                            onChange={(e) => setNewVendor({...newVendor, description: e.target.value})}
                        />
                        <textarea 
                            className="form-input" 
                            placeholder="Address" 
                            rows="2"
                            value={newVendor.address}
                            onChange={(e) => setNewVendor({...newVendor, address: e.target.value})}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
                            <input 
                                type="checkbox" 
                                id="is_active"
                                checked={newVendor.is_active}
                                onChange={(e) => setNewVendor({...newVendor, is_active: e.target.checked})}
                                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                            />
                            <label htmlFor="is_active" style={{ fontWeight: 600, cursor: 'pointer' }}>Supplier is Active</label>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>
                                (Inactive suppliers cannot be selected for new orders but history is preserved)
                            </span>
                        </div>
                        <button type="submit" className="action-btn">
                            {editingId ? 'Update Supplier' : 'Confirm Registration'}
                        </button>
                    </form>
                )}
            </div>

            {loading ? (
                <p>Loading suppliers...</p>
            ) : (
                <div className="glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.2rem' }}>Suppliers Registry</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                             <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{vendors.length} vendors registered</span>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <th style={{ padding: '1rem' }}>NAME</th>
                                    <th style={{ padding: '1rem' }}>CATEGORY</th>
                                    <th style={{ padding: '1rem' }}>BRAND</th>
                                    <th style={{ padding: '1rem' }}>CONTACT / PHONE</th>
                                    <th style={{ padding: '1rem' }}>COMPLIANCE</th>
                                    <th style={{ padding: '1rem' }}>STATUS</th>
                                    <th style={{ padding: '1rem' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vendors.map(vendor => (
                                    <tr key={vendor.id} style={{ background: 'var(--bg-glass)', transition: 'var(--transition)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>{vendor.name}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>{vendor.category_name || '-'}</span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{vendor.brand || '-'}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 600 }}>{vendor.contact_person || '-'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{vendor.phone}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button 
                                                    className="action-btn" 
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                                                    onClick={() => openDocUpload(vendor)}
                                                >
                                                    Upload
                                                </button>
                                                <button 
                                                    className="action-btn" 
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'var(--bg-glass)', color: 'var(--color-primary)' }}
                                                    onClick={() => openDocViewer(vendor)}
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ 
                                                padding: '0.2rem 0.6rem', 
                                                borderRadius: '6px', 
                                                fontSize: '0.7rem', 
                                                background: vendor.is_active ? 'var(--status-success-bg)' : 'var(--bg-glass)',
                                                color: vendor.is_active ? 'var(--status-success-text-vibrant)' : 'var(--text-muted)',
                                                fontWeight: 700
                                            }}>
                                                {vendor.is_active ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                            {hasPermission('can_manage_vendors') && (
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <button onClick={() => handleEdit(vendor)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                                                    <button 
                                                        onClick={() => handleToggleStatus(vendor)} 
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            color: vendor.is_active ? 'var(--text-muted)' : 'var(--status-success-text-vibrant)', 
                                                            cursor: 'pointer', 
                                                            fontWeight: 600 
                                                        }}
                                                    >
                                                        {vendor.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button onClick={() => handleDelete(vendor.id)} style={{ background: 'none', border: 'none', color: 'var(--status-error-text-vibrant)', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Document Upload Modal */}
            {showDocUpload && (
                <div className="modal-overlay" onClick={() => setShowDocUpload(false)}>
                    <div className="glass modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2rem', maxWidth: '500px', width: '90%' }}>
                        <h2>Upload Document for {currentVendor?.name}</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Attach FSSAI, Agreement, or other compliance files.</p>
                        
                        <form onSubmit={handleDocUpload} style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Document Name</label>
                                <input 
                                    className="form-input" 
                                    placeholder="e.g. FSSAI License 2024" 
                                    required 
                                    value={docName}
                                    onChange={(e) => setDocName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Select File</label>
                                <input 
                                    type="file" 
                                    className="form-input" 
                                    accept="image/*,.pdf"
                                    required 
                                    ref={fileInputRef}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="action-btn" disabled={uploadingDoc}>
                                    {uploadingDoc ? 'Uploading...' : 'Start Upload'}
                                </button>
                                <button type="button" className="action-btn" style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={() => setShowDocUpload(false)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {showDocViewer && (
                <div className="modal-overlay" onClick={() => setShowDocViewer(false)}>
                    <div className="glass modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2rem', maxWidth: '700px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>Documents: {currentVendor?.name}</h2>
                            <button className="action-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem' }} onClick={() => setShowDocViewer(false)}>×</button>
                        </div>
                        
                        {documents.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <p>No documents uploaded yet for this vendor.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                {documents.map(doc => (
                                    <div key={doc.id} className="glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{doc.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <a 
                                                href={doc.file} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
                                            >
                                                View / Download
                                            </a>
                                            <button 
                                                onClick={() => handleDocDelete(doc.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--status-error-text-vibrant)', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                            <button className="action-btn" onClick={() => setShowDocViewer(false)}>Close Viewer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorManagement;
