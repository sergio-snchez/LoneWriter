let updateSW = null;

export const registerPWA = (onNeedRefresh) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  import('virtual:pwa-register').then(({ registerSW }) => {
    updateSW = registerSW({
      onNeedRefresh,
      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
      }
    });
  });
};

export const triggerUpdate = () => {
  if (updateSW) {
    updateSW(true);
    // Hard reload as safety fallback
    setTimeout(() => {
      window.location.reload();
    }, 100);
  } else {
    window.location.reload();
  }
};