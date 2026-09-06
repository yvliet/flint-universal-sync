/**
 * @module SupabaseWizard
 * @description
 * Interactive onboarding wizard guiding users through setting up a free-tier
 * Supabase PostgreSQL database for cross-device note synchronization in under 2 minutes.
 */

import React, { useState } from 'react';
import { SupabaseProvider } from '../providers/SupabaseProvider';

interface SupabaseWizardProps {
  projectUrl: string;
  anonKey: string;
  onUpdateCredentials: (projectUrl: string, anonKey: string) => void;
  onTestConnection: () => void;
  isTesting: boolean;
}

export const SupabaseWizard: React.FC<SupabaseWizardProps> = ({
  projectUrl,
  anonKey,
  onUpdateCredentials,
  onTestConnection,
  isTesting,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!projectUrl || !anonKey);

  const provider = new SupabaseProvider({ projectUrl, anonKey }, 'wizard');
  const sqlScript = provider.getSchemaScript();

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Clipboard write fallback
    }
  };

  return (
    <div className="border border-[var(--color-primary,#6366f1)]/30 bg-[var(--bg-secondary,#18181b)] rounded-lg p-4 space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 flex items-center justify-center text-[#3ecf8e] text-base font-bold select-none">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-[var(--text-primary,#ffffff)]">
                Recommended: Supabase Free Tier Setup
              </h4>
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]/30 rounded">
                100% Free Forever
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary,#a1a1aa)] mt-0.5">
              500 MB PostgreSQL cloud storage with zero subscriptions or credit card requirements.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#ffffff)] px-2.5 py-1 rounded bg-[var(--bg-tertiary,#27272a)] border border-[var(--border-default,#3f3f46)]"
        >
          {isExpanded ? 'Hide Steps' : 'Show Setup Steps'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-[var(--border-default,#3f3f46)]/50">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[var(--bg-tertiary,#27272a)] text-[var(--text-primary,#ffffff)] text-xs flex items-center justify-center font-semibold border border-[var(--border-default,#3f3f46)] shrink-0 mt-0.5">
              1
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[var(--text-primary,#ffffff)] font-medium">
                Create a free project on Supabase
              </p>
              <p className="text-[11px] text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
                Sign in to <span className="font-mono text-emerald-400">supabase.com</span> and click{' '}
                <strong>New Project</strong>. Choose your nearest region and set any secure database password.
              </p>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#3ecf8e] hover:underline font-medium pt-1"
              >
                Open Supabase Dashboard →
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[var(--bg-tertiary,#27272a)] text-[var(--text-primary,#ffffff)] text-xs flex items-center justify-center font-semibold border border-[var(--border-default,#3f3f46)] shrink-0 mt-0.5">
              2
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-primary,#ffffff)] font-medium">
                  Run this 1-click table schema in Supabase SQL Editor
                </p>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className={`text-xs px-2.5 py-1 rounded font-medium border flex items-center gap-1.5 ${
                    copiedSql
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/40 hover:bg-[#3ecf8e]/20'
                  }`}
                >
                  {copiedSql ? '✓ Copied to Clipboard!' : '📋 Copy SQL Script'}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary,#a1a1aa)]">
                In Supabase, open <strong>SQL Editor</strong> on the left, click <strong>New query</strong>, paste the copied SQL, and click <strong>Run</strong>.
              </p>
              <pre className="text-[10px] font-mono bg-black/40 p-2.5 rounded border border-[var(--border-default,#3f3f46)] text-neutral-300 max-h-28 overflow-y-auto select-all">
                {sqlScript}
              </pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[var(--bg-tertiary,#27272a)] text-[var(--text-primary,#ffffff)] text-xs flex items-center justify-center font-semibold border border-[var(--border-default,#3f3f46)] shrink-0 mt-0.5">
              3
            </div>
            <div className="space-y-3 flex-1">
              <p className="text-xs text-[var(--text-primary,#ffffff)] font-medium">
                Paste Project URL and Anon Key
              </p>
              <p className="text-[11px] text-[var(--text-secondary,#a1a1aa)]">
                In your Supabase project, go to <strong>Project Settings → API</strong>. Copy your <strong>Project URL</strong> and <strong>anon public API key</strong> below:
              </p>

              <div className="space-y-2 bg-[var(--bg-tertiary,#27272a)]/50 p-3 rounded border border-[var(--border-default,#3f3f46)]">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-primary,#ffffff)] mb-1">
                    Project URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://abcdefghijklm.supabase.co"
                    value={projectUrl}
                    onChange={(e) => onUpdateCredentials(e.target.value, anonKey)}
                    className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary,#ffffff)] focus:outline-none focus:border-[#3ecf8e]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-primary,#ffffff)] mb-1">
                    Anon / Public API Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => onUpdateCredentials(projectUrl, e.target.value)}
                    className="w-full bg-[var(--bg-primary,#121214)] border border-[var(--border-default,#3f3f46)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary,#ffffff)] focus:outline-none focus:border-[#3ecf8e]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onTestConnection}
                    disabled={isTesting || !projectUrl || !anonKey}
                    className="px-3 py-1.5 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black text-xs font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTesting ? 'Testing Connection...' : '⚡ Test Connection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
