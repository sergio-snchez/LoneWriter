/**
 * Service to handle Google Drive Backup & Sync
 * Using Google Identity Services (GSI) for Auth and REST API for Drive
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILENAME = 'lonewriter_backup.lwrt';

let accessToken = localStorage.getItem('lw_google_access_token') || null;
let tokenExpiry = localStorage.getItem('lw_google_token_expiry') || 0;

export const GoogleDriveService = {
  /**
   * Check if we have a valid token
   */
  isAuthenticated: () => {
    return accessToken && Date.now() < parseInt(tokenExpiry);
  },

  /**
   * Initialize OAuth2 flow
   * Returns a promise that resolves with the access token
   */
  authenticate: () => {
    return new Promise((resolve, reject) => {
      try {
        if (!CLIENT_ID) {
          throw new Error('Configuración de Google Drive no encontrada (falta Client ID)');
        }

        // --- FLUJO ESTÁNDAR PARA WEB ---
        if (!window.google || !window.google.accounts) {
          throw new Error('No se pudo cargar la librería de Google Identity Services.');
        }

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            if (response.error) {
              reject(response);
              return;
            }
            accessToken = response.access_token;
            tokenExpiry = Date.now() + (response.expires_in * 1000);

            localStorage.setItem('lw_google_access_token', accessToken);
            localStorage.setItem('lw_google_token_expiry', tokenExpiry);

            resolve(accessToken);
          },
        });

        client.requestAccessToken();
      } catch (error) {
        console.error('[GoogleDrive] Auth error:', error);
        reject(error);
      }
    });
  },

  /**
   * Sign out
   */
  signOut: () => {
    accessToken = null;
    tokenExpiry = 0;
    localStorage.removeItem('lw_google_access_token');
    localStorage.removeItem('lw_google_token_expiry');
  },

  /**
   * Find the backup file in the user's Drive
   */
  findBackupFile: async () => {
    if (!GoogleDriveService.isAuthenticated()) await GoogleDriveService.authenticate();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  },

  /**
   * Upload or update the backup file
   */
  saveBackup: async (jsonContent) => {
    try {
      if (!GoogleDriveService.isAuthenticated()) await GoogleDriveService.authenticate();

      const existingFile = await GoogleDriveService.findBackupFile();
      const metadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/json',
      };

      const fileContent = new Blob([jsonContent], { type: 'application/json' });
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileContent);

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (existingFile) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
        method = 'PATCH';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
      });

      if (!response.ok) throw new Error('Error al subir a Google Drive');

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[GoogleDrive] Save error:', error);
      throw error;
    }
  },

  /**
   * Download the backup file
   */
  downloadBackup: async () => {
    try {
      if (!GoogleDriveService.isAuthenticated()) await GoogleDriveService.authenticate();

      const existingFile = await GoogleDriveService.findBackupFile();
      if (!existingFile) return null;

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) throw new Error('Error al descargar de Google Drive');

      return await response.json();
    } catch (error) {
      console.error('[GoogleDrive] Download error:', error);
      throw error;
    }
  }
};
