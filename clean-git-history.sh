#!/bin/bash
# Script to remove API keys from Git history
# WARNING: This rewrites Git history. Make sure you have a backup!

set -e

echo "⚠️  WARNING: This script will rewrite Git history!"
echo "Make sure you have a backup branch before proceeding."
echo ""
read -p "Have you created a backup branch? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Creating backup branch now..."
    git branch backup-before-history-cleanup-$(date +%Y%m%d-%H%M%S)
    echo "✅ Backup branch created"
fi

echo ""
echo "Starting history cleanup..."

# API keys to replace (update with your actual keys)
AIRTABLE_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
AIRTABLE_BASE_ID="YOUR_ACTUAL_BASE_ID_HERE"

# Replacements
AIRTABLE_API_KEY_REPLACEMENT="YOUR_AIRTABLE_API_KEY_HERE"
AIRTABLE_BASE_ID_REPLACEMENT="YOUR_AIRTABLE_BASE_ID_HERE"

# Files to clean
FILES_TO_CLEAN=(
    "NETLIFY_SETUP.md"
    "js/config.js"
    "google-apps-script-sync.gs"
)

echo ""
echo "Cleaning secrets from Git history..."

# Use git filter-branch to replace secrets in all commits
for file in "${FILES_TO_CLEAN[@]}"; do
    echo "Cleaning $file..."
    
    # Replace API key
    git filter-branch --force --index-filter \
        "git update-index --cacheinfo 100644 \
        \$(git show HEAD:\"$file\" | sed 's/$AIRTABLE_API_KEY/$AIRTABLE_API_KEY_REPLACEMENT/g' | \
        git hash-object -w --stdin),\"$file\"" \
        --prune-empty --tag-name-filter cat -- --all 2>/dev/null || true
    
    # Replace Base ID
    git filter-branch --force --index-filter \
        "git update-index --cacheinfo 100644 \
        \$(git show HEAD:\"$file\" | sed 's/$AIRTABLE_BASE_ID/$AIRTABLE_BASE_ID_REPLACEMENT/g' | \
        git hash-object -w --stdin),\"$file\"" \
        --prune-empty --tag-name-filter cat -- --all 2>/dev/null || true
done

echo ""
echo "✅ History cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Verify no secrets remain: git log -S \"$AIRTABLE_API_KEY\" --all"
echo "2. If clean, force push: git push --force origin main"
echo "3. IMPORTANT: Rotate your API keys in Airtable dashboard"
