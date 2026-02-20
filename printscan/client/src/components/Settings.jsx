import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, testSupplierConnection } from '../utils/api';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [testLoading, setTestLoading] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      await updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(supplierId) {
    setTestLoading(prev => ({ ...prev, [supplierId]: true }));
    setTestResults(prev => ({ ...prev, [supplierId]: null }));
    try {
      const result = await testSupplierConnection(supplierId);
      setTestResults(prev => ({ ...prev, [supplierId]: result }));
    } catch (err) {
      setTestResults(prev => ({ ...prev, [supplierId]: { success: false, error: err.message } }));
    } finally {
      setTestLoading(prev => ({ ...prev, [supplierId]: false }));
    }
  }

  function updateSupplier(supplierId, field, value) {
    setSettings(prev => ({
      ...prev,
      suppliers: {
        ...prev.suppliers,
        [supplierId]: {
          ...prev.suppliers[supplierId],
          [field]: value,
        },
      },
    }));
  }

  function updateWttbCredentials(field, value) {
    setSettings(prev => ({
      ...prev,
      suppliers: {
        ...prev.suppliers,
        wttb: {
          ...prev.suppliers.wttb,
          credentials: {
            ...prev.suppliers.wttb.credentials,
            [field]: value,
          },
        },
      },
    }));
  }

  if (loading) return <div className="card"><div className="spinner" /> Loading settings...</div>;
  if (!settings) return <div className="alert alert-error">{error || 'Failed to load settings'}</div>;

  return (
    <div>
      <div className="card">
        <h2>Default Preferences</h2>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Default Delivery Postcode</label>
            <input type="text" className="form-control"
              value={settings.defaultPostcode || ''}
              onChange={e => setSettings(prev => ({ ...prev, defaultPostcode: e.target.value.toUpperCase() }))}
              placeholder="e.g. SW1A 1AA" />
          </div>
          <div className="form-group">
            <label className="form-label">Default Turnaround</label>
            <select className="form-control"
              value={settings.defaultTurnaround || '3-5 Days'}
              onChange={e => setSettings(prev => ({ ...prev, defaultTurnaround: e.target.value }))}>
              {['Next Day','2-3 Days','3-5 Days','5-7 Days','7-10 Days'].map(t =>
                <option key={t} value={t}>{t}</option>
              )}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Price Display</label>
            <select className="form-control"
              value={settings.showIncVat ? 'inc' : 'ex'}
              onChange={e => setSettings(prev => ({ ...prev, showIncVat: e.target.value === 'inc' }))}>
              <option value="ex">Ex-VAT</option>
              <option value="inc">Inc-VAT</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Supplier Configuration</h2>
        <p>Enable/disable suppliers and set loyalty discount percentages.</p>

        {Object.entries(settings.suppliers || {}).map(([id, supplier]) => (
          <div key={id} style={{
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius)',
            padding: 16,
            marginBottom: 12,
            background: supplier.enabled ? '#fff' : 'var(--gray-50)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={supplier.enabled || false}
                    onChange={e => updateSupplier(id, 'enabled', e.target.checked)} />
                  <strong>{supplier.name}</strong>
                </label>
                {supplier.requiresAuth && <span className="tag tag-yellow">Requires Login</span>}
                {!supplier.enabled && <span className="tag tag-gray">Disabled</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  disabled={testLoading[id]}
                  onClick={() => testConnection(id)}
                >
                  {testLoading[id] ? <><span className="spinner" /> Testing...</> : 'Test Connection'}
                </button>
                {testResults[id] && (
                  <span className={`tag ${testResults[id].success ? 'tag-green' : 'tag-red'}`}>
                    {testResults[id].success ? '✓ OK' : '✗ Failed'}
                  </span>
                )}
              </div>
            </div>

            {testResults[id] && !testResults[id].success && (
              <div className="alert alert-error" style={{ marginBottom: 8, fontSize: '0.8rem' }}>
                {testResults[id].error}
              </div>
            )}
            {testResults[id] && testResults[id].success && (
              <div className="alert alert-success" style={{ marginBottom: 8, fontSize: '0.8rem' }}>
                {testResults[id].message}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
                <label className="form-label">Loyalty Discount %</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" className="form-control" style={{ width: 80 }}
                    value={supplier.discount || 0} min={0} max={100} step={0.5}
                    onChange={e => updateSupplier(id, 'discount', parseFloat(e.target.value) || 0)} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>%</span>
                </div>
              </div>

              {id === 'wttb' && (
                <>
                  <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
                    <label className="form-label">WTTB Email</label>
                    <input type="email" className="form-control"
                      value={supplier.credentials?.email || ''}
                      onChange={e => updateWttbCredentials('email', e.target.value)}
                      placeholder="trade@example.com" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
                    <label className="form-label">WTTB Password</label>
                    <input type="password" className="form-control"
                      value={supplier.credentials?.password || ''}
                      onChange={e => updateWttbCredentials('password', e.target.value)}
                      placeholder="••••••••" />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {saveSuccess && <div className="alert alert-success">Settings saved successfully.</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner" /> Saving...</> : '✓ Save Settings'}
        </button>
        <button className="btn btn-secondary" onClick={loadSettings}>Reset</button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Selector Maintenance</h2>
        <p>When a supplier site changes its layout, update the product URLs in their config files:</p>
        <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: 12, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--gray-700)' }}>
          <div>server/suppliers/solopress/config.json</div>
          <div>server/suppliers/wttb/config.json</div>
          <div>server/suppliers/printed-easy/config.json</div>
          <div>server/suppliers/instantprint/config.json</div>
          <div>server/suppliers/helloprint/config.json</div>
          <div>server/suppliers/route1print/config.json</div>
          <div>server/suppliers/printuk/config.json</div>
        </div>
        <p style={{ marginTop: 8 }}>Each scraper.js can be independently updated without touching core logic.</p>
      </div>
    </div>
  );
}
