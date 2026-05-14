# Contexto y Continuidad

El mayor desafío al escribir una novela extensa es mantener la coherencia de los detalles. LoneWriter utiliza su arquitectura de inteligencia artificial para asegurar que cada nueva palabra sea fiel a lo que ya ha sido establecido.


## La Ventana de Contexto
Cuando solicitas una reescritura o consultas al Oráculo, LoneWriter no solo envía tu petición a la IA. El sistema adjunta automáticamente información relevante:

1. **Contexto de Escena**: Los párrafos inmediatamente anteriores y posteriores a tu cursor.
2. **Contexto de Novela**: Un resumen global de la trama y los temas principales.
3. **Contexto de Lore**: Información del **[Compendio](../worldbuilding/compendium.md)** sobre los personajes y lugares mencionados en la escena actual.


## Evitar Incoherencias
Gracias a la indexación local (RAG), el sistema puede detectar si estás contradiciendo un hecho establecido anteriormente.

- **Detección**: Si escribes que un personaje tiene los ojos azules cuando en el capítulo 1 se describieron como verdes, **[El Oráculo](../analysis/oracle.md)** o el **[MPC](../worldbuilding/mpc.md)** pueden alertarte sobre esta discrepancia consultando la estructura del **[Nexus](../analysis/nexus.md)**.
- **Sugerencias de Continuidad**: Al solicitar una continuación de escena, la IA tendrá en cuenta el tono, el ritmo y el estado emocional de los personajes para asegurar una transición fluida.


## Gestión de la "Memoria" del Proyecto
Para que la continuidad sea efectiva, el autor debe:
- **Mantener el Compendio**: Asegurarse de que las entidades clave estén bien descritas.
- **Resumir Escenas**: Utilizar la función de sinopsis para proporcionar al sistema una visión estructurada de la trama.
- **Indexación periódica**: El sistema actualiza su base de datos de conocimiento de forma automática, pero el autor puede forzar una re-indexación si ha realizado cambios estructurales profundos.


> [!IMPORTANT] IMPORTANTE
> El sistema no toma decisiones creativas por ti. Su función es actuar como una red de seguridad que te avisa de posibles errores lógicos, permitiéndote mantener el control total sobre la narrativa.

## Volver al inicio
Ahora que conoce las herramientas, recuerde por qué LoneWriter prioriza su **[Privacidad y Soberanía](../philosophy.md)**.
