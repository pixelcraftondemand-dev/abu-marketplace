import type { StoreSubmission } from '../services/api';

export interface ApplicationInboxMessage {
  id: string;
  applicationId: string;
  applicationKind: StoreSubmission['kind'];
  name: string;
  status: StoreSubmission['status'];
  title: string;
  body: string;
  date: string;
  unread: boolean;
}

const KIND_NOUN: Record<StoreSubmission['kind'], string> = {
  store: 'store',
  product: 'product listing',
  service: 'service listing',
};

const storageKey = (userId: string) => `abu.application-inbox.read.v1.${userId}`;

/** Reads the ids this account has already seen; storage failures simply mean "nothing read". */
export function readInboxReadIds(userId: string): Record<string, true> {
  if (typeof window === 'undefined' || !userId) return {};
  try {
    const saved = window.localStorage.getItem(storageKey(userId));
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, true>) : {};
  } catch {
    return {};
  }
}

export function saveInboxReadIds(userId: string, ids: Record<string, true>): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // Storage can be blocked; the inbox still works for this session.
  }
}

/**
 * Turns applications into the messages shown in the merchant inbox. Each application
 * contributes a receipt and its latest decision, so an edited note or a new decision
 * after a refresh counts as a fresh, unread message.
 */
export function buildApplicationInbox(
  applications: StoreSubmission[],
  readIds: Record<string, true>,
  limit = 30,
): ApplicationInboxMessage[] {
  const messages: ApplicationInboxMessage[] = [];

  for (const application of applications) {
    const noun = KIND_NOUN[application.kind] || 'application';

    if (application.created_at) {
      const receivedId = `${application.id}:received:${application.created_at}`;
      messages.push({
        id: receivedId,
        applicationId: application.id,
        applicationKind: application.kind,
        name: application.name,
        status: 'pending',
        title: 'Application received',
        body: `We received your ${noun} application for “${application.name}”. Our review team will email you once a decision has been made.`,
        date: application.created_at,
        unread: !readIds[receivedId],
      });
    }

    if (application.status !== 'pending' && application.reviewed_at) {
      const decisionId = `${application.id}:decision:${application.status}:${application.reviewed_at}:${application.updated_at}`;
      const approved = application.status === 'approved';
      const note = application.review_note?.trim();
      messages.push({
        id: decisionId,
        applicationId: application.id,
        applicationKind: application.kind,
        name: application.name,
        status: application.status,
        title: approved ? 'Application approved' : 'Application rejected',
        body: approved
          ? `Your ${noun} “${application.name}” was approved and is now live in the marketplace.${note ? ` Review team note: ${note}` : ''}`
          : `Your ${noun} application for “${application.name}” was not approved.${note ? ` Reason: ${note}` : ''} You are welcome to address the feedback and submit a new application.`,
        date: application.reviewed_at,
        unread: !readIds[decisionId],
      });
    }
  }

  return messages
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
