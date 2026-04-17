// utils/questionKey.ts
export const getQuestionKey = (q: any, qType: string, fallbackIndex?: number) => {
  const type = String(qType || q.type || 'question').toLowerCase();

  // Priority 1: Use existing ID
  if (q.id !== undefined && q.id !== null) {
    return `${type}:${q.id}`;
  }

  // Priority 2: Use stable content-based hash (BEST FIX)
  const contentHash = btoa(
    `${q.question || ''}-${JSON.stringify(q.options || [])}` 
  ).slice(0, 10);

  return `${type}:hash_${contentHash}`;
};

export const getLegacyQuestionKey = (qType: string, index: number) => {
  return `${String(qType).toLowerCase()}:q${index}`;
};