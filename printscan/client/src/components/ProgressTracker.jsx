import React from 'react';

const STATUS_ICONS = {
  pending: '⏳',
  running: '🔄',
  complete: '✓',
  error: '✗',
  timeout: '⏱',
  not_available: '—',
};

const STATUS_CLASSES = {
  pending: 'tag-gray',
  running: 'tag-blue',
  complete: 'tag-green',
  error: 'tag-red',
  timeout: 'tag-yellow',
  not_available: 'tag-gray',
};

export default function ProgressTracker({ supplierStatus }) {
  const entries = Object.entries(supplierStatus || {});
  if (entries.length === 0) return null;

  const completed = entries.filter(([, s]) => s.status === 'complete').length;
  const total = entries.length;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="card">
      <h2>Searching Suppliers</h2>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{completed} of {total} complete</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{percent}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: 'var(--primary)',
            borderRadius: 4,
            width: `${percent}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {entries.map(([supplierId, info]) => (
          <div key={supplierId} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--gray-200)',
          }}>
            <span style={{ fontSize: '1rem' }}>
              {info.status === 'running' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : STATUS_ICONS[info.status] || '?'}
            </span>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{info.name || supplierId}</div>
              <div>
                <span className={`tag ${STATUS_CLASSES[info.status] || 'tag-gray'}`} style={{ fontSize: '0.7rem' }}>
                  {info.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
