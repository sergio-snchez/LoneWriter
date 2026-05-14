# Reescritura Inteligente

LoneWriter no solo guarda tus palabras; te ayuda a esculpirlas. El sistema de reescritura actúa como un editor profesional disponible las 24 horas, permitiéndote pulir el estilo, ajustar el tono o transformar la estructura de tu prosa sin salir del editor.


## Modos de Reescritura (Objetivos Rápidos)

Se han diseñado diferentes algoritmos optimizados para resolver retos específicos de la prosa literaria. Puedes activarlos mediante los botones de **Objetivo Rápido** en el panel:

1. **Estilo**: Eleva la calidad literaria de tu prosa, haciéndola más sugerente y evocadora sin alterar el significado original.
2. **Idioma**: Traduce el fragmento o adapta su registro lingüístico (ej: de formal a coloquial) manteniendo la intención narrativa intacta.
3. **Personaje (POV)**: Filtra el texto a través de la voz única de un personaje, reflejando sus pensamientos y su forma particular de ver el mundo.
4. **Longitud**: Permite expandir escenas que se sienten vacías o recortar pasajes redundantes para ir directo al grano.
5. **Claridad**: Simplifica frases excesivamente complejas y elimina el "ruido" para mejorar la legibilidad inmediata.
6. **Tono**: Ajusta la carga emocional de la escena (haciéndola más melancólica, tensa, sarcástica, etc.).
7. **Ritmo**: Optimiza la cadencia narrativa alternando longitudes de frase para crear un flujo más dinámico y envolvente.
8. **Cohesión**: Pule las costuras entre frases, asegurando transiciones naturales y una fluidez lógica en todo el fragmento.


## Flujo de Trabajo

La reescritura está integrada directamente en tu lienzo. El proceso es sencillo e intuitivo:

1. **Selección**: Sombrea con el ratón el fragmento que deseas mejorar.
2. **Activación**: Haz clic en el icono de **Reescritura** (el icono de destellos) en la barra de herramientas inteligente.
3. **Elección del Modo**: Selecciona la herramienta que mejor se adapte a tu necesidad actual (expandir, pulir, cambiar tono...).
4. **Comparativa**: Revisa la propuesta de la IA frente a tu original y decide si quieres aplicarla.

> [!NOTE] NOTA
> La reescritura generada no se elimina hasta que se genera otra nueva, o hasta que la eliminas manualmente.

<StepCarousel :slides="[
  { src: '/img/guide/editor/rewrite_step1.png', label: '1. Abre el panel IA en la pestaña de Reescritura y selecciona el texto que deseas reescribir.' },
  { src: '/img/guide/editor/rewrite_step2.png', label: '2. Elige un \'Objetivo rápido\' para cargar una instrucción por defecto (recomendado incluir contexto).' },
  { src: '/img/guide/editor/rewrite_step3.png', label: '3. Escribe una instrucción personalizada si lo necesitas y pulsa \'Reescribir\'.' },
  { src: '/img/guide/editor/rewrite_step4.png', label: '4. Revisa la propuesta, regenera si es necesario, o decide si aplicar o descartar los cambios.' }
]" />


## Instrucciones Personalizadas

¿Tienes una manía específica o un estilo muy marcado? Puedes configurar instrucciones globales en los ajustes del proyecto para que la IA siempre respete tus reglas. Por ejemplo:

- *"No uses nunca la voz pasiva"*
- *"Revisa y minimiza el uso de adverbios terminados en -mente"*
- *"Utiliza vocabulario marinero del siglo XVIII"*


## Control y Soberanía

La soberanía del autor es un pilar fundamental en LoneWriter. El sistema está diseñado para que siempre mantengas el control total sobre tu obra, permitiéndote auditar cada sugerencia de la IA antes de que pase a formar parte de tu manuscrito de forma definitiva.

### Vista Comparativa
LoneWriter te muestra ambos textos cara a cara. El original no desaparece hasta que tú pulsas **Aceptar**. Si la IA no ha dado en el clavo, pulsa **Descartar** y tu texto volverá a su estado inicial sin cambios. Y recuerda: incluso después de aceptar un cambio, siempre puedes deshacerlo con el atajo estándar `Ctrl+Z`.

### Recomendación de Modelos
Para que estas herramientas brillen, la elección del modelo es clave:



> [!TIP] CONSEJO
> Para reescrituras literarias complejas, utiliza modelos con gran capacidad de matiz:
> - **Nube**: `claude-opus-4-7` (consulte la guía de **[Claves API](../setup/api-keys.md)**) es actualmente el estándar de oro en prose.
> - **Local**: `qwen3.5:9b` (consulte la guía de **[Modelos Locales](../setup/local-models.md)**) ofrece un equilibrio espectacular entre velocidad y creatividad literaria.

## Siguiente paso
Discuta sus ideas con un equipo de expertos en el **[Foro de Debate](./debate.md)**.
