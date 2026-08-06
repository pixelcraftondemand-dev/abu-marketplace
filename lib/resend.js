import { Resend } from "resend";

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set. Add it to your environment before sending email.");
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

// Lazy facade: importing this module never throws, even when RESEND_API_KEY is
// not configured yet. The underlying client (and its "Missing API key" error)
// is only created when an email is actually sent.
export const resend = {
  get emails() {
    return getClient().emails;
  },
};
