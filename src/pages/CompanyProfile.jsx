import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CompanyProfile = () => {
    const { hasPermission } = useAuth();
    const [profile, setProfile] = useState({ name: '', address: '', phone: '', email: '' });
    const [profileId, setProfileId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await api.getCompanyProfile();
            if (Array.isArray(data) && data.length > 0) {
                const p = data[0];
                setProfile({ name: p.name || '', address: p.address || '', phone: p.phone || '', email: p.email || '' });
                setProfileId(p.id);
            }
        } catch (error) {
            console.error("Failed to fetch company profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            if (profileId) {
                await api.updateCompanyProfile(profileId, profile);
            } else {
                const result = await api.createCompanyProfile(profile);
                setProfileId(result.id);
            }
            setMessage('Company profile saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Failed to save company profile:", error);
            setMessage('Error saving profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="main-container">Loading profile...</div>;

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1>Company Profile</h1>
                <p>Configure your organization details for purchase orders.</p>
            </header>

            <div className="glass" style={{ padding: '2rem', maxWidth: '700px' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>{profileId ? 'Edit Profile' : 'Setup Profile'}</h2>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company / Organization Name</label>
                        <input
                            className="form-input"
                            placeholder="e.g., Rathinam College"
                            required
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                            <input
                                className="form-input"
                                placeholder="e.g., +91 98765 43210"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                            <input
                                className="form-input"
                                type="email"
                                placeholder="e.g., info@rathinam.in"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Address</label>
                        <textarea
                            className="form-input"
                            placeholder="Enter the complete company address"
                            rows="4"
                            value={profile.address}
                            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        />
                    </div>

                    {message && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            background: message.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(153, 194, 33, 0.1)',
                            color: message.includes('Error') ? '#ef4444' : '#99C221'
                        }}>
                            {message}
                        </div>
                    )}

                    {hasPermission('can_manage_company_profile') ? (
                        <button type="submit" className="action-btn" disabled={saving}>
                            {saving ? 'Saving...' : (profileId ? 'Update Profile' : 'Save Profile')}
                        </button>
                    ) : (
                        <div style={{ 
                            padding: '1rem', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: '#ef4444', 
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                             ⚠️ You do not have permission to manage the company profile.
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CompanyProfile;
