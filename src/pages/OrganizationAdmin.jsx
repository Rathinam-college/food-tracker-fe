import React, { useState, useEffect } from 'react';
import api from '../services/api';

const OrganizationAdmin = () => {
    const [activeTab, setActiveTab] = useState('deployments');
    const [deployments, setDeployments] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [units, setUnits] = useState([]);
    const [designations, setDesignations] = useState([]);
    
    // Form States for New Items
    const [newUnit, setNewUnit] = useState({ name: '', parent: '', type: 'Department', display_order: 0, is_active: true, show_counts: true });
    const [newDesignation, setNewDesignation] = useState({ name: '', department_type: '' });
    const [newPlan, setNewPlan] = useState({ organization_unit: '', designation: '', reports_to: '', required_count: 0 });
    
    // Form States for Edit Items
    const [editUnitId, setEditUnitId] = useState(null);
    const [editUnitForm, setEditUnitForm] = useState({});
    const [editDesigId, setEditDesigId] = useState(null);
    const [editDesigForm, setEditDesigForm] = useState({});

    const loadData = async () => {
        try {
            const [depsRes, statRes, unitsRes, desigRes] = await Promise.all([
                api.getDeploymentPlans(),
                api.getDeploymentStatuses(),
                api.getOrgUnitsCRUD(),
                api.getDesignations()
            ]);
            setDeployments(depsRes.results || depsRes);
            setStatuses(statRes.results || statRes);
            setUnits(unitsRes.results || unitsRes);
            setDesignations(desigRes.results || desigRes);
        } catch (error) {
            console.error("Failed to load org data", error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- Units CRUD ---
    const handleAddUnit = async () => {
        try {
            await api.createOrgUnit({ ...newUnit, parent: newUnit.parent || null });
            setNewUnit({ name: '', parent: '', type: 'Department', display_order: 0, is_active: true, show_counts: true });
            loadData();
        } catch (e) { alert("Error adding unit"); }
    };
    const handleUpdateUnit = async (id) => {
        try {
            await api.updateOrgUnit(id, { ...editUnitForm, parent: editUnitForm.parent || null });
            setEditUnitId(null);
            loadData();
        } catch (e) { alert("Error updating unit"); }
    };
    const handleDeleteUnit = async (id) => {
        if (!window.confirm("Delete this unit?")) return;
        try { await api.deleteOrgUnit(id); loadData(); } catch (e) { alert("Error deleting unit"); }
    };

    // --- Designations CRUD ---
    const handleAddDesignation = async () => {
        try {
            await api.createDesignation(newDesignation);
            setNewDesignation({ name: '', department_type: '' });
            loadData();
        } catch (e) { alert("Error adding designation"); }
    };
    const handleUpdateDesignation = async (id) => {
        try {
            await api.updateDesignation(id, editDesigForm);
            setEditDesigId(null);
            loadData();
        } catch (e) { alert("Error updating designation"); }
    };
    const handleDeleteDesignation = async (id) => {
        if (!window.confirm("Delete this designation?")) return;
        try { await api.deleteDesignation(id); loadData(); } catch (e) { alert("Error deleting designation"); }
    };

    // --- Deployments CRUD ---
    const handleAddPlan = async () => {
        try {
            const planData = { ...newPlan, reports_to: newPlan.reports_to || null };
            await api.createDeploymentPlan(planData);
            setNewPlan({ organization_unit: '', designation: '', reports_to: '', required_count: 0 });
            loadData();
        } catch (e) { alert("Error adding deployment plan"); }
    };
    const handleDeletePlan = async (id) => {
        if (!window.confirm("Delete this deployment plan?")) return;
        try { await api.deleteDeploymentPlan(id); loadData(); } catch (e) { alert("Error deleting deployment plan"); }
    };

    const handleUpdateActualStatus = async (planId, statusId, newActual) => {
        try {
            if (statusId) {
                await api.updateDeploymentStatus(statusId, { actual_count: newActual, deployment_plan: planId });
            } else {
                await api.createDeploymentStatus({ deployment_plan: planId, actual_count: newActual });
            }
            alert("Updated successfully!");
            loadData();
        } catch (e) { alert("Error updating: " + e.message); }
    };
    
    // (Render code will follow)
    return (
        <div className="main-container admin-control-container">
            <header className="welcome-header">
                <h1>Organization & HR Management</h1>
                <p>Manage Units, Designations, and Deployment Plans</p>
            </header>

            <div className="admin-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button className={`btn ${activeTab === 'deployments' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('deployments')}>Deployments (Headcount)</button>
                <button className={`btn ${activeTab === 'units' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('units')}>Organization Units</button>
                <button className={`btn ${activeTab === 'designations' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('designations')}>Designations</button>
            </div>

            <div className="glass admin-section">
                {activeTab === 'deployments' && (
                    <div>
                        <h2>Deployment Plans & Headcount</h2>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Unit</th>
                                    <th>Designation</th>
                                    <th>Reports To</th>
                                    <th>Required Count</th>
                                    <th>Actual Count</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deployments.map(plan => {
                                    const unit = units.find(u => u.id === plan.organization_unit);
                                    const desig = designations.find(d => d.id === plan.designation);
                                    const status = statuses.find(s => s.deployment_plan === plan.id);
                                    
                                    return (
                                        <tr key={plan.id}>
                                            <td>{unit ? unit.name : plan.organization_unit}</td>
                                            <td>{desig ? desig.name : plan.designation}</td>
                                            <td>
                                                <select 
                                                    id={`reports_to-${plan.id}`} 
                                                    defaultValue={plan.reports_to || ''} 
                                                    style={{ width: '120px', padding: '5px' }}
                                                >
                                                    <option value="">-- None --</option>
                                                    {deployments.filter(d => d.id !== plan.id && d.organization_unit === plan.organization_unit).map(d => (
                                                        <option key={d.id} value={d.id}>{d.designation_name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    defaultValue={plan.required_count} 
                                                    id={`required-${plan.id}`}
                                                    style={{ width: '60px', padding: '5px' }}
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    defaultValue={status ? status.actual_count : 0} 
                                                    id={`actual-${plan.id}`}
                                                    style={{ width: '60px', padding: '5px' }}
                                                />
                                            </td>
                                            <td>
                                                <div style={{display:'flex', gap:'5px'}}>
                                                    <button className="btn btn-primary" onClick={async () => {
                                                        const reqVal = document.getElementById(`required-${plan.id}`).value;
                                                        const actVal = document.getElementById(`actual-${plan.id}`).value;
                                                        const repVal = document.getElementById(`reports_to-${plan.id}`).value;
                                                        try {
                                                            // Update required count in Deployment Plan
                                                            await api.updateDeploymentPlan(plan.id, { 
                                                                organization_unit: plan.organization_unit, 
                                                                designation: plan.designation, 
                                                                reports_to: repVal || null,
                                                                required_count: parseInt(reqVal, 10) 
                                                            });
                                                            // Update actual count in Deployment Status
                                                            await handleUpdateActualStatus(plan.id, status ? status.id : null, parseInt(actVal, 10));
                                                        } catch (e) {
                                                            alert("Failed to update plan: " + e.message);
                                                        }
                                                    }}>Save</button>
                                                    <button className="btn btn-danger" onClick={() => handleDeletePlan(plan.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Add Row */}
                                <tr>
                                    <td>
                                        <select value={newPlan.organization_unit} onChange={(e) => setNewPlan({...newPlan, organization_unit: e.target.value})} style={{padding:'5px', width:'100%'}}>
                                            <option value="">-- Select Unit --</option>
                                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select value={newPlan.designation} onChange={(e) => setNewPlan({...newPlan, designation: e.target.value})} style={{padding:'5px', width:'100%'}}>
                                            <option value="">-- Select Designation --</option>
                                            {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select value={newPlan.reports_to} onChange={(e) => setNewPlan({...newPlan, reports_to: e.target.value})} style={{padding:'5px', width:'100%'}}>
                                            <option value="">-- None --</option>
                                            {deployments.filter(d => parseInt(d.organization_unit) === parseInt(newPlan.organization_unit)).map(d => (
                                                <option key={d.id} value={d.id}>{d.designation_name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td><input type="number" placeholder="Req." value={newPlan.required_count} onChange={(e) => setNewPlan({...newPlan, required_count: e.target.value})} style={{width:'60px'}}/></td>
                                    <td>-</td>
                                    <td><button className="btn btn-primary" onClick={handleAddPlan}>Add Plan</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
                
                {activeTab === 'units' && (
                    <div>
                        <h2>Organization Units</h2>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Parent Unit</th>
                                    <th>Display Order</th>
                                    <th>Show Counts</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map(unit => {
                                    const parent = units.find(u => u.id === unit.parent);
                                    if (editUnitId === unit.id) {
                                        return (
                                            <tr key={unit.id}>
                                                <td>{unit.id}</td>
                                                <td><input value={editUnitForm.name} onChange={e=>setEditUnitForm({...editUnitForm, name: e.target.value})} /></td>
                                                <td>
                                                    <select value={editUnitForm.parent || ''} onChange={e=>setEditUnitForm({...editUnitForm, parent: e.target.value})}>
                                                        <option value="">-- None (Root) --</option>
                                                        {units.filter(u=>u.id !== unit.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                </td>
                                                <td><input type="number" style={{width:'60px'}} value={editUnitForm.display_order} onChange={e=>setEditUnitForm({...editUnitForm, display_order: e.target.value})} /></td>
                                                <td><input type="checkbox" checked={editUnitForm.show_counts} onChange={e=>setEditUnitForm({...editUnitForm, show_counts: e.target.checked})} /></td>
                                                <td>
                                                    <div style={{display:'flex', gap:'5px'}}>
                                                        <button className="btn btn-primary" onClick={() => handleUpdateUnit(unit.id)}>Save</button>
                                                        <button className="btn btn-secondary" onClick={() => setEditUnitId(null)}>Cancel</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }
                                    return (
                                        <tr key={unit.id}>
                                            <td>{unit.id}</td>
                                            <td>{unit.name}</td>
                                            <td>{parent ? parent.name : 'None (Root)'}</td>
                                            <td>{unit.display_order}</td>
                                            <td>
                                                <input 
                                                    type="checkbox" 
                                                    checked={unit.show_counts} 
                                                    onChange={async (e) => {
                                                        try {
                                                            await api.updateOrgUnit(unit.id, { ...unit, parent: unit.parent || null, show_counts: e.target.checked });
                                                            loadData();
                                                        } catch (err) {
                                                            alert("Failed to update");
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <div style={{display:'flex', gap:'5px'}}>
                                                    <button className="btn btn-secondary" onClick={() => { setEditUnitId(unit.id); setEditUnitForm(unit); }}>Edit</button>
                                                    <button className="btn btn-danger" onClick={() => handleDeleteUnit(unit.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Add Row */}
                                <tr>
                                    <td>New</td>
                                    <td><input placeholder="Unit Name" value={newUnit.name} onChange={e=>setNewUnit({...newUnit, name: e.target.value})} /></td>
                                    <td>
                                        <select value={newUnit.parent} onChange={e=>setNewUnit({...newUnit, parent: e.target.value})}>
                                            <option value="">-- None (Root) --</option>
                                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </td>
                                    <td><input type="number" style={{width:'60px'}} placeholder="Order" value={newUnit.display_order} onChange={e=>setNewUnit({...newUnit, display_order: e.target.value})} /></td>
                                    <td><input type="checkbox" checked={newUnit.show_counts} onChange={e=>setNewUnit({...newUnit, show_counts: e.target.checked})} /></td>
                                    <td><button className="btn btn-primary" onClick={handleAddUnit}>Add Unit</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'designations' && (
                    <div>
                        <h2>Designations</h2>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Department Type</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {designations.map(desig => {
                                    if (editDesigId === desig.id) {
                                        return (
                                            <tr key={desig.id}>
                                                <td>{desig.id}</td>
                                                <td><input value={editDesigForm.name} onChange={e=>setEditDesigForm({...editDesigForm, name: e.target.value})} /></td>
                                                <td><input value={editDesigForm.department_type} onChange={e=>setEditDesigForm({...editDesigForm, department_type: e.target.value})} /></td>
                                                <td>
                                                    <div style={{display:'flex', gap:'5px'}}>
                                                        <button className="btn btn-primary" onClick={() => handleUpdateDesignation(desig.id)}>Save</button>
                                                        <button className="btn btn-secondary" onClick={() => setEditDesigId(null)}>Cancel</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }
                                    return (
                                        <tr key={desig.id}>
                                            <td>{desig.id}</td>
                                            <td>{desig.name}</td>
                                            <td>{desig.department_type}</td>
                                            <td>
                                                <div style={{display:'flex', gap:'5px'}}>
                                                    <button className="btn btn-secondary" onClick={() => { setEditDesigId(desig.id); setEditDesigForm(desig); }}>Edit</button>
                                                    <button className="btn btn-danger" onClick={() => handleDeleteDesignation(desig.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Add Row */}
                                <tr>
                                    <td>New</td>
                                    <td><input placeholder="Designation Name" value={newDesignation.name} onChange={e=>setNewDesignation({...newDesignation, name: e.target.value})} /></td>
                                    <td><input placeholder="Department Type" value={newDesignation.department_type} onChange={e=>setNewDesignation({...newDesignation, department_type: e.target.value})} /></td>
                                    <td><button className="btn btn-primary" onClick={handleAddDesignation}>Add Designation</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizationAdmin;
