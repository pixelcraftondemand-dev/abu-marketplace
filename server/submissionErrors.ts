import type { Response } from 'express';
import { SupabaseConfigurationError } from './supabase.ts';
import { SubmissionError } from './storeSubmissions.ts';

/** Maps submission failures onto the client's error contract. */
export function submissionErrorResponse(res: Response, err: unknown) {
  if (err instanceof SupabaseConfigurationError) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }
  if (err instanceof SubmissionError) {
    return res.status(err.status).json({ success: false, error: err.message, code: err.code });
  }
  console.error('[stores] unexpected submission error:', err);
  return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
}
