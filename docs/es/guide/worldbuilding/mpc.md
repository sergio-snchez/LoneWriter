# El MPC (Monitor de Propuestas)

El Monitor de Propuestas del Compendio (MPC) es una herramienta de asistencia que opera durante el proceso de escritura. Su función es identificar automáticamente menciones de personajes, lugares u objetos en el borrador para sugerir su incorporación al Compendio.

---

## Funcionamiento del MPC

<div style="display: flex; gap: 40px; align-items: center; flex-wrap: wrap;">
<div style="flex: 0.8; min-width: 280px; text-align: center;">

![Interruptor de Escaneo Automático del MPC](/img/guide/worldbuilding/mpc_switch.png)

</div>
<div style="flex: 1; min-width: 300px;">

Mientras redacta en el editor, el motor de IA analiza el flujo de su narrativa de forma periódica y silenciosa en segundo plano para detectar elementos clave.

**Para que este análisis inteligente se ejecute correctamente, asegúrese de tener siempre activado el interruptor de escaneo automático (Scanning Auto) que encontrará en la cabecera de la vista del Compendio.**

Por ejemplo, si escribe: *"El oficial Valerius exploraba las ruinas de Kaelum"*, el MPC identificará posibles entradas para Valerius y Kaelum.

</div>
</div>

> [!TIP] Primer uso
> La primera vez que active el MPC, el sistema descargará automáticamente el modelo local **all-MiniLM-L6-v2** (aprox. 25MB). Este proceso solo ocurre una vez y permite que el análisis semántico se realice íntegramente en su dispositivo, garantizando su privacidad.

---

## Gestión de Propuestas
Las detecciones se muestran en el panel lateral del MPC. Para cada propuesta, dispone de las siguientes opciones:

- **Aceptar**: La entidad se crea en el Compendio con los datos extraídos por el sistema.
- **Rechazar**: La propuesta se descarta.
- **Editar**: Permite modificar el nombre o la categoría antes de confirmar la creación.

---

## Detección de Relaciones
El sistema no se limita a identificar nombres propios, sino que también intenta inferir vínculos entre entidades basándose en el contexto del texto, sugiriendo relaciones automáticas cuando es posible.

---

## Configuración
La sensibilidad y frecuencia del MPC pueden ajustarse desde el menú de Configuración:
- **Frecuencia**: Define el intervalo de análisis del texto.
- **Estado**: Permite activar o desactivar el monitor según las necesidades del flujo de trabajo.

> [!IMPORTANT] IMPORTANTE
> El MPC ha sido diseñado como una herramienta de apoyo que siempre requiere la supervisión del autor. Ningún elemento se añadirá al Compendio sin su aprobación explícita.
