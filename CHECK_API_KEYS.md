# Debug: LLM Returning Demo Data Despite API Calls

## 🔍 Symptoms

- ✅ Mistral OCR works perfectly (text extracted)
- ✅ LLM processing runs (44 seconds - real API call)
- ✅ Processing completes successfully
- ❌ But returns demo data with `_demo_note`

## 🎯 What This Means

The Edge Function **IS calling the LLM APIs** (44 seconds proves it), but something is making it fall back to demo mode.

## Possible Causes

### 1. API Key Expired or Invalid
- Key exists but doesn't work
- API call fails, returns demo data

### 2. API Rate Limit Hit
- Too many requests
- API returns error, falls back to demo

### 3. API Returns Error
- Malformed request
- Text too long
- Invalid template

### 4. All Providers Failing
- Tries OpenAI → fails → demo
- Tries Anthropic → fails → demo  
- Tries Mistral → fails → demo
- Returns demo as final fallback

## 🧪 How to Debug

### Check Supabase Edge Function Logs:

1. Go to: https://supabase.com/dashboard/project/lbjjzisqbihrlosozfgr
2. Click: **Edge Functions** (left sidebar)
3. Click: **generate-structured-output**
4. Click: **Logs** tab
5. Look for your recent request (around 2:10 PM)

### What to Look For in Logs:

```
✅ "Attempting LLM generation with provider: openai"
✅ "Successfully generated output with openai"  ← Should see this!
   OR
❌ "Provider openai failed"  ← Or this if it failed
❌ "All providers failed or returned demo data"
```

### Check for These Specific Errors:

**API Key Issues:**
```
"OpenAI API error: 401 Unauthorized"
→ Invalid API key
```

**Rate Limit:**
```
"OpenAI API error: 429 Too Many Requests"
→ Rate limit hit
```

**Context Length:**
```
"context_length_exceeded"
→ Text too long for model
```

**Invalid Request:**
```
"Invalid request"
→ Malformed template or text
```

## 🔧 Quick Fixes

### Fix 1: Verify API Keys Work

Go to: http://localhost:5173/admin/test-api-keys

This page directly tests your API keys and shows which ones work.

### Fix 2: Check Supabase Logs

The Edge Function logs will show the EXACT error from the LLM API.

### Fix 3: Test with Smaller Text

The extracted text might be too long. Try a 1-page document first.

### Fix 4: Check Text Preview

Look at the `textPreview` in console logs:
```javascript
console.log('Calling LLM Edge Function (Mistral OCR)...', { 
  textLength: ...,
  textPreview: "..."  ← Does this look correct?
});
```

## 🎯 Next Steps

### Step 1: Check Browser Console Again

After hard refresh, look for these NEW log messages I added:

```
"Calling LLM Edge Function (Mistral OCR)..."
  { jobId, llmProvider, textLength, textPreview }

"LLM Response received (Mistral OCR):" 200

"Parsing LLM response (Mistral OCR)..."

"LLM Result (Mistral OCR):" { ... }

"Has demo note?" true/false  ← Key indicator!
```

### Step 2: Check Supabase Edge Function Logs

This will show the REAL error from OpenAI/Anthropic/Mistral.

### Step 3: Share the Error

Once you find the error in Supabase logs, share it and I can help fix it!

## 💡 Theory

**My Hypothesis:**

Since it took 44 seconds, the Edge Function:
1. Tried OpenAI → API call failed (maybe invalid key or rate limit)
2. Tried Anthropic → API call failed
3. Tried Mistral Large → API call failed
4. All failed, returned demo data as fallback

**The 44 seconds = 3 failed API calls (~15 seconds each)**

The Supabase Edge Function logs will confirm this!

## 🚀 Immediate Action

**Please check:**
1. Browser console for the new log messages
2. Supabase Dashboard → Edge Functions → generate-structured-output → Logs
3. Look for errors around 2:10 PM (when you last tested)

Share what you find and I'll help you fix it! 🔍

