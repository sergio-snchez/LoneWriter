/**
 * Service to handle Google Drive Backup & Sync
 * Using Google Identity Services (GSI) for Auth and REST API for Drive
 */

import { compressToJson, decodeFromLwrt } from './exportService';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILENAME = 'lonewriter_backup.lwrt';

let accessToken = localStorage.getItem('lw_google_access_token') || null;
let tokenExpiry = localStorage.getItem('lw_google_token_expiry') || 0;

/** Clear cached token (called on 401 or sign-out) */
function _clearToken() {
  accessToken = null;
  tokenExpiry = 0;
  localStorage.removeItem('lw_google_access_token');
  localStorage.removeItem('lw_google_token_expiry');
}

/**
 * Wrapper around fetch that auto-retries once on 401 by re-authenticating.
 */
async function _driveRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    // Token expired mid-session — clear and re-authenticate
    _clearToken();
    await GoogleDriveService.authenticate();
    // Retry once with the fresh token
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return response;
}

export const GoogleDriveService = {
  /**
   * Check if we have a valid token (local expiry check only)
   */
  isAuthenticated: () => {
    return accessToken && Date.now() < parseInt(tokenExpiry);
  },

  /**
   * Initialize OAuth2 flow
   */
  authenticate: () => {
    return new Promise((resolve, reject) => {
      try {
        if (!CLIENT_ID) {
          throw new Error('Google Drive configuration not found (missing Client ID)');
        }

        if (!window.google || !window.google.accounts) {
          throw new Error('Could not load Google Identity Services library');
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
    _clearToken();
  },

  /**
   * Find the backup file in the user's Drive
   */
  findBackupFile: async () => {
    if (!GoogleDriveService.isAuthenticated()) await GoogleDriveService.authenticate();

    const response = await _driveRequest(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)`
    );

    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  },

  /**
   * Upload or update the backup file
   */
  saveBackup: async (dataObject) => {
    try {
      if (!GoogleDriveService.isAuthenticated()) await GoogleDriveService.authenticate();

      const existingFile = await GoogleDriveService.findBackupFile();
      const metadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/octet-stream',
      };

      const compressed = await compressToJson(dataObject);
      const fileContent = new Blob([compressed], { type: 'application/octet-stream' });
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileContent);

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (existingFile) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
        method = 'PATCH';
      }

      const response = await _driveRequest(url, { method, body: form });

      if (!response.ok) throw new Error('Failed to upload backup to Google Drive');

      return await response.json();
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

      const response = await _driveRequest(
        `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`
      );

      if (!response.ok) throw new Error('Failed to download backup from Google Drive');

      const text = await response.text();
      return await decodeFromLwrt(text);
    } catch (error) {
      console.error('[GoogleDrive] Download error:', error);
      throw error;
    }
  },

  /**
   * Get list of file revisions
   */
  getRevisions: async () => {
    try {
      if (!GoogleDriveService.isAuthenticated()) await GoogleDriveService.authenticate();

      const existingFile = await GoogleDriveService.findBackupFile();
      if (!existingFile) return null;

      const response = await _driveRequest(
        `https://www.googleapis.com/drive/v3/files/${existingFile.id}/revisions?fields=revisions(id,modifiedTime,size)`
      );

      if (!response.ok) throw new Error('Failed to retrieve Drive revisions');

      const data = await response.json();
      return data.revisions || [];
    } catch (error) {
      console.error('[GoogleDrive] Get revisions error:', error);
      throw error;
    }
  },

  /**
   * Download a specific revision
   */
  downloadRevision: async (revisionId) => {
    try {
      if (!GoogleDriveService.isAuthenticated()) await GoogleDriveService.authenticate();

      const existingFile = await GoogleDriveService.findBackupFile();
      if (!existingFile) return null;

      const response = await _driveRequest(
        `https://www.googleapis.com/drive/v3/files/${existingFile.id}/revisions/${revisionId}?alt=media`
      );

      if (!response.ok) throw new Error('Failed to download Drive revision');

      const text = await response.text();
      return await decodeFromLwrt(text);
    } catch (error) {
      console.error('[GoogleDrive] Download revision error:', error);
      throw error;
    }
  }
};
