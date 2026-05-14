# Relaciones y Entidades

La profundidad de un universo narrativo reside en los vínculos que conectan a sus elementos. LoneWriter permite modelar estas conexiones de forma granular, transformando una lista de notas en un ecosistema vivo.


## Tipos de Entidades
Como se menciona en la guía del **[Compendio](./compendium.md)**, existen cuatro categorías fundamentales: Personajes, Ubicaciones, Objetos y Lore. Cada una tiene campos específicos que el autor puede completar manualmente o mediante la asistencia de la inteligencia artificial.


## Definición de Relaciones
Una relación es un vínculo semántico entre dos entidades. LoneWriter permite definir la naturaleza de estos vínculos para que **[El Oráculo](../analysis/oracle.md)** y **[El Nexus](../analysis/nexus.md)** puedan interpretarlos correctamente.

### Gestión y Bidireccionalidad
Las relaciones se gestionan directamente desde el botón **Relaciones** en la ficha de cualquier entidad. Es importante destacar que el sistema es **bidireccional**: al definir un vínculo en una entidad (ej. "Dorian es Padre de Lyra"), LoneWriter reflejará automáticamente la relación inversa en la otra entidad (ej. "Lyra es Hija de Dorian").

### Cómo establecer una conexión (Entre Personajes)
1. Acceda a la ficha de una entidad en el **[Compendio](./compendium.md)**.
2. Pulse el botón de **Relaciones**.
3. Seleccione la entidad de destino mediante el buscador.
4. Defina el **Tipo de Vínculo**:
   - **Jerárquico**: "Subordinado de", "Padre de", "Parte de".
   - **Geográfico**: "Ubicado en", "Origen de".
   - **Emocional**: "Aliado de", "Enemigo de", "Enamorado de".
   - **De Propiedad**: "Propietario de", "Reliquia de".

### Relaciones Cruzadas (Ecosistema Total)
LoneWriter no limita los vínculos a personajes. Todas las entidades disponen de relaciones cruzadas, permitiéndole conectar cualquier categoría entre sí:
- **Personaje ↔ Ubicación**: Un protagonista vinculado a su ciudad natal.
- **Ubicación ↔ Lore**: Una región asociada a una leyenda o fauna específica.
- **Objeto ↔ Personaje**: Una espada legendaria vinculada a su portador actual.

Por ejemplo, una ficha de **Lore** sobre una especie animal puede estar vinculada simultáneamente a una **Ubicación** (su hábitat), a un **Personaje** (su domesticador) y a un **Objeto** (la herramienta fabricada con sus pieles).


<StepCarousel :slides="[
  { src: '/img/guide/worldbuilding/entities_step1.png', label: '1. Las relaciones entre personajes se gestionan desde el botón correspondiente.' },
  { src: '/img/guide/worldbuilding/entities_step2.png', label: '2. Vínculos bidireccionales: los cambios se reflejan automáticamente en ambas entidades (ej. Padre/Hija).' },
  { src: '/img/guide/worldbuilding/entities_step3.png', label: '3. Flexibilidad total: vincula personajes con localizaciones, objetos o aspectos del lore.' },
  { src: '/img/guide/worldbuilding/entities_step4.png', label: '4. Relaciones cruzadas: todas las entidades de cualquier categoría pueden conectarse entre sí.' },
  { src: '/img/guide/worldbuilding/entities_step5.png', label: '5. Ejemplo complejo: una criatura (Lore) asociada a un personaje concreto (criador/cazador) en una ubicación específica (especie autóctona).' }
]" />


## Impacto en el Nexus
Cada relación creada genera una línea de conexión en **[El Nexus](../analysis/nexus.md)** (Grafo 3D). La fuerza o el tipo de relación se visualiza mediante diferentes colores y grosores, permitiéndole identificar de un vistazo:
- Personajes con mayor influencia en la trama (nodos más grandes).
- Grupos o facciones (clústeres de nodos conectados entre sí).
- Rutas de viaje o pertenencia geográfica.


## Uso de Etiquetas (Tags)
Además de las relaciones directas, puede utilizar etiquetas para agrupar entidades bajo conceptos transversales (ejemplo: "Nobleza", "Magia Oscura", "Resistencia"). Esto facilita el filtrado en el **[Compendio](./compendium.md)** y permite al **[Oráculo](../analysis/oracle.md)** realizar búsquedas temáticas más precisas.

<ZoomImage src="/img/guide/worldbuilding/tags_compendium.png" alt="Filtrado por etiquetas en el Compendio" />



## Automatización con el MPC
Recuerde que el **[Monitor de Propuestas (MPC)](./mpc.md)** es capaz de sugerir relaciones nuevas al detectar menciones conjuntas en el texto. Siempre es recomendable revisar estas sugerencias para enriquecer la base de datos de su mundo de forma orgánica.

## Siguiente paso
Consulte sus dudas narrativas directamente con **[El Oráculo](../analysis/oracle.md)**.
