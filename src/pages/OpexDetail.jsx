import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const OpexDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    
    const [viewingEntry, setViewingEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBillModal, setShowBillModal] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const data = await api.getOpexEntry(id);
                setViewingEntry(data);
            } catch (error) {
                console.error("Error fetching opex details", error);
                alert("Could not load details for this entry.");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchDetails();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="glass" style={{ padding: '2rem 4rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '1.5rem', fontWeight: 700 }}>
                    <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                    Loading Full Transaction Record...
                </div>
            </div>
        );
    }

    if (!viewingEntry) return null;

    const getValidUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
            return url;
        }
        return 'https://' + url;
    };

    const handleBack = () => {
        // Check if there is history to go back to within the same app
        if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
            navigate(-1);
        } else {
            // Fallback to the main opex entries list
            const path = window.location.pathname.includes('/management/') 
                ? '/management/reports/opex' 
                : '/procurement/opex-entries';
            navigate(path);
        }
    };

    return (
        <div className={`main-container animate-fade-in ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
            <header className="page-header" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <button 
                    className="secondary-btn" 
                    onClick={handleBack}
                    style={{ padding: '0.6rem', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Go Back"
                >
                    ←
                </button>
                <div>
                    <h1 style={{ fontSize: '2rem' }}>OPEX Detail: {viewingEntry.opex_no}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Financial and operational records linked to {viewingEntry.pr_references}</p>
                </div>
            </header>

            <div className="responsive-grid" style={{ gridTemplateColumns: '1.2fr 2fr', gap: '2.5rem', alignItems: 'start' }}>
                {/* Side Section: Summary & Bill */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass" style={{ padding: '2.5rem', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                        <h3 style={{ marginBottom: '1.8rem', color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 700 }}>Expense Summary</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>Actual Billed Amount</label>
                                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{parseFloat(viewingEntry.opex_value || 0).toLocaleString()}</span>
                            </div>

                            <div className="flyout-divider" style={{ margin: '0.5rem 0' }}></div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>VENDOR</label>
                                    <span style={{ fontWeight: 600 }}>{viewingEntry.vendor_name}</span>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>OPEX DATE</label>
                                    <span style={{ fontWeight: 600 }}>{viewingEntry.opex_date}</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>BILL STATUS</label>
                                    <span className={`status-badge ${viewingEntry.bill_status?.toLowerCase()}`} style={{ fontWeight: 700 }}>{viewingEntry.bill_status}</span>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>PAYMENT</label>
                                    <span className={`status-badge ${viewingEntry.payment_status?.toLowerCase()}`} style={{ fontWeight: 700 }}>{viewingEntry.payment_status}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>BILL REFERENCE</label>
                                <span style={{ fontWeight: 600 }}>{viewingEntry.bill_no} / {viewingEntry.bill_date}</span>
                            </div>

                            {viewingEntry.remarks && (
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>REMARKS</label>
                                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>"{viewingEntry.remarks}"</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bill Image Section */}
                    <div className="glass" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Bill Attachment</h3>
                        {viewingEntry.bill_image ? (
                            <div 
                                style={{ 
                                    width: '100%', 
                                    height: '250px', 
                                    borderRadius: '12px', 
                                    overflow: 'hidden', 
                                    border: '1px solid var(--border-glass)', 
                                    cursor: 'pointer', 
                                    position: 'relative',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                                }}
                                onClick={() => {
                                    if (viewingEntry.bill_image?.toLowerCase().endsWith('.pdf')) {
                                        window.open(getValidUrl(viewingEntry.bill_image), '_blank');
                                    } else {
                                        setShowBillModal(true);
                                    }
                                }}
                            >
                                {viewingEntry.bill_image?.toLowerCase().endsWith('.pdf') ? (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                        <span style={{ fontSize: '4rem' }}>📄</span>
                                        <span style={{ fontSize: '1rem', marginTop: '1rem', color: 'var(--color-primary)', fontWeight: 600 }}>PDF Document</span>
                                    </div>
                                ) : (
                                    <img 
                                        src={getValidUrl(viewingEntry.bill_image)} 
                                        alt="Bill Preview" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                )}
                                <div style={{ 
                                    position: 'absolute', bottom: 0, left: 0, right: 0, 
                                    background: 'rgba(0,0,0,0.7)', color: 'white', 
                                    fontSize: '0.8rem', padding: '0.7rem', textAlign: 'center',
                                    backdropFilter: 'blur(4px)'
                                }}>
                                    {viewingEntry.bill_image?.toLowerCase().endsWith('.pdf') ? 'Click to Open PDF in New Tab' : 'Click to View Full Size'}
                                </div>
                            </div>
                        ) : (
                            <div style={{ 
                                padding: '4rem 2rem', 
                                textAlign: 'center', 
                                background: 'rgba(255,255,255,0.03)', 
                                borderRadius: '12px', 
                                color: 'var(--text-muted)', 
                                border: '1px dashed var(--border-glass)' 
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
                                <p>No bill attachment available.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Section: Comparison */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {/* 1. Original Scope */}
                    <div className="glass" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <div style={{ 
                            padding: '1.5rem 2.5rem', 
                            background: 'rgba(99, 102, 241, 0.06)', 
                            borderBottom: '1px solid var(--border-glass)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📋 Linked Purchase Requests Scope</h3>
                                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', opacity: 0.6 }}>Initial requirements as defined in the associated PRs.</p>
                            </div>
                            <span style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--color-primary)', fontWeight: 700 }}>PR SCOPE</span>
                        </div>
                        {viewingEntry.pr_details?.map((prDetail, prIdx) => (
                            <div key={prIdx} style={{ marginBottom: prIdx < viewingEntry.pr_details.length - 1 ? '1.5rem' : '0' }}>
                                <div style={{ padding: '1rem 2.5rem', background: 'rgba(255,255,255,0.02)', fontWeight: 700, fontSize: '0.9rem', borderBottom: '1px solid var(--border-glass)' }}>
                                    PR: {prDetail.pr_reference} (Total estimated: ₹{parseFloat(prDetail.total_amount).toLocaleString()})
                                </div>
                                <div className="table-responsive">
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                                <th style={{ padding: '0.8rem 2.5rem' }}>ITEM DETAILS</th>
                                                <th style={{ padding: '0.8rem 2rem' }}>ORDERED QTY</th>
                                                <th style={{ padding: '0.8rem 2.5rem', textAlign: 'right' }}>LINE TOTAL (EST)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prDetail.items?.map((item, idx) => (
                                                <tr key={idx} style={{ borderTop: '1px solid var(--border-glass)' }}>
                                                    <td style={{ padding: '0.8rem 2.5rem' }}>
                                                        <div style={{ fontWeight: 600 }}>{item.item_name}</div>
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Estimate Unit Price: ₹{parseFloat(item.unit_price).toLocaleString()}</div>
                                                    </td>
                                                    <td style={{ padding: '0.8rem 2rem' }}>
                                                        <span style={{ fontWeight: 600 }}>{item.quantity_ordered}</span>
                                                    </td>
                                                    <td style={{ padding: '0.8rem 2.5rem', textAlign: 'right', fontWeight: 700 }}>₹{parseFloat(item.line_total || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 2. Actual Billed Content */}
                    <div className="glass" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
                        <div style={{ 
                            padding: '1.5rem 2.5rem', 
                            background: 'rgba(46, 204, 113, 0.06)', 
                            borderBottom: '1px solid var(--border-glass)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>✅ Items Billed to this OPEX</h3>
                                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', opacity: 0.6 }}>Materials actually received and billed by the vendor.</p>
                            </div>
                            <span style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', borderRadius: '4px', background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', fontWeight: 700 }}>BILLED ITEMS</span>
                        </div>
                        <div className="table-responsive">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '1.2rem 2.5rem' }}>ITEM DETAILS</th>
                                        <th style={{ padding: '1.2rem 2rem' }}>ACTUAL QTY</th>
                                        <th style={{ padding: '1.2rem 2rem', textAlign: 'right' }}>LINE TOTAL (ACTUAL)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingEntry.procurements?.length > 0 ? viewingEntry.procurements.map((item, idx) => (
                                        <tr key={idx} style={{ borderTop: '1px solid var(--border-glass)' }}>
                                            <td style={{ padding: '1.2rem 2.5rem' }}>
                                                <div style={{ fontWeight: 600 }}>{item.item_name}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Billed Unit Price: ₹{parseFloat(item.unit_price).toLocaleString()}</div>
                                            </td>
                                            <td style={{ padding: '1.2rem 2rem' }}>
                                                <span style={{ fontWeight: 600 }}>{item.quantity}</span>
                                            </td>
                                            <td style={{ padding: '1.2rem 2.5rem', textAlign: 'right', fontWeight: 800, color: '#2ecc71' }}>₹{parseFloat(item.total_price || 0).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</div>
                                                <p>No procurement records are linked to this specific bill.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {viewingEntry.procurements?.length > 0 && (
                                    <tfoot style={{ background: 'rgba(255,255,255,0.02)' }}>
                                        <tr>
                                            <td colSpan="2" style={{ padding: '1.5rem 2.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>Total Billed Value:</td>
                                            <td style={{ padding: '1.5rem 2.5rem', textAlign: 'right', fontWeight: 900, fontSize: '1.3rem', color: '#2ecc71' }}>
                                                ₹{viewingEntry.procurements.reduce((acc, curr) => acc + parseFloat(curr.total_price), 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bill Lightbox */}
            {showBillModal && viewingEntry.bill_image && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
                    onClick={() => setShowBillModal(false)}
                >
                    <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '95vh' }}>
                        <button style={{ position: 'absolute', top: '-3rem', right: '-1rem', color: 'white', background: 'none', border: 'none', fontSize: '3rem', cursor: 'pointer' }}>×</button>
                        <img 
                            src={getValidUrl(viewingEntry.bill_image)} 
                            alt="Full Size Bill" 
                            style={{ maxWidth: '100%', maxHeight: '95vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 0 60px rgba(0,0,0,0.6)' }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default OpexDetail;
