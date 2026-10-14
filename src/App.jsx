import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import MasterData from './pages/MasterData';
import VendorManagement from './pages/VendorManagement';
import ShippingLocations from './pages/ShippingLocations';
import CompanyProfile from './pages/CompanyProfile';
import CustomSummaryConfig from './pages/CustomSummaryConfig';
import CustomMonthlySummary from './pages/CustomMonthlySummary';
import PRPlacement from './pages/PRPlacement';
import PREntries from './pages/PREntries';
import PurchasedReport from './pages/PurchasedReport';
import PurchaseTracker from './pages/PurchaseTracker';
import MonthWiseSummary from './pages/MonthWiseSummary';
import StockTransitionReport from './pages/StockTransitionReport';
import KitchenConsumptionReport from './pages/KitchenConsumptionReport';
import MonthlyKitchenConsumptionReport from './pages/MonthlyKitchenConsumptionReport';
import ConsumptionCalendar from './pages/ConsumptionCalendar';
import PurchaseOrder from './pages/PurchaseOrder';
import Login from './pages/Login';
import AdminControl from './pages/AdminControl';
import KitchenLanding from './pages/KitchenLanding';
import KitchenMRPlacement from './pages/KitchenMRPlacement';
import KitchenMREntries from './pages/KitchenMREntries';
import ViewKitchenMR from './pages/ViewKitchenMR';
import PRFulfillmentDetails from './pages/PRFulfillmentDetails';
import ProcurementLanding from './pages/ProcurementLanding';
import StockAvailability from './pages/StockAvailability';
import ItemStockLedger from './pages/ItemStockLedger';
import ManagementLanding from './pages/ManagementLanding';
import ManagementApprovals from './pages/ManagementApprovals';
import ManagementApprovalHistory from './pages/ManagementApprovalHistory';
import MRVerificationQueue from './pages/MRVerificationQueue';
import MRVerificationHistory from './pages/MRVerificationHistory';
import OpexEntries from './pages/OpexEntries';
import CreateMultiPROpex from './pages/CreateMultiPROpex';
import ReceivePR from './pages/ReceivePR';
import OpexReport from './pages/OpexReport';
import PRDeviationReport from './pages/PRDeviationReport';
import OpexDetail from './pages/OpexDetail';
import VendorReturnSelector from './pages/VendorReturnSelector';
import VendorReturnForm from './pages/VendorReturnForm';
import VendorReturnEntries from './pages/VendorReturnEntries';
import VendorReturnReport from './pages/VendorReturnReport';
import StockBalanceReport from './pages/StockBalanceReport';
import InventoryAdjustment from './pages/InventoryAdjustment';
import OrganizationChartPage from './pages/OrganizationChartPage';
import OrganizationAdmin from './pages/OrganizationAdmin';
import ComprehensiveAudit from './pages/ComprehensiveAudit';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';



const Navbar = () => {
    const { user, logout, hasPermission } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    
    // Use a single state to track the expanded group (accordion style)
    const [openGroup, setOpenGroup] = React.useState(null); 
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    React.useEffect(() => {
        if (!isCollapsed) {
            const path = location.pathname;
            if (path.includes('/reports')) {
                setOpenGroup('reports');
            } else if (path.includes('/entries') || path.includes('/vendor-returns') || path.includes('/opex') || path.includes('/adjust-stock')) {
                setOpenGroup('entries');
            } else if (path.includes('/master-data')) {
                setOpenGroup('master-data');
            }
        } else {
            setOpenGroup(null);
        }
        
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
        } else {
            document.body.classList.remove('sidebar-collapsed');
        }
        
        return () => {
            document.body.classList.remove('sidebar-collapsed');
        }
    }, [location.pathname, isCollapsed]);

    const handleToggleGroup = (groupName) => {
        if (isCollapsed) return;
        setOpenGroup(prev => prev === groupName ? null : groupName);
    };

    const isActive = (path) => {
        const current = location.pathname.replace(/\/$/, '') || '/';
        const target = path.replace(/\/$/, '') || '/';
        if (current === target) return 'nav-link active';
        const containerPaths = ['/kitchen/reports', '/management/reports', '/procurement/reports', '/procurement/master-data'];
        if (containerPaths.includes(path) && current.startsWith(target + '/')) return 'nav-link active';
        return 'nav-link';
    };

    if (!user) return null;

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
    const closeMobileMenu = () => setMobileMenuOpen(false);

    const isKitchen = location.pathname.startsWith('/kitchen/');
    const isManagement = location.pathname.startsWith('/management/');
 
    let brandText = 'Food Tracker';
    let brandSub = 'Procurement';
    if (isKitchen) brandSub = 'Kitchen Operations';
    if (isManagement) brandSub = 'Executive Analytics';

    const effectivelyCollapsed = isCollapsed && !mobileMenuOpen;

    return (
        <>
            <button className={`mobile-sidebar-toggle ${mobileMenuOpen ? 'open' : ''}`} onClick={toggleMobileMenu}>
                <span className="icon">{mobileMenuOpen ? '✕' : '☰'}</span>
            </button>

            {mobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}

            <nav className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''} ${effectivelyCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    {!effectivelyCollapsed && (
                        <div className="sidebar-logo-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Logo" className="sidebar-logo" style={{ width: '32px', height: '32px', marginBottom: '2px' }} />
                            <img src={`${import.meta.env.BASE_URL}Rathinam_font_new_1.svg`} alt="Rathinam" style={{ height: '9px' }} />
                        </div>
                    )}
                    <div className="sidebar-brand">
                        {!effectivelyCollapsed && (
                            <>
                                <div className="brand-main">{brandText}</div>
                                <div className="brand-sub">{brandSub}</div>
                            </>
                        )}
                    </div>
                    <button className="desktop-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {effectivelyCollapsed ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Expand" style={{ width: '32px', height: '32px', marginBottom: '2px', display: 'block' }} />
                                <img src={`${import.meta.env.BASE_URL}Rathinam_font_new_1.svg`} alt="Rathinam" style={{ height: '7px', display: 'block' }} />
                            </div>
                        ) : (
                            <span className="icon">☰</span>
                        )}
                    </button>
                </div>

                <div className="sidebar-scrollable">
                    <ul className="sidebar-menu">
                        {!effectivelyCollapsed && <li className="menu-heading">Main Navigation</li>}
                        
                        {isKitchen ? (
                            <>
                                <li><Link to="/kitchen/" onClick={closeMobileMenu} className={location.pathname === '/kitchen/' ? 'nav-link active' : 'nav-link'} title="Dashboard"><span className="icon">📊</span> <span className="nav-text">Dashboard</span></Link></li>
                                {hasPermission('can_place_mr') && <li><Link to="/kitchen/mr" onClick={closeMobileMenu} className={isActive('/kitchen/mr')} title="Place Request"><span className="icon">🆕</span> <span className="nav-text">Place Request</span></Link></li>}
                                {(hasPermission('can_view_mr') || hasPermission('can_manage_mr')) && <li><Link to="/kitchen/mr-entries" onClick={closeMobileMenu} className={isActive('/kitchen/mr-entries')} title="Request History"><span className="icon">📋</span> <span className="nav-text">Request History</span></Link></li>}
                                {hasPermission('can_view_stock') && <li><Link to="/kitchen/stock" onClick={closeMobileMenu} className={isActive('/kitchen/stock')} title="Stock Availability"><span className="icon">📦</span> <span className="nav-text">Stock Availability</span></Link></li>}
                                
                                {hasPermission('can_view_reports') && (
                                    <li className="menu-group">
                                        <div className={`nav-link group-header ${openGroup === 'reports' ? 'open' : ''}`} onClick={() => handleToggleGroup('reports')} title="Reports">
                                            <span><span className="icon">📈</span> <span className="nav-text">Reports</span></span> <span className="chevron">{openGroup === 'reports' ? '▾' : '▸'}</span>
                                        </div>
                                        <div className={`group-items ${openGroup === 'reports' ? 'expanded' : ''}`}>
                                            {hasPermission('can_view_consumption_report') && <Link to="/kitchen/reports/consumption" className={isActive('/kitchen/reports/consumption')} onClick={closeMobileMenu}>Consumption Ledger</Link>}
                                            {hasPermission('can_view_consumption_report') && <Link to="/kitchen/reports/monthly-consumption" className={isActive('/kitchen/reports/monthly-consumption')} onClick={closeMobileMenu}>Monthly Consumption</Link>}
                                            <Link to="/kitchen/reports/organization-chart" className={isActive('/kitchen/reports/organization-chart')} onClick={closeMobileMenu}>Organization Chart</Link>
                                        </div>
                                    </li>
                                )}
                            </>
                        ) : isManagement ? (
                            <>
                                <li><Link to="/management/" onClick={closeMobileMenu} className={location.pathname === '/management/' ? 'nav-link active' : 'nav-link'} title="Dashboard"><span className="icon">📊</span> <span className="nav-text">Dashboard</span></Link></li>
                                {(hasPermission('can_approve_pr_l1') || hasPermission('can_approve_pr_l2')) && <li><Link to="/management/approvals" onClick={closeMobileMenu} className={isActive('/management/approvals')} title="Pending Procurement Approvals"><span className="icon">✅</span> <span className="nav-text">Pending Procurement Approvals</span></Link></li>}
                                {hasPermission('can_verify_mr') && <li><Link to="/management/kitchen-requests" onClick={closeMobileMenu} className={isActive('/management/kitchen-requests')} title="Kitchen Requests"><span className="icon">🍳</span> <span className="nav-text">Kitchen Requests</span></Link></li>}
                                {hasPermission('can_view_stock') && <li><Link to="/management/stock" onClick={closeMobileMenu} className={isActive('/management/stock')} title="Stock Balance"><span className="icon">📦</span> <span className="nav-text">Stock Balance</span></Link></li>}
                                {hasPermission('can_view_reports') && (
                                    <li className="menu-group">
                                        <div className={`nav-link group-header ${openGroup === 'reports' ? 'open' : ''}`} onClick={() => handleToggleGroup('reports')} title="Reports">
                                            <span><span className="icon">📈</span> <span className="nav-text">Reports</span></span> <span className="chevron">{openGroup === 'reports' ? '▾' : '▸'}</span>
                                        </div>
                                        <div className={`group-items ${openGroup === 'reports' ? 'expanded' : ''}`}>
                                            <Link to="/management/reports/purchased" className={isActive('/management/reports/purchased')} onClick={closeMobileMenu}>Purchased Report</Link>
                                            <Link to="/management/reports/tracker" className={isActive('/management/reports/tracker')} onClick={closeMobileMenu}>Purchase Tracker</Link>
                                            {hasPermission('can_view_stock_ledger') && <Link to="/management/reports/stock-transition" className={isActive('/management/reports/stock-transition')} onClick={closeMobileMenu}>Stock Transition</Link>}
                                            {hasPermission('can_view_consumption_report') && <Link to="/management/reports/kitchen-consumption" className={isActive('/management/reports/kitchen-consumption')} onClick={closeMobileMenu}>Kitchen Consumption</Link>}
                                            {hasPermission('can_view_consumption_report') && <Link to="/management/reports/monthly-kitchen-consumption" className={isActive('/management/reports/monthly-kitchen-consumption')} onClick={closeMobileMenu}>Monthly Consumption</Link>}
                                            <Link to="/management/reports/month-wise" className={isActive('/management/reports/month-wise')} onClick={closeMobileMenu}>Month-wise Summary</Link>
                                            {hasPermission('can_view_custom_monthly_summary') && <Link to="/management/reports/custom-summary" className={isActive('/management/reports/custom-summary')} onClick={closeMobileMenu}>Custom Monthly Summary</Link>}
                                            {hasPermission('can_view_opex_report') && <Link to="/management/reports/opex" className={isActive('/management/reports/opex')} onClick={closeMobileMenu}>Opex Report</Link>}
                                            {hasPermission('can_view_reports') && <Link to="/management/reports/deviation" className={isActive('/management/reports/deviation')} onClick={closeMobileMenu}>Price Deviation</Link>}
                                            {hasPermission('can_view_reports') && <Link to="/management/reports/vendor-returns" className={isActive('/management/reports/vendor-returns')} onClick={closeMobileMenu}>Vendor Returns</Link>}
                                            <Link to="/management/reports/organization-chart" className={isActive('/management/reports/organization-chart')} onClick={closeMobileMenu}>Organization Chart</Link>
                                        </div>
                                    </li>
                                )}
                            </>
                        ) : (
                            <>
                                <li><Link to="/procurement/" onClick={closeMobileMenu} className={location.pathname === '/procurement/' ? 'nav-link active' : 'nav-link'} title="Dashboard"><span className="icon">📊</span> <span className="nav-text">Dashboard</span></Link></li>
                                {hasPermission('can_manage_mr') && <li><Link to="/procurement/kitchen-mrs" onClick={closeMobileMenu} className={isActive('/procurement/kitchen-mrs')} title="Kitchen MR"><span className="icon">🍳</span> <span className="nav-text">Kitchen MR</span></Link></li>}
                                {hasPermission('can_view_stock') && <li><Link to="/procurement/reports/stock-balance" onClick={closeMobileMenu} className={isActive('/procurement/reports/stock-balance')} title="Stock Balance"><span className="icon">📦</span> <span className="nav-text">Stock Balance</span></Link></li>}
                                
                                {(hasPermission('can_view_pr_entries') || hasPermission('can_place_po')) && (
                                    <li className="menu-group">
                                        <div className={`nav-link group-header ${openGroup === 'entries' ? 'open' : ''}`} onClick={() => handleToggleGroup('entries')} title="Entries">
                                            <span><span className="icon">📝</span> <span className="nav-text">Entries</span></span> <span className="chevron">{openGroup === 'entries' ? '▾' : '▸'}</span>
                                        </div>
                                        <div className={`group-items ${openGroup === 'entries' ? 'expanded' : ''}`}>
                                            {hasPermission('can_place_po') && <Link to="/procurement/pr" className={isActive('/procurement/pr')} onClick={closeMobileMenu}>Place Material PR</Link>}
                                            {hasPermission('can_view_pr_entries') && (
                                                <>
                                                    <Link to="/procurement/pr-entries" className={isActive('/procurement/pr-entries')} onClick={closeMobileMenu}>PR Entries</Link>
                                                    <Link to="/procurement/opex-entries" className={isActive('/procurement/opex-entries')} onClick={closeMobileMenu}>OPEX Entries</Link>
                                                    <Link to="/procurement/vendor-returns" className={isActive('/procurement/vendor-returns')} onClick={closeMobileMenu}>Vendor Returns</Link>
                                                    <Link to="/procurement/vendor-returns/history" className={isActive('/procurement/vendor-returns/history')} onClick={closeMobileMenu}>Return History</Link>
                                                    <Link to="/procurement/adjust-stock" className={isActive('/procurement/adjust-stock')} onClick={closeMobileMenu}>Inventory Adjustment</Link>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                )}

                                {hasPermission('can_view_reports') && (
                                    <li className="menu-group">
                                        <div className={`nav-link group-header ${openGroup === 'reports' ? 'open' : ''}`} onClick={() => handleToggleGroup('reports')} title="Reports">
                                            <span><span className="icon">📈</span> <span className="nav-text">Reports</span></span> <span className="chevron">{openGroup === 'reports' ? '▾' : '▸'}</span>
                                        </div>
                                        <div className={`group-items ${openGroup === 'reports' ? 'expanded' : ''}`}>
                                            <Link to="/procurement/reports/purchased" className={isActive('/procurement/reports/purchased')} onClick={closeMobileMenu}>Purchased Report</Link>
                                            <Link to="/procurement/reports/tracker" className={isActive('/procurement/reports/tracker')} onClick={closeMobileMenu}>Purchase Tracker</Link>
                                            {hasPermission('can_view_opex_report') && <Link to="/procurement/reports/opex" className={isActive('/procurement/reports/opex')} onClick={closeMobileMenu}>Opex Report</Link>}
                                            {hasPermission('can_view_stock_ledger') && <Link to="/procurement/reports/stock-transition" className={isActive('/procurement/reports/stock-transition')} onClick={closeMobileMenu}>Stock Transition</Link>}
                                            {hasPermission('can_view_consumption_report') && <Link to="/procurement/reports/kitchen-consumption" className={isActive('/procurement/reports/kitchen-consumption')} onClick={closeMobileMenu}>Kitchen Consumption</Link>}
                                            {hasPermission('can_view_consumption_report') && <Link to="/procurement/reports/monthly-kitchen-consumption" className={isActive('/procurement/reports/monthly-kitchen-consumption')} onClick={closeMobileMenu}>Monthly Consumption</Link>}
                                            <Link to="/procurement/reports/month-wise" className={isActive('/procurement/reports/month-wise')} onClick={closeMobileMenu}>Month-wise Summary</Link>
                                            {hasPermission('can_view_custom_monthly_summary') && <Link to="/procurement/reports/custom-summary" className={isActive('/procurement/reports/custom-summary')} onClick={closeMobileMenu}>Custom Monthly Summary</Link>}
                                            {hasPermission('can_view_reports') && <Link to="/procurement/reports/deviation" className={isActive('/procurement/reports/deviation')} onClick={closeMobileMenu}>Price Deviation</Link>}
                                            {hasPermission('can_view_reports') && <Link to="/procurement/reports/vendor-returns" className={isActive('/procurement/reports/vendor-returns')} onClick={closeMobileMenu}>Vendor Returns</Link>}
                                            <Link to="/procurement/reports/organization-chart" className={isActive('/procurement/reports/organization-chart')} onClick={closeMobileMenu}>Organization Chart</Link>
                                        </div>
                                    </li>
                                )}

                                <li className="menu-group">
                                    <div className={`nav-link group-header ${openGroup === 'master-data' ? 'open' : ''}`} onClick={() => handleToggleGroup('master-data')} title="Master Data">
                                        <span><span className="icon">⚙️</span> <span className="nav-text">Master Data</span></span> <span className="chevron">{openGroup === 'master-data' ? '▾' : '▸'}</span>
                                    </div>
                                    <div className={`group-items ${openGroup === 'master-data' ? 'expanded' : ''}`}>
                                        {hasPermission('can_manage_items') && <Link to="/procurement/master-data/items" className={isActive('/procurement/master-data/items')} onClick={closeMobileMenu}>Food Materials</Link>}
                                        {hasPermission('can_manage_categories') && <Link to="/procurement/master-data/categories" className={isActive('/procurement/master-data/categories')} onClick={closeMobileMenu}>Categories</Link>}
                                        {hasPermission('can_manage_vendors') && (
                                            <>
                                                <Link to="/procurement/master-data/vendors" className={isActive('/procurement/master-data/vendors')} onClick={closeMobileMenu}>Vendors</Link>
                                                <Link to="/procurement/master-data/vendor-categories" className={isActive('/procurement/master-data/vendor-categories')} onClick={closeMobileMenu}>Vendor Categories</Link>
                                            </>
                                        )}
                                        {hasPermission('can_manage_locations') && <Link to="/procurement/master-data/shipping" className={isActive('/procurement/master-data/shipping')} onClick={closeMobileMenu}>Shipping Locations</Link>}
                                        {hasPermission('can_manage_company_profile') && <Link to="/procurement/master-data/company" className={isActive('/procurement/master-data/company')} onClick={closeMobileMenu}>Company Profile</Link>}
                                        {hasPermission('can_manage_summary_config') && <Link to="/procurement/master-data/custom-summary" className={isActive('/procurement/master-data/custom-summary')} onClick={closeMobileMenu}>Summary Config</Link>}
                                    </div>
                                </li>
                            </>
                        )}
                    </ul>
                </div>

                <div className="sidebar-footer">
                    <div className="theme-toggle-wrapper">
                        <button className="sidebar-theme-toggle" onClick={toggleTheme} title="Toggle Theme">
                            {theme === 'dark' ? (effectivelyCollapsed ? '🌙' : '🌙 Dark Mode') : 
                             theme === 'light' ? (effectivelyCollapsed ? '☀️' : '☀️ Light Mode') : 
                             theme === 'sky' ? (effectivelyCollapsed ? '❄️' : '❄️ Sky Mode') : 
                             (effectivelyCollapsed ? '⚪' : '⚪ White Mode')}
                        </button>
                    </div>

                    <div className="user-profile-widget">
                        <div className="user-info-main">
                            <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
                            {!effectivelyCollapsed && (
                                <div className="user-details">
                                    <span className="user-name">{user.username}</span>
                                    <span className="user-role">{user.profile?.role_details?.name || 'User'}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Flyout menu for collapsed mode */}
                        {effectivelyCollapsed && (
                            <div className="user-flyout-menu">
                                <div className="user-details" style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                                    <span className="user-name" style={{ display: 'block', fontSize: '1rem' }}>{user.username}</span>
                                    <span className="user-role" style={{ fontSize: '0.8rem' }}>{user.profile?.role_details?.name || 'User'}</span>
                                </div>
                                <Link to="/launcher" className="nav-link" style={{ padding: '0.5rem' }}>
                                    <span className="icon">🚀</span> <span className="nav-text" style={{ display: 'inline' }}>Switch Dept</span>
                                </Link>
                                {hasPermission('can_access_admin_panel') && (
                                    <Link to="/procurement/admin" className="nav-link" style={{ padding: '0.5rem' }}>
                                        <span className="icon">🛡️</span> <span className="nav-text" style={{ display: 'inline' }}>Admin Panel</span>
                                    </Link>
                                )}
                                <button className="nav-link logout" onClick={logout} style={{ padding: '0.5rem', width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                                    <span className="icon">🚪</span> <span className="nav-text" style={{ display: 'inline' }}>Logout</span>
                                </button>
                            </div>
                        )}

                        {!effectivelyCollapsed && (
                            <div className="user-actions">
                                {user.profile?.show_switch_dept !== false && (
                                    <Link to="/launcher" className="sidebar-action-btn" title="Switch Department">🚀</Link>
                                )}
                                {hasPermission('can_access_admin_panel') && <Link to="/procurement/admin" className="sidebar-action-btn" title="Admin Panel">🛡️</Link>}
                                <button className="sidebar-action-btn logout" onClick={logout} title="Logout">🚪</button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
};

// Moved Dashboard to ProcurementLanding.jsx

import AppLauncher from './pages/AppLauncher';

function App() {
    return (
        <AuthProvider>
            <Router basename="/food_tracker">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/launcher" element={<ProtectedRoute><AppLauncher /></ProtectedRoute>} />
                    
                    {/* Procurement App Routes - mounted at /procurement */}
                    <Route path="/procurement/*" element={
                        <ProtectedRoute>
                            <Navbar />
                            <Routes>
                                <Route path="/" element={<ProcurementLanding />} />
                                <Route path="/pr" element={<ProtectedRoute permission="can_place_po"><PRPlacement /></ProtectedRoute>} />
                                <Route path="/pr-entries" element={<ProtectedRoute permission="can_view_pr_entries"><PREntries /></ProtectedRoute>} />
                                <Route path="/pr-entries/fulfillment/:id" element={<ProtectedRoute permission="can_view_pr_entries"><PRFulfillmentDetails /></ProtectedRoute>} />
                                <Route path="/pr-entries/receive/:id" element={<ProtectedRoute permission="can_confirm_receive"><ReceivePR /></ProtectedRoute>} />
                                <Route path="/opex-entries" element={<ProtectedRoute permission="can_view_pr_entries"><OpexEntries /></ProtectedRoute>} />
                                <Route path="/opex-entries/new" element={<ProtectedRoute permission="can_view_pr_entries"><CreateMultiPROpex /></ProtectedRoute>} />
                                <Route path="/kitchen-mrs" element={<ProtectedRoute permission="can_view_mr"><KitchenMREntries /></ProtectedRoute>} />
                                <Route path="/kitchen-mrs/view/:id" element={<ProtectedRoute permission="can_view_mr"><ViewKitchenMR /></ProtectedRoute>} />
                                <Route path="/stock" element={<ProtectedRoute permission="can_view_stock"><StockAvailability departmentCode="procurement" /></ProtectedRoute>} />
                                <Route path="/stock/item/:itemId" element={<ProtectedRoute permission="can_view_stock"><ItemStockLedger /></ProtectedRoute>} />
                                <Route path="/master-data/items" element={<ProtectedRoute permission="can_manage_items"><MasterData /></ProtectedRoute>} />
                                <Route path="/master-data/categories" element={<ProtectedRoute permission="can_manage_categories"><MasterData /></ProtectedRoute>} />
                                <Route path="/master-data/vendors" element={<ProtectedRoute permission="can_manage_vendors"><VendorManagement /></ProtectedRoute>} />
                                <Route path="/master-data/vendor-categories" element={<ProtectedRoute permission="can_manage_vendors"><MasterData /></ProtectedRoute>} />
                                <Route path="/master-data/shipping" element={<ProtectedRoute permission="can_manage_locations"><ShippingLocations /></ProtectedRoute>} />
                                <Route path="/master-data/company" element={<ProtectedRoute permission="can_manage_company_profile"><CompanyProfile /></ProtectedRoute>} />
                                <Route path="/master-data/custom-summary" element={<ProtectedRoute permission="can_manage_summary_config"><CustomSummaryConfig /></ProtectedRoute>} />
                                <Route path="/reports/purchased" element={<ProtectedRoute permission="can_view_reports"><PurchasedReport /></ProtectedRoute>} />
                                <Route path="/reports/tracker" element={<ProtectedRoute permission="can_view_reports"><PurchaseTracker /></ProtectedRoute>} />
                                <Route path="/reports/stock-transition" element={<ProtectedRoute permission="can_view_stock_ledger"><StockTransitionReport /></ProtectedRoute>} />
                                <Route path="/reports/kitchen-consumption" element={<ProtectedRoute permission="can_view_reports"><KitchenConsumptionReport /></ProtectedRoute>} />
                                <Route path="/reports/monthly-kitchen-consumption" element={<ProtectedRoute permission="can_view_reports"><MonthlyKitchenConsumptionReport /></ProtectedRoute>} />
                                <Route path="/reports/production-calendar" element={<ProtectedRoute permission="can_view_reports"><ConsumptionCalendar /></ProtectedRoute>} />
                                <Route path="/reports/month-wise" element={<ProtectedRoute permission="can_view_reports"><MonthWiseSummary /></ProtectedRoute>} />
                                <Route path="/reports/opex" element={<ProtectedRoute permission="can_view_opex_report"><OpexReport /></ProtectedRoute>} />
                                <Route path="/opex/:id" element={<ProtectedRoute permission="can_view_pr_entries"><OpexDetail /></ProtectedRoute>} />
                                <Route path="/reports/custom-summary" element={<ProtectedRoute permission="can_view_custom_monthly_summary"><CustomMonthlySummary /></ProtectedRoute>} />
                                <Route path="/reports/deviation" element={<ProtectedRoute permission="can_view_reports"><PRDeviationReport /></ProtectedRoute>} />
                                <Route path="/reports/stock-balance" element={<ProtectedRoute permission="can_view_reports"><StockBalanceReport /></ProtectedRoute>} />
                                <Route path="/reports/vendor-returns" element={<ProtectedRoute permission="can_view_reports"><VendorReturnReport /></ProtectedRoute>} />
                                <Route path="/reports/organization-chart" element={<ProtectedRoute permission="can_view_reports"><OrganizationChartPage /></ProtectedRoute>} />
                                <Route path="/po/:id" element={<ProtectedRoute permission="can_view_pr_entries"><PurchaseOrder /></ProtectedRoute>} />
                                <Route path="/vendor-returns" element={<ProtectedRoute permission="can_view_pr_entries"><VendorReturnSelector /></ProtectedRoute>} />
                                <Route path="/vendor-returns/new/:prId" element={<ProtectedRoute permission="can_view_pr_entries"><VendorReturnForm /></ProtectedRoute>} />
                                <Route path="/vendor-returns/history" element={<ProtectedRoute permission="can_view_pr_entries"><VendorReturnEntries /></ProtectedRoute>} />
                                <Route path="/returns" element={<ProtectedRoute permission="can_view_pr_entries"><VendorReturnSelector /></ProtectedRoute>} />
                                <Route path="/adjust-stock" element={<ProtectedRoute permission="can_confirm_receive"><InventoryAdjustment /></ProtectedRoute>} />
                                <Route path="/admin" element={<ProtectedRoute permission="can_access_admin_panel"><AdminControl /></ProtectedRoute>} />
                                <Route path="/admin/organization" element={<ProtectedRoute permission="can_access_admin_panel"><OrganizationAdmin /></ProtectedRoute>} />
                                <Route path="/admin/audit-log" element={<ProtectedRoute permission="can_access_admin_panel"><ComprehensiveAudit /></ProtectedRoute>} />
                            </Routes>
                        </ProtectedRoute>
                    } />

                    {/* Management App Routes - mounted at /management */}
                    <Route path="/management/*" element={
                        <ProtectedRoute>
                            <Navbar />
                            <Routes>
                                <Route path="/" element={<ManagementLanding />} />
                                <Route path="/approvals" element={<ProtectedRoute permission="can_view_pr_entries"><ManagementApprovals /></ProtectedRoute>} />
                                <Route path="/approvals/history" element={<ProtectedRoute permission="can_view_pr_entries"><ManagementApprovalHistory /></ProtectedRoute>} />
                                <Route path="/kitchen-requests" element={<ProtectedRoute permission="can_verify_mr"><MRVerificationQueue /></ProtectedRoute>} />
                                <Route path="/kitchen-requests/history" element={<ProtectedRoute permission="can_verify_mr"><MRVerificationHistory /></ProtectedRoute>} />
                                <Route path="/kitchen-requests/view/:id" element={<ProtectedRoute permission="can_verify_mr"><ViewKitchenMR /></ProtectedRoute>} />
                                <Route path="/stock" element={<ProtectedRoute permission="can_view_stock"><StockBalanceReport /></ProtectedRoute>} />
                                <Route path="/stock/item/:itemId" element={<ProtectedRoute permission="can_view_stock"><ItemStockLedger /></ProtectedRoute>} />
                                <Route path="/reports/purchased" element={<ProtectedRoute permission="can_view_reports"><PurchasedReport /></ProtectedRoute>} />
                                <Route path="/reports/tracker" element={<ProtectedRoute permission="can_view_reports"><PurchaseTracker /></ProtectedRoute>} />
                                <Route path="/reports/stock-transition" element={<ProtectedRoute permission="can_view_stock_ledger"><StockTransitionReport /></ProtectedRoute>} />
                                <Route path="/reports/kitchen-consumption" element={<ProtectedRoute permission="can_view_reports"><KitchenConsumptionReport /></ProtectedRoute>} />
                                <Route path="/reports/monthly-kitchen-consumption" element={<ProtectedRoute permission="can_view_reports"><MonthlyKitchenConsumptionReport /></ProtectedRoute>} />
                                <Route path="/reports/production-calendar" element={<ProtectedRoute permission="can_view_reports"><ConsumptionCalendar /></ProtectedRoute>} />
                                <Route path="/reports/month-wise" element={<ProtectedRoute permission="can_view_reports"><MonthWiseSummary /></ProtectedRoute>} />
                                <Route path="/reports/opex" element={<ProtectedRoute permission="can_view_opex_report"><OpexReport /></ProtectedRoute>} />
                                <Route path="/opex/:id" element={<ProtectedRoute permission="can_view_pr_entries"><OpexDetail /></ProtectedRoute>} />
                                <Route path="/reports/custom-summary" element={<ProtectedRoute permission="can_view_custom_monthly_summary"><CustomMonthlySummary /></ProtectedRoute>} />
                                <Route path="/reports/deviation" element={<ProtectedRoute permission="can_view_reports"><PRDeviationReport /></ProtectedRoute>} />
                                <Route path="/reports/stock-balance" element={<ProtectedRoute permission="can_view_reports"><StockBalanceReport /></ProtectedRoute>} />
                                <Route path="/reports/vendor-returns" element={<ProtectedRoute permission="can_view_reports"><VendorReturnReport /></ProtectedRoute>} />
                                <Route path="/reports/organization-chart" element={<ProtectedRoute permission="can_view_reports"><OrganizationChartPage /></ProtectedRoute>} />
                                <Route path="/po/:id" element={<ProtectedRoute permission="can_view_pr_entries"><PurchaseOrder /></ProtectedRoute>} />
                            </Routes>
                        </ProtectedRoute>
                    } />

                    {/* Kitchen App Routes - mounted at /kitchen */}
                    <Route path="/kitchen/*" element={
                        <ProtectedRoute>
                            <Navbar />
                            <Routes>
                                <Route path="/" element={<KitchenLanding />} />
                                <Route path="/mr" element={<ProtectedRoute permission="can_place_mr"><KitchenMRPlacement /></ProtectedRoute>} />
                                <Route path="/mr-entries" element={<ProtectedRoute permission="can_view_mr"><KitchenMREntries /></ProtectedRoute>} />
                                <Route path="/mr-entries/view/:id" element={<ProtectedRoute permission="can_view_mr"><ViewKitchenMR /></ProtectedRoute>} />
                                <Route path="/stock" element={<ProtectedRoute permission="can_view_stock"><StockAvailability departmentCode="kitchen" /></ProtectedRoute>} />
                                <Route path="/reports/consumption" element={<ProtectedRoute permission="can_view_consumption_report"><KitchenConsumptionReport /></ProtectedRoute>} />
                                <Route path="/reports/monthly-consumption" element={<ProtectedRoute permission="can_view_consumption_report"><MonthlyKitchenConsumptionReport /></ProtectedRoute>} />
                                <Route path="/reports/production-calendar" element={<ProtectedRoute permission="can_view_consumption_report"><ConsumptionCalendar /></ProtectedRoute>} />
                                <Route path="/reports/organization-chart" element={<ProtectedRoute permission="can_view_reports"><OrganizationChartPage /></ProtectedRoute>} />
                            </Routes>
                        </ProtectedRoute>
                    } />

                    {/* Root path inside /food_tracker/ defaults to launcher */}
                    <Route path="/" element={<ProtectedRoute><AppLauncher /></ProtectedRoute>} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
