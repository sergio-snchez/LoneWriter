# El Nexus y la Línea de Tiempo

LoneWriter proporciona herramientas de visualización avanzada para analizar la estructura de su obra desde perspectivas que el texto lineal no permite apreciar.


## El Nexus (Grafo de conocimientos)
El Nexus es una representación tridimensional de su universo narrativo. Cada nodo representa una entidad del **[Compendio](../worldbuilding/compendium.md)** y cada línea un vínculo entre ellas (consulte la guía de **[Relaciones y Entidades](../worldbuilding/entities.md)**).

### Funcionalidades del Nexus:
- **Navegación Espacial**: Puede rotar, hacer zoom y desplazarse por el grafo para explorar diferentes clústeres de información.
- **Enfoque en Nodo**: Al seleccionar una entidad, el Nexus resaltará sus conexiones directas y atenuará el resto, permitiendo analizar la red social o geográfica de un personaje u objeto específico.
- **Navegación Dual**: Alterne entre el modo **3D** para una exploración inmersiva y el modo **2D** para una vista esquemática y analítica de las conexiones.
- **Acceso Directo**: Al hacer doble clic en un nodo, se abrirá automáticamente su ficha en el **[Compendio](../worldbuilding/compendium.md)** para su edición.


<StepCarousel :slides="[
  { src: '/img/guide/analysis/nexus_step1.png', label: '1. Vista 3D del grafo: exploración espacial inmersiva de las conexiones.' },
  { src: '/img/guide/analysis/nexus_step2.png', label: '2. Vista 2D del grafo: representación esquemática y analítica de los vínculos.' },
  { src: '/img/guide/analysis/nexus_step3.png', label: '3. Vista del Timeline: organización cronológica y secuencial de los eventos.' }
]" />


## La Línea de Tiempo (Timeline)
La coherencia cronológica es vital en cualquier historia. La Línea de Tiempo de LoneWriter permite organizar los eventos de forma secuencial.

### Elementos de la Línea de Tiempo:
- **Eventos**: Hitos narrativos que ocurren en un momento específico.
- **Asociaciones**: Cada evento puede estar vinculado a personajes o ubicaciones del **[Compendio](../worldbuilding/compendium.md)**.
- **Visualización**: Permite ver de forma gráfica la duración de los arcos argumentales y la densidad de eventos en diferentes periodos de la historia.
Para que un evento aparezca en el timeline, debe estar reflejada en la sinopsis de la escena donde ocurre, así como indicar el momento/fecha en que sucede.

<ZoomImage src="/img/guide/analysis/timeline_setup.png" alt="Configuración de eventos para el Timeline" />


## Sincronización con el Oráculo
**[El Oráculo](./oracle.md)** integra los datos del Nexus (relaciones e entidades) y el contexto del Manuscrito (RAG) para ofrecer respuestas coherentes sobre su universo. Esto permite realizar consultas precisas como:
- "Muéstrame la red de enemigos de la facción rebelde."
- "¿Cómo ha evolucionado la relación entre Dorian y Lyra según lo escrito hasta ahora?"

> [!NOTE] NOTA
> Mientras que el Nexus aporta la estructura lógica de su mundo, la memoria de eventos proviene directamente del texto indexado del manuscrito, garantizando que el Oráculo siempre sea fiel a lo que realmente ha escrito.


## Recomendaciones de Visualización
- **Densidad de Nodos**: Si su universo es muy extenso, utilice los filtros de categoría o etiquetas para simplificar la vista del Nexus.
- **Orden Cronológico**: Asegúrese de asignar fechas o periodos a sus eventos para que la Línea de Tiempo refleje fielmente la progresión de la trama.


> [!NOTE] NOTA
> Estas herramientas no son solo estéticas; son instrumentos de análisis que le ayudarán a detectar hilos narrativos sueltos o redundancias en su historia.

## Siguiente paso
Asegure la coherencia de su obra con la guía de **[Contexto y Continuidad](../editor/context.md)**.
