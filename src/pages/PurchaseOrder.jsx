import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import html2pdf from 'html2pdf.js';
import logo from '../assets/logo.png';

const PurchaseOrder = () => {
    const { id } = useParams();
    const [pr, setPr] = useState(null);
    const [company, setCompany] = useState(null);
    const [shippingLocations, setShippingLocations] = useState([]);
    const [selectedShipTo, setSelectedShipTo] = useState(null);
    const [vendor, setVendor] = useState(null);
    const [terms, setTerms] = useState('');
    const [authorizedBy, setAuthorizedBy] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Load the core Purchase Request first (Essential)
            const prData = await api.getPurchaseRequest(id);
            setPr(prData);
            setTerms(prData.terms || '');
            setAuthorizedBy(prData.authorized_by || '');

            // 2. Load supplemental data (Non-essential for initial render)
            // Use individual try-catches to ensure one failure doesn't block others
            try {
                const companyData = await api.getCompanyProfile();
                if (Array.isArray(companyData) && companyData.length > 0) {
                    setCompany(companyData[0]);
                }
            } catch (err) { console.warn("Could not load company profile", err); }

            try {
                const locationsData = await api.getShippingLocations();
                setShippingLocations(locationsData);
                if (prData.ship_to) {
                    const loc = locationsData.find(l => l.id === prData.ship_to);
                    setSelectedShipTo(loc);
                } else {
                    const defaultLoc = locationsData.find(l => l.is_default);
                    setSelectedShipTo(defaultLoc || (locationsData.length > 0 ? locationsData[0] : null));
                }
            } catch (err) { console.warn("Could not load shipping locations", err); }

            try {
                const vendorsData = await api.getVendors();
                const vendorDetail = vendorsData.find(v => v.id === prData.vendor);
                setVendor(vendorDetail);
            } catch (err) { console.warn("Could not load vendor registry", err); }

        } catch (error) {
            console.error("Critical failure loading PO data", error);
            // pr will remain null, showing "Purchase Request not found"
        } finally {
            setLoading(false);
        }
    };

    const handleShipToChange = (e) => {
        const loc = shippingLocations.find(l => l.id === parseInt(e.target.value));
        setSelectedShipTo(loc);
    };

    const handleSaveAndPrint = async () => {
        // Save terms, authorized_by, and ship_to back to the PR
        try {
            await api.updatePurchaseRequest(id, {
                ...pr,
                terms: terms,
                authorized_by: authorizedBy,
                ship_to: selectedShipTo?.id || null,
                items: pr.items // Keep existing items
            });
        } catch (error) {
            console.error("Failed to save PO details before printing:", error);
        }
        window.print();
    };

    const handleDownloadPdf = async () => {
        try {
            await api.updatePurchaseRequest(id, {
                ...pr,
                terms: terms,
                authorized_by: authorizedBy,
                ship_to: selectedShipTo?.id || null,
                items: pr.items
            });
        } catch (error) {
            console.error("Failed to save PO details before PDF download:", error);
        }

        const element = document.getElementById('po-print-area');
        const wrapper = element.querySelector('.po-table-wrapper');

        // Save scroll position
        const prevScrollY = window.scrollY;
        const prevScrollX = window.scrollX;
        window.scrollTo(0, 0);

        element.classList.add('pdf-render-mode');

        // Use 190mm content width + 10mm margins = 210mm total A4 width
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        element.style.width = '190mm';
        element.style.maxWidth = 'none';

        // Calculate table span for header repetition
        // html2pdf treats the element as a long strip. We calculate height in mm.
        const scaleFactor = 190 / element.offsetWidth; // mm per pixel
        const tableBottomMm = (wrapper.offsetTop + wrapper.offsetHeight) * scaleFactor;
        const contentHeightPerPage = 297 - 15 - 15; // A4 height - top(15)/bottom(15) margins = 267mm

        const opt = {
            margin: [15, 10, 15, 10], // Top, Right, Bottom, Left
            filename: `PO_${pr.pr_reference}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, windowWidth: 1024, scrollY: 0, scrollX: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.po-signature', '.po-totals-card', '.po-address-card'] }
        };

        html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);

                // Add Footer (Page Numbers)
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(128, 128, 128);
                const footerText = `PO REF: ${pr.pr_reference}   |   Page ${i} of ${totalPages}`;
                pdf.text(footerText, 105, 292, { align: 'center' }); // 297 - 5

                // Draw Top Dark Blue Bar manually to avoid html2canvas slicing offset bugs
                if (i === 1) {
                    pdf.setFillColor(30, 41, 43); // #1e293b
                    // 210mm wide A4, let's draw it flush across the top like the web view
                    pdf.rect(0, 0, 210, 4, 'F');
                }

                // Add Repeating Header on Page 2+ only if table content is still present
                if (i > 1 && tableBottomMm > ((i - 1) * contentHeightPerPage) + 5) {
                    // Header Background (matching #f1f5f9)
                    pdf.setFillColor(241, 245, 249);
                    pdf.rect(10, 5, 190, 10, 'F');

                    // Header Border Bottom (matching #cbd5e1)
                    pdf.setDrawColor(203, 213, 225);
                    pdf.setLineWidth(0.5);
                    pdf.line(10, 15, 200, 15);

                    // Header Text (matching table style)
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(7.5);
                    pdf.setTextColor(15, 23, 42); // #0f172a

                    // Column start positions
                    const startX = 10;
                    pdf.text('#', startX + 2, 11);
                    pdf.text('ITEM DESCRIPTION', startX + 11, 11);
                    pdf.text('QTY', startX + 83, 11, { align: 'center' });
                    pdf.text('UOM', startX + 101, 11, { align: 'center' });
                    pdf.text('UNIT PRICE', startX + 138, 11, { align: 'right' });
                    pdf.text('TOTAL', startX + 185, 11, { align: 'right' });
                }
            }
        }).save().then(() => {
            element.classList.remove('pdf-render-mode');
            element.style.width = originalWidth;
            element.style.maxWidth = originalMaxWidth;
            window.scrollTo(prevScrollX, prevScrollY);
        });
    };

    const formatCurrency = (num) => {
        return '₹' + parseFloat(num || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Inter', sans-serif" }}>Loading Purchase Order...</div>;
    }

    if (!pr) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Inter', sans-serif" }}>Purchase Request not found.</div>;
    }

    // Calculate totals
    let subtotal = 0;
    const lineItems = (pr.items || []).map(item => {
        const qty = parseFloat(item.quantity_ordered) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const basePrice = qty * price;

        let discountAmount = 0;
        if (item.discount_type === 'PERCENTAGE') {
            discountAmount = basePrice * (parseFloat(item.discount_value) / 100);
        } else {
            discountAmount = parseFloat(item.discount_value) || 0;
        }

        const discountedPrice = basePrice - discountAmount;
        const taxAmount = 0;
        const lineTotal = discountedPrice;

        subtotal += discountedPrice;

        return { ...item, basePrice, discountAmount, discountedPrice, taxAmount, lineTotal };
    });

    // Aggregate tax
    const totalTax = 0;
    const grandTotal = subtotal + totalTax;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

                .po-page * { box-sizing: border-box; }
                .po-page {
                    font-family: 'Inter', sans-serif;
                    background-color: var(--bg-main);
                    background-image: 
                        radial-gradient(circle at 20% 20%, var(--gradient-1) 0%, transparent 40%),
                        radial-gradient(circle at 80% 80%, var(--gradient-2) 0%, transparent 40%);
                    background-attachment: fixed;
                    min-height: 100vh;
                    padding: 2rem 1rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .po-container {
                    width: 210mm;
                    max-width: 100%;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: var(--shadow-premium);
                    border-top: 12px solid var(--bg-navbar);
                    margin-bottom: 2rem;
                    color: #0f172a; /* Dark text */
                }
                .po-content { padding: 2rem; }

                .po-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.5rem;
                    gap: 1.5rem;
                }
                .po-company-info { 
                    flex: 3; 
                    min-width: 0;
                }
                .po-company-info .company-logo {
                    height: 50px;
                    margin-bottom: 0.5rem;
                    object-fit: contain;
                }
                .po-company-info h2 {
                    font-size: 1.0rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 0.3rem 0;
                    letter-spacing: -0.02em;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .po-company-info p {
                    font-size: 0.85rem;
                    color: #64748b;
                    margin: 0.15rem 0;
                    line-height: 1.6;
                }

                .po-details-box { text-align: right; }
                .po-details-box h1 {
                    font-size: 1.5rem;
                    font-weight: 300;
                    color: #cbd5e1;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    margin: 0 0 1rem 0;
                }
                .po-meta-grid {
                    display: inline-grid;
                    grid-template-columns: auto auto;
                    gap: 0.5rem 1.5rem;
                    font-size: 0.85rem;
                }
                .po-meta-label {
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    font-size: 0.7rem;
                    text-align: right;
                    align-self: center;
                }
                .po-meta-value {
                    font-weight: 600;
                    color: #0f172a;
                    text-align: right;
                }

                .po-addresses {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                .po-address-card {
                    background: #f8fafc;
                    padding: 0.6rem;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }
                .po-address-card h3 {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #1e293b;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    margin: 0 0 0.5rem 0;
                    padding-bottom: 0.3rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                .po-address-card .addr-name {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 0.5rem;
                }
                .po-address-card p {
                    font-size: 0.85rem;
                    color: #475569;
                    margin: 0.2rem 0;
                    line-height: 1.6;
                    white-space: pre-wrap;
                }

                .po-table-wrapper {
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                    background: white;
                }
                .po-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                }
                .po-table thead tr {
                    background: #f1f5f9;
                    color: #0f172a;
                    border-bottom: 2px solid #cbd5e1;
                }
                .po-table th {
                    padding: 0.6rem 0.8rem;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .po-table td {
                    padding: 0.6rem 0.8rem;
                    font-size: 0.8rem;
                    border-bottom: 1px solid #e2e8f0;
                    color: #334155;
                }
                .po-table tbody tr:last-child td { border-bottom: none; }
                .po-table .text-right { text-align: right; }
                .po-table .text-center { text-align: center; }
                .po-table .font-medium { font-weight: 600; color: #0f172a; }

                .po-footer-section {
                    display: flex;
                    justify-content: space-between;
                    gap: 1.5rem;
                    margin-top: 1rem;
                }
                .po-terms { flex: 1; }
                .po-terms h4 {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #1e293b;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    margin: 0 0 1rem 0;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                .po-terms textarea {
                    width: 100%;
                    height: 80px;
                    font-size: 0.8rem;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                    padding: 1rem;
                    border-radius: 12px;
                    background: #f8fafc;
                    font-family: 'Inter', sans-serif;
                    resize: vertical;
                    line-height: 1.6;
                    transition: border-color 0.3s;
                }
                .po-terms textarea:focus { outline: none; border-color: #94a3b8; }

                .po-totals-card {
                    width: 350px;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                }
                .po-totals-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.6rem 0.8rem;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 0.85rem;
                }
                .po-totals-row .label { font-weight: 600; color: #475569; }
                .po-totals-row .value { font-weight: 600; color: #0f172a; }
                .po-totals-grand {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.8rem 1rem;
                    background: #f1f5f9;
                    color: #0f172a;
                    border-top: 2px solid #cbd5e1;
                }
                .po-totals-grand .label {
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-size: 0.85rem;
                }
                .po-totals-grand .value { font-weight: 800; font-size: 1.3rem; }

                .po-signature {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                }
                .po-signature .closing-text {
                    font-size: 0.8rem;
                    color: #64748b;
                    font-style: italic;
                    max-width: 300px;
                }
                .po-signature .sig-block { text-align: center; width: 220px; }
                .po-signature .sig-line {
                    border-bottom: 1px solid #1e293b;
                    height: 40px;
                    margin-bottom: 0.5rem;
                }
                .po-signature .sig-label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                .po-signature .auth-input {
                    width: 100%;
                    text-align: center;
                    border: none;
                    border-bottom: 1px solid #ccc;
                    font-family: 'Inter', sans-serif;
                    font-size: 0.85rem;
                    padding: 0.25rem 0;
                    color: #0f172a;
                    background: transparent;
                    margin-bottom: 0.5rem;
                }
                .po-signature .auth-input:focus { outline: none; border-bottom-color: #1e293b; }

                .po-ship-select {
                    width: 100%;
                    padding: 0.4rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 0.82rem;
                    font-family: 'Inter', sans-serif;
                    background: white;
                    color: #0f172a;
                    margin-bottom: 0.5rem;
                }

                /* Break Avoidance for PDF & Print */
                .po-header, .po-addresses, .po-table-wrapper tr, .po-terms, .po-totals-card, .po-signature {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                /* Print Toolbar */
                .po-toolbar {
                    width: 210mm;
                    max-width: 100%;
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                .po-print-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 0.65rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 500;
                    font-size: 0.9rem;
                    cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    transition: all 0.2s;
                }
                .po-print-btn:hover { background: #1d4ed8; transform: translateY(-1px); }

                .print-only { display: none !important; }

                /* Print Styles */
                @media print {
                    @page { size: A4; margin: 0.5cm; }
                    body, html { background: white !important; }
                    nav, .navbar, .po-toolbar, .print-hidden { display: none !important; }
                    .print-only { display: block !important; }
                    .po-page {
                        padding: 0 !important;
                        background: white !important;
                        min-height: auto !important;
                        display: block !important;
                    }
                    .po-container, .po-container * { color: black !important; }
                    .po-container {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        border-top: 12px solid #1e293b !important;
                        background: white !important;
                    }
                    .po-content { padding: 1rem !important; }
                    .po-terms textarea { border: none !important; background: transparent !important; padding: 0 !important; resize: none !important; }
                    .po-signature .auth-input { border-bottom: none !important; }
                    .po-address-card, .po-totals-card { background: transparent !important; border-color: #e2e8f0 !important; }
                    .po-table thead tr { background: #f1f5f9 !important; color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .po-totals-grand { background: #f1f5f9 !important; color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }

                /* PDF Render Mode (applied dynamically via JS) */
                .pdf-render-mode .print-hidden { display: none !important; }
                .pdf-render-mode .print-only { display: block !important; }
                .pdf-render-mode.po-container, .pdf-render-mode.po-container * { color: black !important; }
                .pdf-render-mode.po-container {
                    background: white !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    border-top: none !important;
                    width: 190mm !important;
                    max-width: none !important;
                    border-left: none !important;
                    border-right: none !important;
                    border-bottom: none !important;
                }
                .pdf-render-mode .po-content { padding: 0 !important; }
                .pdf-render-mode .po-terms textarea { border: none !important; background: transparent !important; padding: 0 !important; resize: none !important; }
                .pdf-render-mode .po-signature .auth-input { border-bottom: none !important; }
                .pdf-render-mode .po-address-card, .pdf-render-mode .po-totals-card { background: transparent !important; border-color: #e2e8f0 !important; }
                .pdf-render-mode .po-table thead tr { background: #f1f5f9 !important; color: #0f172a !important; }
                .pdf-render-mode .po-totals-grand { background: #f1f5f9 !important; color: #0f172a !important; }
            `}</style>

            <div className="po-page">
                <div className="po-container" id="po-print-area">
                    <div className="po-content">


                        {/* Header */}
                        <div className="po-header">
                            <div className="po-company-info">
                                <img src={logo} alt="Company Logo" className="company-logo" />
                                <h2>{company?.name || 'Your Company Name'}</h2>
                                {company?.address && company.address.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                {company?.email && <p>{company.email}</p>}
                                {company?.phone && <p>{company.phone}</p>}
                            </div>
                            <div className="po-details-box">
                                <div style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: pr.status === 'COMPLETED' ? 'var(--status-success-bg)' : pr.status === 'PLACED' ? 'var(--status-pending-bg)' : 'var(--status-error-bg)',
                                    color: pr.status === 'COMPLETED' ? 'var(--status-success-text-vibrant)' : pr.status === 'PLACED' ? 'var(--status-pending-text)' : 'var(--status-error-text-vibrant)',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '1rem',
                                    border: '1px solid currentColor'
                                }}>
                                    {pr.status.replace(/_/g, ' ')}
                                </div>
                                <h1>Purchase Order</h1>
                                <div className="po-meta-grid">
                                    <span className="po-meta-label">PO Number</span>
                                    <span className="po-meta-value">{pr.pr_reference}</span>
                                    <span className="po-meta-label">Date</span>
                                    <span className="po-meta-value">{formatDate(pr.order_date)}</span>
                                    <span className="po-meta-label">Delivery Due</span>
                                    <span className="po-meta-value">{formatDate(pr.delivery_date)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Addresses */}
                        <div className="po-addresses">
                            <div className="po-address-card">
                                <h3>Vendor</h3>
                                {vendor ? (
                                    <>
                                        <div className="addr-name">{vendor.name}</div>
                                        {vendor.address && <p>{vendor.address}</p>}
                                        {vendor.contact_person && <p>Attn: {vendor.contact_person}</p>}
                                        {vendor.email && <p>{vendor.email}</p>}
                                        {vendor.phone && <p>{vendor.phone}</p>}
                                    </>
                                ) : (
                                    <p>{pr.vendor_name}</p>
                                )}
                            </div>
                            <div className="po-address-card">
                                <h3>Ship To</h3>
                                <div className="print-hidden">
                                    <select className="po-ship-select" value={selectedShipTo?.id || ''} onChange={handleShipToChange}>
                                        <option value="">-- Select Location --</option>
                                        {shippingLocations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="print-only" style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.4rem', color: '#0f172a' }}>
                                    {selectedShipTo?.name || '----------------'}
                                </div>
                                {selectedShipTo && (
                                    <>
                                        {selectedShipTo.address && <p>{selectedShipTo.address}</p>}
                                        {selectedShipTo.contact_person && <p>Attn: {selectedShipTo.contact_person}</p>}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="po-table-wrapper">
                            <table className="po-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '5%' }}>#</th>
                                        <th style={{ width: '48%' }}>Item Description</th>
                                        <th style={{ width: '10%' }} className="text-center">Qty</th>
                                        <th style={{ width: '10%' }} className="text-center">UOM</th>
                                        <th style={{ width: '13%' }} className="text-right">Unit Price</th>
                                        <th style={{ width: '14%' }} className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItems.map((item, index) => (
                                        <tr key={index}>
                                            <td className="font-medium">{index + 1}</td>
                                            <td className="font-medium">{item.item_name}</td>
                                            <td className="text-center">{parseFloat(item.quantity_ordered)}</td>
                                            <td className="text-center">{item.unit || '-'}</td>
                                            <td className="text-right">{formatCurrency(item.unit_price)}</td>
                                            <td className="text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer: Terms + Totals */}
                        <div className="po-footer-section">
                            <div className="po-terms">
                                <h4>Terms & Instructions</h4>
                                <textarea
                                    value={terms}
                                    onChange={(e) => setTerms(e.target.value)}
                                    placeholder="Enter payment terms, delivery instructions, or special notes here..."
                                />
                            </div>
                            <div className="po-totals-card">
                                <div className="po-totals-row">
                                    <span className="label">Subtotal</span>
                                    <span className="value">{formatCurrency(subtotal)}</span>
                                </div>

                                <div className="po-totals-grand">
                                    <span className="label">Total Amount</span>
                                    <span className="value">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signature */}
                        <div className="po-signature">
                            <div className="closing-text">This is a system-generated document. Each approval stage carries a distinct audit trail.</div>

                            <div style={{ display: 'flex', gap: '2rem' }}>
                                {/* L1 Signature */}
                                <div className="sig-block" style={{ border: pr.approved_by_l1_name ? '1px solid #e2e8f0' : '1px dashed #e2e8f0', padding: '10px', borderRadius: '8px', minWidth: '180px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: pr.approved_by_l1_name ? '#166534' : '#94a3b8' }}>
                                        {pr.approved_by_l1_name ? '✓ L1 APPROVED' : 'L1 PENDING'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', height: '20px', fontStyle: 'italic' }}>{pr.approved_by_l1_name || ''}</div>
                                    <div className="sig-line" style={{ margin: '5px 0' }}></div>
                                    <div className="sig-label" style={{ fontWeight: 700 }}>Level 1 Manager</div>
                                </div>

                                {/* L2 Signature */}
                                <div className="sig-block" style={{ border: pr.approved_by_l2_name ? '1px solid #e2e8f0' : '1px dashed #e2e8f0', padding: '10px', borderRadius: '8px', minWidth: '180px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: pr.approved_by_l2_name ? '#166534' : '#94a3b8' }}>
                                        {pr.approved_by_l2_name ? '✓ L2 APPROVED' : 'L2 PENDING'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', height: '20px', fontStyle: 'italic' }}>{pr.approved_by_l2_name || ''}</div>
                                    <div className="sig-line" style={{ margin: '5px 0' }}></div>
                                    <div className="sig-label" style={{ fontWeight: 700 }}>Level 2 Manager</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Print Button at Bottom */}
                <div className="po-toolbar">
                    <button className="po-print-btn" onClick={handleSaveAndPrint}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print PO
                    </button>
                    <button className="po-print-btn" style={{ background: 'var(--color-primary)' }} onClick={handleDownloadPdf}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="12" y2="18"></line><line x1="15" y1="15" x2="12" y2="18"></line></svg>
                        Download PDF
                    </button>
                </div>
            </div>
        </>
    );
};

export default PurchaseOrder;
