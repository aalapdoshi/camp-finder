# Airtable Feedback Table Setup Instructions

## Step-by-Step Guide

Follow these steps to create the Feedback table in your Airtable base:

### Step 1: Create New Table

1. Open your Airtable base: `appv2VRiObNca7leq`
2. Click the **"+"** button next to your existing tables (or use the "+ Add a table" button)
3. Name the new table: **`Feedback`**
4. Click **"Create table"**

### Step 2: Add Fields

You need to add the following fields to your Feedback table. For each field:

1. Click the **"+"** button in the header row (or right-click the header)
2. Select the field type
3. Enter the field name **exactly** as shown below (case-sensitive)
4. Configure the field settings as specified

#### Field 1: Rating

- **Field Name:** `Rating`
- **Field Type:** Number
- **Options:**
  - Format: Integer
  - Decimal places: 0
  - Min: 1
  - Max: 5
- **Description:** User's rating of how helpful CampFinder was (1-5 scale)

#### Field 2: Suggestions

- **Field Name:** `Suggestions`
- **Field Type:** Long text
- **Options:**
  - Allow attachments: No (optional)
- **Description:** Optional text feedback from users

#### Field 3: Submitted At

- **Field Name:** `Submitted At`
- **Field Type:** Date
- **Options:**
  - Include time: Yes
  - Format: ISO 8601 (or your preferred format)
- **Description:** Timestamp when feedback was submitted

#### Field 4: Page

- **Field Name:** `Page`
- **Field Type:** Single line text
- **Options:**
  - Max characters: 255 (default)
- **Description:** Page where feedback was submitted (e.g., "browse.html", "campfinder_index.html")

### Step 3: Verify Table Structure

Your Feedback table should have these fields in this order:

| Field Name | Field Type | Required |
|------------|------------|----------|
| Rating | Number | Yes |
| Suggestions | Long text | No |
| Submitted At | Date | Yes |
| Page | Single line text | No |

### Step 4: Test the Integration

After creating the table:

1. Deploy your site to Netlify (or test locally)
2. Click the floating feedback button (💬 Feedback) on any page
3. Select a rating (1-5)
4. Optionally add suggestions
5. Click "Submit Feedback"
6. Check your Airtable Feedback table - you should see a new record appear

### Troubleshooting

**If feedback submissions fail:**

1. **Check field names:** Make sure field names match exactly (case-sensitive):
   - `Rating` (capital R)
   - `Suggestions` (capital S)
   - `Submitted At` (capital S, capital A, space between words)
   - `Page` (capital P)

2. **Check field types:** Verify each field has the correct type:
   - Rating must be Number
   - Suggestions must be Long text (not Single line text)
   - Submitted At must be Date with time enabled
   - Page must be Single line text

3. **Check Netlify environment variables:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Verify `AIRTABLE_API_KEY` is set
   - Verify `AIRTABLE_BASE_ID` is set to `appv2VRiObNca7leq`

4. **Check Netlify Function logs:**
   - Go to Netlify Dashboard → Functions → feedback
   - Check for any error messages

5. **Check browser console:**
   - Open browser DevTools (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab for failed API requests

### Field Name Reference

**Important:** The field names must match exactly as shown below:

```
Rating
Suggestions
Submitted At
Page
```

Note: "Submitted At" has a space between "Submitted" and "At". This is important!

### Optional: Add Views

You might want to create views in Airtable for easier feedback management:

1. **All Feedback** (default view)
2. **High Ratings** (filter: Rating >= 4)
3. **Low Ratings** (filter: Rating <= 2)
4. **With Suggestions** (filter: Suggestions is not empty)
5. **Recent** (sort by Submitted At, descending)

### Optional: Add Field Descriptions

You can add descriptions to fields in Airtable:
1. Click on a field header
2. Click "Customize field type"
3. Add a description in the description box
4. This helps document what each field is for

---

## Quick Checklist

- [ ] Created table named "Feedback"
- [ ] Added field "Rating" (Number, integer, 1-5)
- [ ] Added field "Suggestions" (Long text)
- [ ] Added field "Submitted At" (Date with time)
- [ ] Added field "Page" (Single line text)
- [ ] Verified field names match exactly (case-sensitive)
- [ ] Tested feedback submission
- [ ] Verified records appear in Airtable

---

## Need Help?

If you encounter any issues:
1. Double-check field names match exactly
2. Verify field types are correct
3. Check Netlify Function logs for errors
4. Ensure environment variables are set in Netlify
