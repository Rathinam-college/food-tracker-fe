import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/* ─────────────────────────────────────────────────
   Helper utilities
───────────────────────────────────────────────── */
const fmt = (n, digits = 2) =>
  parseFloat(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const deviationColor = (amount) => {
  if (parseFloat(amount) > 0) return 'var(--status-error-text-vibrant)';
  if (parseFloat(amount) < 0) return 'var(--status-success-text-vibrant)';
  return 'var(--text-muted)';
};

const deviationBg = (amount) => {
  if (parseFloat(amount) > 0) return 'var(--status-error-bg)';
  if (parseFloat(amount) < 0) return 'var(--status-success-bg)';
  return 'var(--bg-glass)';
};

const deviationLabel = (amount) => {
  const v = parseFloat(amount);
  if (v > 0) return '▲ Over';
  if (v < 0) return '▼ Under';
  return '✓ Match';
};

/* ─────────────────────────────────────────────────
   Component
───────────────────────────────────────────────── */
const PRDeviationReport = () => {
  // Data
  const [reportData, setReportData] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  // Filters
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const [filters, setFilters] = useState({
    start_date: firstOfMonth,
    end_date: today,
    vendor: '',
    pr_reference: '',
    opex_no: '',
    deviation_type: 'ALL',
    page: 1,
    page_size: '20',
  });

  /* ── Load vendors for dropdown ── */
  useEffect(() => {
    api.getVendors().then((res) => {
      const list = Array.isArray(res) ? res : (res.results || []);
      setVendors(list);
    }).catch(() => {});
  }, []);

  /* ── Fetch report ── */
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setExpandedRows({});
    try {
      const params = {};
      if (filters.start_date)    params.start_date = filters.start_date;
      if (filters.end_date)      params.end_date = filters.end_date;
      if (filters.vendor)        params.vendor = filters.vendor;
      if (filters.pr_reference)  params.pr_reference = filters.pr_reference;
      if (filters.opex_no)       params.opex_no = filters.opex_no;
      if (filters.deviation_type && filters.deviation_type !== 'ALL')
        params.deviation_type = filters.deviation_type;
      params.page = filters.page;
      params.page_size = filters.page_size;

      const data = await api.getDeviationReport(params);
      setReportData(data);
    } catch (err) {
      console.error('Deviation report error:', err);
      alert('Failed to load report: ' + (err.error || err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /* ── Toggle expanded row ── */
  const toggleRow = (prRef) =>
    setExpandedRows((prev) => ({ ...prev, [prRef]: !prev[prRef] }));

  /* ── Auto-refresh on pagination change ── */
  useEffect(() => {
    if (reportData) {
      fetchReport();
    }
  }, [filters.page, filters.page_size, fetchReport]);

  /* ── Summary metrics ── */
  const summary = reportData?.summary || {};
  const results = reportData?.results || [];
  const pagination = reportData?.pagination || { count: 0, page: 1, total_pages: 1, has_next: false, has_previous: false };

  /* ── Deviation type badge icons ── */
  const devTypeOptions = [
    { value: 'ALL', label: '🔍 All PRs' },
    { value: 'OVER', label: '🔴 Over-charged' },
    { value: 'UNDER', label: '🟢 Under-charged' },
    { value: 'NONE', label: '✅ Exact Match' },
  ];

  return (
    <div className="main-container animate-fade-in">
      {/* ── PAGE HEADER ── */}
      <header className="welcome-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2.5rem' }}>📉</span>
              Price Deviation Report
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
              Compare approved PR prices vs actual received prices — spot over- or under-charges per vendor.
            </p>
          </div>
        </div>
      </header>

      {/* ── SUMMARY CARDS ── */}
      {reportData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'PRs Analysed', value: summary.total_prs, icon: '📋', color: 'var(--color-secondary)' },
            { label: 'PRs with Deviation', value: summary.prs_with_deviation, icon: '⚠️', color: '#f1c40f' },
            {
              label: 'Total Over-charged',
              value: `₹${fmt(summary.total_overcharge)}`,
              icon: '🔴',
              color: 'var(--status-error-text-vibrant)',
            },
            {
              label: 'Total Under-charged',
              value: `₹${fmt(summary.total_undercharge)}`,
              icon: '🟢',
              color: 'var(--status-success-text-vibrant)',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="glass"
              style={{ padding: '1.3rem', borderRadius: '14px', borderLeft: `4px solid ${card.color}` }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{card.icon}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '0.4rem' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Start date */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              From Date
            </label>
            <input
              id="dev-start-date"
              type="date"
              className="form-input"
              value={filters.start_date}
              onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          {/* End date */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              To Date
            </label>
            <input
              id="dev-end-date"
              type="date"
              className="form-input"
              value={filters.end_date}
              onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Vendor */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              Vendor
            </label>
            <select
              id="dev-vendor"
              className="form-input"
              value={filters.vendor}
              onChange={(e) => setFilters((f) => ({ ...f, vendor: e.target.value }))}
              style={{ width: '100%' }}
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* PR Reference */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              PR Reference
            </label>
            <input
              id="dev-pr-ref"
              type="text"
              className="form-input"
              placeholder="e.g. PR-0042"
              value={filters.pr_reference}
              onChange={(e) => setFilters((f) => ({ ...f, pr_reference: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          {/* OPEX No. */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              OPEX No.
            </label>
            <input
              id="dev-opex-no"
              type="text"
              className="form-input"
              placeholder="e.g. OPX-0012"
              value={filters.opex_no}
              onChange={(e) => setFilters((f) => ({ ...f, opex_no: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Deviation type */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              Deviation Type
            </label>
            <select
              id="dev-type"
              className="form-input"
              value={filters.deviation_type}
              onChange={(e) => setFilters((f) => ({ ...f, deviation_type: e.target.value }))}
              style={{ width: '100%' }}
            >
              {devTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Search button */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.72rem', opacity: 0 }}>-</label>
            <button
              id="dev-search-btn"
              className="action-btn"
              onClick={fetchReport}
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem 1rem' }}
            >
              {loading ? '⏳ Loading...' : '🔍 Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* ── PAGINATION CONTROLS ── */}
      {reportData && results.length > 0 && (
        <div className="glass" style={{ padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Show</span>
              <select 
                className="form-input" 
                value={filters.page_size} 
                onChange={(e) => setFilters(f => ({ ...f, page_size: e.target.value, page: 1 }))}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="all">All</option>
              </select>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing <strong>{results.length}</strong> of <strong>{pagination.count}</strong> PRs
            </div>
          </div>

          {filters.page_size !== 'all' && pagination.total_pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <button 
                className="action-btn-secondary" 
                disabled={!pagination.has_previous}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                ◀ Previous
              </button>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Page {pagination.page} of {pagination.total_pages}
              </div>
              <button 
                className="action-btn-secondary" 
                disabled={!pagination.has_next}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Next ▶
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS TABLE ── */}
      {loading ? (
        <div className="glass" style={{ padding: '4rem', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ color: 'var(--text-muted)' }}>Calculating deviations...</p>
        </div>
      ) : !reportData ? (
        <div className="glass" style={{ padding: '4rem', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>📉</div>
          <p style={{ color: 'var(--text-muted)' }}>Set your filters above and click <strong>Generate Report</strong>.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="glass" style={{ padding: '4rem', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>📭</div>
          <p style={{ color: 'var(--text-muted)' }}>No received PRs found matching your filters.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Only PRs with status COMPLETED are included in this report.</p>
        </div>
      ) : (
        <div className="glass" style={{ padding: '2rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              📋 {filters.page_size === 'all' ? results.length : pagination.count} Purchase Request{ (filters.page_size === 'all' ? results.length : pagination.count) !== 1 ? 's' : ''}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                (click any row to see item breakdown)
              </span>
            </h2>
          </div>

          {/* PR-level rows */}
          {results.map((pr) => {
            const isExpanded = expandedRows[pr.pr_reference];
            const devAmt = parseFloat(pr.deviation_amount);
            const devPct = parseFloat(pr.deviation_pct);

            return (
              <div
                key={pr.pr_reference}
                className="glass"
                style={{
                  marginBottom: '1rem',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  borderLeft: `4px solid ${deviationColor(devAmt)}`,
                  transition: 'box-shadow 0.2s',
                }}
              >
                {/* PR header row — clickable */}
                <div
                  id={`pr-row-${pr.pr_reference}`}
                  onClick={() => toggleRow(pr.pr_reference)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.2fr 1.2fr 1.2fr 1.4fr auto',
                    gap: '0.8rem',
                    padding: '1rem 1.2rem',
                    cursor: 'pointer',
                    alignItems: 'center',
                    background: isExpanded ? 'var(--bg-glass)' : 'transparent',
                    transition: 'background 0.2s',
                    overflowX: 'hidden'
                  }}
                >
                  {/* PR Ref */}
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                      {pr.pr_reference}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      📅 {pr.order_date}
                    </div>
                  </div>

                  {/* Vendor */}
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    🏪 {pr.vendor}
                    {pr.receipt_date && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Received: {pr.receipt_date}
                      </div>
                    )}
                  </div>

                  {/* Approved total */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Approved</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{fmt(pr.approved_total)}</div>
                  </div>

                  {/* Received total */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Received</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{fmt(pr.received_total)}</div>
                  </div>

                  {/* Deviation ₹ */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Deviation (₹)</div>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: deviationColor(devAmt),
                    }}>
                      {devAmt > 0 ? '+' : ''}{fmt(devAmt)}
                    </div>
                  </div>

                  {/* Deviation % */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Deviation %</div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.7rem',
                      borderRadius: '50px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      background: deviationBg(devAmt),
                      color: deviationColor(devAmt),
                    }}>
                      {deviationLabel(devAmt)} {devPct !== 0 ? `${Math.abs(devPct).toFixed(2)}%` : ''}
                    </span>
                  </div>

                  {/* OPEX */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>OPEX</div>
                    {pr.opex_no ? (
                      <>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary)', fontWeight: 700 }}>{pr.opex_no}</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>₹{fmt(pr.opex_value)}</div>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>

                  {/* Items count */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Items</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{pr.items.length}</div>
                  </div>

                  {/* Expand icon */}
                  <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', paddingLeft: '0.5rem' }}>
                    {isExpanded ? '▾' : '▸'}
                  </div>
                </div>

                {/* ── EXPANDED ITEM BREAKDOWN ── */}
                {isExpanded && (
                  <div style={{ padding: '0 1.2rem 1.2rem' }}>
                    <div style={{ borderRadius: '10px', overflowX: 'auto', border: '1px solid var(--border-glass)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', tableLayout: 'fixed' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '0.7rem 0.8rem', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px', minWidth: '200px' }}>Item</th>
                            {['Unit', 'Ordered Qty', 'Approved Price', 'Approved Total', 'Received Qty', 'Received Price', 'Received Total', 'Δ/Unit', 'Deviation (₹)', 'Deviation %'].map((h) => (
                              <th key={h} style={{ padding: '0.7rem 0.8rem', textAlign: 'right', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pr.items.map((item, i) => {
                            const itemDev = parseFloat(item.deviation_amount);
                            return (
                              <tr
                                key={i}
                                style={{
                                  borderTop: '1px solid var(--border-glass)',
                                  background: i % 2 === 0 ? 'transparent' : 'var(--bg-glass)',
                                }}
                              >
                                <td style={{ 
                                  padding: '0.7rem 0.8rem', 
                                  fontWeight: 700, 
                                  textAlign: 'left', 
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                  minWidth: '200px',
                                  maxWidth: '250px'
                                }}>
                                  {item.item_name}
                                </td>
                                <td style={{ padding: '0.7rem 0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                  {item.unit}
                                </td>
                                <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right' }}>
                                  {fmt(item.ordered_qty, 3)}
                                </td>
                                <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right' }}>
                                  ₹{fmt(item.approved_unit_price)}
                                </td>
                                <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right', fontWeight: 600 }}>
                                  ₹{fmt(item.approved_line_total)}
                                </td>
                                <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right' }}>
                                  {fmt(item.received_qty, 3)}
                                </td>
                                <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right' }}>
                                  ₹{fmt(item.received_unit_price)}
                                </td>
                                <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right', fontWeight: 600 }}>
                                  ₹{fmt(item.received_line_total)}
                                </td>
                                {/* Δ per unit */}
                                <td style={{
                                  padding: '0.7rem 0.8rem', textAlign: 'right', fontWeight: 700,
                                  color: deviationColor(item.deviation_per_unit),
                                }}>
                                  {parseFloat(item.deviation_per_unit) > 0 ? '+' : ''}₹{fmt(item.deviation_per_unit)}
                                </td>
                                {/* Deviation ₹ */}
                                <td style={{
                                  padding: '0.7rem 0.8rem', textAlign: 'right', fontWeight: 800,
                                  color: deviationColor(itemDev),
                                }}>
                                  {itemDev > 0 ? '+' : ''}₹{fmt(itemDev)}
                                </td>
                                {/* Deviation % badge */}
                                <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '50px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: deviationBg(itemDev),
                                    color: deviationColor(itemDev),
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {deviationLabel(itemDev)}
                                    {parseFloat(item.deviation_pct) !== 0
                                      ? ` ${Math.abs(parseFloat(item.deviation_pct)).toFixed(2)}%`
                                      : ''}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Totals foot */}
                        <tfoot>
                          <tr style={{ background: 'var(--bg-glass-heavy)', fontWeight: 800 }}>
                            <td colSpan={4} style={{ padding: '0.8rem', color: 'var(--text-muted)', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                              PR Totals
                            </td>
                            <td style={{ padding: '0.8rem', textAlign: 'right' }}>₹{fmt(pr.approved_total)}</td>
                            <td colSpan={2} />
                            <td style={{ padding: '0.8rem', textAlign: 'right' }}>₹{fmt(pr.received_total)}</td>
                            <td />
                            <td style={{ padding: '0.8rem', textAlign: 'right', color: deviationColor(pr.deviation_amount) }}>
                              {devAmt > 0 ? '+' : ''}₹{fmt(pr.deviation_amount)}
                            </td>
                            <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '50px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                background: deviationBg(devAmt),
                                color: deviationColor(devAmt),
                              }}>
                                {deviationLabel(devAmt)}
                                {devPct !== 0 ? ` ${Math.abs(devPct).toFixed(2)}%` : ''}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {/* OPEX reconciliation note */}
                    {pr.opex_no && (
                      <div style={{
                        marginTop: '0.8rem',
                        padding: '0.7rem 1rem',
                        borderRadius: '8px',
                        background: 'var(--bg-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        fontSize: '0.82rem',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>💰 <strong>OPEX Settlement:</strong></span>
                        <span style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>{pr.opex_no}</span>
                        <span>Billed: <strong>₹{fmt(pr.opex_value)}</strong></span>
                        <span>Received Total: <strong>₹{fmt(pr.received_total)}</strong></span>
                        {parseFloat(pr.opex_value) !== parseFloat(pr.received_total) && (
                          <span style={{ color: deviationColor(parseFloat(pr.opex_value) - parseFloat(pr.received_total)), fontWeight: 700 }}>
                            OPEX vs Received Δ: ₹{fmt(parseFloat(pr.opex_value) - parseFloat(pr.received_total))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PRDeviationReport;
