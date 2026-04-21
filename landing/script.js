// Initialize Lucide icons
lucide.createIcons();

// Intersection Observer for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-in, .fade-in-up');
    animatedElements.forEach(el => observer.observe(el));

    // Localization / i18n
    const translations = {
        en: {
            nav_features: "Features",
            nav_engine: "MPC System",
            nav_openapp: "Open App",
            badge_version: "v1.7 Anáfora is Live",
            hero_title_1: "The Intelligent IDE<br/>for",
            hero_title_2: "Novelists",
            hero_subtitle: "Compose, structure, and refine your masterwork in a distraction-free, privacy-first environment enhanced by local AI.",
            hero_launch: "Launch Editor",
            hero_discover: "Discover Features",
            mock_heading: "Chapter 1: The Golden Parrot",
            mock_p: "Silas occupied his usual table, a shadowy corner at the back of The Golden Parrot, where the shadows seemed to adhere to the walls...",
            mock_mpc: "3 Entities Detected",
            features_sectitle: "Built for the Architect and the Gardener",
            features_secsub: "A granular suite of tools to handle everything from scene drafting to entire world-building bibles.",
            feat_1_title: "Narrative Structure",
            feat_1_desc: "Organize your novel into Acts, Chapters, and Scenes. Reorder your manuscript with fluid drag-and-drop mechanics.",
            feat_2_title: "Goal Tracking",
            feat_2_desc: "Set custom word counts, chapter targets, and visually track your progress. Keep your writing streak alive.",
            feat_3_title: "Knowledge Base",
            feat_3_desc: "Upload your world-building lore, specific chapter notes, and context files. Toggle them instantly for the Oracle to review.",
            feat_4_title: "Cloud Sync",
            feat_4_desc: "Local-first storage with optional Google Drive syncing and continuous backups to ensure your manuscript is never lost.",
            feat_5_title: "Dynamic Design",
            feat_5_desc: "Immerse yourself in a beautifully crafted responsive UI with customizable dynamic glassmorphism and an elegant dark mode.",
            feat_6_title: "Frictionless Export",
            feat_6_desc: "Compile your entire project into a standard Document (.docx) with one click, perfectly formatted for publishing.",
            engine_badge: "MPC Coreference Engine",
            engine_title: "Minimum Plausible Context",
            engine_sub: "LoneWriter extracts and categorizes important elements dynamically as you type without consuming massive amounts of AI tokens.",
            eng_1_label: "Characters:",
            eng_1: "Tracks character traits and appearances dynamically.",
            eng_2_label: "Locations:",
            eng_2: "Connects scenes directly to your custom world map locales.",
            eng_3_label: "Lore & Objects:",
            eng_3: "Contextual awareness of your magical or sci-fi systems.",
            eng_4_label: "Saliency Scoring:",
            eng_4: "Injects only the most relevant lore into your AI prompts.",
            comp_head: "Compendium",
            comp_char: "Characters",
            comp_loc: "Locations",
            comp_obj: "Objects",
            comp_lore: "Lore",
            footer_quote: "Your masterpiece, structured intelligently.",
            footer_res: "Resources",
            footer_doc: "Documentation",
            footer_change: "Changelog (v1.7)",
            footer_auth: "Author",
            footer_copy: "© 2026 Sergio Sánchez. Built for creators."
        },
        es: {
            nav_features: "Características",
            nav_engine: "Sistema MPC",
            nav_openapp: "Abrir App",
            badge_version: "v1.7 Anáfora ya disponible",
            hero_title_1: "El IDE Inteligente<br/>para",
            hero_title_2: "Novelistas",
            hero_subtitle: "Compón, estructura y refina tu obra maestra en un entorno sin distracciones, enfocado en la privacidad y potenciado por IA local.",
            hero_launch: "Iniciar Editor",
            hero_discover: "Descubrir Características",
            mock_heading: "Capítulo 1: El Loro Dorado",
            mock_p: "Silas ocupaba su mesa habitual, un rincón sombrío al fondo de El Loro Dorado, donde las sombras parecían adherirse a las paredes...",
            mock_mpc: "3 Entidades Detectadas",
            features_sectitle: "Creado para el Arquitecto y el Jardinero",
            features_secsub: "Una suite granular de herramientas para manejar desde el borrador de escenas hasta biblias enteras de world-building.",
            feat_1_title: "Estructura Narrativa",
            feat_1_desc: "Organiza tu novela en Actos, Capítulos y Escenas. Reordena tu manuscrito con mecánicas fluidas de arrastrar y soltar.",
            feat_2_title: "Seguimiento de Metas",
            feat_2_desc: "Establece recuentos de palabras, objetivos por capítulo y sigue visualmente tu progreso. Mantén viva tu racha de escritura.",
            feat_3_title: "Base de Conocimiento",
            feat_3_desc: "Sube tu lore de world-building, notas específicas por capítulo y archivos de contexto. Actívalos al instante para que el Oráculo los revise.",
            feat_4_title: "Sincronización en la Nube",
            feat_4_desc: "Almacenamiento local con sincronización opcional a Google Drive y copias de seguridad continuas para asegurar que tu manuscrito nunca se pierda.",
            feat_5_title: "Diseño Dinámico",
            feat_5_desc: "Sumérgete en una interfaz bellamente diseñada con glassmorphism dinámico personalizable y un elegante modo oscuro.",
            feat_6_title: "Exportación sin Fricción",
            feat_6_desc: "Compila todo tu proyecto en un Documento estándar (.docx) con un solo clic, perfectamente formateado para publicar.",
            engine_badge: "Motor de Correferencia MPC",
            engine_title: "Contexto Mínimo Plausible",
            engine_sub: "LoneWriter extrae y categoriza dinámicamente elementos importantes mientras escribes sin consumir cantidades masivas de tokens de IA.",
            eng_1_label: "Personajes:",
            eng_1: "Rastrea rasgos de los personajes y apariencias dinámicamente.",
            eng_2_label: "Localizaciones:",
            eng_2: "Conecta escenas directamente a las localizaciones de tu mapa del mundo.",
            eng_3_label: "Lore y Objetos:",
            eng_3: "Conciencia contextual de tus sistemas mágicos o de ciencia ficción.",
            eng_4_label: "Puntuación de Saliencia:",
            eng_4: "Inyecta solo el lore más relevante en tus peticiones de IA.",
            comp_head: "Compendio",
            comp_char: "Personajes",
            comp_loc: "Localizaciones",
            comp_obj: "Objetos",
            comp_lore: "Lore",
            footer_quote: "Tu obra maestra, estructurada de manera inteligente.",
            footer_res: "Recursos",
            footer_doc: "Documentación",
            footer_change: "Registro de cambios (v1.7)",
            footer_auth: "Autor",
            footer_copy: "© 2026 Sergio Sánchez. Creado para creadores."
        }
    };

    let currentLang = 'en';
    const langToggleBtn = document.getElementById('lang-toggle');

    function applyTranslations(lang) {
        const dictionary = translations[lang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dictionary[key]) {
                el.innerHTML = dictionary[key];
            }
        });
        document.documentElement.lang = lang;
        langToggleBtn.textContent = lang === 'en' ? 'ES' : 'EN';
    }

    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'es' : 'en';
        applyTranslations(currentLang);
    });

    // Removed automatic language detection to ensure English is default.
});
