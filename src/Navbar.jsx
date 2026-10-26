import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

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

    return (
        <>
            <button className={`mobile-sidebar-toggle ${mobileMenuOpen ? 'open' : ''}`} onClick={toggleMobileMenu}>
                <span className="icon">{mobileMenuOpen ? '✕' : '☰'}</span>
            </button>

            {mobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}

            <nav className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    {!isCollapsed && <img src={logo} alt="Logo" className="sidebar-logo" />}
                    <div className="sidebar-brand">
                        {!isCollapsed && (
                            <>
                                <div className="brand-main">{brandText}</div>
                                <div className="brand-sub">{brandSub}</div>
                            </>
                        )}
                    </div>
                    <button className="desktop-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                        <span className="icon">☰</span>
                    </button>
                </div>

                <div className="sidebar-scrollable">
                    <ul className="sidebar-menu">
                        {!isCollapsed && <li className="menu-heading">Main Navigation</li>}
                        
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
                                        </div>
                                    </li>
                                )}
                            </>
                        ) : isManagement ? (
                            <>
                                <li><Link to="/management/" onClick={closeMobileMenu} className={location.pathname === '/management/' ? 'nav-link active' : 'nav-link'} title="Dashboard"><span className="icon">📊</span> <span className="nav-text">Dashboard</span></Link></li>
                                {(hasPermission('can_approve_pr_l1') || hasPermission('can_approve_pr_l2')) && <li><Link to="/management/approvals" onClick={closeMobileMenu} className={isActive('/management/approvals')} title="Pending Approvals"><span className="icon">✅</span> <span className="nav-text">Pending Approvals</span></Link></li>}
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
                            {theme === 'dark' ? (isCollapsed ? '🌙' : '🌙 Dark Mode') : 
                             theme === 'light' ? (isCollapsed ? '☀️' : '☀️ Light Mode') : 
                             theme === 'sky' ? (isCollapsed ? '❄️' : '❄️ Sky Mode') : 
                             (isCollapsed ? '⚪' : '⚪ White Mode')}
                        </button>
                    </div>

                    <div className="user-profile-widget">
                        <div className="user-info-main">
                            <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
                            {!isCollapsed && (
                                <div className="user-details">
                                    <span className="user-name">{user.username}</span>
                                    <span className="user-role">{user.profile?.role_details?.name || 'User'}</span>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
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
