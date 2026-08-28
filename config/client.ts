/**
 * Per-client configuration. Every client-specific value lives here and
 * nowhere else — job types, business name, urgency labels, Slack channel.
 * Deploying for a new client means editing this file and setting new
 * environment variables. Nothing client-specific belongs in route.ts or
 * the components.
 *
 * PII policy: contact names and business names for clients not yet
 * onboarded are pseudonymised (CLIENT_ALPHA, CLIENT_ALPHA_CONTACT) until
 * the client relationship is confirmed and this file is updated with a
 * real deployment. The real mapping is not stored in this repo.
 * Geographic/market data (region, trade, job types) is not PII and is
 * kept real — it's product context, not an identity.
 */

export type JobType =
  | "roof_repair"
  | "roof_replacement"
  | "flat_roof"
  | "gutters_roofline"
  | "pointing_chimney"
  | "exterior_painting"
  | "other";

export type Urgency = "urgent" | "this_week" | "quote_only";

export interface ClientConfig {
  /** Internal codename — never the real business/contact name until confirmed. */
  clientId: string;
  businessName: string;
  region: string;
  trade: string;
  /** Not validated with the client — an arbitrary starting value to test against. */
  callbackWindowMinutes: number;
  jobTypes: Record<JobType, string>;
  urgencyLabels: Record<Urgency, string>;
}

export const activeClient: ClientConfig = {
  clientId: "CLIENT_ALPHA",
  businessName: "CLIENT_ALPHA",
  region: "Aberdeen",
  trade: "roofing",
  callbackWindowMinutes: 45,
  jobTypes: {
    roof_repair: "Roof repair",
    roof_replacement: "New roof / replacement",
    flat_roof: "Flat roof and felt",
    gutters_roofline: "Gutters, fascias and soffits",
    pointing_chimney: "Pointing and chimney work",
    exterior_painting: "Exterior painting",
    other: "Something else",
  },
  urgencyLabels: {
    urgent: "Urgent",
    this_week: "This week",
    quote_only: "Quote only",
  },
};
