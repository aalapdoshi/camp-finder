# How to Run git-filter-repo

## Step 1: Install git-filter-repo

```bash
# Install using pip (recommended)
pip3 install git-filter-repo

# OR if you prefer pipx (isolated installation)
pipx install git-filter-repo

# Verify installation
git-filter-repo --version
```

## Step 2: Create Backup Branch

```bash
cd /Users/aalapd/Documents/Development/CampFinder_v1
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S)

# Verify backup was created
git branch | grep backup
```

## Step 3: Create Replacements File

```bash
# Create the replacements file
cat > /tmp/replacements.txt << 'EOF'
YOUR_ACTUAL_API_KEY_HERE==>YOUR_AIRTABLE_API_KEY_HERE
YOUR_ACTUAL_BASE_ID_HERE==>YOUR_AIRTABLE_BASE_ID_HERE
EOF

# Verify file contents
cat /tmp/replacements.txt
```

## Step 4: Run git-filter-repo

```bash
cd /Users/aalapd/Documents/Development/CampFinder_v1

# Run filter-repo to replace secrets
# NOTE: Use python3 -m git_filter_repo (not "git filter-repo")
python3 -m git_filter_repo --replace-text /tmp/replacements.txt

# This will:
# - Rewrite all commits in history
# - Replace the API keys with placeholders
# - Show progress as it processes
```

## Step 5: Verify Secrets Are Gone

```bash
# Check for API key (should return nothing)
git log -S "patCY3iFvBxudBbJl" --all

# Check for Base ID (should return nothing)
git log -S "appv2VRiObNca7leq" --all

# If you see results, the cleanup didn't work - check the replacements file
```

## Step 6: Clean Up Git References

```bash
# Remove old references and optimize repository
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Step 7: Force Push (If You Have a Remote)

⚠️ **WARNING**: Only do this if you're working alone or have coordinated with your team!

```bash
# Check your remote
git remote -v

# Force push to overwrite remote history
git push --force origin main

# Or if your branch has a different name:
# git push --force origin <your-branch-name>
```

## Step 8: Rotate Your API Keys (IMPORTANT!)

After cleaning history, you should rotate your API keys:

1. **Airtable**:
   - Go to https://airtable.com/create/tokens
   - Create a new Personal Access Token
   - Revoke the old token
   - Update:
     - Local `js/config.js`
     - Netlify environment variables
     - Google Apps Script

## Troubleshooting

### "git-filter-repo: command not found" or "filter-repo is not a git command"
- **Use**: `python3 -m git_filter_repo` (with underscore, not hyphen)
- This is the correct way to run it after pip installation
- Alternative: Check if script exists: `~/.local/bin/git-filter-repo` (may need PATH update)

### "fatal: not a git repository"
- Make sure you're in the project directory: `cd /Users/aalapd/Documents/Development/CampFinder_v1`

### "Repository has been modified"
- Make sure you've committed or stashed all changes: `git status`
- Commit any pending changes first

### Still seeing secrets after cleanup
- Double-check the replacements file format (must be `old==>new`)
- Make sure you're searching correctly: `git log -S "exact-string" --all`
- Try searching in specific files: `git log --all -- "NETLIFY_SETUP.md" | grep "patCY3iFvBxudBbJl"`

## Quick Copy-Paste Commands

```bash
# Install
pip3 install git-filter-repo

# Backup
cd /Users/aalapd/Documents/Development/CampFinder_v1
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S)

# Create replacements
cat > /tmp/replacements.txt << 'EOF'
YOUR_ACTUAL_API_KEY_HERE==>YOUR_AIRTABLE_API_KEY_HERE
YOUR_ACTUAL_BASE_ID_HERE==>YOUR_AIRTABLE_BASE_ID_HERE
EOF

# Run cleanup
python3 -m git_filter_repo --replace-text /tmp/replacements.txt

# Verify
git log -S "YOUR_ACTUAL_API_KEY" --all
git log -S "YOUR_ACTUAL_BASE_ID" --all

# Cleanup
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (if needed)
git push --force origin main
```
