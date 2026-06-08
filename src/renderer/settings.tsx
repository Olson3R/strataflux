import React, { useEffect, useState } from 'react';
import type { AppConfig } from '@shared/types';

interface Props {
  onBack: () => void;
}

export function Settings({ onBack }: Props): JSX.Element {
  const [config, setConfig] = useState<AppConfig>({
    adoOrgUrl: '',
    adoProject: '',
    githubRepos: [],
    pollIntervalMinutes: 5,
  });
  const [adoPat, setAdoPat] = useState('');
  const [githubPat, setGithubPat] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig).catch(console.error);
  }, []);

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setStatus('saving');
    setErrorMsg('');

    const payload = {
      ...config,
      ...(adoPat ? { adoPat } : {}),
      ...(githubPat ? { githubPat } : {}),
    };

    const result = await window.electronAPI.saveConfig(payload);
    if (result.ok) {
      setStatus('ok');
      setAdoPat('');
      setGithubPat('');
    } else {
      setStatus('error');
      setErrorMsg(result.error ?? 'Unknown error');
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={onBack}
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <form onSubmit={handleSave} className="p-4 space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-700">
            Azure DevOps
          </legend>
          <label className="block">
            <span className="text-xs text-gray-500">Organization URL</span>
            <input
              type="url"
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="https://dev.azure.com/myorg"
              value={config.adoOrgUrl}
              onChange={(e) =>
                setConfig((c) => ({ ...c, adoOrgUrl: e.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Project</span>
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="MyProject"
              value={config.adoProject}
              onChange={(e) =>
                setConfig((c) => ({ ...c, adoProject: e.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Personal Access Token</span>
            <input
              type="password"
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="••••••••"
              value={adoPat}
              onChange={(e) => setAdoPat(e.target.value)}
            />
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-700">
            GitHub
          </legend>
          <label className="block">
            <span className="text-xs text-gray-500">
              Repositories (one per line; empty = all)
            </span>
            <textarea
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
              rows={3}
              placeholder="owner/repo"
              value={config.githubRepos.join('\n')}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  githubRepos: e.target.value
                    .split('\n')
                    .map((r) => r.trim())
                    .filter(Boolean),
                }))
              }
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Personal Access Token</span>
            <input
              type="password"
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="••••••••"
              value={githubPat}
              onChange={(e) => setGithubPat(e.target.value)}
            />
          </label>
        </fieldset>

        <label className="block">
          <span className="text-xs text-gray-500">
            Poll interval: {config.pollIntervalMinutes} minutes
          </span>
          <input
            type="range"
            min={5}
            max={15}
            className="mt-1 w-full"
            value={config.pollIntervalMinutes}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                pollIntervalMinutes: Number(e.target.value),
              }))
            }
          />
        </label>

        {status === 'error' && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}
        {status === 'ok' && (
          <p className="text-sm text-green-600">Saved successfully.</p>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : 'Save & Connect'}
        </button>
      </form>
    </div>
  );
}
