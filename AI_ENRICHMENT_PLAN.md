# AI-Powered Camp Enrichment Implementation Plan

## Goal

Use OpenAI API to automatically enrich camp data by:
1. **Scraping camp websites** to extract descriptions
2. **Categorizing camps** based on name + description using predefined Categories table
3. Only filling empty `Description` and `Primary Category` fields
4. Running automatically after Google Sheets sync, with manual trigger option

---

## 1. OpenAI API Setup

### What You Need to Do:

1. **Create OpenAI Account**:
   - Go to https://platform.openai.com/
   - Sign up / Log in
   - Navigate to API Keys: https://platform.openai.com/api-keys

2. **Create API Key**:
   - Click "Create new secret key"
   - Name it "CampFinder Enrichment" (or similar)
   - **Copy the key immediately** (you won't see it again)
   - Store it securely

3. **Add to Google Apps Script**:
   - Open your Google Apps Script editor
   - Add the API key to the configuration section:
     ```javascript
     const OPENAI_API_KEY = 'sk-your-actual-api-key-here';
     ```

4. **Understand Costs**:
   - OpenAI charges per token (input + output)
   - Estimated cost per camp: ~$0.01-0.03 (depends on website size)
   - For 100 camps: ~$1-3 per full run
   - Monitor usage at: https://platform.openai.com/usage

5. **Rate Limits**:
   - Free tier: 3 requests/minute, 200 requests/day
   - Paid tier: Higher limits (check current limits on OpenAI dashboard)
   - **Recommendation**: Start with paid tier for production use

---

## 2. Implementation Architecture

### Functions to Create:

1. **`enrichCampsWithAI()`** - Main function (manual trigger)
   - Processes ALL camps with website but empty Description OR Primary Category
   - Can be run manually anytime
   - Sends email summary

2. **`enrichNewCampsFromSync(newCamps)`** - Called during sync
   - Processes only newly created camps from sync
   - Called automatically after `batchCreateAirtableCamps()`
   - Lightweight, processes only new camps

3. **`fetchWebsiteContent(url)`** - Helper function
   - Fetches website HTML using `UrlFetchApp.fetch()`
   - Extracts text content (removes HTML tags)
   - Handles errors gracefully

4. **`callOpenAIForEnrichment(campName, websiteContent)`** - Helper function
   - Calls OpenAI API with prompt
   - Returns: { description, category }
   - Handles API errors and rate limiting

5. **`matchCategoryToAirtable(aiCategory, airtableCategories)`** - Helper function
   - Fuzzy matches AI-suggested category to Categories table
   - Returns matched category name or null if no match

### Integration Points:

- **After sync completes**: Call `enrichNewCampsFromSync(newCamps)` automatically
- **Manual trigger**: Run `enrichCampsWithAI()` from function dropdown
- **Email summary**: Include AI enrichment stats in sync summary email

---

## 3. Batch Processing Strategy

### Recommendation: Sequential Processing with Delays

**Why Sequential:**
- Google Apps Script has 6-minute execution time limit (can be extended to 30 min with triggers)
- OpenAI API has rate limits (3 req/min free, higher paid)
- Need to handle errors gracefully per camp
- Easier to track progress and resume if needed

**Implementation:**
- Process camps one at a time (not in parallel batches)
- Add delays between requests:
  - **Free tier**: 20 seconds between requests (3 req/min)
  - **Paid tier**: 2-3 seconds between requests (faster)
- Track progress in script properties (if script times out, can resume)
- Update Airtable immediately after each successful enrichment (don't batch)

**Alternative (if you upgrade to paid tier):**
- Process 3-5 camps in parallel (still respect rate limits)
- Faster but more complex error handling

---

## 4. OpenAI API Usage

### Approach: Pass Website Content to OpenAI

**Why not use OpenAI's web browsing:**
- OpenAI's browsing capability is limited/experimental
- More reliable to fetch content ourselves and pass it
- Better control over what content is analyzed

### Prompt Design:

```
You are helping categorize summer camps for children.

Camp Name: [Camp Name]
Website Content: [Extracted text from website]

Tasks:
1. Write a 2-3 sentence description of this camp based on the website content. Focus on what makes this camp unique, what activities it offers, and who it's for.

2. Categorize this camp into ONE of these categories:
[List of categories from Airtable Categories table]

Choose the best matching category. If none match well, respond with "NO_MATCH".

Respond in JSON format:
{
  "description": "...",
  "category": "..."
}
```

### API Call Structure:

```javascript
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer [API_KEY]
  Content-Type: application/json
Body:
{
  "model": "gpt-4o-mini",  // or "gpt-3.5-turbo" (cheaper)
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant that analyzes summer camp websites..."
    },
    {
      "role": "user",
      "content": "[Prompt with camp name and website content]"
    }
  ],
  "temperature": 0.3,  // Lower = more consistent
  "max_tokens": 500     // Limit response length
}
```

---

## 5. Website Content Extraction

### Strategy: Simple HTML → Text Extraction

**Google Apps Script Limitations:**
- `UrlFetchApp.fetch()` can fetch HTML
- No built-in HTML parser, but we can use regex or simple string manipulation
- For complex sites, extract main content areas

**Implementation:**
1. Fetch HTML with `UrlFetchApp.fetch(url)`
2. Remove `<script>`, `<style>`, `<nav>`, `<footer>` tags (regex)
3. Extract text from `<body>` or main content areas
4. Clean up whitespace and limit to ~5000 characters (to save tokens)
5. If fetch fails, skip camp and log error

**Fallback:**
- If website is inaccessible, skip camp
- Log error in email summary

---

## 6. Category Matching Logic

### Fuzzy Matching Algorithm:

1. **Exact match**: Check if AI category exactly matches any Category Name
2. **Case-insensitive match**: Check ignoring case
3. **Partial match**: Check if AI category contains Category Name (or vice versa)
4. **Synonym matching**: Hardcoded mappings (e.g., "Science" → "STEM", "Art" → "Arts & Crafts")
5. **If no match**: Return null, don't set Primary Category

**Example mappings:**
- "Science" / "Technology" / "Engineering" → "STEM"
- "Art" / "Crafts" / "Creative" → "Arts & Crafts"
- "Sports" / "Athletics" → "Sports"
- "Nature" / "Outdoor" / "Environmental" → "Nature & Outdoor"

---

## 7. Error Handling

### Skip and Log Strategy:

**Skip camp if:**
- Website URL is missing/invalid
- Website fetch fails (404, 403, timeout, etc.)
- OpenAI API call fails (rate limit, API error, etc.)
- OpenAI returns invalid JSON
- Category doesn't match any in Categories table
- Description is empty (AI didn't generate one)

**Logging:**
- Track skipped camps with reason
- Include in email summary
- Continue processing remaining camps

---

## 8. Workflow Integration

### Automatic (After Sync):

```javascript
// In syncCampsToAirtable(), after creating new camps:
if (campsToCreate.length > 0) {
  batchCreateAirtableCamps(campsToCreate, stats);
  
  // Enrich newly created camps
  const newCampRecords = campsToCreate.map(camp => ({
    name: camp.fields['Camp Name'],
    website: camp.fields['Website']
  }));
  
  enrichNewCampsFromSync(newCampRecords, stats);
}
```

### Manual Trigger:

- User selects `enrichCampsWithAI` from function dropdown
- Runs independently of sync
- Processes all eligible camps

---

## 9. Execution Time Considerations

### Google Apps Script Limits:

- **Default**: 6 minutes execution time
- **With trigger**: 30 minutes execution time
- **For 100 camps**: ~33-50 minutes at 20 sec/camp (free tier)
- **Solution**: Use time-based trigger or process in chunks

### Chunking Strategy (if needed):

- Process camps in batches of 10-15
- Store progress in Script Properties
- Resume from last processed camp if script times out
- Or: Run multiple times manually until all camps processed

---

## 10. Cost Estimation

### Per Camp:
- Website fetch: Free (Google Apps Script)
- OpenAI API call: ~$0.01-0.03 per camp
  - Input tokens: ~500-1000 (camp name + website content)
  - Output tokens: ~100-200 (description + category)
  - Using gpt-4o-mini: ~$0.01/camp
  - Using gpt-3.5-turbo: ~$0.005/camp

### For 100 Camps:
- **gpt-4o-mini**: ~$1-2
- **gpt-3.5-turbo**: ~$0.50-1

### Recommendation:
- Start with **gpt-3.5-turbo** (cheaper, good enough quality)
- Upgrade to **gpt-4o-mini** if quality isn't sufficient

---

## 11. Implementation Steps

### Phase 1: Setup
1. Create OpenAI account and API key
2. Add API key to Google Apps Script config
3. Test API connection with simple call

### Phase 2: Core Functions
1. Implement `fetchWebsiteContent(url)`
2. Implement `callOpenAIForEnrichment(campName, websiteContent)`
3. Implement `matchCategoryToAirtable(aiCategory, airtableCategories)`
4. Test with single camp

### Phase 3: Integration
1. Implement `enrichNewCampsFromSync(newCamps)`
2. Integrate into sync workflow
3. Test with small batch

### Phase 4: Manual Function
1. Implement `enrichCampsWithAI()`
2. Add progress tracking
3. Test with all eligible camps

### Phase 5: Error Handling & Polish
1. Add comprehensive error handling
2. Update email summary to include AI stats
3. Test edge cases
4. Document usage

---

## 12. Edge Cases to Handle

1. **Website requires JavaScript**: Extract what we can from HTML
2. **Website blocks bots**: Skip and log
3. **Website is very large**: Limit content to first 5000 chars
4. **AI returns malformed JSON**: Try to parse, skip if fails
5. **AI suggests invalid category**: Use fuzzy matching, skip if no match
6. **Description already exists**: Skip (per requirement)
7. **Primary Category already exists**: Skip (per requirement)
8. **OpenAI rate limit hit**: Wait and retry, or skip and log
9. **Script execution timeout**: Resume from last camp (if chunking implemented)

---

## 13. Testing Strategy

1. **Unit Tests** (manual):
   - Test `fetchWebsiteContent()` with various URLs
   - Test `callOpenAIForEnrichment()` with sample data
   - Test `matchCategoryToAirtable()` with various inputs

2. **Integration Tests**:
   - Test with 1-2 camps manually
   - Test with new camps during sync
   - Test manual enrichment function

3. **Production Test**:
   - Run on small subset (5-10 camps)
   - Verify descriptions and categories
   - Check costs
   - Run full batch if successful

---

## 14. Monitoring & Maintenance

### Track:
- Number of camps enriched per run
- Number of camps skipped (with reasons)
- API costs per run
- Execution time
- Error rates

### Email Summary Should Include:
- Total camps processed
- Descriptions added
- Categories assigned
- Skipped camps (with reasons)
- Estimated API cost
- Execution time

---

## 15. Questions / Clarifications Needed

1. **Model Choice**: Do you prefer gpt-3.5-turbo (cheaper) or gpt-4o-mini (better quality)?
2. **Description Length**: Any preference? (2-3 sentences, or longer?)
3. **Resume on Timeout**: Should we implement chunking/resume functionality, or just process what we can in 30 minutes?
4. **Category Synonyms**: Should I create a hardcoded mapping table, or rely purely on fuzzy matching?
5. **Website Content Limit**: Limit to 5000 characters to save tokens, or use more?

---

## Next Steps

Once you confirm:
1. OpenAI API key is set up
2. Model preference (gpt-3.5-turbo vs gpt-4o-mini)
3. Any clarifications on questions above

I'll implement the functions and integrate them into your Google Apps Script.
