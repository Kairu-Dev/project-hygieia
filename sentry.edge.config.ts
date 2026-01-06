// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://74d93eec6fb6294cc43b9afb20c137d3@o4510622828068864.ingest.de.sentry.io/4510622850416720",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Disable PII to maintain HIPAA/DPA compliance
  sendDefaultPii: false,

  // Use beforeSend to scrub PHI from error reports
  beforeSend(event) {
    // Remove user email, IP, and other PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    // Scrub PHI from breadcrumbs and context
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => ({
        ...breadcrumb,
        message: breadcrumb.message?.replace(/patient|mrn|diagnosis/gi, '[REDACTED]')
      }));
    }
    return event;
  },
});
