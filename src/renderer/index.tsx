import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import type { SerializedTrayData } from '@shared/types';
import { Settings } from './settings';

function App(): JSX.Element {
  const [view, setView] = useState<'popup' | 'settings'>('popup');
  const [data, setData] = useState<SerializedTrayData | null>(null);

  useEffect(() => {
    window.electronAPI.getData().then(setData).catch(console.error);

    const cleanupData = window.electronAPI.onDataUpdated(setData);
    const cleanupRefresh = window.electronAPI.onRefreshStarted(() => {
      // spinner state handled per-component when PollEngine is wired
    });
    const cleanupNavigate = window.electronAPI.onNavigateSettings(() => {
      setView('settings');
    });

    return () => {
      cleanupData();
      cleanupRefresh();
      cleanupNavigate();
    };
  }, []);

  if (view === 'settings') {
    return <Settings onBack={() => setView('popup')} />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold">StrataFlux</h1>
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setView('settings')}
        >
          Settings
        </button>
      </header>

      <main className="p-4">
        {data === null ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : data.groups.length === 0 && data.unlinkedPRs.length === 0 ? (
          <p className="text-gray-500 text-sm">No active work items or PRs.</p>
        ) : (
          <>
            {data.groups.map((group) => (
              <section key={group.state} className="mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  {group.state}
                </h2>
                <ul className="space-y-1">
                  {group.items.map(({ workItem, prs }) => (
                    <li key={workItem.id}>
                      <button
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm"
                        onClick={() =>
                          window.electronAPI.openUrl(workItem.url)
                        }
                      >
                        <span className="font-medium">{workItem.title}</span>
                        {prs.length > 0 && (
                          <span className="ml-2 text-xs text-gray-400">
                            {prs.length} PR{prs.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {data.unlinkedPRs.length > 0 && (
              <section className="mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Unlinked PRs
                </h2>
                <ul className="space-y-1">
                  {data.unlinkedPRs.map((pr) => (
                    <li key={pr.nodeId}>
                      <button
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm"
                        onClick={() => window.electronAPI.openUrl(pr.url)}
                      >
                        {pr.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      {data && (
        <footer className="px-4 py-2 border-t border-gray-200 text-xs text-gray-400">
          {data.refresh.lastSuccessAt
            ? `Last refreshed: ${new Date(data.refresh.lastSuccessAt).toLocaleTimeString()}`
            : 'Not yet refreshed'}
          {data.refresh.status === 'error' && (
            <span className="ml-2 text-red-500">
              ⚠ {data.refresh.lastErrorMessage}
            </span>
          )}
        </footer>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
