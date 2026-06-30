/**
 * Single source of truth for the application version.
 * Vite injects __APP_VERSION__ at build time from package.json.
 * The fallback string is only used if the build define is unavailable (e.g. in tests).
 */
 
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.1.0';
