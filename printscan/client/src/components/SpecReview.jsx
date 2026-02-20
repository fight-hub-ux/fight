import React, { useState } from 'react';
import { startSearch } from '../utils/api';

const PRODUCT_TYPES = [
  'Business Cards','Flyers/Leaflets','Folded Leaflets','Brochures/Booklets','Posters',
  'Postcards','Compliment Slips','Letterheads','NCR Pads/Sets','Presentation Folders',
  'Large Format Posters','Roller Banners','PVC Banners','Canvas Prints','Stickers/Labels',
  'Envelopes','Other',
];
const SIZES = ['A6','A5','A4','A3','A2','A1','A0','DL','85x55mm','Custom'];
const PAPER_STOCKS = [
  '130gsm Silk','150gsm Silk','170gsm Silk','250gsm Silk','300gsm Silk','350gsm Silk','400gsm Silk',
  '130gsm Gloss','150gsm Gloss','170gsm Gloss','250gsm Gloss','300gsm Gloss',
  '120gsm Uncoated','170gsm Uncoated','300gsm Uncoated','350gsm Uncoated','Custom',
];
const LAMINATIONS = [
  'None','Matt Lamination (one side)','Matt Lamination (both sides)',
  'Gloss Lamination (one side)','Gloss Lamination (both sides)','Soft Touch Lamination','Spot UV',
];
const FOLDINGS = ['None','Half Fold','Tri-Fold (letter)','Tri-Fold (Z-fold)','Gate Fold','Concertina/Accordion','Roll Fold','Cross Fold'];
const BINDINGS = ['None','Saddle Stitch','Perfect Bound','Wiro Bound','Comb Bound'];
const TURNAROUNDS = ['Next Day','2-3 Days','3-5 Days','5-7 Days','7-10 Days'];
const PRINT_SIDES = ['single','double'];
const COLOURS = ['full_colour','black_and_white','spot'];

function SpecItem({ spec, index, onChange, onRemove, count }) {
  const update = (field, value) => onChange(index, { ...spec, [field]: value });
  const paperLabel = spec.paper_stock
    ? `${spec.paper_weight_gsm || ''}gsm ${spec.paper_stock}`.trim()
    : '';

  return (
    <div className="card" style={{ border: '1px solid var(--gray-200)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
          Item {index + 1}: {spec.product_type || 'Unknown product'}
        </h3>
        {count > 1 && (
          <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => onRemove(index)}>
            Remove
          </button>
        )}
      </div>

      {spec.confidence_notes && spec.confidence_notes.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <strong>AI Notes:</strong>
          <ul style={{ margin: '4px 0 0 16px' }}>
            {spec.confidence_notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Product Type</label>
          <select className="form-control" value={spec.product_type || ''} onChange={e => update('product_type', e.target.value)}>
            <option value="">Select...</option>
            {PRODUCT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Size</label>
          <select className="form-control" value={spec.size || ''} onChange={e => update('size', e.target.value)}>
            <option value="">Select...</option>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input type="number" className="form-control" value={spec.quantity || ''} min={1}
            onChange={e => update('quantity', parseInt(e.target.value) || '')} />
        </div>

        <div className="form-group">
          <label className="form-label">Paper Stock</label>
          <select className="form-control"
            value={paperLabel || spec.paper_stock || ''}
            onChange={e => {
              const val = e.target.value;
              const match = val.match(/^(\d+)gsm\s+(.+)$/);
              if (match) {
                update('paper_stock', match[2]);
                onChange(index, { ...spec, paper_stock: match[2], paper_weight_gsm: parseInt(match[1]) });
              } else {
                update('paper_stock', val);
              }
            }}>
            <option value="">Select...</option>
            {PAPER_STOCKS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Print Sides</label>
          <select className="form-control" value={spec.print_sides || 'double'} onChange={e => update('print_sides', e.target.value)}>
            {PRINT_SIDES.map(s => <option key={s} value={s}>{s === 'single' ? 'Single Sided' : 'Double Sided'}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Colour</label>
          <select className="form-control" value={spec.colour || 'full_colour'} onChange={e => update('colour', e.target.value)}>
            <option value="full_colour">Full Colour</option>
            <option value="black_and_white">Black & White</option>
            <option value="spot">Spot Colour</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Lamination</label>
          <select className="form-control" value={spec.lamination || 'None'} onChange={e => update('lamination', e.target.value)}>
            {LAMINATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Folding</label>
          <select className="form-control" value={spec.folding || 'None'} onChange={e => update('folding', e.target.value)}>
            {FOLDINGS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Binding</label>
          <select className="form-control" value={spec.binding || 'None'} onChange={e => update('binding', e.target.value)}>
            {BINDINGS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Pages (booklets/brochures)</label>
          <input type="number" className="form-control" value={spec.pages || ''} min={4}
            onChange={e => update('pages', parseInt(e.target.value) || null)} placeholder="e.g. 8" />
        </div>

        <div className="form-group">
          <label className="form-label">Turnaround</label>
          <select className="form-control" value={spec.turnaround || '3-5 Days'} onChange={e => update('turnaround', e.target.value)}>
            {TURNAROUNDS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Delivery Postcode</label>
          <input type="text" className="form-control" value={spec.delivery_postcode || ''}
            onChange={e => update('delivery_postcode', e.target.value.toUpperCase())}
            placeholder="e.g. M1 1AE" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Other Requirements</label>
        <textarea className="form-control" rows={2} value={spec.other_requirements || ''}
          onChange={e => update('other_requirements', e.target.value)}
          placeholder="Spot UV, rounded corners, die-cutting, etc." />
      </div>
    </div>
  );
}

export default function SpecReview({ specs, rawInput, onConfirm, onBack }) {
  const [items, setItems] = useState(specs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateItem = (index, updated) => {
    const next = [...items];
    next[index] = updated;
    setItems(next);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startSearch(items);
      onConfirm(result.searchId);
    } catch (err) {
      setError(err.message || 'Failed to start search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Review & Confirm Specification</h2>
        <p>Check the parsed specification below. Correct any errors before confirming.</p>
        {rawInput && (
          <details style={{ marginBottom: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--gray-600)' }}>Show original input</summary>
            <pre style={{ marginTop: 8, padding: 12, background: 'var(--gray-50)', borderRadius: 'var(--radius)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: 'var(--gray-700)' }}>{rawInput}</pre>
          </details>
        )}
      </div>

      {items.map((spec, i) => (
        <SpecItem key={i} spec={spec} index={i} onChange={updateItem} onRemove={removeItem} count={items.length} />
      ))}

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-success" onClick={handleConfirm} disabled={loading || items.length === 0}>
          {loading ? <><span className="spinner" /> Starting search...</> : `✓ Confirm & Search Prices (${items.length} item${items.length > 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  );
}
