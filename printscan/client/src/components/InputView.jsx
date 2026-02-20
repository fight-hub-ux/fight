import React, { useState } from 'react';
import { parseText } from '../utils/api';

const EXAMPLE_INPUTS = [
  "5,000 A5 flyers, 170gsm silk, full colour both sides, matt lamination one side, delivery to Manchester, need them by next Friday",
  "250 x A4 folded to DL leaflets, 8 pages self-cover, 150gsm silk, saddle stitched, no lamination",
  "500 business cards, 450gsm, matt lam both sides, standard turnaround. Also 1000 DL leaflets, 130gsm gloss, single sided",
];

export default function InputView({ onParsed }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseText(text);
      if (result.parseError || !result.specs || result.specs.length === 0) {
        setError(result.parseError || 'No specifications could be extracted. Please check your input.');
        return;
      }
      onParsed(result.specs, text);
    } catch (err) {
      setError(err.message || 'Failed to parse. Check that the server is running and ANTHROPIC_API_KEY is set.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Paste Customer Quote Request</h2>
        <p>Paste the customer's print requirements below — free text, exactly as they sent it. The AI will extract the specification.</p>

        <div className="form-group">
          <textarea
            className="form-control"
            rows={8}
            placeholder="e.g. Hi Tom, can you quote me for 5,000 A5 flyers, 170gsm silk, full colour both sides, matt lamination one side, delivery to Manchester, need them by next Friday?"
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleParse}
            disabled={!text.trim() || loading}
          >
            {loading ? <><span className="spinner" /> Parsing...</> : '→ Parse Specification'}
          </button>
          {text && (
            <button className="btn btn-secondary" onClick={() => setText('')} disabled={loading}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Example Inputs</h2>
        <p>Click any example to load it:</p>
        {EXAMPLE_INPUTS.map((ex, i) => (
          <div
            key={i}
            style={{
              padding: '10px 14px',
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius)',
              marginBottom: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: 'var(--gray-700)',
              lineHeight: '1.5',
            }}
            onClick={() => setText(ex)}
          >
            {ex}
          </div>
        ))}
      </div>
    </div>
  );
}
