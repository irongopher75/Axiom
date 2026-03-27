// packages/ui/src/config/api.ts
// Dynamic configuration to handle late injection from Electron

export const config = {
  get isDesktop() {
    return (window as any).axiomDesktop !== undefined || (window as any).__AXIOM_CONFIG__ !== undefined;
  },
  get apiBase() {
    return (window as any).__AXIOM_CONFIG__?.apiBase || 'http://localhost:8000';
  },
  get wsBase() {
    return (window as any).__AXIOM_CONFIG__?.wsBase || 'ws://localhost:8000';
  },
  get newsWsUrl() {
    return (window as any).__AXIOM_CONFIG__?.newsMongoWs || 'wss://news.axiom.app/feed';
  },
  get platform() {
    return (window as any).__AXIOM_CONFIG__?.platform || 'web';
  },
  get version() {
    return (window as any).__AXIOM_CONFIG__?.version || '0.0.0';
  }
};
