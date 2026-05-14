# Foro de Debate

¿Alguna vez has deseado poder discutir un giro de guion o la coherencia de un personaje con un equipo de profesionales? El Foro de Debate de LoneWriter permite invocar a diferentes agentes de IA para analizar tu obra desde múltiples perspectivas.


## Cómo funciona el Debate

A diferencia de la reescritura, el Foro de Debate no modifica tu texto directamente. Es un espacio de consulta donde puedes:
1. **Seleccionar** un fragmento de tu novela o escribir una duda específica.
2. **Activar** a los participantes que desees (Editor, Crítico, Corrector...).
3. **Iniciar el Debate** y dejar que la IA discuta entre sí para ofrecerte una conclusión razonada.


## Gestión de Agentes

Puedes personalizar tu equipo de debate según las necesidades de cada consulta:
- **Selección a voluntad**: Activa o desactiva participantes con un solo clic. Solo los agentes seleccionados intervendrán en la conversación actual.
- **Rondas de Debate**: Configura cuántas veces deben responderse los agentes entre sí para profundizar en el tema.
- **Contexto Inteligente**: Los agentes tienen acceso automático a la escena actual y a la información relevante de tu Compendio. Aunque puedes ajustar este acceso mediante los iconos de la barra de herramientas, el sistema está diseñado para que el contexto se incluya por defecto sin necesidad de configuración adicional.

> [!WARNING] AVISO SOBRE TOKENS
> Cada ronda adicional multiplica el consumo de tokens. El sistema está diseñado para que **cada agente lea toda la conversación previa** (incluyendo las respuestas de los participantes anteriores) antes de generar su propia intervención.

<StepCarousel :slides="[
  { src: '/img/guide/editor/debate_step1.png', label: '1. Consultando al debate sobre un párrafo que introduce un nuevo personaje.' },
  { src: '/img/guide/editor/debate_step2.png', label: '2. Cambia los participantes a voluntad, dejando por ejemplo solo al corrector para una revisión técnica.' },
  { src: '/img/guide/editor/debate_step3.png', label: '3. Pantalla de gestión de participantes: edita los perfiles existentes o crea nuevos agentes.' },
  { src: '/img/guide/editor/debate_step4.png', label: '4. Creación de un nuevo participante personalizado, como un \'Entusiasta del Roleplay\'.' },
  { src: '/img/guide/editor/debate_step5.png', label: '5. Pon a prueba a tu nuevo agente para obtener una perspectiva única sobre tu escena.' }
]" />


## Los Participantes (Agentes)

LoneWriter incluye tres perfiles preconfigurados, cada uno con una "personalidad" y enfoque técnico distinto. Sin embargo, el equipo es totalmente flexible: puedes **editar sus instrucciones (prompts)** para ajustar su comportamiento o **crear tantos participantes nuevos como necesites** (ej: un experto en mitología nórdica o un asesor científico).

- **Editor**: Se centra en la estructura narrativa, el ritmo de la trama y el arco de los personajes.
- **Crítico**: Ofrece una valoración analítica y honesta, comparando técnicas y buscando puntos débiles en la lógica de la historia.
- **Corrector**: Se encarga de la parte más técnica: gramática, ortografía, tics de escritura y fluidez a nivel de frase.

<ZoomImage src="/img/guide/editor/debate_manage_btn.png" alt="Botón de Gestión de Participantes" />


## Memoria del Foro
Cada chat de debate se guarda de forma independiente. Puedes navegar por tu historial de discusiones, renombrar hilos o eliminarlos cuando ya no los necesites.


> [!TIP] CONSEJO
> El Foro de Debate es especialmente potente gracias a su integración con el Compendio. Los agentes podrán avisarte si alguna idea surgida en la conversación contradice lo que ya has establecido como canon en tu mundo.

## Siguiente paso
Organice los detalles de su universo en **[El Compendio](../worldbuilding/compendium.md)**.
