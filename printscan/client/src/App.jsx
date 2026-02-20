import React, { useState } from 'react';
import InputView from './components/InputView';
import SpecReview from './components/SpecReview';
import ResultsDashboard from './components/ResultsDashboard';
import Settings from './components/Settings';
import './App.css';

const VIEWS = { INPUT: 'input', REVIEW: 'review', RESULTS: 'results', SETTINGS: 'settings' };

export default function App() {
  const [view, setView] = useState(VIEWS.INPUT);
  const [parsedSpecs, setParsedSpecs] = useState([]);
  const [searchId, setSearchId] = useState(null);
  const [rawInputText, setRawInputText] = useState('');

  const goToReview = (specs, inputText) => {
    setParsedSpecs(specs);
    setRawInputText(inputText);
    setView(VIEWS.REVIEW);
  };

  const goToResults = (id) => {
    setSearchId(id);
    setView(VIEWS.RESULTS);
  };

  const startOver = () => {
    setParsedSpecs([]);
    setSearchId(null);
    setRawInputText('');
    setView(VIEWS.INPUT);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="logo-icon">🖨</span> PrintScan
          </h1>
          <p className="app-subtitle">Price Comparison — Express Print Services Ltd</p>
        </div>
        <nav className="header-nav">
          {view !== VIEWS.SETTINGS && (
            <button className="nav-btn" onClick={startOver}>New Search</button>
          )}
          <button
            className={`nav-btn ${view === VIEWS.SETTINGS ? 'active' : ''}`}
            onClick={() => view === VIEWS.SETTINGS ? startOver() : setView(VIEWS.SETTINGS)}
          >
            {view === VIEWS.SETTINGS ? '← Back' : '⚙ Settings'}
          </button>
        </nav>
      </header>

      {view !== VIEWS.SETTINGS && (
        <div className="step-indicator">
          <StepDot num={1} label="Input" active={view === VIEWS.INPUT} done={view !== VIEWS.INPUT} />
          <div className="step-line" />
          <StepDot num={2} label="Review" active={view === VIEWS.REVIEW} done={view === VIEWS.RESULTS} />
          <div className="step-line" />
          <StepDot num={3} label="Results" active={view === VIEWS.RESULTS} done={false} />
        </div>
      )}

      <main className="app-main">
        {view === VIEWS.INPUT && (
          <InputView onParsed={goToReview} />
        )}
        {view === VIEWS.REVIEW && (
          <SpecReview
            specs={parsedSpecs}
            rawInput={rawInputText}
            onConfirm={goToResults}
            onBack={() => setView(VIEWS.INPUT)}
          />
        )}
        {view === VIEWS.RESULTS && (
          <ResultsDashboard
            searchId={searchId}
            specs={parsedSpecs}
            onStartOver={startOver}
          />
        )}
        {view === VIEWS.SETTINGS && (
          <Settings />
        )}
      </main>
    </div>
  );
}

function StepDot({ num, label, active, done }) {
  return (
    <div className={`step-dot ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      <div className="step-circle">{done ? '✓' : num}</div>
      <span className="step-label">{label}</span>
    </div>
  );
}
