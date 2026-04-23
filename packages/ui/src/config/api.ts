// packages/ui/src/config/api.ts
// Platform configuration for Tauri desktop and web
import { AXIOM_CONFIG } from './constants';

export const config = {
  get isDesktop(): boolean {
    try {
      // Tauri v2 detection
      return typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
    } catch {
      return false;
    }
  },
  get apiBase(): string {
    // Desktop uses local Python sidecar, web uses remote backend
    return this.isDesktop ? AXIOM_CONFIG.DESKTOP.API_BASE : AXIOM_CONFIG.WEB.API_BASE;
  },
  get wsBase(): string {
    return this.isDesktop ? AXIOM_CONFIG.DESKTOP.WS_BASE : AXIOM_CONFIG.WEB.WS_BASE;
  },
  get newsWsUrl(): string {
    return (window as any).__AXIOM_CONFIG__?.newsMongoWs || AXIOM_CONFIG.NEWS_WS_URL;
  },
  get platform(): 'desktop' | 'web' {
    return this.isDesktop ? 'desktop' : 'web';
  },
  get version(): string {
    return (window as any).__AXIOM_CONFIG__?.version || AXIOM_CONFIG.VERSION;
  }
};
