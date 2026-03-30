import { db } from '../db/database';
import { saveAs } from 'file-saver';
import HTMLToDOCX from 'html-to-docx';

/**
 * Service to handle project portability (.lwrt) and document export (.docx)
 */
export const ExportService = {
  /**
   * Export the entire database as a .lwrt file (JSON)
   */
  exportProject: async () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: {}
      };

      // Export all Dexie tables
      for (const table of db.tables) {
        data.tables[table.name] = await table.toArray();
      }

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const novelTitle = data.tables.novels[0]?.title || 'Proyecto';
      saveAs(blob, `${novelTitle}.lwrt`);
      
      return true;
    } catch (error) {
      console.error('Error exporting project:', error);
      throw error;
    }
  },

  /**
   * Import a .lwrt file and overwrite the current database
   */
  importProject: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.tables) throw new Error('Formato .lwrt inválido');

          await db.transaction('rw', db.tables, async () => {
            // Clear all tables
            for (const table of db.tables) {
              await table.clear();
              // Re-seed from import
              if (data.tables[table.name]) {
                await table.bulkAdd(data.tables[table.name]);
              }
            }
          });

          window.location.reload(); // Hard reload to reset context
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

  /**
   * Export a specific scene or a whole chapter to Word (.docx)
   */
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

      // Fix: Explicitly convert to Blob for browser compatibility
      const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      saveAs(blob, `${title}.docx`);
      return true;
    } catch (error) {
      console.error('[LoneWriter] Error exporting to Word:', error);
      throw error;
    }
  },

  /**
   * Export the entire novel structure to a single Word document
   */
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

      // Iterar por actos y capítulos
      for (const act of acts) {
        // Salto de página antes de cada acto
        fullHtml += `<br style="page-break-before: always; clear: both;" />`;
        fullHtml += `<div style="text-align: center; margin-top: 50px; margin-bottom: 30px;">
          <h2 style="color: #444; font-size: 24pt;">${act.title}</h2>
        </div>`;
        
        const chapters = act.chapters || [];
        for (const ch of chapters) {
          // Cada capítulo empieza en nueva página
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
