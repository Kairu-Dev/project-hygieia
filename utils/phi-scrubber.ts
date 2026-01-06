export const PHI_PATTERNS = {
  // Email addresses: standard pattern
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers: 10-digit formats with common separators (-, ., space)
  // Avoids matching simple 10-digit timestamps by ensuring some separators or context if possible,
  // but for safety we catch common formats: (123) 456-7890, 123-456-7890, 123.456.7890
  PHONE: /(?:\+?1[-.]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,

  // Dates: MM/DD/YYYY, YYYY-MM-DD.
  // We try to be specific to avoid scrubbing version numbers or simple ratios.
  // Matches: 1/1/2023, 01-01-2023, 2023-01-01
  DATE: /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:\d{2,4}[-/]\d{1,2}[-/]\d{1,2}))\b/g,

  // MRN / IDs: Context-aware.
  // Only matches if preceded by keywords like "MRN:", "ID:", "Patient:", etc.
  // Captures the number/alphanumeric following the keyword.
  // Lookbehind support in JS is good in modern envs (Node 10+), but we can use capturing groups to be safe and portable.
  // We'll replace the *value* part while keeping the label.
  // Keywords: mrn, id, patient, ssn, medical record, prescription, rx
  MRN_CONTEXT:
    /(\b(?:mrn|patient\s*id|medical\s*record|ssn|rx|prescription|account\s*id)\s*[:#]?\s*)([a-zA-Z0-9-]+)/gi,

  // General Keywords: Fallback for specific PHI terms if they appear in isolation?
  // The original prompt suggested scrubbing specific keywords, but usually we want to scrub the *values*.
  // However, we will keep the original keyword scrubbing if strictly needed, but the user asked for *values* to be redacted.
  // We will mostly focus on the values above.
} as const;

/**
 * Scrubs Protected Health Information (PHI) from a given string.
 * Redacts emails, phone numbers, dates, and context-specific IDs.
 *
 * @param text The input string to scrub.
 * @returns The scrubbed string with PHI replaced by [REDACTED].
 */
export function scrubPHI(text: string): string {
  if (!text) return text;

  let scrubbed = text;

  // 1. Scrub Emails
  scrubbed = scrubbed.replace(PHI_PATTERNS.EMAIL, "[REDACTED_EMAIL]");

  // 2. Scrub Phone Numbers
  // Note: Phone regex can be aggressive. We might want to be careful here.
  // Start with a check: filter out if it looks like a timestamp (unlikely with separators).
  scrubbed = scrubbed.replace(PHI_PATTERNS.PHONE, (match) => {
    // strict check: if it's just 10 digits with no separators, it might be a timestamp or ID.
    // If it has separators, we scrub it.
    if (/^\d{10}$/.test(match)) {
      // If it's a raw 10 digit number, we generally shouldn't scrub unless we are sure.
      // For now, let's LEAVE plain 10-digit numbers to avoid false positives on timestamps/IDs,
      // unless they look very much like phone numbers (e.g. area codes).
      // User requirement: "Phone numbers... pass through".
      // Let's rely on the context-aware MRN scrubber for pure IDs.
      // We'll skip scrubbing pure 10-digit numbers here to be safe,
      // assuming phones usually have formatting in UIs.
      return match;
    }
    return "[REDACTED_PHONE]";
  });

  // 3. Scrub Dates
  // Replaces dates with [REDACTED_DATE]
  scrubbed = scrubbed.replace(PHI_PATTERNS.DATE, "[REDACTED_DATE]");

  // 4. Scrub IDs with Context
  // "MRN: 12345" -> "MRN: [REDACTED_ID]"
  scrubbed = scrubbed.replace(
    PHI_PATTERNS.MRN_CONTEXT,
    (match, prefix, value) => {
      return `${prefix}[REDACTED_ID]`;
    }
  );

  // 5. Scrub Names (Heuristic) - OPTIONAL / HARD
  // Names are very hard to regex without NLP.
  // We will rely on the "user" object being stripped in Sentry config (already done in original file).
  // And we rely on context (e.g. "Patient John Doe") if we had a regex for that.
  // For now, we will stop here to avoid over-scrubbing system components.

  return scrubbed;
}
