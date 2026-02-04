# AI Enrichment Setup & Usage Guide

## Quick Start

### 1. Set Up OpenAI API Key

1. **Create OpenAI Account** (if you haven't):
   - Go to https://platform.openai.com/
   - Sign up / Log in

2. **Get API Key**:
   - Navigate to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name it "CampFinder Enrichment"
   - **Copy the key immediately** (you won't see it again)

3. **Add to Google Apps Script**:
   - Open your Google Apps Script editor
   - Find line 30: `const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';`
   - Replace `YOUR_OPENAI_API_KEY_HERE` with your actual API key
   - Save the script

### 2. Test the Setup

1. **Test with Single Camp** (optional):
   - In Apps Script, select `enrichCampsWithAI` from function dropdown
   - Click Run (▶️)
   - Check execution log and email for results

2. **Verify API Key Works**:
   - If you see errors about API key, double-check it's correct
   - Make sure you have credits in your OpenAI account

---

## Functions Available

### `enrichCampsWithAI()` - Manual Enrichment

**What it does:**
- Processes ALL camps that have a Website but are missing Description OR Primary Category
- Can be run manually anytime
- Processes up to ~90 camps in 30 minutes (with 20-second delays)
- Sends separate email summary

**When to use:**
- First-time setup (enrich all existing camps)
- After adding new categories to Categories table
- When you want to refresh descriptions/categories

**How to run:**
1. Open Apps Script editor
2. Select `enrichCampsWithAI` from function dropdown
3. Click Run (▶️)
4. Check email for summary

### `enrichNewCampsFromSync()` - Automatic Enrichment

**What it does:**
- Automatically runs after Google Sheets sync creates new camps
- Only processes newly created camps
- Integrated into sync workflow
- Stats included in sync email summary

**When it runs:**
- Automatically after `batchCreateAirtableCamps()` completes
- Only if new camps were created
- Only if camps have Website but missing Description or Category

**No manual action needed** - it runs automatically!

---

## How It Works

### Process Flow:

1. **Fetch Website Content**:
   - Uses `UrlFetchApp.fetch()` to get HTML
   - Extracts text content (removes HTML tags, scripts, styles)
   - Limits to 5000 characters to save tokens

2. **Call OpenAI API**:
   - Sends camp name + website content to OpenAI
   - Uses gpt-3.5-turbo model
   - Prompt asks for:
     - 2-3 sentence description
     - Best matching category from Categories table

3. **Match Category**:
   - Tries exact match (case-insensitive)
   - Tries partial match (contains)
   - Tries fuzzy matching with synonyms
   - If no match: logs in email for you to review

4. **Update Airtable**:
   - Updates Description field (if empty)
   - Updates Primary Category field (if empty and match found)
   - Skips if both already filled

### Rate Limiting:

- **20 seconds delay** between requests (respects free tier: 3 req/min)
- If you upgrade to paid tier, change `OPENAI_DELAY_SECONDS` to 2-3

---

## Email Summaries

### Sync Email (includes AI stats if new camps enriched):
- Shows AI enrichment stats in separate section
- Lists unmatched categories (for improving Categories table)
- Shows errors and skipped camps

### Manual Enrichment Email:
- Separate email sent after `enrichCampsWithAI()` completes
- Shows:
  - Camps processed/enriched
  - Descriptions added
  - Categories added
  - Unmatched categories (with AI suggestions)
  - Errors and skipped camps

---

## Unmatched Categories

When AI suggests a category that doesn't match your Categories table, it's logged in the email:

```
Unmatched Categories (for improving Categories table):
- Camp Name: "Science Adventure Camp"
  AI Suggested: "Science & Technology"
  Available Categories: Sports, Arts & Crafts, STEM, Nature & Outdoor...
```

**What to do:**
- Review these suggestions
- Add new categories to Categories table if needed
- Or add synonyms to the `synonymMap` in `matchCategoryToAirtable()` function

---

## Cost Estimation

### Per Camp:
- **gpt-3.5-turbo**: ~$0.005-0.01 per camp
- Input: ~500-1000 tokens (camp name + website content)
- Output: ~100-200 tokens (description + category)

### For 100 Camps:
- **Total cost**: ~$0.50-1.00

### Monitoring:
- Check usage at: https://platform.openai.com/usage
- Set up usage alerts in OpenAI dashboard

---

## Troubleshooting

### "OpenAI API key not configured"
- Make sure you've added your API key to line 30
- Check for typos or extra spaces

### "Rate limit exceeded"
- You're hitting OpenAI rate limits
- Free tier: 3 requests/minute
- Solution: Increase `OPENAI_DELAY_SECONDS` or upgrade to paid tier

### "Could not fetch website content"
- Website might be blocking bots
- Website might require JavaScript (we can't execute JS)
- Website might be down
- **Action**: Check website manually, skip if inaccessible

### "AI did not return valid description"
- OpenAI might have returned invalid JSON
- Check execution log for details
- **Action**: Camp will be skipped, try again later

### Script Times Out
- Google Apps Script has 30-minute limit (with triggers)
- Script processes ~90 camps in 30 minutes
- **Solution**: Run `enrichCampsWithAI()` multiple times until all camps processed

---

## Upgrading to Paid Tier

If you upgrade OpenAI to paid tier:

1. **Update delay** (line 33):
   ```javascript
   const OPENAI_DELAY_SECONDS = 3; // Faster for paid tier
   ```

2. **Check new rate limits**:
   - Paid tier has higher limits
   - Adjust delay accordingly

---

## Customization

### Change Model:
Edit line 31:
```javascript
const OPENAI_MODEL = 'gpt-4o-mini'; // Better quality, more expensive
```

### Add Category Synonyms:
Edit the `synonymMap` in `matchCategoryToAirtable()` function (around line 1100):
```javascript
const synonymMap = {
  'science': 'STEM',
  'your-key': 'Your Category Name',
  // Add more mappings here
};
```

### Change Description Length:
Edit the prompt in `callOpenAIForEnrichment()` function:
```javascript
"Write a 2-3 sentence description..." // Change to "Write a 4-5 sentence description..."
```

---

## Best Practices

1. **Start Small**: Test with `enrichCampsWithAI()` on a few camps first
2. **Monitor Costs**: Check OpenAI usage dashboard regularly
3. **Review Unmatched Categories**: Use them to improve your Categories table
4. **Run During Off-Hours**: Manual enrichment can take 30+ minutes
5. **Keep API Key Secure**: Don't share your script publicly with API key

---

## Next Steps

1. ✅ Add OpenAI API key to script
2. ✅ Test with `enrichCampsWithAI()` on a few camps
3. ✅ Review results and unmatched categories
4. ✅ Add new categories to Categories table if needed
5. ✅ Run full enrichment when ready
6. ✅ Let automatic enrichment handle new camps from sync
