const BASE_URL = '/food_tracker/api';

// Helper that automatically attaches the auth token to every request
const authFetch = (url, options = {}) => {
    const token = localStorage.getItem('ft_token');
    const headers = {
        ...(options.headers || {}),
        ...(token ? { 'Authorization': `Token ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
};

const jsonFetch = (url, options = {}) => {
    return authFetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    }).then(async res => {
        if (!res.ok) {
            const err = await res.json().catch(() => ({ 
                error: `Server Error (${res.status})`, 
                detail: "The server encountered an unexpected error. Please check the logs." 
            }));
            throw err;
        }
        if (res.status === 204) return null;
        return res.json();
    });
};

const api = {
    // Categories
    getCategories: () => jsonFetch(`${BASE_URL}/categories/`),
    createCategory: (data) => jsonFetch(`${BASE_URL}/categories/`, { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id, data) => jsonFetch(`${BASE_URL}/categories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id) => authFetch(`${BASE_URL}/categories/${id}/`, { method: 'DELETE' }),

    // Items
    getItems: (page = 1, pageSize = 20, category = '', search = '', asOfDate = '') => {
        let url = `${BASE_URL}/items/?page=${page}&page_size=${pageSize}`;
        if (category) url += `&category=${category}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (asOfDate) url += `&as_of_date=${asOfDate}`;
        return jsonFetch(url);
    },
    getItem: (id) => jsonFetch(`${BASE_URL}/items/${id}/`),
    checkItemAvailability: (id, targetDate) => jsonFetch(`${BASE_URL}/items/${id}/check_availability/?target_date=${targetDate}`),
    createItem: (data) => jsonFetch(`${BASE_URL}/items/`, { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (id, data) => jsonFetch(`${BASE_URL}/items/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteItem: (id) => authFetch(`${BASE_URL}/items/${id}/`, { method: 'DELETE' }),
    bulkDeleteItems: (ids) => jsonFetch(`${BASE_URL}/items/bulk_delete/`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
    }),
    exportItems: () => {
        const url = `${BASE_URL}/items/export_excel/`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    importItems: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return authFetch(`${BASE_URL}/items/import_excel/`, {
            method: 'POST',
            body: formData,
        }).then(async res => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Import failed" }));
                throw err;
            }
            return res.json();
        });
    },

    // Vendors
    getVendors: () => jsonFetch(`${BASE_URL}/vendors/`),
    createVendor: (data) => jsonFetch(`${BASE_URL}/vendors/`, { method: 'POST', body: JSON.stringify(data) }),
    updateVendor: (id, data) => jsonFetch(`${BASE_URL}/vendors/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteVendor: (id) => authFetch(`${BASE_URL}/vendors/${id}/`, { method: 'DELETE' }),
    exportVendors: () => {
        const url = `${BASE_URL}/vendors/export_excel/`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getVendorDocuments: (id) => jsonFetch(`${BASE_URL}/vendors/${id}/documents/`),
    uploadVendorDocument: (id, formData) => authFetch(`${BASE_URL}/vendors/${id}/upload_document/`, {
        method: 'POST',
        body: formData,
    }).then(async res => {
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Upload failed" }));
            throw err;
        }
        return res.json();
    }),
    deleteVendorDocument: (vendorId, docId) => authFetch(`${BASE_URL}/vendors/${vendorId}/delete_document/${docId}/`, {
        method: 'DELETE'
    }),

    // Vendor Categories
    getVendorCategories: () => jsonFetch(`${BASE_URL}/vendor-categories/`),
    createVendorCategory: (data) => jsonFetch(`${BASE_URL}/vendor-categories/`, { method: 'POST', body: JSON.stringify(data) }),
    updateVendorCategory: (id, data) => jsonFetch(`${BASE_URL}/vendor-categories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteVendorCategory: (id) => authFetch(`${BASE_URL}/vendor-categories/${id}/`, { method: 'DELETE' }),

    // Tax Rates
    getTaxRates: () => jsonFetch(`${BASE_URL}/tax-rates/`),
    createTaxRate: (data) => jsonFetch(`${BASE_URL}/tax-rates/`, { method: 'POST', body: JSON.stringify(data) }),
    exportTaxRates: () => {
        const url = `${BASE_URL}/tax-rates/export_excel/`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },

    // Purchase Requests
    getPurchaseRequests: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/purchase-requests/${query ? `?${query}` : ''}`);
    },
    getItemPriceTrend: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/pr-items/price_trend/${query ? `?${query}` : ''}`);
    },
    getNextPRNumber: (orderDate) => jsonFetch(`${BASE_URL}/purchase-requests/next_pr_number/?order_date=${orderDate}`),
    getPurchaseRequest: (id) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/`),
    createPurchaseRequest: (data) => jsonFetch(`${BASE_URL}/purchase-requests/`, { method: 'POST', body: JSON.stringify(data) }),
    updatePurchaseRequest: (id, data) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePurchaseRequest: (id) => authFetch(`${BASE_URL}/purchase-requests/${id}/`, { method: 'DELETE' }),
    receivePurchaseRequest: (id, data) => {
        if (data instanceof FormData) {
            return authFetch(`${BASE_URL}/purchase-requests/${id}/receive/`, { method: 'POST', body: data }).then(async res => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw err;
                }
                return res.json();
            });
        }
        return jsonFetch(`${BASE_URL}/purchase-requests/${id}/receive/`, { method: 'POST', body: JSON.stringify(data) });
    },
    revertPRStatus: (id) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/revert_status/`, { method: 'POST' }),
    submitPRForApproval: (id) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/submit_for_approval/`, { method: 'POST' }),
    approvePRL1: (id) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/approve_l1/`, { method: 'POST' }),
    approvePRL2: (id) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/approve_l2/`, { method: 'POST' }),
    rejectPRApproval: (id) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/reject_approval/`, { method: 'POST' }),
    shortClosePurchaseRequest: (id) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/short_close/`, { method: 'POST' }),
    exportPurchaseRequests: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/purchase-requests/export_excel/${query ? `?${query}` : ''}`;
        const token = localStorage.getItem('ft_token');
        
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getPRBulkTemplate: () => {
        const url = `${BASE_URL}/purchase-requests/download_bulk_template/`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Template download failed');
            return res.blob();
        });
    },
    parsePRBulkExcel: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return authFetch(`${BASE_URL}/purchase-requests/parse_bulk_excel/`, {
            method: 'POST',
            body: formData,
        }).then(async res => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Parsing failed" }));
                throw err;
            }
            return res.json();
        });
    },
    exportPurchaseTracker: (month, year, category, purchase_type) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (category) params.append('category', category);
        if (purchase_type) params.append('purchase_type', purchase_type);
        const qs = params.toString();
        const url = `${BASE_URL}/procurement/export_tracker_excel/${qs ? `?${qs}` : ''}`;
        const token = localStorage.getItem('ft_token');

        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },

    // Reports
    getPurchasedReport: (month, year, category, vendor, item, page, page_size, day, purchase_type, event_name) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (day) params.append('day', day);
        if (category) params.append('category', category);
        if (vendor) params.append('vendor', vendor);
        if (item) params.append('item', item);
        if (page) params.append('page', page);
        if (page_size) params.append('page_size', page_size);
        if (purchase_type) params.append('purchase_type', purchase_type);
        if (event_name) params.append('event_name', event_name);
        const qs = params.toString();
        return jsonFetch(`${BASE_URL}/procurement/${qs ? `?${qs}` : ''}`);
    },
    exportPurchasedReport: (month, year, category, vendor, item, purchase_type, event_name) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (category) params.append('category', category);
        if (vendor) params.append('vendor', vendor);
        if (item) params.append('item', item);
        if (purchase_type) params.append('purchase_type', purchase_type);
        if (event_name) params.append('event_name', event_name);
        const qs = params.toString();
        const url = `${BASE_URL}/procurement/export_excel/${qs ? `?${qs}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getVendorReturnReport: (params) => {
        const qs = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/vendor-returns/item_report/${qs ? `?${qs}` : ''}`);
    },
    exportVendorReturnReportExcel: (params) => {
        const qs = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/vendor-returns/export_item_report/${qs ? `?${qs}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getMonthWiseSummary: (months, categories, purchase_type) => {
        const params = new URLSearchParams();
        if (months) params.append('months', months);
        if (categories && categories.length > 0) categories.forEach(id => params.append('categories[]', id));
        if (purchase_type) params.append('purchase_type', purchase_type);
        const qs = params.toString();
        return jsonFetch(`${BASE_URL}/procurement/month_wise_summary/${qs ? `?${qs}` : ''}`);
    },
    exportMonthWiseSummary: (months, categories, purchase_type) => {
        const params = new URLSearchParams();
        if (months) params.append('months', months);
        if (categories && categories.length > 0) categories.forEach(id => params.append('categories[]', id));
        if (purchase_type) params.append('purchase_type', purchase_type);
        const qs = params.toString();
        const url = `${BASE_URL}/procurement/export_month_wise_summary_excel/${qs ? `?${qs}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getCustomMonthlySummary: (month, year, months_count, purchase_type) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (months_count) params.append('months_count', months_count);
        if (purchase_type) params.append('purchase_type', purchase_type);
        const qs = params.toString();
        return jsonFetch(`${BASE_URL}/procurement/custom_monthly_summary/${qs ? `?${qs}` : ''}`);
    },
    getTopPurchasedItems: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/procurement/top_purchased_items/${query ? `?${query}` : ''}`);
    },
    getVendorSpendAnalysis: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/procurement/vendor_spend_analysis/${query ? `?${query}` : ''}`);
    },
    exportCustomSummaryExcel: (month, year, months_count, purchase_type) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (months_count) params.append('months_count', months_count);
        if (purchase_type) params.append('purchase_type', purchase_type);
        const qs = params.toString();
        const url = `${BASE_URL}/procurement/export_custom_summary_excel/${qs ? `?${qs}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },

    // Company Profile
    getCompanyProfile: () => jsonFetch(`${BASE_URL}/company-profile/`),
    createCompanyProfile: (data) => jsonFetch(`${BASE_URL}/company-profile/`, { method: 'POST', body: JSON.stringify(data) }),
    updateCompanyProfile: (id, data) => jsonFetch(`${BASE_URL}/company-profile/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

    // Shipping Locations
    getShippingLocations: () => jsonFetch(`${BASE_URL}/shipping-locations/`),
    createShippingLocation: (data) => jsonFetch(`${BASE_URL}/shipping-locations/`, { method: 'POST', body: JSON.stringify(data) }),
    updateShippingLocation: (id, data) => jsonFetch(`${BASE_URL}/shipping-locations/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteShippingLocation: (id) => authFetch(`${BASE_URL}/shipping-locations/${id}/`, { method: 'DELETE' }),

    // Custom Summary Config
    getCustomSummaryConfigs: () => jsonFetch(`${BASE_URL}/custom-summary-config/`),
    createCustomSummaryConfig: (data) => jsonFetch(`${BASE_URL}/custom-summary-config/`, { method: 'POST', body: JSON.stringify(data) }),
    updateCustomSummaryConfig: (id, data) => jsonFetch(`${BASE_URL}/custom-summary-config/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCustomSummaryConfig: (id) => authFetch(`${BASE_URL}/custom-summary-config/${id}/`, { method: 'DELETE' }),

    // Bill Upload / Delete
    uploadPRBill: (id, file) => {
        const formData = new FormData();
        formData.append('bill_image', file);
        return authFetch(`${BASE_URL}/purchase-requests/${id}/`, {
            method: 'PATCH',
            body: formData,
        }).then(async res => {
            if (!res.ok) throw await res.json();
            return res.json();
        });
    },
    deletePRBill: (id) => jsonFetch(`${BASE_URL}/purchase-requests/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ bill_image: null }),
    }),
    deleteReceiptFile: (fileId) => authFetch(`${BASE_URL}/receipt-files/${fileId}/`, { method: 'DELETE' }),
    uploadReceiptFiles: (receiptId, formData) => authFetch(`${BASE_URL}/receipts/${receiptId}/upload_files/`, {
        method: 'POST',
        body: formData,
    }).then(async res => {
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Upload failed" }));
            throw err;
        }
        return res.json();
    }),

    // Departments
    getDepartments: () => jsonFetch(`${BASE_URL}/departments/`),
    
    // User Management Extensions
    setUserDepartments: (userId, departmentIds) => jsonFetch(`${BASE_URL}/users/${userId}/set_departments/`, {
        method: 'POST',
        body: JSON.stringify({ department_ids: departmentIds }),
    }),
    
    createUser: (data) => jsonFetch(`${BASE_URL}/users/create_user/`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
    }),

    // Material Requests (Kitchen)
    getMaterialRequests: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/material-requests/${query ? `?${query}` : ''}`);
    },
    exportMaterialRequestsExcel: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/material-requests/export_excel/${query ? `?${query}` : ''}`;
        return authFetch(url).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getMaterialRequestsByUrl: (url) => jsonFetch(url),
    getNextMRNumber: (orderDate) => jsonFetch(`${BASE_URL}/material-requests/next_mr_number/?order_date=${orderDate}`),
    getMaterialRequest: (id) => jsonFetch(`${BASE_URL}/material-requests/${id}/`),
    createMaterialRequest: (data) => jsonFetch(`${BASE_URL}/material-requests/`, { method: 'POST', body: JSON.stringify(data) }),
    updateMaterialRequest: (id, data) => jsonFetch(`${BASE_URL}/material-requests/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteMaterialRequest: (id) => authFetch(`${BASE_URL}/material-requests/${id}/`, { method: 'DELETE' }),
    getMRBulkTemplate: () => {
        const url = `${BASE_URL}/material-requests/download_bulk_template/`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Template download failed');
            return res.blob();
        });
    },
    parseMRBulkExcel: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return authFetch(`${BASE_URL}/material-requests/parse_bulk_excel/`, {
            method: 'POST',
            body: formData,
        }).then(async res => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Parsing failed" }));
                throw err;
            }
            return res.json();
        });
    },
    placeMaterialRequest: (id) => jsonFetch(`${BASE_URL}/material-requests/${id}/place/`, { method: 'POST' }),
    acknowledgeMaterialRequest: (id) => jsonFetch(`${BASE_URL}/material-requests/${id}/acknowledge/`, { method: 'POST' }),
    acceptMaterialRequest: (id, batchAllocations = []) => jsonFetch(`${BASE_URL}/material-requests/${id}/accept/`, {
        method: 'POST',
        body: JSON.stringify({ batch_allocations: batchAllocations }),
    }),
    kitchenAcceptMaterialRequest: (id) => jsonFetch(`${BASE_URL}/material-requests/${id}/kitchen_accept/`, { method: 'POST' }),
    rejectMaterialRequest: (id) => jsonFetch(`${BASE_URL}/material-requests/${id}/reject/`, { method: 'POST' }),
    undoMaterialRequest: (id) => jsonFetch(`${BASE_URL}/material-requests/${id}/undo_action/`, { method: 'POST' }),
    verifyMaterialRequest: (id, data) => jsonFetch(`${BASE_URL}/material-requests/${id}/verify/`, { method: 'POST', body: JSON.stringify(data) }),
    reconcileMaterialRequest: (id, data) => jsonFetch(`${BASE_URL}/material-requests/${id}/reconcile/`, { method: 'POST', body: JSON.stringify(data) }),
    updateMRHeadcount: (id, data) => jsonFetch(`${BASE_URL}/material-requests/${id}/update_headcount/`, { method: 'POST', body: JSON.stringify(data) }),
    confirmReconcileMaterialRequest: (id) => jsonFetch(`${BASE_URL}/material-requests/${id}/confirm_reconcile/`, { method: 'POST' }),

    // Stock Batches (FIFO)
    getStockBatches: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/stock-batches/${query ? `?${query}` : ''}`);
    },
    getItemLedger: (itemId, params = {}) => {
        const query = new URLSearchParams({ item: itemId, ...params }).toString();
        return jsonFetch(`${BASE_URL}/stock-batches/item-ledger/?${query}`);
    },
    exportItemLedger: (itemId) => {
        const url = `${BASE_URL}/stock-batches/export-excel/?item=${itemId}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getDeviationReport: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/purchase-requests/deviation_report/${query ? `?${query}` : ''}`);
    },
    getKitchenConsumptions: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/material-requests/consumptions/${query ? `?${query}` : ''}`);
    },
    exportKitchenConsumptionsExcel: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/material-requests/export_consumptions_excel/${query ? `?${query}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getMonthlyKitchenConsumptions: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/material-requests/monthly_consumptions/${query ? `?${query}` : ''}`);
    },
    exportMonthlyKitchenConsumptionsExcel: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/material-requests/export_monthly_consumptions_excel/${query ? `?${query}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },

    // Stock Movements
    getStockMovements: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/stock-movements/${query ? `?${query}` : ''}`);
    },
    exportStockMovementsExcel: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/stock-movements/export_excel/${query ? `?${query}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },

    // Inventory
    getInventory: (params) => jsonFetch(`${BASE_URL}/inventory/${params ? `?${new URLSearchParams(params).toString()}` : ''}`),
    exportInventoryExcel: (params) => {
        const query = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/inventory/export_excel/${query ? `?${query}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getStockBalanceReport: (asOfDate) => {
        const url = asOfDate 
            ? `${BASE_URL}/inventory/stock_balance_report/?as_of_date=${asOfDate}`
            : `${BASE_URL}/inventory/stock_balance_report/`;
        return jsonFetch(url);
    },
    exportStockBalanceReportExcel: (asOfDate) => {
        const url = asOfDate 
            ? `${BASE_URL}/inventory/export_balance_report_excel/?as_of_date=${asOfDate}`
            : `${BASE_URL}/inventory/export_balance_report_excel/`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    adjustStock: (data) => jsonFetch(`${BASE_URL}/inventory/adjust_stock/`, { method: 'POST', body: JSON.stringify(data) }),
    getWastageAnalytics: () => jsonFetch(`${BASE_URL}/inventory/wastage_analytics/`),
    checkDiscrepancies: () => jsonFetch(`${BASE_URL}/inventory/check_discrepancies/`),
    fixDiscrepancy: (item_id) => jsonFetch(`${BASE_URL}/inventory/fix_discrepancy/`, { method: 'POST', body: JSON.stringify({ item_id }) }),

    // Opex Entries
    getOpexEntries: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/opex-entries/${query ? `?${query}` : ''}`);
    },
    getOpexEntry: (id) => jsonFetch(`${BASE_URL}/opex-entries/${id}/`),
    createOpexEntry: (data) => {
        if (data instanceof FormData) {
            return authFetch(`${BASE_URL}/opex-entries/`, { method: 'POST', body: data }).then(async res => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw err;
                }
                return res.json();
            });
        }
        return jsonFetch(`${BASE_URL}/opex-entries/`, { method: 'POST', body: JSON.stringify(data) });
    },
    updateOpexEntry: (id, data) => {
        if (data instanceof FormData) {
            return authFetch(`${BASE_URL}/opex-entries/${id}/`, { method: 'PATCH', body: data }).then(async res => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw err;
                }
                return res.json();
            });
        }
        return jsonFetch(`${BASE_URL}/opex-entries/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    deleteOpexEntry: (id) => authFetch(`${BASE_URL}/opex-entries/${id}/`, { method: 'DELETE' }),
    getSettlablePRs: (vendorId, includeOpexId = null) => {
        let query = vendorId ? `?vendor=${vendorId}` : '';
        if (includeOpexId) {
            query += (query ? '&' : '?') + `include_opex_id=${includeOpexId}`;
        }
        return jsonFetch(`${BASE_URL}/purchase-requests/settlable/${query}`);
    },
    exportOpexEntries: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/opex-entries/export_excel/${query ? `?${query}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    getOpexReport: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/opex-entries/opex_report/${query ? `?${query}` : ''}`);
    },
    exportOpexReportExcel: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = `${BASE_URL}/opex-entries/export_opex_report_excel/${query ? `?${query}` : ''}`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    toggleOpexLock: (id) => jsonFetch(`${BASE_URL}/opex-entries/${id}/toggle_lock/`, { method: 'POST' }),
    
    // Vendor Returns
    getVendorReturns: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return jsonFetch(`${BASE_URL}/vendor-returns/${query ? `?${query}` : ''}`);
    },
    createVendorReturn: (data) => jsonFetch(`${BASE_URL}/vendor-returns/`, { method: 'POST', body: JSON.stringify(data) }),
    exportVendorReturnsExcel: () => {
        const url = `${BASE_URL}/vendor-returns/export_excel/`;
        const token = localStorage.getItem('ft_token');
        return fetch(url, {
            headers: {
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
            }
        }).then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        });
    },
    deleteVendorReturn: (id) => authFetch(`${BASE_URL}/vendor-returns/${id}/`, { method: 'DELETE' }),
    
    // Organization & HR
    getOrganizationTree: () => jsonFetch(`${BASE_URL}/organization-units/tree/`),
    
    // Organization Admin CRUD
    getOrgUnitsCRUD: () => jsonFetch(`${BASE_URL}/org-units-crud/`),
    createOrgUnit: (data) => jsonFetch(`${BASE_URL}/org-units-crud/`, { method: 'POST', body: JSON.stringify(data) }),
    updateOrgUnit: (id, data) => jsonFetch(`${BASE_URL}/org-units-crud/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteOrgUnit: (id) => authFetch(`${BASE_URL}/org-units-crud/${id}/`, { method: 'DELETE' }),

    getDesignations: () => jsonFetch(`${BASE_URL}/designations/`),
    createDesignation: (data) => jsonFetch(`${BASE_URL}/designations/`, { method: 'POST', body: JSON.stringify(data) }),
    updateDesignation: (id, data) => jsonFetch(`${BASE_URL}/designations/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDesignation: (id) => authFetch(`${BASE_URL}/designations/${id}/`, { method: 'DELETE' }),

    getDeploymentPlans: () => jsonFetch(`${BASE_URL}/deployment-plans/`),
    createDeploymentPlan: (data) => jsonFetch(`${BASE_URL}/deployment-plans/`, { method: 'POST', body: JSON.stringify(data) }),
    updateDeploymentPlan: (id, data) => jsonFetch(`${BASE_URL}/deployment-plans/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDeploymentPlan: (id) => authFetch(`${BASE_URL}/deployment-plans/${id}/`, { method: 'DELETE' }),

    getDeploymentStatuses: () => jsonFetch(`${BASE_URL}/deployment-statuses/`),
    createDeploymentStatus: (data) => jsonFetch(`${BASE_URL}/deployment-statuses/`, { method: 'POST', body: JSON.stringify(data) }),
    updateDeploymentStatus: (id, data) => jsonFetch(`${BASE_URL}/deployment-statuses/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

};

export default api;
