import type { Request, RequestHandler, Response } from 'express';
import { withAuthCode } from './supabase.ts';
import { submissionErrorResponse } from './submissionErrors.ts';
import type { Actor, SubmissionRow } from './storeSubmissions.ts';

export interface MerchantApplicationsDeps {
  /** Resolves the signed-in merchant from the request. */
  actorFor: (req: Request) => Promise<Actor | null>;
  /** All submissions; the handler narrows them to the caller's own. */
  listSubmissions: () => Promise<SubmissionRow[]>;
  /** Deployment guard mounted before the handler. */
  requireSupabase: RequestHandler;
}

/**
 * GET /api/stores/submissions/mine
 *
 * A merchant sees only applications they own. Ownership is matched on the account id,
 * with email as a fallback for rows written before the owner id was recorded.
 */
export function merchantApplicationsHandler(deps: MerchantApplicationsDeps): RequestHandler[] {
  const handler = async (req: Request, res: Response) => {
    try {
      const actor = await deps.actorFor(req);
      if (!actor) {
        return res.status(401).json(withAuthCode(req, { success: false, error: 'Please sign in' }));
      }

      const all = await deps.listSubmissions();
      const mine = all.filter(
        (row) => row.owner_id === actor.id || (!!actor.email && row.owner_email === actor.email),
      );
      res.json({ success: true, count: mine.length, data: mine });
    } catch (err) {
      submissionErrorResponse(res, err);
    }
  };

  return [deps.requireSupabase, handler];
}
