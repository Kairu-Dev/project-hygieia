// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

  // Use beforeSend to scrub PHI from server error reports
  beforeSend(event) {
    // Remove all user PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    // Scrub PHI patterns from error messages and stack traces
    const phiPatterns = /\b(patient|mrn|medical record|diagnosis|prescription|treatment|appointment|doctor|staff)\b/gi;

    if (event.message) {
      event.message = event.message.replace(phiPatterns, '[REDACTED]');
    }

    if (event.exception?.values) {
      event.exception.values = event.exception.values.map(exception => ({
        ...exception,
        value: exception.value?.replace(phiPatterns, '[REDACTED]')
      }));
    }

    // Scrub database query context and request data
    if (event.contexts?.database) {
      delete event.contexts.database;
    }

    return event;
  },
});
