# El MPC (Monitor de Propuestas)

El Monitor de Propuestas del Compendio (MPC) es una herramienta de asistencia que opera durante el proceso de escritura. Su función es identificar automáticamente menciones de personajes, lugares u objetos en el borrador para sugerir su incorporación al Compendio.

> [!IMPORTANT]
> El MPC ha sido diseñado como una herramienta de apoyo que siempre requiere la supervisión del autor. Ningún elemento se añadirá al Compendio sin su aprobación explícita.

## Funcionamiento del MPC

<div style="display: flex; gap: 40px; align-items: center; flex-wrap: wrap;">
<div style="flex: 0.8; min-width: 280px; text-align: center;">

![Interruptor de Escaneo Automático del MPC](/img/guide/worldbuilding/mpc_switch.png)

</div>
<div style="flex: 1; min-width: 300px;">

Mientras redacta en el editor, el motor de IA analiza el flujo de su narrativa de forma periódica y silenciosa en segundo plano para detectar elementos clave que aún no han sido registrados (Personajes, Lugares, Objetos o elementos de Lore).

Para garantizar un rendimiento fluido, el monitor utiliza un intervalo de cortesía (**cooldown**) de unos 15 segundos entre cada análisis automático. Si prefiere un resultado inmediato sobre un párrafo concreto, puede forzarlo mediante el **Análisis Manual**: simplemente seleccione el texto y pulse el botón MPC en la cabecera.

**Para que el análisis en segundo plano se ejecute, asegúrese de tener activado el interruptor "Scanning Auto" en la cabecera de la vista del Compendio.**

</div>
</div>

---


## Gestión de Propuestas
Las detecciones se muestran en el panel lateral del MPC. El sistema filtra automáticamente cualquier nombre que ya exista en su Compendio para evitar duplicidades. Para cada propuesta, dispone de las siguientes opciones:

- **Aceptar**: La entidad se crea en el Compendio. El sistema intenta extraer automáticamente datos como el rol, la categoría o rasgos distintivos basándose en el contexto.
- **Rechazar**: Elimina la propuesta de la lista de sugerencias actual.
- **Ignorar Permanentemente**: Añade el nombre a una \"lista negra\" específica de la novela para que el monitor no vuelva a sugerirlo en futuros escaneos.
- **Editar**: Permite modificar el nombre o cambiar la categoría (ej. de Personaje a Objeto) antes de confirmar la creación definitiva.

> [!NOTE] CONSEJO
> Las propuestas del MPC se guardan localmente para cada novela. Puede cerrar la aplicación y sus sugerencias pendientes seguirán disponibles en su próxima sesión.

<StepCarousel :slides="[
  { src: '/img/guide/worldbuilding/mpc_step1.png', label: '1. Detección automática de entidades mientras el autor escribe.' },
  { src: '/img/guide/worldbuilding/mpc_step2.png', label: '2. Revisión de las entidades detectadas automáticamente (notificadas en el botón del MPC).' },
  { src: '/img/guide/worldbuilding/mpc_step3.png', label: '3. Activación manual del MPC: búsqueda de entidades en un fragmento de texto seleccionado.' },
  { src: '/img/guide/worldbuilding/mpc_step4.png', label: '4. Revisión de las nuevas entidades detectadas basándose en la selección anterior.' },
  { src: '/img/guide/worldbuilding/mpc_step5.png', label: '5. Navegación por el Compendio con todas las nuevas entidades guardadas y organizadas.' }
]" />
