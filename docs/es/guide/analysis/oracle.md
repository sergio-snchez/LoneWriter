# El Oráculo

El Oráculo es una herramienta de consulta narrativa avanzada. A diferencia de los modelos de lenguaje generales, el Oráculo dispone de acceso directo a los borradores y al Compendio de su proyecto.

Utiliza tecnología RAG (Generación Aumentada por Recuperación) para procesar sus textos y proporcionar respuestas precisas basadas exclusivamente en su historia.

---

## Consultas al Oráculo
El acceso al Oráculo se realiza desde la barra de herramientas principal.

### Ejemplos de uso:
- "¿Cómo se llamaba el personaje secundario introducido en el primer capítulo?"
- "¿Cuál es el vínculo histórico entre la ciudad de Kaelum y el protagonista?"
- "Proporciona un resumen de los eventos ocurridos en la escena anterior."
- "¿Existen inconsistencias en la descripción del objeto reliquia?"

---

## Funcionamiento Técnico
Para garantizar la precisión y rapidez de las respuestas, LoneWriter realiza un proceso de indexación local:

1. **Indexación**: El sistema procesa el texto en segundo plano para estructurar la información en una base de datos vectorial local.
2. **Privacidad**: Todo el procesamiento se realiza de forma local en el navegador. La base de datos de conocimiento no se transfiere a servidores externos.
3. **Actualización**: El sistema notifica al usuario cuando el contenido del borrador ha sido indexado correctamente y está disponible para consultas.

---

## Recomendaciones de Uso
- **Precisión**: Para obtener los mejores resultados, se recomienda realizar preguntas específicas que incluyan nombres de entidades.
- **Mantenimiento del Compendio**: La calidad de las respuestas depende de la completitud de la información en el Compendio y en los borradores.
- **Contexto**: Es posible delimitar el alcance de la búsqueda a capítulos específicos o a la totalidad de la obra.

> [!NOTE] NOTA
> El Oráculo es una herramienta diseñada para asistir en la gestión de tramas complejas y el mantenimiento de la coherencia en obras extensas.
