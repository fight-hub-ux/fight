import React, { useEffect, useState, useRef } from 'react';
import { getSearchResults, getSearchStatus, createProgressWebSocket } from '../utils/api';
import ProgressTracker from './ProgressTracker';

function formatPrice(price) {
  if (price == null) return '—';
  return `£${Number(price).toFixed(2)}`;
}

function StatusBadge({ status }) {
  const config = {
    available: { label: '✓ Available', cls: 'tag-green' },
    partial: { label: '⚠ Partial match', cls: 'tag-yellow' },
    not_available: { label: '✗ Not available', cls: 'tag-red' },
    error: { label: '✗ Error', cls: 'tag-red' },
    timeout: { label: '⏱ Timed out', cls: 'tag-yellow' },
  };
  const c = config[status] || { label: status, cls: 'tag-gray' };
  return <span className={`tag ${c.cls}`}>{c.label}</span>;
}

function RankBadge({ rank }) {
  const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
  return <div className={`rank-badge ${cls}`}>{rank}</div>;
}

export default function ResultsDashboard({ searchId, specs, onStartOver }) {
  const [status, setStatus] = useState('running');
  const [supplierStatus, setSupplierStatus] = useState({});
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!searchId) return;

    // Connect via WebSocket for real-time updates
    const ws = createProgressWebSocket(searchId, (data) => {
      if (data.type === 'supplier_update') {
        setSupplierStatus(prev => ({
          ...prev,
          [data.supplierId]: { ...prev[data.supplierId], status: data.status, name: data.name },
        }));
      } else if (data.type === 'complete') {
        fetchResults();
        setStatus('complete');
      }
    });

    wsRef.current = ws;

    ws.onerror = () => {
      // Fall back to polling if WS fails
      startPolling();
    };

    // Also start polling as backup
    startPolling();

    return () => {
      ws.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [searchId]);

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const s = await getSearchStatus(searchId);
        setSupplierStatus(s.supplierStatus || {});
        if (s.status === 'complete') {
          clearInterval(pollRef.current);
          setStatus('complete');
          fetchResults();
        }
      } catch (e) {
        // Ignore poll errors
      }
    }, 2000);
  }

  async function fetchResults() {
    try {
      const data = await getSearchResults(searchId);
      setResults(data.results || []);
      setStatus('complete');
    } catch (err) {
      setError(err.message);
    }
  }

  const availableResults = results.filter(r => r.totalCost != null);
  const unavailableResults = results.filter(r => r.totalCost == null);

  return (
    <div>
      {status === 'running' && (
        <ProgressTracker supplierStatus={supplierStatus} />
      )}

      {status === 'complete' && results.length === 0 && (
        <div className="alert alert-warning">No results returned. All suppliers may have failed. Check Settings → Test Connection.</div>
      )}

      {availableResults.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2>Price Comparison Results</h2>
              <p>{specs.map(s => `${s.quantity}x ${s.size} ${s.product_type}`).join(', ')}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => window.print()}>🖨 Print</button>
              <button className="btn btn-secondary" onClick={onStartOver}>New Search</button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Rank</th>
                  <th>Supplier</th>
                  <th>Print Price</th>
                  <th>Discount</th>
                  <th>Delivery</th>
                  <th>Total</th>
                  <th>Turnaround</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {availableResults.map((r, i) => (
                  <tr key={`${r.supplierId}-${i}`} style={i === 0 ? { background: '#fefce8' } : {}}>
                    <td style={{ textAlign: 'center' }}>
                      <RankBadge rank={i + 1} />
                    </td>
                    <td>
                      <a href={r.productUrl || r.supplierUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                        {r.supplierName}
                      </a>
                    </td>
                    <td>{formatPrice(r.printPriceAfterDiscount ?? r.printPrice)}</td>
                    <td>
                      {r.discountApplied > 0
                        ? <span className="tag tag-green">{r.discountApplied}% loyalty</span>
                        : <span className="tag tag-gray">None</span>}
                    </td>
                    <td>{formatPrice(r.deliveryCost)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(r.totalCost)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{r.turnaround || '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {availableResults.some(r => r.notes && r.notes.length > 0) && (
            <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--gray-600)' }}>
              <strong>Notes:</strong>
              <ul style={{ marginTop: 4, marginLeft: 16 }}>
                {availableResults.flatMap(r =>
                  (r.notes || []).map((n, i) => <li key={`${r.supplierId}-${i}`}>{r.supplierName}: {n}</li>)
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {unavailableResults.length > 0 && (
        <div className="card">
          <h2>Unavailable / Errors</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {unavailableResults.map((r, i) => (
                  <tr key={`${r.supplierId}-err-${i}`}>
                    <td>
                      <a href={r.supplierUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        {r.supplierName}
                      </a>
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                      {r.error || (r.notes && r.notes.join('; ')) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {specs.some(s => s.other_requirements) && (
        <div className="alert alert-info">
          <strong>Non-standard requirements (manual quote needed):</strong>
          {specs.filter(s => s.other_requirements).map((s, i) => (
            <div key={i} style={{ marginTop: 4 }}>{s.product_type}: {s.other_requirements}</div>
          ))}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
    </div>
  );
}
