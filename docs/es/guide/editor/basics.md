# El Editor

El editor de LoneWriter ha sido diseñado para minimizar las distracciones y maximizar el flujo creativo, integrando las herramientas de inteligencia artificial de forma orgánica.


### El Área de Escritura
El corazón de la aplicación es un editor de texto enriquecido que admite formatos básicos. Su diseño limpio permite centrarse exclusivamente en la palabra.


## Gestión de Actos, Capítulos y Escenas

LoneWriter organiza tu trabajo en unidades lógicas jerárquicas (**Actos > Capítulos > Escenas**) para facilitar la navegación y la indexación de datos.

### Cómo estructurar tu historia
1. **Creación**: El primer paso es crear una novela; puedes darle el nombre que desees.
2. **Jerarquía**: El nuevo proyecto crea un acto por defecto. Desde el menú lateral "Estructura Narrativa" puedes crear nuevos actos, capítulos y escenas según necesites.
3. **Edición de Títulos**: Puedes renombrar cualquier acto, capítulo, escena o incluso el título de la novela simplemente haciendo doble clic sobre lo que desees modificar.
4. **Flujo de Trabajo**: Una vez definida la estructura, puedes empezar a escribir y usar las herramientas de IA a tu disposición directamente en el editor.
5. **Organización Flexible**: Puedes arrastrar escenas para reordenarlas o cambiarlas de capítulo. También es posible reorganizar capítulos o actos enteros utilizando el icono de arrastre situado a la izquierda de cada elemento.

<StepCarousel :slides="[
  { src: '/img/guide/editor/structure_step1.png', label: '1. Crea tu novela con el nombre que desees.' },
  { src: '/img/guide/editor/structure_step2.png', label: '2. El proyecto incluye un acto por defecto; añade nuevos desde el menú lateral.' },
  { src: '/img/guide/editor/structure_step3.png', label: '3. Renombra cualquier elemento haciendo doble clic sobre su título.' },
  { src: '/img/guide/editor/structure_step4.png', label: '4. Empieza a escribir directamente en el editor con todas las herramientas de IA.' },
  { src: '/img/guide/editor/structure_step5.png', label: '5. Arrastra y reordena elementos usando el icono de la izquierda.' }
]" />


## Opciones incluidas en el Editor

El editor no es solo un lienzo de texto; incluye herramientas integradas para gestionar la metadata y el progreso de cada escena.

### Configuración de Escena y Estadísticas
1. **Herramientas de Escena**: Junto al nombre o título de la escena, encontrarás un **Chevron** (flecha) que despliega herramientas relacionadas con otras funciones de LoneWriter.
2. **Metadata y Nexus**: Desde esta sección puedes modificar el estado de la escena (**Borrador, En progreso, Completado**), asignar el **POV** (punto de vista) y establecer la fecha y la sinopsis. Estos datos son fundamentales para las visualizaciones cronológicas del **[Nexus](../analysis/nexus.md)**.
3. **Herramientas de IA y Exportación**: Junto al botón de exportar escena en .docx, encontrarás botones para funciones de IA avanzadas como "No Key Elements" y "MPC Compendium" (que veremos en detalle más adelante).
4. **Estadísticas Detalladas**: La sección **Estadísticas del Proyecto** en la parte inferior también puede desplegarse para ampliar la información sobre tu ritmo de escritura.
5. **Objetivos de Escritura**: El contador de "palabras totales" es un botón interactivo. Al pulsarlo, puedes configurar diferentes tipos de escritos (Relato corto, Novela estándar, etc.) y sus respectivas extensiones para realizar un seguimiento de tus metas.

<StepCarousel :slides="[
  { src: '/img/guide/editor/editor_options_1.png', label: '1. Despliega el Chevron junto al título para ver opciones extra.' },
  { src: '/img/guide/editor/editor_options_2.png', label: '2. Gestiona el estado, POV, fecha y sinopsis de la escena.' },
  { src: '/img/guide/editor/editor_options_5.png', label: '3. Acceso rápido a herramientas de IA y exportación a Word.' },
  { src: '/img/guide/editor/editor_options_3.png', label: '4. Expande las estadísticas para ver tu progreso diario.' },
  { src: '/img/guide/editor/editor_options_4.png', label: '5. Configura metas de palabras personalizadas según tu proyecto.' }
]" />


## Panel IA

Más allá del texto, el editor integra un panel de herramientas inteligentes diseñadas para asistir en el proceso creativo sin romper el flujo de trabajo.

### Herramientas de Asistencia
1. **[Oráculo](../analysis/oracle.md)**: Tu conexión directa con el conocimiento del mundo. Permite realizar consultas sobre el lore, personajes o tramas que hayas definido en tu proyecto (consulte la guía de **[El Oráculo](../analysis/oracle.md)**).
2. **[MPC](../worldbuilding/mpc.md)**: El Monitor de Propuestas del Compendio analiza tu texto para sugerir nuevas entradas o actualizaciones para tu enciclopedia personal (consulte la guía de **[El MPC](../worldbuilding/mpc.md)**).
3. **[Reescritura](./rewrites.md)**: Un conjunto de herramientas para pulir, expandir o cambiar el tono de fragmentos específicos de tu manuscrito.
4. **[Ajustes de IA](../setup/api-keys.md)**: Permite cambiar entre diferentes modelos (locales o en la nube) y ajustar los parámetros de generación al vuelo.

> [!TIP] CONSEJO
> Encontrarás guías detalladas sobre el funcionamiento profundo de cada una de estas herramientas en sus respectivas secciones de la documentación.


## Guardado Automático y Local
La seguridad de tus textos es prioritaria.
- **Persistencia**: Los datos se guardan automáticamente en la base de datos local de tu navegador (IndexedDB).
- **Estado de Guardado**: Un indicador visual te confirmará que tu trabajo está seguro tras cada cambio.


> [!NOTE] NOTA
> Aunque el guardado es automático, se recomienda realizar [exportaciones periódicas](../cloud/export.md) o configurar la [sincronización con Google Drive](../cloud/sync.md) para mayor seguridad.

## Siguiente paso
Aprenda a pulir su prosa con la **[Reescritura Inteligente](./rewrites.md)** o comience a construir su mundo en **[El Compendio](../worldbuilding/compendium.md)**.
