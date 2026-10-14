import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const getColor = (depth, isDeployment) => {
    if (depth === 0) return { bg: '#8b3a39', text: 'white' }; // Root
    if (depth === 1) return { bg: '#e53935', text: 'white' }; // Red
    if (depth === 2) return { bg: '#ff6d00', text: 'white' }; // Orange
    return { bg: 'white', text: '#8b3a39' }; // White with dark text
};

const CustomTree = ({ data, depth = 0 }) => {
    if (!data) return null;
    return (
        <div className="lr-tree" style={{ padding: '20px' }}>
            <TreeNode node={data} isRoot={true} depth={depth} />
        </div>
    );
};

const TreeNode = ({ node, isRoot, depth }) => {
    const isDeployment = !!node.designation_name;
    const name = isDeployment ? node.designation_name : node.name;
    const role = isDeployment ? 'Designation' : 'Unit';
    
    const total = isDeployment ? node.required_count : (node.total_required || 0);
    const present = isDeployment ? node.actual_count : (node.total_present || 0);
    const shouldShowStats = isDeployment || node.show_counts !== false;
    
    let combinedChildren = [];
    if (!isDeployment) {
        if (node.deployments && node.deployments.length > 0) {
            combinedChildren = [...combinedChildren, ...node.deployments];
        }
        if (node.children && node.children.length > 0) {
            combinedChildren = [...combinedChildren, ...node.children];
        }
    } else {
        if (node.children_deployments && node.children_deployments.length > 0) {
            combinedChildren = [...combinedChildren, ...node.children_deployments];
        }
    }
    
    const hasChildren = combinedChildren.length > 0;
    const colors = getColor(depth, isDeployment);
    
    return (
        <div className="lr-node">
            <div className={`lr-node-content ${hasChildren ? 'has-children' : ''}`} style={{ width: '230px', flexShrink: 0, position: 'relative', margin: '6px 0' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: colors.bg,
                    borderRadius: '50px',
                    padding: '4px 10px 4px 4px',
                    width: '100%',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                    color: colors.text,
                    border: depth >= 3 ? '2px solid transparent' : 'none',
                    boxSizing: 'border-box'
                }}>
                    {/* Avatar */}
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '8px',
                        color: '#333',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        flexShrink: 0,
                        border: '2px solid white',
                        overflow: 'hidden'
                    }}>
                        <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name.replace(/[^a-zA-Z0-9 ]/g, '').trim())}&background=random`} 
                            alt={name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    
                    {/* Text */}
                    <div style={{ textAlign: 'left', flex: 1, paddingRight: '5px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.8rem', lineHeight: '1.2' }}>{name}</div>
                        {shouldShowStats && <div style={{ fontSize: '0.6rem', opacity: 0.9 }}>{role}</div>}
                    </div>
                    
                    {/* Stats */}
                    {shouldShowStats && (
                        <div style={{ display: 'flex', gap: '3px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(128,128,128,0.2)', padding: '1px 4px', borderRadius: '4px' }}>
                                <span style={{ fontSize: '0.45rem', opacity: 0.8 }}>REQ</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{total}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(128,128,128,0.2)', padding: '1px 4px', borderRadius: '4px' }}>
                                <span style={{ fontSize: '0.45rem', opacity: 0.8 }}>ACT</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: present < total ? '#ff5252' : 'inherit' }}>{present}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {hasChildren && (
                <>
                    {/* The dynamic flex connector that stretches to fill any gap */}
                    <div style={{ flex: 1, minWidth: '20px', height: '0', borderTop: '2px dashed var(--org-line)', zIndex: 1 }}></div>
                    <div className="lr-children">
                        {combinedChildren.map((child, index) => {
                            const isFirst = index === 0;
                            const isLast = index === combinedChildren.length - 1;
                            const isOnly = combinedChildren.length === 1;
                            return (
                                <div key={index} className={`lr-child-item ${isFirst ? 'is-first' : ''} ${isLast ? 'is-last' : ''} ${isOnly ? 'is-only' : ''}`}>
                                    {/* Small fixed line for the child side */}
                                    <div style={{ width: '20px', height: '0', borderTop: '2px dashed var(--org-line)', zIndex: 1 }}></div>
                                    <TreeNode node={child} isRoot={false} depth={depth + 1} />
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

const OrganizationChartPage = () => {
    const [treeData, setTreeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(1.0);
    const containerRef = useRef(null);
    const treeRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await api.getOrganizationTree();
            setTreeData(data);
        } catch (error) {
            console.error("Error fetching organization tree:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate grand total for the entire tree
    const calculateGrandTotal = (node) => {
        if (!node) return { req: 0, act: 0 };
        let req = 0;
        let act = 0;

        if (node.designation_name) {
            // It's a deployment
            req += parseInt(node.required_count || 0, 10);
            act += parseInt(node.actual_count || (node.status && node.status.actual_count) || 0, 10);
            
            if (node.children_deployments && Array.isArray(node.children_deployments)) {
                node.children_deployments.forEach(child => {
                    const childTotals = calculateGrandTotal(child);
                    req += childTotals.req;
                    act += childTotals.act;
                });
            }
        } else {
            // It's a unit
            if (node.deployments && Array.isArray(node.deployments)) {
                node.deployments.forEach(dep => {
                    const depTotals = calculateGrandTotal(dep);
                    req += depTotals.req;
                    act += depTotals.act;
                });
            }
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach(child => {
                    const childTotals = calculateGrandTotal(child);
                    req += childTotals.req;
                    act += childTotals.act;
                });
            }
        }
        return { req, act };
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setZoom(prev => Math.max(0.4, prev - 0.05));
    const handleResetZoom = () => setZoom(1.0);
    const handleFitWidth = () => {
        if (containerRef.current && treeRef.current) {
            // Reset zoom to measure natural width
            treeRef.current.style.zoom = 1.0;
            const containerWidth = containerRef.current.clientWidth - 100; // 50px padding on each side
            const naturalWidth = treeRef.current.scrollWidth;
            if (naturalWidth > 0) {
                const fitZoom = containerWidth / naturalWidth;
                setZoom(Math.max(0.4, Math.min(1.5, fitZoom)));
            }
        }
    };

    if (loading) return <div className="main-container">Loading organization tree...</div>;
    if (!treeData || treeData.length === 0) return <div className="main-container">No organization data available.</div>;

    const rootNode = treeData[0];

    const btnStyle = {
        background: 'var(--org-btn-bg)',
        color: 'var(--org-btn-text)',
        border: 'none',
        padding: '6px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.85rem'
    };
    const grandTotal = calculateGrandTotal(rootNode);

    return (
        <div className="main-container full-width-override org-chart-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
            
            {/* Header on Top */}
            <header style={{ 
                background: 'var(--org-header-bg)', 
                padding: '20px 40px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                borderBottom: '4px solid var(--org-border)',
                zIndex: 10,
                position: 'relative'
            }}>
                <h1 style={{ color: 'var(--org-header-text)', margin: 0, fontSize: '2rem', letterSpacing: '1px' }}>
                    FOOD DEPARTMENT
                </h1>
                <h2 style={{ color: '#555', margin: '5px 0 0 0', fontSize: '1.2rem', fontWeight: 'normal' }}>
                    Organizational Chart
                </h2>

                {/* Zoom Toolbar */}
                <div style={{
                    position: 'absolute',
                    top: '25px',
                    right: '40px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}>
                    <button style={btnStyle} onClick={handleZoomOut}>−</button>
                    <span style={{ color: '#333', fontWeight: 'bold', minWidth: '45px', textAlign: 'center', fontSize: '0.9rem' }}>
                        {Math.round(zoom * 100)}%
                    </span>
                    <button style={btnStyle} onClick={handleZoomIn}>+</button>
                    <button style={btnStyle} onClick={handleFitWidth}>Fit Width</button>
                    <button style={btnStyle} onClick={handleResetZoom}>Reset</button>
                </div>
            </header>

            {/* Tree Area */}
            <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: '50px', background: 'var(--org-bg)', position: 'relative' }}>
                {/* Grand Total Box */}
                {rootNode && (
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        right: '40px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid var(--org-border)',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 10
                    }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                            Overall Team Strength
                        </div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>REQUIRED</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--org-bg)' }}>{grandTotal.req}</span>
                            </div>
                            <div style={{ width: '1px', background: '#ddd' }}></div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>ACTUAL</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: grandTotal.act < grandTotal.req ? '#e53935' : '#4caf50' }}>{grandTotal.act}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={treeRef} style={{ zoom: zoom }}>
                    <CustomTree data={rootNode} />
                </div>
                
                {/* Static Deployment Breakup Tables */}
                <StaticDeploymentTables />
            </div>

            {/* CSS for Left-to-Right Tree */}
            <style>{`
                .lr-tree {
                    display: inline-flex;
                    justify-content: flex-start;
                    align-items: flex-start;
                }
                .lr-node {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: flex-start !important;
                    gap: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                /* We no longer use pseudo-elements for horizontal lines, a flex connector div handles it */
                
                .lr-children {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    position: relative;
                    margin: 0 !important;
                    padding: 0 !important;
                    gap: 0 !important;
                }
                
                .lr-child-item {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    /* The padding-left is now handled by the connector div in the parent */
                    padding-left: 0 !important;
                    position: relative;
                    margin: 0 !important;
                }
                
                /* Vertical line connecting children */
                .lr-child-item::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    border-left: 2px dashed var(--org-line);
                    z-index: 1;
                }
                
                /* Fix vertical line for first and last child */
                .lr-child-item.is-first::after {
                    top: calc(50% - 1px);
                }
                .lr-child-item.is-last::after {
                    bottom: calc(50% + 1px);
                }
                /* Hide vertical line if only child */
                .lr-child-item.is-only::after {
                    display: none;
                }

                /* Theme Variables */
                .org-chart-container {
                    --org-bg: #6e2f2c;
                    --org-header-bg: white;
                    --org-header-text: #8b3a39;
                    --org-border: #8b3a39;
                    --org-line: white;
                    --org-btn-bg: #8b3a39;
                    --org-btn-text: white;
                }

                body.sky-theme .org-chart-container {
                    --org-bg: #e0f2fe; /* Light sky blue */
                    --org-header-bg: #ffffff;
                    --org-header-text: #0284c7; /* Sky 600 */
                    --org-border: #0ea5e9; /* Sky 500 */
                    --org-line: #0ea5e9;
                    --org-btn-bg: #0ea5e9;
                    --org-btn-text: white;
                }
            `}</style>
        </div>
    );
};

const StaticDeploymentTables = () => {
    return (
        <div style={{ marginTop: '50px', maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto', padding: '0 20px' }}>
            
            <style>{`
                .premium-table-container {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                    overflow-x: auto;
                    overflow-y: hidden;
                    margin-bottom: 40px;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                
                .premium-table {
                    width: 100%;
                    min-width: 1300px;
                    border-collapse: collapse;
                    font-size: 0.95rem;
                    color: #333;
                }
                
                .premium-table th, .premium-table td {
                    padding: 14px 16px;
                    text-align: center;
                    border: 1px solid #eaeaea;
                    transition: background-color 0.2s ease;
                }
                
                .premium-table thead th {
                    background-color: #f8fafc;
                    color: #475569;
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 0.8rem;
                    letter-spacing: 0.5px;
                }
                
                /* Main Table Header */
                .premium-table thead tr:first-child th {
                    background-color: #8b3a39; /* Matches theme */
                    color: white;
                    font-size: 1rem;
                    padding: 16px;
                    letter-spacing: 1px;
                }
                
                body.sky-theme .premium-table thead tr:first-child th {
                    background-color: #0ea5e9;
                }
                
                .premium-table tbody tr:hover td {
                    background-color: #f1f5f9 !important;
                }
                
                .premium-table tbody tr:nth-child(even) td {
                    background-color: #fafafa;
                }
                
                .highlight-cell {
                    background-color: #f8fafc;
                    font-weight: 600;
                    color: #334155;
                    text-align: left !important;
                }
                
                .bold-cell {
                    font-weight: bold;
                    color: #0f172a;
                }
                
                .total-row td {
                    background-color: #e2e8f0 !important;
                    font-weight: bold;
                    color: #0f172a;
                    border-top: 2px solid #cbd5e1;
                }
                
                .section-title {
                    color: var(--org-header-text);
                    background: var(--org-header-bg);
                    display: inline-block;
                    padding: 8px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    margin-bottom: 25px;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                }
            `}</style>
            
            <div style={{ textAlign: 'center' }}>
                <h3 className="section-title">Deployment Breakups</h3>
            </div>
            
            {/* Kitchen Deployment Plan */}
            <div className="premium-table-container">
                <table className="premium-table">
                    <thead>
                        <tr>
                            <th colSpan="9">Kitchen Deployment plan</th>
                        </tr>
                        <tr>
                            <th>Location</th>
                            <th>Kitchen Incharge</th>
                            <th>Master</th>
                            <th>Assistant cook</th>
                            <th>Helper</th>
                            <th>Griding Helper</th>
                            <th>HK Supervisor (Siri)</th>
                            <th>HK staff (Siri)</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="highlight-cell">Kitchen Total staff strength</td>
                            <td>1</td>
                            <td>4</td>
                            <td>6</td>
                            <td>4</td>
                            <td>3</td>
                            <td>1</td>
                            <td>9</td>
                            <td className="bold-cell">28</td>
                        </tr>
                        <tr>
                            <td className="highlight-cell">Current Status</td>
                            <td>1</td>
                            <td>4</td>
                            <td>6</td>
                            <td>4</td>
                            <td>3</td>
                            <td>1</td>
                            <td>10</td>
                            <td className="bold-cell">29</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* FC Deployment Plan Breakdown (Slide 2) */}
            <div className="premium-table-container">
                <table className="premium-table">
                    <thead>
                        <tr>
                            <th colSpan="11">FC Deployment Plan Breakdown</th>
                        </tr>
                        <tr>
                            <th>Location</th>
                            <th>FC Sr. Executive</th>
                            <th>HSQE</th>
                            <th>FC Service Supervisor</th>
                            <th>Food vehicle Driver</th>
                            <th>Service Staff</th>
                            <th>Scanning</th>
                            <th>HK Supervisor</th>
                            <th>Table, Floor, oven area, Service area cleaning -HK staff</th>
                            <th>Plate washing -HK staff</th>
                            <th>Food waste Bio</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="highlight-cell">Kings</td>
                            <td rowSpan="5" className="bold-cell">3</td>
                            <td rowSpan="5" className="bold-cell">1</td>
                            <td>1</td>
                            <td rowSpan="5" className="bold-cell">3</td>
                            <td>7</td>
                            <td></td>
                            <td rowSpan="5" className="bold-cell">1</td>
                            <td>2</td>
                            <td>4</td>
                            <td rowSpan="4" className="bold-cell">1</td>
                        </tr>
                        <tr>
                            <td className="highlight-cell">WEH Terrace</td>
                            <td>1</td>
                            <td>7</td>
                            <td></td>
                            <td>2</td>
                            <td>2</td>
                        </tr>
                        <tr>
                            <td className="highlight-cell">Divas2</td>
                            <td>1</td>
                            <td>7</td>
                            <td></td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td className="highlight-cell">RCAS</td>
                            <td>1</td>
                            <td>8</td>
                            <td></td>
                            <td>6</td>
                            <td>8</td>
                        </tr>
                        <tr>
                            <td className="highlight-cell">Kings 2</td>
                            <td>1</td>
                            <td>7</td>
                            <td></td>
                            <td>2</td>
                            <td>2</td>
                            <td></td>
                        </tr>
                        <tr className="total-row">
                            <td className="highlight-cell">Total</td>
                            <td>3</td>
                            <td>1</td>
                            <td>5</td>
                            <td>3</td>
                            <td>36</td>
                            <td></td>
                            <td>1</td>
                            <td>12</td>
                            <td>16</td>
                            <td>1</td>
                        </tr>
                        <tr className="total-row">
                            <td colSpan="9" style={{ background: 'white', border: 'none' }}></td>
                            <td style={{ textAlign: 'right', paddingRight: '20px' }}>Grand Total</td>
                            <td className="bold-cell" style={{ fontSize: '1.2rem', color: '#8b3a39' }}>78</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* FC Deployment Plan Summary (Slide 3) */}
            <div className="premium-table-container">
                <table className="premium-table">
                    <thead>
                        <tr>
                            <th colSpan="14">FC Deployment Plan versus Actual Summary</th>
                        </tr>
                        <tr>
                            <th>Location</th>
                            <th>FC Sr. Executive</th>
                            <th>HSQE</th>
                            <th>FC Service Supervisor /HK</th>
                            <th>Food vehicle Driver</th>
                            <th>Service Staff</th>
                            <th>HK Supervisor</th>
                            <th>Table, Floor, oven area, Service area cleaning -HK staff</th>
                            <th>Plate washing- HK staff</th>
                            <th>Food waste Bio</th>
                            <th>Data entry</th>
                            <th>Store Incharge</th>
                            <th>Store Keeper</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="highlight-cell">FC Total staff strength</td>
                            <td>3</td>
                            <td>1</td>
                            <td>5</td>
                            <td>3</td>
                            <td>36</td>
                            <td>1</td>
                            <td>14</td>
                            <td>14</td>
                            <td>1</td>
                            <td>1</td>
                            <td>1</td>
                            <td>5</td>
                            <td className="bold-cell">85</td>
                        </tr>
                        <tr>
                            <td className="highlight-cell">Current Status</td>
                            <td>3</td>
                            <td>1</td>
                            <td>5</td>
                            <td>3</td>
                            <td>41</td>
                            <td>1</td>
                            <td>14</td>
                            <td>14</td>
                            <td>0</td>
                            <td>1</td>
                            <td>1</td>
                            <td>5</td>
                            <td className="bold-cell">89</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrganizationChartPage;
