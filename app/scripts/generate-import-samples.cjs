const JSZip = require('jszip')
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', '..', 'test-import')

async function createDocx() {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
  zip.file('word/styles.xml', '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:style></w:styles>')
  zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Mi Novela de Prueba</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>Texto de introduccion generado desde Word.</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>Este documento tiene capitulos y escenas para probar la importacion.</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Capitulo 1: El Inicio</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>Era una manana fria de otono. El viento soplaba con fuerza mientras el protagonista se preparaba para su viaje.</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Escena 1: La Partida</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>Salio de su casa al amanecer, con una mochila y determinacion.</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Escena 2: El Bosque</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>El bosque era oscuro y misterioso.</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Capitulo 2: El Desarrollo</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>Despues de dias de viaje, llego a la ciudad principal.</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Escena 1: La Llegada</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>La ciudad era mas grande de lo que habia imaginado.</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Capitulo 3: El Final</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>Todo llego a su conclusion de una manera inesperada.</w:t></w:r></w:p></w:body></w:document>')
  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  fs.writeFileSync(path.join(outDir, 'test-doc.docx'), buf)
  console.log('OK test-doc.docx (' + buf.length + ' bytes)')
}

async function createOdt() {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compress: false })
  zip.file('META-INF/manifest.xml', '<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:type="text/xml"/></manifest:manifest>')
  zip.file('content.xml', '<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2"><office:body><office:text><text:h text:outline-level="1">Mi Novela de Prueba</text:h><text:p>Texto de introduccion generado desde ODT.</text:p><text:p>Este documento tiene capitulos y escenas.</text:p><text:h text:outline-level="2">Capitulo 1: El Inicio</text:h><text:p>Era una manana fria de otono.</text:p><text:h text:outline-level="3">Escena 1: La Partida</text:h><text:p>Salio de su casa al amanecer.</text:p><text:h text:outline-level="3">Escena 2: El Bosque</text:h><text:p>El bosque era oscuro y misterioso.</text:p><text:h text:outline-level="2">Capitulo 2: El Desarrollo</text:h><text:p>Despues de dias de viaje.</text:p><text:h text:outline-level="3">Escena 1: La Llegada</text:h><text:p>La ciudad era mas grande.</text:p><text:h text:outline-level="2">Capitulo 3: El Final</text:h><text:p>Todo llego a su conclusion.</text:p></office:text></office:body></office:document-content>')
  zip.file('styles.xml', '<?xml version="1.0" encoding="UTF-8"?><office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" office:version="1.2"/>')
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  fs.writeFileSync(path.join(outDir, 'test-odt.odt'), buf)
  console.log('OK test-odt.odt (' + buf.length + ' bytes)')
}

;(async () => {
  await createDocx()
  await createOdt()
  console.log('Done')
})()
