# Universal External Sync (`flint-universal-sync`)

Cross-device note synchronization extension for [Flint](https://flintnotes.com). Sync your notes and knowledge graph across desktop and mobile machines using your own free-tier database with zero subscriptions, zero tracking, and complete data sovereignty.

Authored by **Yuliet Li**.

---

## 1. Supported Cloud Database Providers

- **Supabase PostgreSQL (Recommended)**: 100% free forever (500 MB database, instant PostgREST HTTP APIs, zero maintenance).
- **Turso / libSQL**: Ultra-low latency edge SQLite over the Hrana v2 HTTP pipeline.
- **Cloudflare D1**: Serverless SQL database running on Cloudflare's global edge network.
- **Custom Self-Hosted REST**: Connects to any private REST sync server or webhook endpoint.

---

## 2. Quick Start: Supabase Free Tier in Under 2 Minutes

Supabase provides 500 MB of permanent free PostgreSQL storage, which is enough to store tens of thousands of markdown notes, canvases, and metadata records without ever entering a credit card.

### Step 1: Create a Free Project
1. Visit [supabase.com](https://supabase.com) and click **New Project**.
2. Select your organization and choose your closest geographic region.
3. Choose any database password and click **Create new project**.

### Step 2: Create the Sync Table
1. In your Supabase project dashboard, open the **SQL Editor** from the left navigation bar.
2. Click **New query** and paste the following SQL script:

```sql
-- 1. Create the Flint Sync Documents table
CREATE TABLE IF NOT EXISTS flint_sync_documents (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_json TEXT NOT NULL DEFAULT '',
  is_daily_note INTEGER NOT NULL DEFAULT 0,
  is_folder INTEGER NOT NULL DEFAULT 0,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  doc_type TEXT NOT NULL DEFAULT 'base',
  properties TEXT NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT DEFAULT NULL,
  device_id TEXT
);

-- 2. Create performance indexes for rapid delta queries
CREATE INDEX IF NOT EXISTS idx_flint_sync_updated ON flint_sync_documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_flint_sync_deleted ON flint_sync_documents(deleted_at);

-- 3. Enable Row Level Security (RLS) and permit CRUD access for your API key
ALTER TABLE flint_sync_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Flint Sync CRUD" ON flint_sync_documents;
CREATE POLICY "Allow Flint Sync CRUD" ON flint_sync_documents
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

3. Click **Run** (`Ctrl+Enter` or `Cmd+Enter`). You will see "Success. No rows returned".

### Step 3: Connect Flint
1. In Supabase, go to **Project Settings → API**.
2. Copy your **Project URL** (e.g. `https://abcdefghijkl.supabase.co`).
3. Copy your **anon public key** (`eyJhbGci...`).
4. In Flint, open **Settings → Universal Sync**.
5. Paste the Project URL and Anon Key into the setup wizard.
6. Click **Test Connection** (you should see a green verification checkmark), then click **Sync Now**.

---

## 3. Alternative Providers Setup

### Turso libSQL
1. Create a database using the Turso CLI:
   ```bash
   turso db create flint-sync
   ```
2. Open the SQL shell:
   ```bash
   turso db shell flint-sync
   ```
3. Run the schema creation:
   ```sql
   CREATE TABLE IF NOT EXISTS flint_sync_documents (
     id TEXT PRIMARY KEY,
     parent_id TEXT,
     title TEXT NOT NULL DEFAULT 'Untitled',
     content_json TEXT NOT NULL DEFAULT '',
     is_daily_note INTEGER NOT NULL DEFAULT 0,
     is_folder INTEGER NOT NULL DEFAULT 0,
     is_bookmarked INTEGER NOT NULL DEFAULT 0,
     doc_type TEXT NOT NULL DEFAULT 'base',
     properties TEXT NOT NULL DEFAULT '{}',
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     deleted_at INTEGER DEFAULT NULL,
     device_id TEXT
   );
   CREATE INDEX IF NOT EXISTS idx_flint_sync_updated ON flint_sync_documents(updated_at);
   CREATE INDEX IF NOT EXISTS idx_flint_sync_deleted ON flint_sync_documents(deleted_at);
   ```
4. Generate an authentication token:
   ```bash
   turso db tokens create flint-sync
   ```
5. Paste your `libsql://...` URL and Auth Token in Flint Settings.

---

## 4. Extension Features & Architecture

- **Debounced Auto-Sync on Save**: Automatically syncs 2.5 seconds after editing notes without blocking typing or causing frame drops.
- **Tombstone Deletion Propagation**: Deleted notes are recorded as tombstones (`deleted_at` timestamp) so deletions replicate across devices instead of resurrecting old notes. Old tombstones are pruned automatically after 30 days.
- **Configurable Conflict Strategies**:
  - `Newer Timestamp (Last Write Wins)`: Standard distributed clock merge.
  - `Keep Both (Create Conflict Copy)`: Preserves both versions by creating a `[Conflict Copy] Note Title` document.
  - `Local Always Wins`: Preserves local changes and ignores remote conflicts.
  - `Remote Always Wins`: Overwrites local modifications with incoming remote changes.
- **Status Bar Integration**: Clickable indicator in the bottom right corner shows current status (`☁️ Synced`, `🔄 Syncing...`, `⚠️ Sync Error`) and last sync timestamp.
- **Command Palette (`Ctrl+K`)**:
  - `Universal Sync: Synchronize Notes Now` (Hotkey: `Ctrl+Shift+S`)
  - `Universal Sync: Test Database Connection`
  - `Universal Sync: Open Sync Settings & Setup Wizard`
- **Model Context Protocol (MCP) AI Tools**:
  - `flint-universal-sync_sync_now`: Allows AI agents to trigger note synchronization.
  - `flint-universal-sync_get_sync_status`: Inspects telemetry, database status, and pending counts.
  - `flint-universal-sync_test_connection`: Verifies database reachability and table status.

---

## 5. Development & Publishing

### Local Build
```bash
npm install
npm run build
```
This produces `dist/main.js`.

### Local Testing in Flint
Copy `manifest.json` and `dist/main.js` to your Hearth's extension directory:
```bash
mkdir -p "<my-hearth>/.flint/extensions/flint-universal-sync"
cp manifest.json dist/main.js "<my-hearth>/.flint/extensions/flint-universal-sync/"
```
Then click **Reload extensions** in Flint Settings.

### Publishing to the Flint Community Registry
Tag a release version in git:
```bash
git tag v1.0.0
git push origin v1.0.0
```
The included GitHub Action (`.github/workflows/publish.yml`) will automatically build and publish the bundle to the remote Flint Turso Registry.

---

## 6. License

MIT License • Created with pride by Yuliet Li for the Flint Community.
