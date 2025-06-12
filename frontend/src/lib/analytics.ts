import ReactGA from 'react-ga4';

export function initializeAnalytics() {
  if (import.meta.env.VITE_GA_TRACKING_ID) {
    ReactGA.initialize(import.meta.env.VITE_GA_TRACKING_ID);
  }
}

export function trackPageView(path: string) {
  if (import.meta.env.VITE_GA_TRACKING_ID) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
}

export function trackEvent(category: string, action: string, label?: string) {
  if (import.meta.env.VITE_GA_TRACKING_ID) {
    ReactGA.event({
      category,
      action,
      label,
    });
  }
}

export function trackPermitAction(action: string, permitId: string) {
  trackEvent('Permit', action, permitId);
}

export function trackDocumentAction(action: string, documentId: string) {
  trackEvent('Document', action, documentId);
}

export function trackUserAction(action: string, userId: string) {
  trackEvent('User', action, userId);
} 