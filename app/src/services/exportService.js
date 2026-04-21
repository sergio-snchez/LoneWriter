import { db } from '../db/database';
import { saveAs } from 'file-saver';
import HTMLToDOCX from 'html-to-docx';
import pako from 'pako';

const LWRT_HEADER = 'LWRT_V1';

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

async function compressToJson(data) {
  const jsonString = JSON.stringify(data);
  const encoded = new TextEncoder().encode(jsonString);
  const compressed = pako.gzip(encoded);
  const base64 = arrayBufferToBase64(compressed.buffer);
  return LWRT_HEADER + base64;
}

async function decodeFromLwrt(content) {
  const trimmed = content.trim();

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

export const ExportService = {
  exportProject: async () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: {}
      };

      for (const table of db.tables) {
        data.tables[table.name] = await table.toArray();
      }

      const compressed = await compressToJson(data);
      const blob = new Blob([compressed], { type: 'application/octet-stream' });
      const novelTitle = data.tables.novels[0]?.title || 'Proyecto';
      saveAs(blob, `${novelTitle}.lwrt`);

      return true;
    } catch (error) {
      console.error('Error exporting project:', error);
      throw error;
    }
  },

  importProject: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = await decodeFromLwrt(e.target.result);
          if (!data.tables) throw new Error('Formato .lwrt inválido');

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
      reader.readAsText(file);
    });
  },

  exportToWord: async (title, contentHTML) => {
    try {
      if (!contentHTML || contentHTML.trim() === '<p></p>' || contentHTML.trim() === '') {
        alert('La escena está vacía. Escribe algo antes de exportar.');
        return;
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

  exportFullNovel: async (novel, acts = []) => {
    try {
      if (!novel) throw new Error('No hay una novela activa para exportar.');

      console.log('Iniciando exportación de novela completa:', novel.title);

      let fullHtml = `
        <!DOCTYPE html>
        <html lang="es">
          <head><meta charset="UTF-8"></head>
          <body>
            <div style="text-align: center; padding-top: 100px; margin-bottom: 50px;">
              <h1 style="font-size: 36pt; margin-bottom: 10px;">${novel.title}</h1>
              <h2 style="font-size: 18pt; color: #555;">${novel.author || 'Autor desconocido'}</h2>
              <p style="margin-top: 50px; font-style: italic;">Manuscrito generado por LoneWriter</p>
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
                Capítulo ${ch.number || ''}: ${ch.title}
              </h1>
          `;

          const scenes = ch.scenes || [];
          for (const sc of scenes) {
            fullHtml += `
              <div style="margin-bottom: 25px;">
                <h3 style="color: #777; font-size: 11pt; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
                  Escena: ${sc.title} ${sc.pov ? `(POV: ${sc.pov})` : ''}
                </h3>
                <div class="scene-content">
                  ${sc.content || '<p><i>Escena sin contenido</i></p>'}
                </div>
              </div>
            `;
          }

          fullHtml += `</div>`;
        }
      }

      fullHtml += `</body></html>`;

      console.log('Generando DOCX con html-to-docx...');

      const output = await HTMLToDOCX(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });

      console.log('DOCX generado con éxito, iniciando descarga.');

      const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const fileName = `${novel.title.replace(/[^a-z0-9]/gi, '_')}_Manuscrito.docx`;

      saveAs(blob, fileName);
      return true;
    } catch (error) {
      console.error('[LoneWriter] Error al exportar novela completa:', error);
      throw error;
    }
  }
};
