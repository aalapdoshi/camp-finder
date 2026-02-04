# Quick Git History Cleanup

## Correct Command

Use `python3 -m git_filter_repo` (with underscore, not `git filter-repo`)

## Full Commands to Run

```bash
# 1. Navigate to project
cd /Users/aalapd/Documents/Development/CampFinder_v1

# 2. Create backup
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S)

# 3. Create replacements file
cat > /tmp/replacements.txt << 'EOF'
YOUR_ACTUAL_API_KEY_HERE==>YOUR_AIRTABLE_API_KEY_HERE
YOUR_ACTUAL_BASE_ID_HERE==>YOUR_AIRTABLE_BASE_ID_HERE
EOF

# 4. Run cleanup (CORRECT COMMAND)
python3 -m git_filter_repo --replace-text /tmp/replacements.txt

# 5. Verify secrets are gone
git log -S "YOUR_ACTUAL_API_KEY" --all
git log -S "YOUR_ACTUAL_BASE_ID" --all

# 6. Clean up Git references
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 7. Force push (if you have a remote)
git push --force origin main
```

## Key Point

✅ **Correct**: `python3 -m git_filter_repo`  
❌ **Wrong**: `git filter-repo`
