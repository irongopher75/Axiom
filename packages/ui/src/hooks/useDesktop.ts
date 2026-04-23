import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface UpdateInfo {
  version: string;
  date: string;
  body: string;
}

export interface SidecarStatusEvent {
  status: 'ready' | 'starting' | 'failed' | 'crashed';
}

let updateAvailableUnlisten: UnlistenFn | null = null;
let updateProgressUnlisten: UnlistenFn | null = null;
let sidecarStatusUnlisten: UnlistenFn | null = null;

export function useDesktop() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    return () => {
      updateAvailableUnlisten?.();
      updateProgressUnlisten?.();
      sidecarStatusUnlisten?.();
    };
  }, []);

  const checkForUpdates = useCallback(async (): Promise<UpdateInfo | null> => {
    try {
      const result = await invoke<UpdateInfo | null>('check_for_updates');
      return result;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return null;
    }
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      await invoke('install_update');
    } catch (error) {
      console.error('Failed to install update:', error);
      throw error;
    }
  }, []);

  const onUpdateAvailable = useCallback((callback: (info: UpdateInfo) => void): UnlistenFn => {
    updateAvailableUnlisten?.();
    listen<UpdateInfo>('update-available', (event) => {
      callback(event.payload);
    }).then((unlisten) => {
      updateAvailableUnlisten = unlisten;
    });
    return () => updateAvailableUnlisten?.();
  }, []);

  const onUpdateProgress = useCallback((callback: (progress: number) => void): UnlistenFn => {
    updateProgressUnlisten?.();
    listen<number>('update-progress', (event) => {
      callback(event.payload);
    }).then((unlisten) => {
      updateProgressUnlisten = unlisten;
    });
    return () => updateProgressUnlisten?.();
  }, []);

  const getSidecarStatus = useCallback(async (): Promise<'ready' | 'starting' | 'failed' | 'crashed'> => {
    try {
      const status = await invoke<string>('get_sidecar_status');
      return status as 'ready' | 'starting' | 'failed' | 'crashed';
    } catch (error) {
      console.error('Failed to get sidecar status:', error);
      return 'failed';
    }
  }, []);

  const onSidecarStatus = useCallback((callback: (status: SidecarStatusEvent) => void): UnlistenFn => {
    sidecarStatusUnlisten?.();
    listen<SidecarStatusEvent>('sidecar-ready', () => {
      callback({ status: 'ready' });
    }).then((unlisten) => {
      sidecarStatusUnlisten = unlisten;
    });
    return () => sidecarStatusUnlisten?.();
  }, []);

  return {
    isReady,
    checkForUpdates,
    installUpdate,
    onUpdateAvailable,
    onUpdateProgress,
    getSidecarStatus,
    onSidecarStatus,
  };
}
