import { useMemo, useState } from 'react';
import { PriorityHandler, TokenGenerator, Urgency, type Token } from './queueModel';

const departments = ['OPD', 'Cardiology', 'Pediatrics', 'Radiology'];

const urgencyLabel: Record<Urgency, string> = {
  [Urgency.EMERGENCY]: 'Emergency',
  [Urgency.NORMAL]: 'Normal',
};

const urgencyTone: Record<Urgency, string> = {
  [Urgency.EMERGENCY]: 'danger',
  [Urgency.NORMAL]: 'calm',
};

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function App() {
  const [tokenGenerator] = useState(() => new TokenGenerator());
  const [queueSystem] = useState(() => new PriorityHandler());

  const [patientName, setPatientName] = useState('John Carter');
  const [department, setDepartment] = useState('OPD');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.NORMAL);
  const [selectedDepartment, setSelectedDepartment] = useState('OPD');
  const [statusMessage, setStatusMessage] = useState('Ready to register a patient.');
  const [generatedToken, setGeneratedToken] = useState<Token | null>(null);
  const [, forceRender] = useState(0);

  const queues = useMemo(() => queueSystem.getQueueSnapshot(), [queueSystem, generatedToken, statusMessage]);
  const pendingTokens = useMemo(() => queueSystem.getPendingSnapshot(), [queueSystem, generatedToken, statusMessage]);

  const allDepartments = useMemo(() => {
    const knownDepartments = new Set<string>([...departments, ...queues.keys(), ...pendingTokens.map((token) => token.department)]);
    return Array.from(knownDepartments);
  }, [pendingTokens, queues]);

  function syncView(message: string) {
    setStatusMessage(message);
    forceRender((count) => count + 1);
  }

  function handleGenerateToken() {
    const trimmedName = patientName.trim();

    if (!trimmedName) {
      setStatusMessage('Patient name is required.');
      return;
    }

    const token = tokenGenerator.generateToken(trimmedName, department, urgency);
    queueSystem.addToken(token);
    setGeneratedToken(token);
    syncView(`${token.tokenId} added to ${department}.`);
  }

  function handleCallNext() {
    const next = queueSystem.callNext(selectedDepartment);
    if (!next) {
      syncView(`Queue empty for ${selectedDepartment}.`);
      return;
    }

    setGeneratedToken(next);
    syncView(`Serving ${next.tokenId} from ${selectedDepartment}.`);
  }

  function handleSkipNext() {
    const skipped = queueSystem.skipToken(selectedDepartment);
    if (!skipped) {
      syncView(`Nothing to skip in ${selectedDepartment}.`);
      return;
    }

    syncView(`Skipped ${skipped.tokenId}; moved to pending list.`);
  }

  function handleReinsert(tokenId: string) {
    const success = queueSystem.reinsertPending(tokenId);
    syncView(success ? `${tokenId} reinserted at the front.` : `${tokenId} not found in pending list.`);
  }

  function handleReset() {
    tokenGenerator.resetAllCounters();
    setGeneratedToken(null);
    syncView('Counters reset. Existing queues remain available for review.');
  }

  return (
    <div className="app-shell">
      <main className="dashboard">
        <section className="hero card">
          <div>
            <p className="eyebrow">Hospital Queue System</p>
            <h1>Frontend and backend logic are now aligned.</h1>
            <p className="lead">
              Register patients, prioritize emergencies, and manage the per-department queue in one view.
            </p>
          </div>

          <div className="hero-stats">
            <div>
              <span>Departments tracked</span>
              <strong>{allDepartments.length}</strong>
            </div>
            <div>
              <span>Pending tokens</span>
              <strong>{pendingTokens.length}</strong>
            </div>
            <div>
              <span>Active department</span>
              <strong>{selectedDepartment}</strong>
            </div>
          </div>
        </section>

        <section className="grid">
          <article className="card form-card">
            <h2>Register patient</h2>
            <label>
              Patient name
              <input value={patientName} onChange={(event) => setPatientName(event.target.value)} />
            </label>

            <div className="two-column">
              <label>
                Department
                <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Urgency
                <select value={urgency} onChange={(event) => setUrgency(event.target.value as Urgency)}>
                  <option value={Urgency.NORMAL}>Normal</option>
                  <option value={Urgency.EMERGENCY}>Emergency</option>
                </select>
              </label>
            </div>

            <div className="actions">
              <button className="primary" onClick={handleGenerateToken}>
                Generate token
              </button>
              <button className="secondary" onClick={handleReset}>
                Reset counters
              </button>
            </div>

            <div className="result-panel">
              <span>Latest token</span>
              <strong>{generatedToken ? generatedToken.tokenId : 'No token generated yet'}</strong>
            </div>
          </article>

          <article className="card control-card">
            <h2>Queue control</h2>
            <label>
              Department in focus
              <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)}>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </label>

            <div className="actions stacked">
              <button className="primary" onClick={handleCallNext}>
                Call next patient
              </button>
              <button className="secondary" onClick={handleSkipNext}>
                Skip next token
              </button>
            </div>

            <div className="result-panel muted">
              <span>Status</span>
              <strong>{statusMessage}</strong>
            </div>
          </article>
        </section>

        <section className="grid two-up">
          <article className="card">
            <h2>Queues</h2>
            <div className="queue-list">
              {allDepartments.map((dept) => {
                const queue = queues.get(dept) ?? [];
                return (
                  <div key={dept} className="queue-block">
                    <div className="queue-header">
                      <strong>{dept}</strong>
                      <span>{queue.length} waiting</span>
                    </div>
                    {queue.length === 0 ? (
                      <p className="empty-state">No patients queued.</p>
                    ) : (
                      <ul>
                        {queue.map((token) => (
                          <li key={token.tokenId} className={`token-chip ${urgencyTone[token.urgency]}`}>
                            <div>
                              <strong>{token.tokenId}</strong>
                              <span>{token.patientName}</span>
                            </div>
                            <small>
                              {urgencyLabel[token.urgency]} · {formatTimestamp(token.timestamp)}
                            </small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="card">
            <h2>Pending list</h2>
            {pendingTokens.length === 0 ? (
              <p className="empty-state">No skipped tokens.</p>
            ) : (
              <ul className="pending-list">
                {pendingTokens.map((token) => (
                  <li key={token.tokenId}>
                    <div>
                      <strong>{token.tokenId}</strong>
                      <span>
                        {token.patientName} · {token.department}
                      </span>
                    </div>
                    <button className="secondary" onClick={() => handleReinsert(token.tokenId)}>
                      Reinsert
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
