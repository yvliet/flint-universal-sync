/**
 * @module UniversalSyncSettingsTab
 * @description
 * Settings and management interface for the Universal External Sync extension.
 * Provides interactive provider configuration, telemetry status cards,
 * and the 1-click guided setup wizard.
 */

import React, { useState } from 'react';
import type { FlintApp } from 'flint';
import {
  UniversalSyncConfig,
  SyncTelemetry,
  SyncProviderType,
  ConflictStrategy,
} from '../types';
import { SyncEngine } from '../engine/SyncEngine';
import { SupabaseWizard } from './SupabaseWizard';
import { TursoProvider } from '../providers/TursoProvider';
import { CloudflareD1Provider } from '../providers/CloudflareD1Provider';
import { CustomRestProvider } from '../providers/CustomRestProvider';

interface UniversalSyncSettingsTabProps {
  app: FlintApp;
  config: UniversalSyncConfig;
  engine: SyncEngine;
  onSaveConfig: (newConfig: UniversalSyncConfig) => Promise<void>;
}

export const UniversalSyncSettingsTab: React.FC<UniversalSyncSettingsTabProps> = ({
  app,
  config: initialConfig,
  engine,
  onSaveConfig,
}) => {
  const [config, setConfig] = useState<UniversalSyncConfig>(initialConfig);
  const [telemetry, setTelemetry] = useState<SyncTelemetry>(engine.getTelemetry());
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState<string | null>(null);

  const updateConfig = async (patch: Partial<UniversalSyncConfig>) => {
    const updated = { ...config, ...patch };
    setConfig(updated);
    engine.updateConfig(updated);
    await onSaveConfig(updated);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      let result;
      if (config.activeProvider === 'supabase') {
        const { SupabaseProvider } = await import('../providers/SupabaseProvider');
        const p = new SupabaseProvider(config.supabase, config.deviceId);
        result = await p.testConnection();
      } else if (config.activeProvider === 'turso') {
        const p = new TursoProvider(config.turso, config.deviceId);
        result = await p.testConnection();
      } else if (config.activeProvider === 'cloudflare_d1') {
        const p = new CloudflareD1Provider(config.cloudflareD1, config.deviceId);
        result = await p.testConnection();
      } else {
        const p = new CustomRestProvider(config.customRest, config.deviceId);
        result = await p.testConnection();
      }

      setTestResult(result);
      if (result.success) {
        app.workspace.showToast('Database connection verified successfully!', 'success');
      } else {
        app.workspace.showToast(result.message || 'Connection test failed', 'warning');
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || String(e) });
    } finally {
      setIsTesting(false);
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const res = await engine.syncNow();
      setTelemetry(engine.getTelemetry());
      if (res.success) {
        app.workspace.showToast(res.message, 'success');
      } else {
        app.workspace.showToast(res.message, 'warning');
      }
    } catch (e: any) {
      app.workspace.showToast(`Sync error: ${e?.message || String(e)}`, 'warning');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleCopySchema = async (type: string, schema: string) => {
    try {
      await navigator.clipboard.writeText(schema);
      setCopiedSchema(type);
      setTimeout(() => setCopiedSchema(null), 2000);
    } catch {}
  };

  const formatLastSync = (ts: number | null): string => {
    if (!ts) return 'Never synced';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 30) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="space-y-6 max-w-3xl pb-10 text-[var(--text-primary,#ffffff)] font-sans">
      {/* Overview Header */}
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Universal External Sync</h3>
        <p className="text-xs text-[var(--text-secondary,#a1a1aa)] mt-1 leading-relaxed">
          Synchronize your Hearth notes across all devices using your own free cloud database.
          Never pay a subscription for storage you can host yourself for free.
        </p>
      </div>

      {/* Telemetry Status Card */}
      <div className="bg-[var(--bg-secondary,#18181b)] border border-[var(--border-default,#3f3f46)] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                telemetry.lastStatus === 'syncing' || isManualSyncing
                  ? 'bg-amber-400 animate-pulse'
                  : telemetry.lastStatus === 'success'
                  ? 'bg-emerald-400'
                  : telemetry.lastStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-neutral-500'
              }`}
            />
            <span className="text-sm font-semibold capitalize">
              {telemetry.lastStatus === 'syncing' || isManualSyncing
                ? 'Syncing changes...'
                : telemetry.lastStatus === 'success'
                ? 'All Notes Synchronized'
                : telemetry.lastStatus === 'error'
                ? 'Sync Error Occurred'
                : 'Ready / Idle'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary,#a1a1aa)]">
            <span>Last Synced: <strong className="text-[var(--text-primary,#ffffff)]">{formatLastSync(telemetry.lastSyncedAt)}</strong></span>
            <span>Total Syncs: <strong className="text-[var(--text-primary,#ffffff)]">{telemetry.syncedCount}</strong></span>
            {telemetry.conflictCount > 0 && (
              <span className="text-amber-400">Conflicts Resolved: {telemetry.conflictCount}</span>
            )}
          </div>

          {telemetry.lastError && (
            <p className="text-xs text-rose-400 bg-rose-950/40 px-2 py-1 rounded border border-rose-800/40">
              {telemetry.lastError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--bg-tertiary,#27272a)] hover:bg-[var(--bg-tertiary,#27272a)]/80 text-[var(--text-primary,#ffffff)] border border-[var(--border-default,#3f3f46)] disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing || isTesting}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-[var(--color-primary,#6366f1)] hover:bg-[var(--color-primary,#6366f1)]/90 text-white disabled:opacity-50 flex items-center gap-1.5"
          >
            {isManualSyncing ? 'Syncing...' : '🔄 Sync Now'}
          </button>
        </div>
      </div>

      {/* Test Connection Alert Result */}
      {testResult && (
        <div
          className={`p-3 rounded-lg text-xs border flex items-center justify-between ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{testResult.success ? '✓' : '✗'}</span>
            <span>{testResult.message}</span>
          </div>
          {testResult.latencyMs && (
            <span className="text-[11px] opacity-75 font-mono">{testResult.latencyMs}ms</span>
          )}
        </div>
      )}

      {/* Provider Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary,#a1a1aa)]">
          Select Cloud Database Provider
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: 'supabase', label: 'Supabase', desc: 'Free Tier (Recommended)', badge: 'Free' },
              { id: 'turso', label: 'Turso libSQL', desc: 'Serverless SQLite', badge: 'Edge' },
              { id: 'cloudflare_d1', label: 'Cloudflare D1', desc: 'Serverless Workers', badge: 'D1' },
              { id: 'custom_rest', label: 'Custom REST', desc: 'Self-Hosted Server', badge: 'Self' },
            ] as const
          ).map((prov) => {
            const isSelected = config.activeProvider === prov.id;
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() => updateConfig({ activeProvider: prov.id as SyncProviderType })}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[var(--color-primary,#6366f1)]/10 border-[var(--color-primary,#6366f1)] text-[var(--text-primary,#ffffff)] shadow-sm'
                    : 'bg-[var(--bg-secondary,#18181b)] border-[var(--border-default,#3f3f46)] text-[var(--text-secondary,#a1a1aa)] hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold text-[var(--text-primary,#ffffff)]">{prov.label}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                    {prov.badge}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--text-secondary,#a1a1aa)]">{prov.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider-Specific Configuration Section */}
      <div className="space-y-4">
        {config.activeProvider === 'supabase' && (
          <SupabaseWizard
            projectUrl={config.supabase.projectUrl}
            anonKey={config.supabase.anonKey}
            onUpdateCredentials={(projectUrl, anonKey) =>
              updateConfig({ supabase: { ...config.supabase, projectUrl, anonKey } })
            }
            onTestConnection={handleTestConnection}
            isTesting={isTesting}
          />
        )}

        {config.activeProvider === 'turso' && (
          <div className="bg-[var(--bg-secondary,#18181b)] border border-[var(--border-default,#3f3f46)] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[var(--text-primary,#ffffff)] uppercase tracking-wider">
                Turso libSQL Configuration
              </h4>
              <button
                type="button"
                onClick={() =>
                  handleCopySchema('turso', new TursoProvider(config.turso, 'wizard').getSchemaScript())
                }
                className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary,#27272a)] text-cyan-400 border border-cyan-800/50 hover:bg-cyan-950/50"
              >
                {copiedSchema === 'turso' ? '✓ Copied SQL!' : '📋 Copy Turso SQL Schema'}
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary,#a1a1aa)] mb-1">
                Database URL (e.g., libsql://my-db.turso.io)
              </label>
              <input
                type="text"
                value={config.turso.databaseUrl}
                onChange={(e) =>
                  updateConfig({ turso: { ...config.turso, databaseUrl: e.target.value } })
                }
                placeholder="libsql://your-db-org.turso.io"
                className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary,#a1a1aa)] mb-1">
                Auth Token (JWT)
              </label>
              <input
                type="password"
                value={config.turso.authToken}
                onChange={(e) =>
                  updateConfig({ turso: { ...config.turso, authToken: e.target.value } })
                }
                placeholder="eyJhbGciOiJFZERTQ..."
                className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {config.activeProvider === 'cloudflare_d1' && (
          <div className="bg-[var(--bg-secondary,#18181b)] border border-[var(--border-default,#3f3f46)] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[var(--text-primary,#ffffff)] uppercase tracking-wider">
                Cloudflare D1 Configuration
              </h4>
              <button
                type="button"
                onClick={() =>
                  handleCopySchema('d1', new CloudflareD1Provider(config.cloudflareD1, 'wizard').getSchemaScript())
                }
                className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary,#27272a)] text-orange-400 border border-orange-800/50 hover:bg-orange-950/50"
              >
                {copiedSchema === 'd1' ? '✓ Copied SQL!' : '📋 Copy D1 SQL Schema'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary,#a1a1aa)] mb-1">
                  Account ID
                </label>
                <input
                  type="text"
                  value={config.cloudflareD1.accountId}
                  onChange={(e) =>
                    updateConfig({ cloudflareD1: { ...config.cloudflareD1, accountId: e.target.value } })
                  }
                  className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary,#a1a1aa)] mb-1">
                  Database ID
                </label>
                <input
                  type="text"
                  value={config.cloudflareD1.databaseId}
                  onChange={(e) =>
                    updateConfig({ cloudflareD1: { ...config.cloudflareD1, databaseId: e.target.value } })
                  }
                  className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary,#a1a1aa)] mb-1">
                Cloudflare API Token
              </label>
              <input
                type="password"
                value={config.cloudflareD1.apiToken}
                onChange={(e) =>
                  updateConfig({ cloudflareD1: { ...config.cloudflareD1, apiToken: e.target.value } })
                }
                className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {config.activeProvider === 'custom_rest' && (
          <div className="bg-[var(--bg-secondary,#18181b)] border border-[var(--border-default,#3f3f46)] rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-[var(--text-primary,#ffffff)] uppercase tracking-wider">
              Self-Hosted REST Server Configuration
            </h4>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary,#a1a1aa)] mb-1">
                Server Endpoint URL
              </label>
              <input
                type="text"
                value={config.customRest.endpointUrl}
                onChange={(e) =>
                  updateConfig({ customRest: { ...config.customRest, endpointUrl: e.target.value } })
                }
                placeholder="https://sync.my-server.com/api"
                className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary,#a1a1aa)] mb-1">
                Bearer Token (Optional)
              </label>
              <input
                type="password"
                value={config.customRest.bearerToken}
                onChange={(e) =>
                  updateConfig({ customRest: { ...config.customRest, bearerToken: e.target.value } })
                }
                className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sync Preferences Section */}
      <div className="bg-[var(--bg-secondary,#18181b)] border border-[var(--border-default,#3f3f46)] rounded-lg p-4 space-y-4">
        <h4 className="text-xs font-semibold text-[var(--text-primary,#ffffff)] uppercase tracking-wider">
          Sync Behavior & Automation
        </h4>

        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--text-primary,#ffffff)] block">
              Auto-Sync on Save
            </span>
            <span className="text-[11px] text-[var(--text-secondary,#a1a1aa)]">
              Automatically uploads changes 2.5 seconds after editing notes without blocking typing.
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.autoSyncOnSave}
            onChange={(e) => updateConfig({ autoSyncOnSave: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 bg-neutral-800 border-neutral-600"
          />
        </div>

        {/* Interval Dropdown */}
        <div className="flex items-center justify-between border-t border-[var(--border-default,#3f3f46)]/50 pt-3">
          <div>
            <span className="text-xs font-medium text-[var(--text-primary,#ffffff)] block">
              Periodic Sync Interval
            </span>
            <span className="text-[11px] text-[var(--text-secondary,#a1a1aa)]">
              Periodically checks the remote cloud database for notes edited on other devices.
            </span>
          </div>
          <select
            value={config.periodicIntervalSeconds}
            onChange={(e) => updateConfig({ periodicIntervalSeconds: parseInt(e.target.value, 10) })}
            className="bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2 py-1 text-xs text-white"
          >
            <option value={0}>Manual Only</option>
            <option value={60}>Every 1 Minute</option>
            <option value={300}>Every 5 Minutes (Default)</option>
            <option value={900}>Every 15 Minutes</option>
            <option value={1800}>Every 30 Minutes</option>
          </select>
        </div>

        {/* Conflict Strategy Dropdown */}
        <div className="flex items-center justify-between border-t border-[var(--border-default,#3f3f46)]/50 pt-3">
          <div>
            <span className="text-xs font-medium text-[var(--text-primary,#ffffff)] block">
              Conflict Resolution Strategy
            </span>
            <span className="text-[11px] text-[var(--text-secondary,#a1a1aa)]">
              How to reconcile simultaneous edits on the same note across different devices.
            </span>
          </div>
          <select
            value={config.conflictStrategy}
            onChange={(e) => updateConfig({ conflictStrategy: e.target.value as ConflictStrategy })}
            className="bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2 py-1 text-xs text-white"
          >
            <option value="last_write_wins">Newer Timestamp (Last Write Wins)</option>
            <option value="keep_both">Keep Both (Create Duplicate Note)</option>
            <option value="local_wins">Local Always Wins</option>
            <option value="remote_wins">Remote Always Wins</option>
          </select>
        </div>

        {/* Device Identifier */}
        <div className="flex items-center justify-between border-t border-[var(--border-default,#3f3f46)]/50 pt-3">
          <div>
            <span className="text-xs font-medium text-[var(--text-primary,#ffffff)] block">
              Device Identifier
            </span>
            <span className="text-[11px] text-[var(--text-secondary,#a1a1aa)]">
              Identifies this device to prevent echo updates during sync.
            </span>
          </div>
          <span className="font-mono text-xs text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
            {config.deviceId}
          </span>
        </div>
      </div>
    </div>
  );
};
