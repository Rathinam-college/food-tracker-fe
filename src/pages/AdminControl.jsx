import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BASE_URL = '/food_tracker/api';

const adminFetch = (url, options = {}) => {
    const token = localStorage.getItem('ft_token');
    const headers = { Authorization: `Token ${token}`, ...options.headers };
    return fetch(url, { ...options, headers });
};

const adminJson = (url, options = {}) =>
    adminFetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
    }).then(async res => {
        if (!res.ok) throw await res.json().catch(() => ({}));
        if (res.status === 204) return null;
        return res.json();
    });

const permissionGroups = [
    {
        name: '💼 Management Department',
        fields: [
            { key: 'can_approve_pr_l1', label: 'Approve PR (Level 1)' },
            { key: 'can_approve_pr_l2', label: 'Approve PR (Level 2)' },
            { key: 'can_verify_mr', label: 'Verify & Approve Kitchen MRs' },
            { key: 'can_view_reports', label: 'View executive-level charts and expenditure' },
            { key: 'can_view_pr_entries', label: 'View All PR History for executive review' },
            { key: 'can_view_opex_report', label: 'View Detailed Opex Financial Report' }
        ]
    },
    {
        name: '📦 Procurement Department',
        fields: [
            { key: 'can_place_po', label: 'Place Material PR' },
            { key: 'can_confirm_receive', label: 'Confirm Receive/Accept' },
            { key: 'can_edit_po', label: 'Edit Purchase Request' },
            { key: 'can_delete_po', label: 'Delete Purchase Request' },
            { key: 'can_generate_po', label: 'Generate PDF/PO' },
            { key: 'can_upload_bill', label: 'Upload Receipt/Bill' },
            { key: 'can_view_pr_entries', label: 'View All PR History' }
        ]
    },
    {
        name: '🍳 Kitchen Department',
        fields: [
            { key: 'can_place_mr', label: 'Place Material Request' },
            { key: 'can_view_mr', label: 'View Own MR History' },
            { key: 'can_delete_mr', label: 'Delete Own MR (Drafts)' }
        ]
    },
    {
        name: '📊 Inventory & Reports',
        fields: [
            { key: 'can_view_stock', label: 'View Stock Availability' },
            { key: 'can_view_reports', label: 'View General Reports' },
            { key: 'can_view_stock_ledger', label: 'View Stock Transition Ledger' },
            { key: 'can_view_consumption_report', label: 'View Kitchen Consumption' },
            { key: 'can_view_custom_monthly_summary', label: 'View Custom Monthly Summary' }
        ]
    },
    {
        name: '🏗️ Master Data & Registry',
        fields: [
            { key: 'can_manage_items', label: 'Manage Food Material Registry' },
            { key: 'can_manage_categories', label: 'Manage Categories' },
            { key: 'can_manage_tax', label: 'Manage Tax History' },
            { key: 'can_manage_vendors', label: 'Manage Vendor Registry' },
            { key: 'can_manage_locations', label: 'Manage Shipping Locations' },
            { key: 'can_manage_company_profile', label: 'Edit Company Profile' },
            { key: 'can_manage_summary_config', label: 'Configure Custom Summaries' }
        ]
    },
    {
        name: '🛡️ System Administration',
        fields: [
            { key: 'can_manage_mr', label: 'Approve/Process Kitchen MRs' },
            { key: 'can_access_admin_panel', label: 'Access Admin Control Panel' },
            { key: 'can_perform_hard_reset', label: 'Database Management (Backup/Restore/Reset)' }
        ]
    }
];

const permissionFields = permissionGroups.flatMap(g => g.fields);

const Modal = ({ title, onClose, children }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-overlay, rgba(0,0,0,0.75))', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
        <div className="animate-fade-in" style={{ padding: '2rem', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-navbar)', border: '1px solid var(--border-glass-bright)', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{title}</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
            </div>
            {children}
        </div>
    </div>
);

const AdminControl = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users');
    const [selectedRole, setSelectedRole] = useState(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ 
        username: '', 
        password: '', 
        first_name: '', 
        last_name: '', 
        email: '', 
        role_id: '',
        department_ids: [],
        landing_page: 'launcher',
        auto_approve: false,
        auto_approve_threshold: 0,
        can_verify_mr: false
    });
    const [userError, setUserError] = useState('');
    const [userLoading, setUserLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [pwMsg, setPwMsg] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');
    const [dbLoading, setDbLoading] = useState(false);
    const [dbMsg, setDbMsg] = useState('');
    const [resetRequests, setResetRequests] = useState([]);
    const [resetsLoading, setResetsLoading] = useState(false);
    const { user: currentUser, hasPermission } = useAuth();

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, deptsRes] = await Promise.all([
                adminJson(`${BASE_URL}/users/`),
                adminJson(`${BASE_URL}/roles/`),
                adminJson(`${BASE_URL}/departments/`),
            ]);
            setUsers(usersRes);
            setRoles(rolesRes);
            setDepartments(deptsRes);
        } catch (err) {
            console.error('Failed to fetch admin data', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchResets = async () => {
        setResetsLoading(true);
        try {
            const data = await adminJson(`${BASE_URL}/password-reset-requests/`);
            setResetRequests(data.results || data);
        } catch (err) {
            console.error('Failed to fetch resets', err);
        } finally {
            setResetsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'resets') fetchResets();
    }, [activeTab]);

    const handleActionReset = async (id, action, remarks = '') => {
        try {
            await adminJson(`${BASE_URL}/password-reset-requests/${id}/${action}/`, {
                method: 'POST',
                body: JSON.stringify({ remarks })
            });
            fetchResets();
        } catch (err) {
            console.error(err);
            alert(`Failed to ${action} reset request`);
        }
    };

    const handleRoleChange = async (userId, roleId) => {
        try {
            await adminJson(`${BASE_URL}/users/${userId}/set_role/`, {
                method: 'POST',
                body: JSON.stringify({ role_id: roleId || null }),
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to update role');
        }
    };

    const handleDepartmentChange = async (userId, deptIds) => {
        try {
            await adminJson(`${BASE_URL}/users/${userId}/set_departments/`, {
                method: 'POST',
                body: JSON.stringify({ department_ids: deptIds }),
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to update departments');
        }
    };

    const handleToggleSwitchDept = async (e, userId, currentState) => {
        if (e) e.preventDefault();
        try {
            await adminJson(`${BASE_URL}/users/${userId}/`, {
                method: 'PATCH',
                body: JSON.stringify({
                    show_switch_dept: !currentState
                }),
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to update visibility setting');
        }
    };

    const handleSaveRole = async (e) => {
        e.preventDefault();
        try {
            if (selectedRole.id) {
                await adminJson(`${BASE_URL}/roles/${selectedRole.id}/`, { method: 'PUT', body: JSON.stringify(selectedRole) });
            } else {
                await adminJson(`${BASE_URL}/roles/`, { method: 'POST', body: JSON.stringify(selectedRole) });
            }
            setIsRoleModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to save role');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setUserError('');
        setUserLoading(true);
        try {
            await adminJson(`${BASE_URL}/users/create_user/`, { method: 'POST', body: JSON.stringify(newUser) });
            setIsUserModalOpen(false);
            setNewUser({ username: '', password: '', first_name: '', last_name: '', email: '', role_id: '', department_ids: [], landing_page: 'launcher', auto_approve: false, auto_approve_threshold: 0, can_verify_mr: false });
            fetchData();
        } catch (err) {
            setUserError(err.error || 'Failed to create user');
        } finally {
            setUserLoading(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setPwMsg('');
        setPwLoading(true);
        try {
            await adminJson(`${BASE_URL}/users/${selectedUser.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({
                    username: selectedUser.username,
                    first_name: selectedUser.first_name,
                    last_name: selectedUser.last_name,
                    email: selectedUser.email,
                    role_id: selectedUser.role_id || (selectedUser.profile?.role),
                    department_ids: selectedUser.department_ids || (selectedUser.profile?.departments),
                    landing_page: selectedUser.landing_page || (selectedUser.profile?.landing_page || 'launcher'),
                    auto_approve: selectedUser.auto_approve !== undefined ? selectedUser.auto_approve : (selectedUser.profile?.auto_approve || false),
                    auto_approve_threshold: selectedUser.auto_approve_threshold !== undefined ? selectedUser.auto_approve_threshold : (selectedUser.profile?.auto_approve_threshold || 0),
                    can_verify_mr: selectedUser.can_verify_mr !== undefined ? selectedUser.can_verify_mr : (selectedUser.profile?.can_verify_mr || false)
                }),
            });
            setPwMsg('✅ User updated successfully!');
            fetchData();
        } catch (err) {
            setPwMsg('❌ Failed to update user: ' + (err.error || 'Unknown error'));
        } finally {
            setPwLoading(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (user.id === currentUser?.id) {
            alert("You cannot delete your own account.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
            return;
        }
        try {
            await adminJson(`${BASE_URL}/users/${user.id}/`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            alert('Failed to delete user: ' + (err.error || 'Unknown error'));
        }
    };

    const handleSetPassword = async (e) => {
        e.preventDefault();
        setPwMsg('');
        setPwLoading(true);
        try {
            await adminJson(`${BASE_URL}/users/${selectedUser.id}/set_password/`, {
                method: 'POST',
                body: JSON.stringify({ password: newPassword }),
            });
            setPwMsg('✅ Password updated successfully!');
            setNewPassword('');
            fetchData();
        } catch (err) {
            console.error(err);
            setPwMsg('❌ Failed to update password');
        } finally {
            setPwLoading(false);
        }
    };

    const handleSyncInventory = async () => {
        if (!window.confirm("CRITICAL: This will hard reset all inventory to ZERO and permanently clear out the Stock Transition Ledger. This cannot be undone. Proceed?")) {
            return;
        }
        setSyncLoading(true);
        setSyncMsg('');
        try {
            const res = await adminJson(`${BASE_URL}/inventory/hard_reset/`, { method: 'POST' });
            setSyncMsg(`✅ ${res.status}`);
            // Clearing message after 10 seconds
            setTimeout(() => setSyncMsg(''), 10000);
        } catch (err) {
            setSyncMsg(`❌ Failed: ${err.error || 'Unknown error'}`);
        } finally {
            setSyncLoading(false);
        }
    };

    const handleDbBackup = async () => {
        setDbLoading(true);
        setDbMsg('⏳ Generating SQL backup...');
        try {
            const token = localStorage.getItem('ft_token');
            const response = await fetch(`${BASE_URL}/database/backup/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (!response.ok) throw new Error('Backup failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.download = `rathinam_food_db_${timestamp}.sql`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setDbMsg('✅ SQL Backup downloaded successfully!');
        } catch (err) {
            console.error(err);
            setDbMsg('❌ Failed to download backup');
        } finally {
            setDbLoading(false);
        }
    };

    const handleDbRestore = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const proceed = window.confirm(
            "🛑 CRITICAL WARNING: RESTORE OPERATION\n\n" +
            "This will OVERWRITE your entire database with the contents of the uploaded SQL file. " +
            "All current data will be lost. This cannot be undone.\n\n" +
            "Do you want to proceed with the restoration?"
        );

        if (!proceed) {
            e.target.value = '';
            return;
        }

        setDbLoading(true);
        setDbMsg('⏳ Restoring database... please wait and do not refresh.');
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('ft_token');
            const response = await fetch(`${BASE_URL}/database/restore/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}` },
                body: formData
            });
            
            const res = await response.json();
            if (!response.ok) throw new Error(res.error || 'Restoration failed');
            
            setDbMsg('✅ ' + res.message);
            alert("Database restored successfully! The system will now reload to apply changes.");
            window.location.reload();
        } catch (err) {
            setDbMsg('❌ Error: ' + err.message);
            console.error('Restore Error:', err);
        } finally {
            setDbLoading(false);
            e.target.value = '';
        }
    };

    const newRoleDefaults = permissionFields.reduce((acc, f) => ({ ...acc, [f.key]: false }), {});

    const thStyle = { 
        textAlign: 'left', 
        padding: '0.5rem 0.3rem', 
        fontSize: '0.52rem', 
        fontWeight: 800, 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em', 
        color: 'var(--text-muted)', 
        borderBottom: '1px solid var(--border-glass)',
        whiteSpace: 'nowrap'
    };
    const tdStyle = { 
        padding: '0.5rem 0.3rem', 
        fontSize: '0.68rem', 
        borderBottom: '1px solid var(--border-glass)',
        verticalAlign: 'middle'
    };

    if (loading) return <div className="main-container" style={{ paddingTop: '4rem', textAlign: 'center' }}>Loading admin data...</div>;

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1>🛡️ Admin Control Panel</h1>
                <p>Manage user accounts, roles, and permissions.</p>
            </header>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button className={`action-btn${activeTab === 'users' ? '' : ' secondary'}`} onClick={() => setActiveTab('users')}>
                    👥 Manage Users
                </button>
                <button className={`action-btn${activeTab === 'roles' ? '' : ' secondary'}`} onClick={() => setActiveTab('roles')}>
                    🔑 Manage Roles
                </button>
                {hasPermission('can_perform_hard_reset') && (
                    <button className={`action-btn${activeTab === 'maintenance' ? '' : ' secondary'}`} onClick={() => setActiveTab('maintenance')}>
                        🗄️ Database Management
                    </button>
                )}
                <button className={`action-btn${activeTab === 'resets' ? '' : ' secondary'}`} onClick={() => setActiveTab('resets')}>
                    🔓 Password Resets
                </button>
                <button className="action-btn secondary" onClick={() => navigate('organization')}>
                    🏢 Org & HR Chart
                </button>
                <button className="action-btn secondary" onClick={() => navigate('audit-log')}>
                    📜 System Audit Log
                </button>
            </div>

            {activeTab === 'users' ? (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button className="action-btn" onClick={() => { setUserError(''); setIsUserModalOpen(true); }}>
                            + Create User
                        </button>
                    </div>
                    <div style={{ background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass-bright)', borderRadius: '12px', padding: '0', boxShadow: 'var(--shadow-premium)', overflowX: 'auto', marginBottom: '2rem', width: '100%', zoom: '0.8' }}>
                        <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'separate', borderSpacing: '0', tableLayout: 'fixed' }}>
                            <thead style={{ background: 'var(--bg-glass)' }}>
                                <tr>
                                    <th style={{ ...thStyle, width: '110px', paddingLeft: '1.2rem' }}>Username</th>
                                    <th style={{ ...thStyle, width: '120px' }}>Full Name</th>
                                    <th style={{ ...thStyle, width: '150px' }}>Email</th>
                                    <th style={{ ...thStyle, width: '130px' }}>Assigned Role</th>
                                    <th style={{ ...thStyle, width: '180px' }}>Departments</th>
                                    <th style={{ ...thStyle, width: '100px' }}>Landing Page</th>
                                    <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Auto Appr.</th>
                                    <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Verify MR</th>
                                    <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Switch Dept</th>
                                    <th style={{ ...thStyle, width: '60px', textAlign: 'center', paddingRight: '1rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => (
                                    <tr key={u.id} style={{ background: i % 2 === 0 ? 'var(--bg-glass)' : 'transparent' }}>
                                        <td style={{ ...tdStyle, paddingLeft: '1.2rem', wordBreak: 'break-all' }}>
                                            <span
                                                style={{ cursor: 'pointer', color: 'var(--color-secondary, #7aa2f7)', textDecoration: 'underline', fontWeight: 700 }}
                                                onClick={() => { 
                                                    setSelectedUser({
                                                        ...u,
                                                        role_id: u.profile?.role || '',
                                                        department_ids: u.profile?.departments || [],
                                                        landing_page: u.profile?.landing_page || 'launcher',
                                                        auto_approve: u.profile?.auto_approve || false,
                                                         auto_approve_threshold: u.profile?.auto_approve_threshold || 0,
                                                        can_verify_mr: u.profile?.can_verify_mr || false
                                                    }); 
                                                    setNewPassword(''); 
                                                    setPwMsg(''); 
                                                    setShowPassword(false); 
                                                }}
                                            >
                                                {u.username}
                                            </span>
                                            {u.id === currentUser?.id && <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem', marginLeft: '6px' }}>(you)</span>}
                                            {u.is_staff && <span style={{ color: 'var(--status-pending-text, #f4a523)', fontSize: '0.7rem', marginLeft: '6px', background: 'var(--status-pending-bg, rgba(244,165,35,0.15))', padding: '1px 6px', borderRadius: '8px' }}>staff</span>}
                                        </td>
                                        <td style={tdStyle}>{u.first_name} {u.last_name}</td>
                                        <td style={{ ...tdStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.email}>{u.email || '—'}</td>
                                        <td style={{ ...tdStyle, padding: '0.8rem 1rem' }}>
                                            <div style={{ position: 'relative' }}>
                                            <select
                                                value={u.profile?.role || ''}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                style={{ 
                                                    width: '100%',
                                                    padding: '0.3rem 0.4rem', 
                                                    fontSize: '0.7rem', 
                                                    color: 'var(--text-main)', 
                                                    backgroundColor: 'var(--bg-glass)', 
                                                    border: '1px solid var(--border-glass)', 
                                                    borderRadius: '4px', 
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }}
                                            >
                                                    <option value="">— No Role —</option>
                                                    {roles.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {departments.map(d => {
                                                    const isAssigned = (u.profile?.departments || []).includes(d.id);
                                                    return (
                                                        <span 
                                                            key={d.id}
                                                            onClick={() => {
                                                                const currentDepts = u.profile?.departments || [];
                                                                const newDepts = isAssigned 
                                                                    ? currentDepts.filter(id => id !== d.id)
                                                                    : [...currentDepts, d.id];
                                                                handleDepartmentChange(u.id, newDepts);
                                                            }}
                                                            style={{
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                background: isAssigned ? 'var(--status-info-bg)' : 'var(--bg-glass)',
                                                                color: isAssigned ? 'var(--status-info-text, #3b82f6)' : 'var(--text-muted)',
                                                                border: `1px solid ${isAssigned ? 'var(--border-glass-bright)' : 'var(--border-glass)'}`,
                                                                transition: 'all 0.2s',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                            title={isAssigned ? 'Click to remove' : 'Click to add'}
                                                        >
                                                            <span style={{ fontSize: '0.8rem', opacity: isAssigned ? 1 : 0.5 }}>{d.logo}</span>
                                                            {d.display_name || d.name}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ 
                                                fontSize: '0.8rem', 
                                                padding: '2px 8px', 
                                                borderRadius: '10px', 
                                                background: 'var(--bg-glass)',
                                                color: 'var(--text-muted)',
                                                border: '1px solid var(--border-glass)'
                                            }}>
                                                {u.profile?.landing_page === 'procurement' ? '🚀 Procurement' : 
                                                 u.profile?.landing_page === 'kitchen' ? '🍳 Kitchen' : 
                                                 u.profile?.landing_page === 'management' ? '💼 Management' : '🏠 Launcher'}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {u.profile?.auto_approve ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                     <span title="Auto-Approval Enabled" style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>⚡</span>
                                                     {u.profile.auto_approve_threshold > 0 && (
                                                         <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                             ≤ ₹{Number(u.profile.auto_approve_threshold).toLocaleString()}
                                                         </span>
                                                     )}
                                                 </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {(u.profile?.can_verify_mr || roles.find(r => r.id === u.profile?.role)?.can_verify_mr) ? (
                                                <span title="MR Verification Enabled" style={{ fontSize: '1.2rem', color: 'var(--color-secondary, #7aa2f7)' }}>🛡️</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center', paddingRight: '1rem' }}>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleToggleSwitchDept(e, u.id, u.profile?.show_switch_dept ?? true)}
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    cursor: 'pointer', 
                                                    fontSize: '1.2rem',
                                                    filter: u.profile?.show_switch_dept !== false ? 'none' : 'grayscale(1) opacity(0.5)',
                                                    transition: 'transform 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                title={u.profile?.show_switch_dept !== false ? 'Hide Switch Dept Button' : 'Show Switch Dept Button'}
                                            >
                                                {u.profile?.show_switch_dept !== false ? '👁️' : '🙈'}
                                            </button>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <button 
                                                onClick={() => handleDeleteUser(u)}
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    cursor: 'pointer', 
                                                    fontSize: '1.1rem', 
                                                    filter: u.id === currentUser?.id ? 'grayscale(1) opacity(0.1)' : 'none',
                                                    transition: 'transform 0.2s'
                                                }}
                                                onMouseOver={(e) => !u.id === currentUser?.id && (e.currentTarget.style.transform = 'scale(1.2)')}
                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                title="Delete User"
                                                disabled={u.id === currentUser?.id}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'roles' ? (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button className="action-btn" onClick={() => {
                            setSelectedRole({ name: '', description: '', ...newRoleDefaults });
                            setIsRoleModalOpen(true);
                        }}>
                            + Create New Role
                        </button>
                    </div>
                    <div style={{ background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass-bright)', borderRadius: '12px', padding: '0', boxShadow: 'var(--shadow-premium)', overflowX: 'auto', marginBottom: '2rem', width: '100%', zoom: '0.8' }}>
                        <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'separate', borderSpacing: '0', tableLayout: 'fixed' }}>
                            <thead style={{ background: 'var(--bg-glass)' }}>
                                <tr>
                                    <th style={{ ...thStyle, width: '140px', paddingLeft: '1.2rem' }}>Role Name</th>
                                    <th style={{ ...thStyle, width: '200px' }}>Description</th>
                                    <th style={thStyle}>Permissions</th>
                                    <th style={{ ...thStyle, width: '80px', textAlign: 'center', paddingRight: '1rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map((r, i) => (
                                    <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--bg-glass)' : 'transparent' }}>
                                        <td style={tdStyle}><strong>{r.name}</strong></td>
                                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{r.description || '—'}</td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                {permissionFields.filter(f => r[f.key]).map(f => (
                                                    <span key={f.key} style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg-glass-heavy)', color: 'var(--text-main)', border: '1px solid var(--border-glass-bright)' }}>
                                                        {f.label}
                                                    </span>
                                                ))}
                                                {permissionFields.filter(f => r[f.key]).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No permissions</span>}
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <button style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', background: 'var(--bg-glass-heavy)', color: 'var(--text-main)', border: '1px solid var(--border-glass-bright)', borderRadius: '6px', cursor: 'pointer' }} onClick={() => { setSelectedRole({ ...r }); setIsRoleModalOpen(true); }}>
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'resets' ? (
                <div className="animate-fade-in">
                    <div style={{ background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass-bright)', borderRadius: '12px', padding: '0', boxShadow: 'var(--shadow-premium)', overflowX: 'auto', marginBottom: '2rem', width: '100%' }}>
                        <h2 style={{ padding: '1rem 1.2rem 0.4rem 1.2rem', margin: 0, fontSize: '1rem' }}>🔓 Pending Password Resets</h2>
                        {resetsLoading ? (
                            <p style={{ padding: '1rem' }}>Loading requests...</p>
                        ) : (
                            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'separate', borderSpacing: '0', tableLayout: 'fixed' }}>
                                <thead style={{ background: 'var(--bg-glass)' }}>
                                    <tr>
                                        <th style={{ ...thStyle, paddingLeft: '1.2rem' }}>Username</th>
                                        <th style={thStyle}>Requested At</th>
                                        <th style={{ ...thStyle, width: '100px' }}>Status</th>
                                        <th style={{ ...thStyle, width: '160px', paddingRight: '1.2rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resetRequests.filter(r => r.status === 'PENDING').map((r, i) => (
                                        <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--bg-glass)' : 'transparent' }}>
                                            <td style={tdStyle}><strong>{r.username}</strong></td>
                                            <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
                                            <td style={tdStyle}>
                                                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' }}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button 
                                                        className="action-btn" 
                                                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                                                        onClick={() => {
                                                            const remarks = prompt("Any remarks? (Optional)");
                                                            handleActionReset(r.id, 'complete', remarks);
                                                        }}
                                                    >
                                                        ✅ Done
                                                    </button>
                                                    <button 
                                                        className="action-btn secondary" 
                                                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                                                        onClick={() => {
                                                            const remarks = prompt("Reason for cancellation?");
                                                            if (remarks) handleActionReset(r.id, 'cancel', remarks);
                                                        }}
                                                    >
                                                        ❌ Cancel
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {resetRequests.filter(r => r.status === 'PENDING').length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No pending requests found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        <h2 style={{ padding: '1.5rem 1.2rem 0.4rem 1.2rem', margin: 0, fontSize: '1rem' }}>📜 History</h2>
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'separate', borderSpacing: '0', tableLayout: 'fixed' }}>
                            <thead style={{ background: 'var(--bg-glass)' }}>
                                <tr>
                                    <th style={{ ...thStyle, paddingLeft: '1.2rem' }}>Username</th>
                                    <th style={thStyle}>Completed At</th>
                                    <th style={thStyle}>Admin</th>
                                    <th style={{ ...thStyle, width: '100px', paddingRight: '1.2rem' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resetRequests.filter(r => r.status !== 'PENDING').map((r, i) => (
                                    <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--bg-glass)' : 'transparent' }}>
                                        <td style={tdStyle}>{r.username}</td>
                                        <td style={tdStyle}>{new Date(r.completed_at).toLocaleString()}</td>
                                        <td style={tdStyle}>{r.completed_by_username || '—'}</td>
                                        <td style={tdStyle}>
                                            <span style={{ 
                                                padding: '2px 8px', 
                                                borderRadius: '10px', 
                                                fontSize: '0.75rem', 
                                                background: r.status === 'COMPLETED' ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
                                                color: r.status === 'COMPLETED' ? 'var(--status-success-text)' : 'var(--status-error-text)'
                                            }}>
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in" style={{ background: 'var(--bg-navbar)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '2rem', boxShadow: 'var(--shadow-premium)' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span>🗄️</span> Database Management
                    </h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem', maxWidth: '800px' }}>
                        Use these tools to oversee the system's database. You can generate backups, restore from previous states, or reset the inventory ledger.
                        <br /><br />
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>⚠️ CAUTION:</span> Restoration and Hard Reset operations are permanent and will overwrite or wipe current data. Handle with care.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Reset Tool */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-glass)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ color: 'var(--status-error-text-vibrant, #d33)' }}>🔥</span> Factory Resets
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                <strong>Full System Reset</strong> deletes all Items, Vendors, History, and Users (except Admin).<br/><br/>
                                <strong>Wipe Entry Tables</strong> deletes only operational history (Procurement, Inventory, Movements) and resets IDs to 1, preserving all Master Data.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <button 
                                        className="action-btn" 
                                        style={{ background: 'var(--status-warning-text-vibrant, #f39c12)', border: 'none', width: '100%', color: '#fff' }}
                                        onClick={async () => {
                                            if (!window.confirm("Are you SURE you want to wipe all Entry Tables and reset IDs to 1? Master data will be preserved, but all history will be permanently deleted!")) return;
                                            setSyncLoading(true);
                                            try {
                                                const res = await adminJson(`${BASE_URL}/database/wipe_entry_tables/`, { method: 'POST' });
                                                setSyncMsg('✅ ' + (res.status || 'Entry tables wiped successfully!'));
                                            } catch (err) {
                                                setSyncMsg('❌ ' + (err.error || 'Unknown error'));
                                            } finally {
                                                setSyncLoading(false);
                                            }
                                        }}
                                        disabled={syncLoading}
                                    >
                                        {syncLoading ? '⏳ Processing...' : 'Wipe Entry Tables (Keep Master Data)'}
                                    </button>
                                </div>
                                <div>
                                    <button 
                                        className="action-btn" 
                                        style={{ background: 'var(--status-error-text-vibrant, #d33)', border: 'none', width: '100%' }}
                                        onClick={handleSyncInventory}
                                        disabled={syncLoading}
                                    >
                                        {syncLoading ? '⏳ Resetting System...' : 'Perform FULL Factory Reset'}
                                    </button>
                                </div>
                                {syncMsg && <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>{syncMsg}</div>}
                            </div>
                        </div>

                        {/* Backup & Restore */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-glass)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ color: 'var(--color-secondary, #7aa2f7)' }}>💾</span> Database Backup
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                Download a full SQL dump or restore from a previously saved file.
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button 
                                    className="action-btn" 
                                    style={{ background: 'var(--color-secondary, #3b82f6)', border: 'none', width: '100%' }}
                                    onClick={handleDbBackup}
                                    disabled={dbLoading}
                                >
                                    {dbLoading ? '⏳ Processing...' : 'Download SQL Backup'}
                                </button>

                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="file" 
                                        accept=".sql"
                                        onChange={handleDbRestore}
                                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 1 }}
                                        disabled={dbLoading}
                                    />
                                    <button 
                                        className="action-btn secondary" 
                                        style={{ width: '100%', borderColor: 'var(--border-glass-bright)' }}
                                        disabled={dbLoading}
                                    >
                                        📤 Restore from SQL File
                                    </button>
                                </div>
                                {dbMsg && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)' }}>{dbMsg}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            ) }

            {/* Create User Modal */}
            {isUserModalOpen && (
                <Modal title="➕ Create New User" onClose={() => setIsUserModalOpen(false)}>
                    <form onSubmit={handleCreateUser}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label>First Name</label>
                                <input type="text" className="glass-input" value={newUser.first_name}
                                    onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input type="text" className="glass-input" value={newUser.last_name}
                                    onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Username <span style={{ color: '#ff6b6b' }}>*</span></label>
                                <input type="text" className="glass-input" value={newUser.username} required
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Assign Departments</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {departments.map(d => {
                                        const isSelected = newUser.department_ids.includes(d.id);
                                        return (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => {
                                                    const current = newUser.department_ids;
                                                    const newVal = isSelected 
                                                        ? current.filter(id => id !== d.id)
                                                        : [...current, d.id];
                                                    setNewUser({ ...newUser, department_ids: newVal });
                                                }}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-glass)',
                                                    background: isSelected ? 'var(--status-info-bg)' : 'var(--bg-glass)',
                                                    color: isSelected ? 'var(--status-info-text, #7aa2f7)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                {d.logo} {d.display_name || d.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" className="glass-input" value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Password <span style={{ color: 'var(--status-error-text-vibrant)' }}>*</span></label>
                                <input type="password" className="glass-input" value={newUser.password} required
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Default Landing Page</label>
                                <select className="glass-input" value={newUser.landing_page}
                                    onChange={e => setNewUser({ ...newUser, landing_page: e.target.value })} style={{ color: 'var(--text-main)', backgroundColor: 'var(--bg-glass)' }}>
                                    <option value="launcher">App Launcher</option>
                                    <option value="management">Management Overview</option>
                                    <option value="procurement">Procurement Dashboard</option>
                                    <option value="kitchen">Kitchen Dashboard</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', gap: '15px' }}>
                                <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={newUser.auto_approve}
                                        onChange={e => setNewUser({ ...newUser, auto_approve: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                         <span style={{ fontWeight: 600 }}>Auto-Approval</span>
                                         {newUser.auto_approve && (
                                             <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Limit: ₹</span>
                                                 <input 
                                                     type="number" 
                                                     className="glass-input" 
                                                     style={{ padding: '2px 5px', fontSize: '0.8rem', width: '80px', height: '24px' }}
                                                     value={newUser.auto_approve_threshold}
                                                     onChange={e => setNewUser({ ...newUser, auto_approve_threshold: e.target.value })}
                                                     placeholder="0 = No limit"
                                                     onClick={e => e.stopPropagation()}
                                                 />
                                             </div>
                                         )}
                                     </div>

                                </label>
                                <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={newUser.can_verify_mr}
                                        onChange={e => setNewUser({ ...newUser, can_verify_mr: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span>MR Verification</span>
                                </label>
                            </div>
                        </div>

                        {userError && <div className="error-message">{userError}</div>}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button type="button" className="action-btn secondary" onClick={() => setIsUserModalOpen(false)}>Cancel</button>
                            <button type="submit" className="action-btn" disabled={userLoading}>
                                {userLoading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit Role Modal */}
            {isRoleModalOpen && selectedRole && (
                <Modal title={selectedRole.id ? '✏️ Edit Role' : '➕ Create Role'} onClose={() => setIsRoleModalOpen(false)}>
                    <form onSubmit={handleSaveRole}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label>Role Name <span style={{ color: 'var(--status-error-text-vibrant)' }}>*</span></label>
                                <input type="text" className="glass-input" value={selectedRole.name} required
                                    onChange={e => setSelectedRole({ ...selectedRole, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <input type="text" className="glass-input" value={selectedRole.description || ''}
                                    onChange={e => setSelectedRole({ ...selectedRole, description: e.target.value })} />
                            </div>
                        </div>

                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Permissions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2.5rem' }}>
                            {permissionGroups.map(group => (
                                <div key={group.name} style={{ background: 'var(--bg-glass)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.name}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                                        {group.fields.map(f => (
                                            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', background: 'var(--bg-navbar)', border: '1px solid var(--border-glass)', transition: 'all 0.2s' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!selectedRole[f.key]}
                                                    onChange={e => setSelectedRole({ ...selectedRole, [f.key]: e.target.checked })} 
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                {f.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="action-btn secondary" onClick={() => setIsRoleModalOpen(false)}>Cancel</button>
                            <button type="submit" className="action-btn">Save Role</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* User Detail / Password Modal */}
            {selectedUser && (
                <Modal title={`👤 Edit User: ${selectedUser.username}`} onClose={() => setSelectedUser(null)}>
                    <form onSubmit={handleUpdateUser} style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Username</label>
                                <input 
                                    type="text" 
                                    className="glass-input" 
                                    value={selectedUser.username} 
                                    required
                                    onChange={e => setSelectedUser({ ...selectedUser, username: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email</label>
                                <input 
                                    type="email" 
                                    className="glass-input" 
                                    value={selectedUser.email || ''} 
                                    onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>First Name</label>
                                <input 
                                    type="text" 
                                    className="glass-input" 
                                    value={selectedUser.first_name || ''} 
                                    onChange={e => setSelectedUser({ ...selectedUser, first_name: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Last Name</label>
                                <input 
                                    type="text" 
                                    className="glass-input" 
                                    value={selectedUser.last_name || ''} 
                                    onChange={e => setSelectedUser({ ...selectedUser, last_name: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Role</label>
                                <select 
                                    className="glass-input" 
                                    style={{ color: 'var(--text-main)', backgroundColor: 'var(--bg-glass)' }}
                                    value={selectedUser.role_id || ''}
                                    onChange={e => setSelectedUser({ ...selectedUser, role_id: e.target.value })}
                                >
                                    <option value="">— No Role —</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Default Landing Page</label>
                                <select 
                                    className="glass-input" 
                                    style={{ color: 'var(--text-main)', backgroundColor: 'var(--bg-glass)' }}
                                    value={selectedUser.landing_page || 'launcher'}
                                    onChange={e => setSelectedUser({ ...selectedUser, landing_page: e.target.value })}
                                >
                                    <option value="launcher">App Launcher</option>
                                    <option value="management">Management Overview</option>
                                    <option value="procurement">Procurement Dashboard</option>
                                    <option value="kitchen">Kitchen Dashboard</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', gap: '15px' }}>
                                <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedUser.auto_approve}
                                        onChange={e => setSelectedUser({ ...selectedUser, auto_approve: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                         <span style={{ fontWeight: 600 }}>Auto-Approval</span>
                                         {selectedUser.auto_approve && (
                                             <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Limit: ₹</span>
                                                 <input 
                                                     type="number" 
                                                     className="glass-input" 
                                                     style={{ padding: '2px 5px', fontSize: '0.8rem', width: '100px', height: '24px' }}
                                                     value={selectedUser.auto_approve_threshold}
                                                     onChange={e => setSelectedUser({ ...selectedUser, auto_approve_threshold: e.target.value })}
                                                     placeholder="0 = No limit"
                                                     onClick={e => e.stopPropagation()}
                                                 />
                                             </div>
                                         )}
                                     </div>

                                </label>
                                <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedUser.can_verify_mr}
                                        onChange={e => setSelectedUser({ ...selectedUser, can_verify_mr: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span>MR Verification</span>
                                </label>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Staff Status</label>
                                <div style={{ paddingTop: '10px' }}>
                                    {selectedUser.is_staff ? '🛡️ Staff Admin' : '👤 Regular User'}
                                </div>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Departments</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {departments.map(d => {
                                        const isAssigned = (selectedUser.department_ids || []).includes(d.id);
                                        return (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => {
                                                    const current = selectedUser.department_ids || [];
                                                    const newVal = isAssigned 
                                                        ? current.filter(id => id !== d.id)
                                                        : [...current, d.id];
                                                    setSelectedUser({ ...selectedUser, department_ids: newVal });
                                                }}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    background: isAssigned ? 'var(--status-info-bg)' : 'var(--bg-glass)',
                                                    color: isAssigned ? 'var(--status-info-text, #7aa2f7)' : 'var(--text-muted)',
                                                    border: `1px solid ${isAssigned ? 'var(--status-info-text)' : 'var(--border-glass)'}`,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {d.logo} {d.display_name || d.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                type="submit" 
                                disabled={pwLoading}
                                className="action-btn"
                                style={{ padding: '0.6rem 2rem' }}
                            >
                                {pwLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>

                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.2rem', marginBottom: '1.2rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Stored Password</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-glass)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '1px', flex: 1 }}>
                                {selectedUser.profile?.plain_password
                                    ? (showPassword ? selectedUser.profile.plain_password : '••••••••')
                                    : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not stored (set before this feature)</span>
                                }
                            </div>
                            {selectedUser.profile?.plain_password && (
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ padding: '0.5rem 0.8rem', background: 'var(--bg-glass-heavy)', color: 'var(--text-main)', border: '1px solid var(--border-glass-bright)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    {showPassword ? '🙈 Hide' : '👁️ Show'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.2rem' }}>
                        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem' }}>🔒 Set New Password</h3>
                        <form onSubmit={handleSetPassword} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    style={{ width: '100%', padding: '0.6rem 1rem', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '0.95rem' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={pwLoading}
                                style={{ padding: '0.6rem 1.2rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                            >
                                {pwLoading ? 'Saving...' : 'Update Password'}
                            </button>
                        </form>
                        {pwMsg && <div style={{ marginTop: '0.8rem', fontSize: '0.9rem' }}>{pwMsg}</div>}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminControl;
