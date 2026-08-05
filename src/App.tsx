import { useEffect, useMemo, useState } from 'react';
import { Urgency, type Token } from './queueModel';
import { fetchState, createToken, callNextToken, skipNextToken, reinsertToken, resetCounters } from './api';

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
  const [patientName, setPatientName] = useState('John Carter');
  const [department, setDepartment] = useState('OPD');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.NORMAL);
  const [selectedDepartment, setSelectedDepartment] = useState('OPD');
  const [statusMessage, setStatusMessage] = useState('Connecting to backend...');
  const [generatedToken, setGeneratedToken] = useState<Token | null>(null);
  const [queues, setQueues] = useState<Record<string, Token[]>>({});
  const [pendingTokens, setPendingTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const allDepartments = useMemo(() => {
    const knownDepartments = new Set<string>([
      ...departments,
      ...Object.keys(queues),
      ...pendingTokens.map((token) => token.department),
    ]);
    return Array.from(knownDepartments).sort();
  }, [pendingTokens, queues]);

  async function refreshState() {
    setIsLoading(true);
    try {
      const state = await fetchState();
      setQueues(state.queues);
      setPendingTokens(state.pending);
      if (!allDepartments.includes(selectedDepartment) && state.departments.length > 0) {
        setSelectedDepartment(state.departments[0]);
      }
      setStatusMessage('Backend state synchronized.');
    } catch (error) {
      setStatusMessage('Unable to connect to backend. Please start the API server.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncView(message: string) {
    setStatusMessage(message);
  }

  async function handleGenerateToken() {
    const trimmedName = patientName.trim();
    if (!trimmedName) {
      setStatusMessage('Patient name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await createToken({ patientName: trimmedName, department, urgency });
      setGeneratedToken(token);
      syncView(`${token.tokenId} added to ${department}.`);
      await refreshState();
    } catch (error) {
      syncView('Failed to generate token.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCallNext() {
    setIsLoading(true);
    try {
      const token = await callNextToken(selectedDepartment);
      if (!token) {
        syncView(`Queue empty for ${selectedDepartment}.`);
      } else {
        setGeneratedToken(token);
        syncView(`Serving ${token.tokenId} from ${selectedDepartment}.`);
      }
      await refreshState();
    } catch (error) {
      syncView('Failed to call next patient.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSkipNext() {
    setIsLoading(true);
    try {
      const token = await skipNextToken(selectedDepartment);
      if (!token) {
        syncView(`Nothing to skip in ${selectedDepartment}.`);
      } else {
        syncView(`Skipped ${token.tokenId}; moved to pending list.`);
      }
      await refreshState();
    } catch (error) {
      syncView('Failed to skip next token.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReinsert(tokenId: string) {
    setIsLoading(true);
    try {
      const success = await reinsertToken(tokenId);
      syncView(success ? `${tokenId} reinserted at the front.` : `${tokenId} not found.`);
      await refreshState();
    } catch (error) {
      syncView('Failed to reinsert token.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset() {
    setIsLoading(true);
    try {
      await resetCounters();
      setGeneratedToken(null);
      syncView('Counters reset. Existing queues remain available for review.');
      await refreshState();
    } catch (error) {
      syncView('Failed to reset counters.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="dashboard">
        <section className="hero card">
          <div>
            <p className="eyebrow">Hospital Queue System</p>
            <h1>TO - CaRe</h1>
            <p className="lead">
              Register patients, prioritize emergencies, and use the admin dashboard to manage active queues.
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
              <span>Admin controls</span>
              <strong>Call, Skip, Reinsert</strong>
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
              <button className="primary" onClick={handleGenerateToken} disabled={isLoading}>
                Generate token
              </button>
              <button className="secondary" onClick={handleReset} disabled={isLoading}>
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
              <button className="primary" onClick={handleCallNext} disabled={isLoading}>
                Call next patient
              </button>
              <button className="secondary" onClick={handleSkipNext} disabled={isLoading}>
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
                const queue = queues[dept] ?? [];
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
                    <button className="secondary" onClick={() => handleReinsert(token.tokenId)} disabled={isLoading}>
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
