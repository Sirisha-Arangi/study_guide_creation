# Student Exam Results Bug - ROOT CAUSE & FIX

## The Problem
When faculty clicks "View Results" to see student answers after exam submission:
- **ONE question displays the student's answer correctly** ✅
- **OTHER questions display "Student answer: No answer"** ❌
- Even though ALL answers were saved in the database ✔️

## Root Cause Analysis

### How Answers Are Stored
When a student answers a question during the exam:

1. **Frontend (StudentExams.tsx)** constructs a unique question key using `getQuestionKey()`:
   - If question has an `id`: returns `"type:id"` (e.g., `"multiple_choice:1"`)
   - If question lacks an `id`: returns `"type:hash_XXXXX"` (e.g., `"multiple_choice:hash_ABC123"`)

2. **Backend** receives and stores the answer:
   ```python
   answers[normalize_question_id(request.question_id)] = request.answer
   ```
   So answers dictionary stores with SAME key format it received.

### The Bug - Missing Fallback in TeacherSubmissions.tsx

**AssignmentGenerator.tsx (line 775)** - ✅ CORRECT:
```typescript
const newKey = getQuestionKey(processedQuestion, qType, index);
const legacyKey = getLegacyQuestionKey(qType, index);  // "type:q0", "type:q1"
const answer = selectedAttempt.answers?.[newKey] ?? selectedAttempt.answers?.[legacyKey];
```
✔️ Checks TWO key formats with fallback

**TeacherSubmissions.tsx (line 280-283)** - ❌ BUG:
```typescript
const qType = String(q.type || 'question').toLowerCase();
const rawId = q.id ?? 'None';
const questionKey = `${qType}:${rawId}`;
const answer = selectedAttempt.answers?.[questionKey];
```
❌ Only checks ONE key format - NO FALLBACK!

### Why One Question Works
- If that ONE question's key happens to match what's stored, it displays correctly
- Other questions fail because:
  - Answers might be stored with legacy key format
  - Or the key doesn't exactly match due to ID issues
  - TeacherSubmissions has no fallback to find them

## The Fix Applied

**File:** `frontend/src/pages/TeacherSubmissions.tsx`

### Change 1: Import the utility functions
```typescript
import { getQuestionKey, getLegacyQuestionKey } from '../utils/questionKey';
```

### Change 2: Use consistent question key lookup (lines 280-290)
**BEFORE (Buggy):**
```typescript
const qType = String(q.type || 'question').toLowerCase();
const rawId = q.id ?? 'None';
const questionKey = `${qType}:${rawId}`;
const answer = selectedAttempt.answers?.[questionKey];
```

**AFTER (Fixed):**
```typescript
const qType = String(q.type || 'question').toLowerCase();

// Use getQuestionKey for new format, fallback to legacy format
const newKey = getQuestionKey(q, q.type, idx);
const legacyKey = getLegacyQuestionKey(qType, idx);
// Primary key for storing/retrieving answers and grading
const questionKey = newKey;

// Try to find answer with multiple key formats
const answer = selectedAttempt.answers?.[newKey] ?? selectedAttempt.answers?.[legacyKey];

// Backend builds evaluation scores using "type:id" format
const rawId = q.id ?? 'None';
const scoreEntryKey = `${qType}:${rawId}`;
const scoreEntry = selectedAttempt.evaluation?.question_scores?.[scoreEntryKey];
```

### Key Points of the Fix:
1. **Uses same logic as AssignmentGenerator.tsx** - Maintains consistency across codebase
2. **Multiple key format fallback** - Tries `newKey` first, falls back to `legacyKey`
3. **Proper key for grading** - Uses `questionKey` (which is now `newKey`) for the grade submission
4. **Evaluation scores lookup** - Keeps separate lookup for `scoreEntryKey` since backend builds those with "type:id" format

## Data Flow After Fix

```
Student answers question
    ↓
StudentExams.tsx: questionKey = getQuestionKey(q, q.type, idx)
    ↓
Answer saved with questionKey
    ↓
When faculty views results:
    ↓
TeacherSubmissions.tsx now uses SAME getQuestionKey logic
    ↓
questoinKey = newKey (from getQuestionKey)
    ↓
Looks up: answers[newKey] ?? answers[legacyKey]
    ↓
✅ FOUND! Displays student's answer correctly
```

## Why This Matters
- Ensures consistency across frontend question identification
- Provides fallback for different key formats (handles data migration)
- Fixes display of all student answers regardless of how they were stored
- Maintains backward compatibility with legacy answer key formats

## Testing Recommendation
After deploying this fix:
1. Have a student take an exam with multiple questions
2. Faculty views the results
3. **ALL questions should now show the correct student answers** ✅
4. No more "No answer" for questions that were actually answered

---

**File Modified:** `frontend/src/pages/TeacherSubmissions.tsx`
**Lines Changed:** 5, 280-293
**Type:** Bug Fix - Answer Display in Faculty Results View
