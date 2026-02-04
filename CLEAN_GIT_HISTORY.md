# Clean Git History - Remove Secrets

## Problem
Git is blocking pushes because API keys are present in commit history:
- `NETLIFY_SETUP.md:28` - commit 7346d82
- `js/config.js:2,11` - commits fcf07bc, 7346d82  
- `google-apps-script-sync.gs:20` - commits a936237, e5384e4

## Solution Options

### Option 1: Use BFG Repo-Cleaner (Recommended - Fastest)

```bash
# Install BFG (requires Java)
brew install bfg  # macOS
# OR download from: https://rtyley.github.io/bfg-repo-cleaner/

# Create backup
git branch backup-before-cleanup

# Clean secrets
bfg --replace-text secrets.txt

# Create secrets.txt file with:
# YOUR_ACTUAL_API_KEY==>YOUR_AIRTABLE_API_KEY_HERE
# YOUR_ACTUAL_BASE_ID==>YOUR_AIRTABLE_BASE_ID_HERE

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option 2: Use git filter-repo (Recommended - Modern)

```bash
# Install git-filter-repo
pip install git-filter-repo

# Create backup
git branch backup-before-cleanup

# Replace secrets in all commits
git filter-repo --replace-text <(echo "your-actual-api-key==>YOUR_AIRTABLE_API_KEY_HERE")
git filter-repo --replace-text <(echo "your-actual-base-id==>YOUR_AIRTABLE_BASE_ID_HERE")
```

### Option 3: Manual git filter-branch (Built-in, slower)

```bash
# Create backup
git branch backup-before-cleanup

# Replace API key in all commits
git filter-branch --force --index-filter \
  'git ls-files -s | sed "s-\t\"*-&NEWFILENAME-" | \
  GIT_INDEX_FILE=$GIT_INDEX_FILE.new git update-index --index-info && \
  mv $GIT_INDEX_FILE.new $GIT_INDEX_FILE' \
  --prune-empty --tag-name-filter cat -- --all

# Or use the provided script
chmod +x clean-git-history.sh
./clean-git-history.sh
```

### Option 4: Interactive Rebase (If only recent commits)

```bash
# Create backup
git branch backup-before-cleanup

# Interactive rebase from first commit with secrets
git rebase -i fcf07bc^  # Start before first commit with secrets

# For each commit, mark as 'edit', then:
# - Edit the file to replace secrets
# - git add <file>
# - git commit --amend --no-edit
# - git rebase --continue
```

## After Cleanup

1. **Verify secrets are gone:**
   ```bash
   git log -S "patCY3iFvBxudBbJl" --all
   git log -S "appv2VRiObNca7leq" --all
   ```
   Should return no results.

2. **Force push (if remote exists):**
   ```bash
   git push --force origin main
   ```
   ⚠️ **WARNING**: Only do this if you're working alone or have coordinated with your team!

3. **Rotate API Keys (IMPORTANT):**
   - Go to https://airtable.com/create/tokens
   - Create a new Personal Access Token
   - Update:
     - Local `js/config.js`
     - Netlify environment variables
     - Google Apps Script
   - Revoke the old token

## Current Status

✅ Fixed `NETLIFY_SETUP.md` - API key replaced with placeholder
🟥 Need to clean Git history
🟥 Need to force push (if remote exists)
🟥 Need to rotate API keys

## Quick Start (Recommended: git filter-repo)

```bash
# 1. Install git-filter-repo
pip install git-filter-repo

# 2. Create backup
git branch backup-before-cleanup-$(date +%Y%m%d)

# 3. Create replacement file
cat > /tmp/replacements.txt << EOF
YOUR_ACTUAL_API_KEY_HERE==>YOUR_AIRTABLE_API_KEY_HERE
YOUR_ACTUAL_BASE_ID_HERE==>YOUR_AIRTABLE_BASE_ID_HERE
EOF

# 4. Run filter-repo
git filter-repo --replace-text /tmp/replacements.txt

# 5. Verify
git log -S "YOUR_ACTUAL_API_KEY" --all
git log -S "YOUR_ACTUAL_BASE_ID" --all

# 6. Force push (if needed)
git push --force origin main
```
