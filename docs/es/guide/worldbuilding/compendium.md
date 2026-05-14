# El Compendio

El Compendio constituye la base de conocimiento de su mundo. Se trata de una base de datos inteligente que LoneWriter utiliza para mantener la coherencia narrativa y proporcionar información precisa al **[Oráculo](../analysis/oracle.md)**.


## Estructura del Compendio
El Compendio organiza la información en cuatro categorías principales:

1. **Personajes**: Protagonistas, antagonistas y personajes secundarios.
2. **Ubicaciones**: Entornos geográficos, ciudades o estancias específicas.
3. **Objetos**: Ítems, tecnología o reliquias relevantes para la trama.
4. **Lore**: Hechos históricos, sistemas de magia o conceptos culturales.


## Funciones Avanzadas

### Gestión del Contexto IA
En la ficha de cada entidad encontrará una etiqueta marcada como **AI Context**. Este interruptor es vital para la precisión del **[Oráculo](../analysis/oracle.md)**:
- **Activado**: La IA conoce la existencia de esta entidad y sus detalles al responder preguntas.
- **Desactivado**: La entidad se oculta del "conocimiento" de la IA. Es útil para evitar que el modelo alucine con información de personajes que aún no han aparecido o que han muerto.

### Autocompletado Inteligente
El botón de la "varita mágica" (Magic Wand) activa el escaneo profundo. LoneWriter buscará en todo su borrador menciones a esta entidad para:
1.  Redactar un **resumen automático** de su papel en la historia.
2.  Identificar **etiquetas relevantes** (rasgos, tipos).
3.  Detectar **relaciones** con otras entidades existentes.

<StepCarousel :slides="[
  { src: '/img/guide/worldbuilding/compendium_step1.png', label: '1. Vista general del Compendio: organización por categorías (Personajes, Lugares, etc.).' },
  { src: '/img/guide/worldbuilding/compendium_step2.png', label: '2. Acceso a detalles: al pulsar sobre una entidad se despliegan sus etiquetas, descripción y el acceso a **Relaciones**.' },
  { src: '/img/guide/worldbuilding/compendium_step3.png', label: '3. Control de Contexto IA: active o desactive el interruptor para que la IA ignore o considere esta entidad.' },
  { src: '/img/guide/worldbuilding/compendium_step4.png', label: '4. Modo Edición: acceda al formulario completo para modificar cualquier atributo de la ficha.' },
  { src: '/img/guide/worldbuilding/compendium_step5.png', label: '5. Autocompletado IA: deje que el sistema analice su borrador y complete la ficha por usted.' }
]" />

> [!TIP] CONSEJO
> Utilice el autocompletado después de una sesión intensa de escritura para asegurar que sus fichas de personaje siempre reflejan los últimos cambios del borrador.


## Relaciones entre Entidades
Para una guía detallada sobre cómo conectar personajes, lugares y objetos, consulte la sección **[Relaciones y Entidades](./entities.md)**.


Estas conexiones son el motor que alimenta **[El Nexus](../analysis/nexus.md)**. Cada entidad y relación que defina aquí se proyectará automáticamente en el Grafo de Conocimiento, permitiéndole visualizar la red de conexiones de su historia de forma tridimensional y navegar por ella de manera intuitiva.

## Siguiente paso
Descubra cómo automatizar la creación de fichas con el **[Monitor de Propuestas (MPC)](./mpc.md)**.
