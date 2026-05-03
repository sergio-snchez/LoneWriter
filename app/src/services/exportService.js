import { db } from '../db/database';
import { saveAs } from 'file-saver';
import HTMLToDOCX from 'html-to-docx';
import pako from 'pako';

const LWRT_HEADER = 'LWRT_V1';
const LWRT_HEADER_ENC = 'LWRT_V1_ENC'; // Encrypted variant

// ─── Base64 helpers ────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  const chunkSize = 8192;
  for (let i = 0; i < binary.length; i += chunkSize) {
    const chunk = binary.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      bytes[i + j] = chunk.charCodeAt(j);
    }
  }
  return bytes;
}

// ─── Compression ───────────────────────────────────────────────────────────────

async function compressToJson(data) {
  const jsonString = JSON.stringify(data);
  const encoded = new TextEncoder().encode(jsonString);
  const compressed = pako.gzip(encoded);
  const base64 = arrayBufferToBase64(compressed.buffer);
  return LWRT_HEADER + base64;
}

// ─── AES-GCM Encryption (optional) ────────────────────────────────────────────

/**
 * Derives a CryptoKey from a user password using PBKDF2.
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 200000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a compressed LWRT_V1 payload with AES-GCM.
 * Returns "LWRT_V1_ENC" + base64(salt[16] + iv[12] + ciphertext).
 */
async function encryptPayload(compressedPayload, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const data = enc.encode(compressedPayload);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Pack: salt (16) + iv (12) + ciphertext
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);

  return LWRT_HEADER_ENC + arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypts an LWRT_V1_ENC payload back to a plain LWRT_V1 string.
 * Throws if the password is wrong (AES-GCM auth tag mismatch).
 */
async function decryptPayload(encPayload, password) {
  const base64 = encPayload.slice(LWRT_HEADER_ENC.length);
  const combined = base64ToArrayBuffer(base64);

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(password, salt);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // AES-GCM auth tag mismatch = wrong password
    throw new Error('WRONG_PASSWORD');
  }
}

// ─── Decode ────────────────────────────────────────────────────────────────────

/**
 * Decodes a .lwrt file content to a plain JS object.
 * Handles both encrypted (LWRT_V1_ENC) and plain (LWRT_V1) variants.
 * @param {string} content - Raw file text
 * @param {string|null} password - Password for encrypted files, or null
 */
async function decodeFromLwrt(content, password = null) {
  const trimmed = content.trim();

  if (trimmed.startsWith(LWRT_HEADER_ENC)) {
    if (!password) {
      throw new Error('ENCRYPTED'); // Caller must prompt for password
    }
    // Decrypt → get LWRT_V1 payload → decompress
    const decrypted = await decryptPayload(trimmed, password);
    return decodeFromLwrt(decrypted, null); // Re-enter for LWRT_V1 path
  }

  if (trimmed.startsWith(LWRT_HEADER)) {
    const base64 = trimmed.slice(LWRT_HEADER.length);
    const bytes = base64ToArrayBuffer(base64);
    const decompressed = pako.ungzip(bytes);
    const decoded = new TextDecoder().decode(decompressed);
    return JSON.parse(decoded);
  }

  return JSON.parse(trimmed);
}

export { compressToJson, decodeFromLwrt };

// ─── Public service ────────────────────────────────────────────────────────────

// Tables that hold device-specific config (NOT novel data) — excluded by default
const DEVICE_ONLY_TABLES = new Set(['editorPrefs', 'customStopwords']);

export const ExportService = {
  /**
   * Export all project data to a .lwrt file.
   * @param {string|null} password - If provided, the file will be AES-GCM encrypted.
   */
  exportProject: async (password = null) => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: {}
      };

      for (const table of db.tables) {
        if (DEVICE_ONLY_TABLES.has(table.name)) continue;
        data.tables[table.name] = await table.toArray();
      }

      let payload = await compressToJson(data);

      if (password && password.trim().length > 0) {
        payload = await encryptPayload(payload, password.trim());
      }

      const blob = new Blob([payload], { type: 'application/octet-stream' });
      const novelTitle = data.tables.novels?.[0]?.title || 'Proyecto';
      saveAs(blob, `${novelTitle}.lwrt`);

      return true;
    } catch (error) {
      console.error('Error exporting project:', error);
      throw error;
    }
  },

  /**
   * Import a .lwrt file.
   * @param {File} file
   * @param {string|null} password - Required if file is encrypted.
   */
  importProject: async (file, password = null) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = await decodeFromLwrt(e.target.result, password);
          if (!data.tables) throw new Error('INVALID_FORMAT');

          await db.transaction('rw', db.tables, async () => {
            for (const table of db.tables) {
              await table.clear();
              if (data.tables[table.name]) {
                await table.bulkAdd(data.tables[table.name]);
              }
            }
          });

          window.location.reload();
          resolve(true);
        } catch (error) {
          console.error('Error importing project:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file, 'utf-8');
    });
  },

  /**
   * Export a single scene as a .docx file.
   * @param {string} title - Scene title (for filename and heading)
   * @param {string} contentHTML - HTML content of the scene
   * @param {string} emptySceneMsg - Localised "scene is empty" message
   */
  exportToWord: async (title, contentHTML, emptySceneMsg) => {
    try {
      if (!contentHTML || contentHTML.trim() === '<p></p>' || contentHTML.trim() === '') {
        throw new Error('SCENE_EMPTY');
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8"></head>
          <body>
            <h1 style="text-align: center;">${title}</h1>
            <br/>
            ${contentHTML}
          </body>
        </html>
      `;

      const output = await HTMLToDOCX(htmlContent, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });

      const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `${title}.docx`);
      return true;
    } catch (error) {
      console.error('[LoneWriter] Error exporting to Word:', error);
      throw error;
    }
  },

  /**
   * Export the full novel as a manuscript .docx file.
   * @param {Object} novel
   * @param {Array} acts
   * @param {Object} strings - Localised strings { unknownAuthor, chapterLabel, sceneLabel, emptyScene, generatedBy, noNovel }
   */
  exportFullNovel: async (novel, acts = [], strings = {}) => {
    try {
      if (!novel) throw new Error('NO_ACTIVE_NOVEL');

      const {
        unknownAuthor = 'Unknown Author',
        chapterLabel = 'Chapter',
        sceneLabel = 'Scene',
        emptyScene = '<i>Empty scene</i>',
        generatedBy = 'Manuscript generated by LoneWriter',
      } = strings;

      let fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head><meta charset="UTF-8"></head>
          <body>
            <div style="text-align: center; padding-top: 100px; margin-bottom: 50px;">
              <h1 style="font-size: 36pt; margin-bottom: 10px;">${novel.title}</h1>
              <h2 style="font-size: 18pt; color: #555;">${novel.author || unknownAuthor}</h2>
              <p style="margin-top: 50px; font-style: italic;">${generatedBy}</p>
            </div>
      `;

      for (const act of acts) {
        fullHtml += `<br style="page-break-before: always; clear: both;" />`;
        fullHtml += `<div style="text-align: center; margin-top: 50px; margin-bottom: 30px;">
          <h2 style="color: #444; font-size: 24pt;">${act.title}</h2>
        </div>`;

        const chapters = act.chapters || [];
        for (const ch of chapters) {
          fullHtml += `<br style="page-break-before: always; clear: both;" />`;
          fullHtml += `
            <div style="margin-bottom: 30px;">
              <h1 style="text-align: center; font-size: 20pt; margin-bottom: 20px;">
                ${chapterLabel} ${ch.number || ''}: ${ch.title}
              </h1>
          `;

          const scenes = ch.scenes || [];
          for (const sc of scenes) {
            fullHtml += `
              <div style="margin-bottom: 25px;">
                <h3 style="color: #777; font-size: 11pt; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
                  ${sceneLabel}: ${sc.title} ${sc.pov ? `(POV: ${sc.pov})` : ''}
                </h3>
                <div class="scene-content">
                  ${sc.content || `<p>${emptyScene}</p>`}
                </div>
              </div>
            `;
          }

          fullHtml += `</div>`;
        }
      }

      fullHtml += `</body></html>`;

      const output = await HTMLToDOCX(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });

      const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const fileName = `${novel.title.replace(/[^a-z0-9]/gi, '_')}_Manuscrito.docx`;
      saveAs(blob, fileName);
      return true;
    } catch (error) {
      console.error('[LoneWriter] Error exporting full novel:', error);
      throw error;
    }
  }
};
