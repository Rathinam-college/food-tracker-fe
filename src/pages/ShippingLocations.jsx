import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ShippingLocations = () => {
    const { hasPermission } = useAuth();
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newLocation, setNewLocation] = useState({
        name: '', address: '', contact_person: '', is_default: false
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const data = await api.getShippingLocations();
            setLocations(data);
        } catch (error) {
            console.error("Failed to fetch shipping locations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.updateShippingLocation(editingId, newLocation);
                setEditingId(null);
            } else {
                await api.createShippingLocation(newLocation);
            }
            setShowForm(false);
            setNewLocation({ name: '', address: '', contact_person: '', is_default: false });
            fetchLocations();
        } catch (error) {
            console.error("Failed to save shipping location:", error);
            alert("Error saving location. Please check if the name is unique.");
        }
    };

    const handleEdit = (location) => {
        setNewLocation({
            name: location.name,
            address: location.address || '',
            contact_person: location.contact_person || '',
            is_default: location.is_default
        });
        setEditingId(location.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this shipping location?")) {
            try {
                await api.deleteShippingLocation(id);
                fetchLocations();
            } catch (error) {
                console.error("Failed to delete location", error);
            }
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setNewLocation({ name: '', address: '', contact_person: '', is_default: false });
    };

    return (
        <div className="main-container">
            <header className="welcome-header">
                <h1>Shipping Locations</h1>
                <p>Manage delivery points for your purchase orders.</p>
            </header>

            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{editingId ? 'Edit Location' : 'Delivery Points'}</h2>
                    {hasPermission('can_manage_locations') && (
                        <button className="action-btn" onClick={editingId || showForm ? handleCancel : () => setShowForm(true)}>
                            {editingId || showForm ? 'Cancel' : 'Add New Location'}
                        </button>
                    )}
                </div>

                {(showForm || editingId) && (
                    <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
                        <input
                            className="form-input"
                            placeholder="Location Name (e.g., Main Kitchen, Hostel A)"
                            required
                            value={newLocation.name}
                            onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                        />
                        <input
                            className="form-input"
                            placeholder="Contact Person"
                            value={newLocation.contact_person}
                            onChange={(e) => setNewLocation({...newLocation, contact_person: e.target.value})}
                        />
                        <textarea
                            className="form-input"
                            placeholder="Full Address"
                            rows="3"
                            value={newLocation.address}
                            onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={newLocation.is_default}
                                onChange={(e) => setNewLocation({...newLocation, is_default: e.target.checked})}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                            />
                            Set as default delivery location
                        </label>
                        <button type="submit" className="action-btn">
                            {editingId ? 'Update Location' : 'Save Location'}
                        </button>
                    </form>
                )}
            </div>

            {loading ? (
                <p>Loading locations...</p>
            ) : (
                <div className="glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.2rem' }}>Registered Locations</h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{locations.length} locations</span>
                    </div>
                    {locations.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No shipping locations added yet. Click "Add New Location" to get started.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        <th style={{ padding: '1rem' }}>NAME</th>
                                        <th style={{ padding: '1rem' }}>ADDRESS</th>
                                        <th style={{ padding: '1rem' }}>CONTACT</th>
                                        <th style={{ padding: '1rem' }}>DEFAULT</th>
                                        <th style={{ padding: '1rem' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {locations.map(loc => (
                                        <tr key={loc.id} style={{ background: 'rgba(255,255,255,0.02)', transition: 'var(--transition)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 600, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>{loc.name}</td>
                                            <td style={{ padding: '1rem', maxWidth: '300px', whiteSpace: 'pre-wrap' }}>{loc.address || '-'}</td>
                                            <td style={{ padding: '1rem' }}>{loc.contact_person || '-'}</td>
                                            <td style={{ padding: '1rem' }}>
                                                {loc.is_default && (
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.7rem',
                                                        background: 'rgba(153, 194, 33, 0.1)',
                                                        color: '#99C221',
                                                        fontWeight: 700
                                                    }}>
                                                        DEFAULT
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                {hasPermission('can_manage_locations') && (
                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                        <button onClick={() => handleEdit(loc)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                                                        <button onClick={() => handleDelete(loc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ShippingLocations;
