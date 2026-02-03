/**
 * QualityScoring - Feature #16: Response Quality Scoring
 * Evaluates quality of model responses
 */

export interface QualityScore {
  overall: number;
  completeness: number;
  format: number;
  relevance: number;
}

export type ExpectedResponseType = 'list' | 'code' | 'text' | 'json';

export function scoreResponseQuality(
  response: string,
  expectedType: ExpectedResponseType,
  expectedLength?: number
): QualityScore {
  let completeness = 0;
  let format = 0;
  let relevance = 1; // Default to high

  // Completeness based on length
  const length = response.length;
  if (expectedLength) {
    completeness = Math.min(1, length / expectedLength);
  } else {
    completeness = length > 100 ? 1 : length / 100;
  }

  // Format scoring
  switch (expectedType) {
    case 'list':
      const listItems = (response.match(/^\d+\./gm) || []).length;
      format = listItems > 0 ? Math.min(1, listItems / 10) : 0;
      break;

    case 'code':
      const hasCode = /```|function|class|const|let|var|def |import /i.test(response);
      format = hasCode ? 1 : 0.3;
      break;

    case 'json':
      try {
        JSON.parse(response.replace(/```json|```/g, '').trim());
        format = 1;
      } catch {
        format = 0;
      }
      break;

    case 'text':
      format = response.trim().length > 0 ? 1 : 0;
      break;
  }

  // Detect low-quality patterns
  if (/I cannot|I'm unable|I don't have|jako AI/i.test(response)) {
    relevance = 0.3;
  }

  const overall = completeness * 0.3 + format * 0.4 + relevance * 0.3;

  return { overall, completeness, format, relevance };
}
