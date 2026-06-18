import { datadogRum } from "@datadog/browser-rum";

const APP_ID = import.meta.env.VITE_DD_RUM_APP_ID as string | undefined;
const CLIENT_TOKEN = import.meta.env.VITE_DD_RUM_CLIENT_TOKEN as string | undefined;
const ENV = (import.meta.env.VITE_DD_RUM_ENV as string | undefined) ?? "beta";

export function initAnalytics() {
  if (!APP_ID || !CLIENT_TOKEN) return;

  datadogRum.init({
    applicationId: APP_ID,
    clientToken: CLIENT_TOKEN,
    site: "us5.datadoghq.com",
    service: "compass-desktop",
    env: ENV,
    version: "0.1.0",
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask-user-input",
  });
}

export function trackView(viewName: string) {
  if (!APP_ID || !CLIENT_TOKEN) return;
  datadogRum.startView({ name: viewName });
}

export function trackAction(name: string, context?: Record<string, unknown>) {
  if (!APP_ID || !CLIENT_TOKEN) return;
  datadogRum.addAction(name, context);
}

export function setAnalyticsUser(id: string, email?: string) {
  if (!APP_ID || !CLIENT_TOKEN) return;
  datadogRum.setUser({ id, email });
}

export function clearAnalyticsUser() {
  if (!APP_ID || !CLIENT_TOKEN) return;
  datadogRum.clearUser();
}
