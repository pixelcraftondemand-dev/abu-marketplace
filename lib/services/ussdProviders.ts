// AMBER PAY — USSD Provider Interface
//
// Pluggable provider system for USSD gateways.

interface UssdRequest {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  text: string;
}

interface UssdProvider {
  name: string;
  validateRequest(body: Record<string, unknown>, headers: Headers): boolean;
  parseRequest(body: Record<string, unknown>): UssdRequest;
  formatResponse(ussdResponse: string): string;
}

const africastalking: UssdProvider = {
  name: "africastalking",

  validateRequest(body: Record<string, unknown>, headers: Headers): boolean {
    const username = process.env.AT_USSD_USERNAME;
    if (process.env.NODE_ENV !== "production") return true;
    if (username && body.username !== username) {
      console.warn("[USSD/AT] Invalid username:", body.username);
      return false;
    }
    return true;
  },

  parseRequest(body: Record<string, unknown>): UssdRequest {
    return {
      sessionId: (body.sessionId as string) || "",
      phoneNumber: (body.phoneNumber as string) || (body.phone as string) || "",
      serviceCode: (body.serviceCode as string) || "",
      text: (body.text as string) || "",
    };
  },

  formatResponse(ussdResponse: string): string {
    return ussdResponse;
  },
};

const beem: UssdProvider = {
  name: "beem",

  validateRequest(body: Record<string, unknown>, headers: Headers): boolean {
    const secret = process.env.BEEM_USSD_SECRET;
    if (!secret) return true;
    const signature = headers.get("x-beem-signature");
    if (!signature) return false;
    return true;
  },

  parseRequest(body: Record<string, unknown>): UssdRequest {
    return {
      sessionId: (body.session_id as string) || (body.sessionId as string) || "",
      phoneNumber: (body.phone_number as string) || (body.phoneNumber as string) || (body.phone as string) || "",
      serviceCode: (body.service_code as string) || (body.serviceCode as string) || "",
      text: (body.text as string) || "",
    };
  },

  formatResponse(ussdResponse: string): string {
    return ussdResponse;
  },
};

const custom: UssdProvider = {
  name: "custom",

  validateRequest(body: Record<string, unknown>, headers: Headers): boolean {
    const secret = process.env.USSD_WEBHOOK_SECRET;
    if (!secret) return true;
    const provided = headers.get("x-webhook-secret");
    return provided === secret;
  },

  parseRequest(body: Record<string, unknown>): UssdRequest {
    return {
      sessionId: (body.sessionId as string) || (body.session_id as string) || (body.id as string) || "",
      phoneNumber: (body.phoneNumber as string) || (body.phone_number as string) || (body.phone as string) || (body.msisdn as string) || "",
      serviceCode: (body.serviceCode as string) || (body.service_code as string) || (body.short_code as string) || "",
      text: (body.text as string) || (body.input as string) || (body.dial as string) || "",
    };
  },

  formatResponse(ussdResponse: string): string {
    return ussdResponse;
  },
};

const providers: Record<string, UssdProvider> = {
  africastalking,
  beem,
  custom,
};

export function getProvider(): UssdProvider {
  const name = (process.env.USSD_PROVIDER || "africastalking").toLowerCase();
  const provider = providers[name];
  if (!provider) {
    console.warn(`[USSD] Unknown provider "${name}", falling back to africastalking`);
    return africastalking;
  }
  return provider;
}

export function validateUssdRequest(body: Record<string, unknown>, headers: Headers): boolean {
  const provider = getProvider();
  return provider.validateRequest(body, headers);
}

export function parseUssdRequest(body: Record<string, unknown>): UssdRequest {
  const provider = getProvider();
  return provider.parseRequest(body);
}

export function formatUssdResponse(ussdResponse: string): string {
  const provider = getProvider();
  return provider.formatResponse(ussdResponse);
}

export default providers;
