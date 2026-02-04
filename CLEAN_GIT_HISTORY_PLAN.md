# Clean Git History Plan - Remove Secrets

**Overall Progress:** `0%`

## TLDR
Remove API keys and secrets from Git commit history. Secrets are currently in multiple commits:
- `NETLIFY_SETUP.md` (line 28) - commit 7346d82
- `js/config.js` (lines 2, 11) - commits fcf07bc, 7346d82
- `google-apps-script-sync.gs` (line 20) - commits a936237, e5384e4

## Critical Decisions
- **Approach**: Use `git filter-branch` or `git filter-repo` to rewrite history
- **Strategy**: Replace actual API keys with placeholders in all affected commits
- **Safety**: Create backup branch before rewriting history
- **After cleanup**: Force push required (coordinate with team if shared repo)

## Tasks:

- [ ] 🟥 **Step 1: Fix Current Files**
  - [x] 🟩 Remove API key from NETLIFY_SETUP.md (replace with placeholder)
  - [ ] 🟥 Verify all example/template files use placeholders only
  - [ ] 🟥 Ensure .gitignore properly excludes secret files

- [ ] 🟥 **Step 2: Backup Current State**
  - [ ] 🟥 Create backup branch: `git branch backup-before-history-cleanup`
  - [ ] 🟥 Verify backup branch contains all commits

- [ ] 🟥 **Step 3: Remove Secrets from Git History**
  
  **Option A: Using git filter-branch (built-in)**
  - [ ] 🟥 Run filter-branch to replace API keys in NETLIFY_SETUP.md
  - [ ] 🟥 Run filter-branch to replace API keys in js/config.js
  - [ ] 🟥 Run filter-branch to replace API keys in google-apps-script-sync.gs
  
  **Option B: Using git filter-repo (recommended, faster)**
  - [ ] 🟥 Install git-filter-repo: `pip install git-filter-repo`
  - [ ] 🟥 Use filter-repo to replace secrets in all files across all commits
  
  **Option C: Interactive rebase (if only recent commits)**
  - [ ] 🟥 Use `git rebase -i` to edit commits containing secrets
  - [ ] 🟥 Replace secrets with placeholders in each commit

- [ ] 🟥 **Step 4: Verify Cleanup**
  - [ ] 🟥 Search git log for API keys: `git log -S "patCY3iFvBxudBbJl" --all`
  - [ ] 🟥 Search git log for base ID: `git log -S "appv2VRiObNca7leq" --all`
  - [ ] 🟥 Verify no secrets found in history

- [ ] 🟥 **Step 5: Force Push (if remote exists)**
  - [ ] 🟥 **WARNING**: Only if working alone or team coordinated
  - [ ] 🟥 Force push: `git push --force origin main` (or your branch name)
  - [ ] 🟥 Verify remote no longer has secrets

- [ ] 🟥 **Step 6: Rotate API Keys (Security Best Practice)**
  - [ ] 🟥 Generate new Airtable API key
  - [ ] 🟥 Update local config.js with new key
  - [ ] 🟥 Update Netlify environment variables
  - [ ] 🟥 Update Google Apps Script with new key
  - [ ] 🟥 Revoke old API key in Airtable dashboard
