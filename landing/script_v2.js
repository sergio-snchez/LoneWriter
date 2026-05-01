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
            page_title: "LoneWriter - The Intelligent App for Writers",
            nav_features: "Features",
            nav_engine: "MPC Engine",
            nav_openapp: "Open App",
            badge_version: "v1.8-glassmorphism is Live",
            hero_title_1: "The Intelligent App<br/>for",
            hero_title_2: "Writers",
            hero_subtitle: "Compose, structure, and refine your masterwork in a distraction-free, privacy-first environment enhanced by local AI.",
            hero_launch: "Open App",
            hero_discover: "Discover Features",
            hero_micro: "Designed for Deep Work. Zero distractions.",
            mock_heading: "Prologue: The Obsidian Spire",
            mock_p: "The storm howled against the jagged obsidian glass, but inside the Spire, Archmage Vaelen only smiled. He traced the glowing runes on the monolith; the convergence was finally at hand...",
            mock_mpc: "3 Entities Detected",
            back_title: "Detected Entities",
            ent_1: "Archmage Vaelen (Character)",
            ent_2: "The Obsidian Spire (Location)",
            ent_3: "The Monolith (Object)",
            features_sectitle: "Professional Tools for Writers",
            features_secsub: "A granular suite of tools to handle everything from scene drafting to entire world-building bibles.",
            feat_1_title: "Narrative Structure",
            feat_1_desc: "Organize your novel into Acts, Chapters, and Scenes. Reorder your manuscript with fluid drag-and-drop mechanics.",
            feat_2_title: "Goal Tracking",
            feat_2_desc: "Set custom word counts, chapter targets, and visually track your progress. Keep your writing streak alive.",
            feat_3_title: "Knowledge Base",
            feat_3_desc: "Upload your world-building lore, specific chapter notes, and context files. Toggle them instantly for the Oracle to review.",
            feat_4_title: "Cloud Sync",
            feat_4_desc: "Local-first storage with optional Google Drive syncing and continuous backups to ensure your manuscript is never lost.",
            feat_5_title: "Flow State Environment",
            feat_5_desc: "A distraction-free, minimalist UI with dynamic glassmorphism and deep dark mode designed psychologically to anchor you in your flow state.",
            feat_6_title: "Frictionless Export",
            feat_6_desc: "Compile your entire project into a standard Document (.docx) with one click, perfectly formatted for publishing.",
            mu_act1: "Act I: The Call",
            mu_ch1: "Chapter 1",
            mu_ch2: "Chapter 2",
            mu_act2: "Act II: The Descent",
            mu_streak: "12 Day Streak!",
            mu_words: "24,500 / 50,000 words",
            mu_chars: "Characters",
            mu_locs: "Locations",
            mu_magic: "Objects",
            mu_synced: "Changes saved",
            mu_synced_time: "Last synced: Just now",
            mu_drive: "Google Drive",
            mu_format: "Export to Local Drive (*.lwrt)",
            mu_titlepage: "Export Complete Manuscript",
            mu_exportbtn: "Export .DOCX",
            engine_badge: "MPC Entity Management",
            engine_title: "MPC Engine (Monitoring Proposals for Compendium)",
            engine_sub: "LoneWriter silently processes your world in the background. No annoying autocomplete. No unsolicited suggestions. The AI organizes your lore so you can focus solely on writing.",
            engine_ghost: "Invisible AI Assistance",
            eng_1_label: "Characters:",
            eng_1: "Tracks character traits and appearances dynamically.",
            eng_2_label: "Locations:",
            eng_2: "Connects scenes directly to your custom world map locales.",
            eng_3_label: "Lore & Objects:",
            eng_3: "Contextual awareness of your magical or sci-fi systems.",
            eng_4_label: "Saliency Scoring:",
            eng_4: "Injects only the most relevant lore into your AI prompts.",
            rag_badge: "Local Semantic Intelligence",
            rag_title: "Local RAG Engine",
            rag_sub: "LoneWriter incorporates a Retrieval-Augmented Generation engine directly in your browser. It instantly retrieves fragments of your novel and relevant lore to provide perfect context for the AI, all without sending your data to the cloud.",
            rag_manuscript: "Manuscript",
            rag_vectordb: "Vector Database",
            local_badge: "Local-First Sovereignty",
            local_title: "Your Work. Your Rules.",
            local_sub: "A privacy-first manifesto for writers. Connect LoneWriter with Ollama or LM Studio to run AI completely locally. No scraping, no corporate surveillance, and absolute IP protection. Your manuscript stays on your machine.",
            modal_close: "Close",
            modal_placeholder: "App Screenshot Placeholder",
            comp_head: "Compendium",
            comp_char: "Characters",
            comp_loc: "Locations",
            comp_obj: "Objects",
            comp_lore: "Lore",
            footer_quote: "Your masterpiece, structured intelligently.",
            footer_res: "Resources",
            footer_doc: "Documentation",
            footer_change: "Changelog",
            footer_auth: "Author",
            footer_copy: "Designed and developed with ♥ by Sergio Sánchez with Antigravity.",
            link_doc: "https://github.com/sergio-snchez/LoneWriter/blob/main/README.md",
            link_change: "https://github.com/sergio-snchez/LoneWriter/blob/main/CHANGELOG.md",
            link_roadmap: "https://github.com/sergio-snchez/LoneWriter/blob/main/ROADMAP.md",
            nav_roadmap: "Roadmap",
            roadmap_sectitle: "Future Vision & Roadmap",
            roadmap_secsub: "LoneWriter is evolving every day based on the needs of the community. Here is what is being worked on next.",
            roadmap_high: "High Priority",
            roadmap_low: "Low Priority",
            roadmap_status_planned: "Planned",
            roadmap_status_backlog: "Backlog",
            rd_1_title: "Mobile PWA Polish",
            rd_1_desc: "Improved touch gestures and offline reliability.",
            rd_2_title: "Interactive Timelines",
            rd_2_desc: "Visual mapping for events and character arcs.",
            rd_3_title: "Zettelkasten System",
            rd_3_desc: "3D knowledge graph integrated into Compendium.",
            rd_4_title: "Anaphora Optimization",
            rd_4_desc: "Refined coherence for long narrative texts.",
            rd_5_title: "Extended Import",
            rd_5_desc: "Direct parsing for .pdf and .docx documents.",
            rd_6_title: "MCP Integration",
            rd_6_desc: "Auto-extract lore from reference files via MCP.",
            rd_7_title: "Smart Bootstrap",
            rd_7_desc: "Map/import MD files into narrative tree.",
            roadmap_view_full: "View Full Roadmap"
        },
        es: {
            page_title: "LoneWriter - La App Inteligente para Escritores",
            nav_features: "Características",
            nav_engine: "Motor MPC",
            nav_openapp: "Abrir App",
            badge_version: "v1.8-glassmorphism ya disponible",
            hero_title_1: "La App Inteligente<br/>para",
            hero_title_2: "Escritores",
            hero_subtitle: "Componer, estructurar y refinar tu obra maestra en un entorno sin distracciones, enfocado en la privacidad y potenciado por IA local.",
            hero_launch: "Abrir App",
            hero_discover: "Descubrir Características",
            hero_micro: "Diseñado para el Trabajo Profundo. Cero distracciones.",
            mock_heading: "Prólogo: La Aguja de Obsidiana",
            mock_p: "La tormenta aullaba contra el cristal dentado de obsidiana, pero dentro de la Aguja, el Archimago Vaelen solo sonreía. Trazó con el dedo las runas brillantes del monolito; la convergencia por fin había llegado...",
            mock_mpc: "3 Entidades Detectadas",
            back_title: "Entidades Detectadas",
            ent_1: "Archimago Vaelen (Personaje)",
            ent_2: "La Aguja de Obsidiana (Ubicación)",
            ent_3: "El Monolito (Objeto)",
            features_sectitle: "Herramientas Profesionales para Escritores",
            features_secsub: "Una suite granular de herramientas para manejar desde el borrador de escenas hasta biblias enteras de world-building.",
            feat_1_title: "Estructura Narrativa",
            feat_1_desc: "Organiza tu novela en Actos, Capítulos y Escenas. Reordena tu manuscrito con mecánicas fluidas de arrastrar y soltar.",
            feat_2_title: "Seguimiento de Metas",
            feat_2_desc: "Establece recuentos de palabras, objetivos por capítulo y sigue visualmente tu progreso. Mantén viva tu racha de escritura.",
            feat_3_title: "Base de Conocimiento",
            feat_3_desc: "Sube tu lore de world-building, notas específicas por capítulo y archivos de contexto. Actívalos al instante para que el Oráculo los revise.",
            feat_4_title: "Sincronización en la Nube",
            feat_4_desc: "Almacenamiento local con sincronización opcional a Google Drive y copias de seguridad continuas para asegurar que tu manuscrito nunca se pierda.",
            feat_5_title: "Entorno de Estado de Flujo",
            feat_5_desc: "Una interfaz minimalista y sin distracciones, con glassmorphism dinámico y un modo oscuro profundo, diseñada psicológicamente para anclarte en tu estado de flujo.",
            feat_6_title: "Exportación sin Fricción",
            feat_6_desc: "Compila todo tu proyecto en un Documento estándar (.docx) con un solo clic, perfectamente formateado para publicar.",
            mu_act1: "Acto I: La Llamada",
            mu_ch1: "Capítulo 1",
            mu_ch2: "Capítulo 2",
            mu_act2: "Acto II: El Descenso",
            mu_streak: "¡Racha de 12 días!",
            mu_words: "24.500 / 50.000 palabras",
            mu_chars: "Personajes",
            mu_locs: "Ubicaciones",
            mu_magic: "Objetos",
            mu_synced: "Cambios guardados",
            mu_synced_time: "Última sincronización: Ahora mismo",
            mu_drive: "Google Drive",
            mu_format: "Exportar al Disco Duro Local (*.lwrt)",
            mu_titlepage: "Exportar Manuscrito Completo",
            mu_exportbtn: "Exportar a .DOCX",
            engine_badge: "Gestión de Entidades MPC",
            engine_title: "Motor MPC (Monitoreo de Propuestas del Compendio)",
            engine_sub: "LoneWriter procesa tu mundo en silencio. Sin autocompletados molestos. Sin sugerencias no solicitadas. La IA organiza tu lore para que tú solo te preocupes de una cosa: escribir.",
            engine_ghost: "Asistencia de IA Invisible",
            eng_1_label: "Personajes:",
            eng_1: "Rastrea rasgos de los personajes y apariencias dinámicamente.",
            eng_2_label: "Localizaciones:",
            eng_2: "Conecta escenas directamente a las localizaciones de tu mapa del mundo.",
            eng_3_label: "Lore y Objetos:",
            eng_3: "Conciencia contextual de tus sistemas mágicos o de ciencia ficción.",
            eng_4_label: "Puntuación de Saliencia:",
            eng_4: "Inyecta solo el lore más relevante en tus peticiones de IA.",
            rag_badge: "Inteligencia Semántica Local",
            rag_title: "Motor RAG en Local",
            rag_sub: "LoneWriter incorpora un motor RAG (Generación Aumentada por Recuperación) directamente en tu navegador. Recupera fragmentos de tu novela y lore relevante al instante para un contexto perfecto en la IA, todo sin enviar tus datos a la nube.",
            rag_manuscript: "Manuscrito",
            rag_vectordb: "Base de Datos Vectorial",
            local_badge: "Soberanía Local-First",
            local_title: "Tu Obra. Tus Reglas.",
            local_sub: "Un manifiesto de privacidad para escritores. Conecta LoneWriter con Ollama o LM Studio para ejecutar IA de forma 100% local. Sin scraping, sin vigilancia corporativa y con protección absoluta de tu propiedad intelectual. Tu manuscrito se queda en tu máquina.",
            modal_close: "Cerrar",
            modal_placeholder: "Captura de pantalla de la App",
            comp_head: "Compendio",
            comp_char: "Personajes",
            comp_loc: "Localizaciones",
            comp_obj: "Objetos",
            comp_lore: "Lore",
            footer_quote: "Tu obra maestra, estructurada de manera inteligente.",
            footer_res: "Recursos",
            footer_doc: "Documentación",
            footer_change: "Registro de cambios",
            footer_auth: "Autor",
            footer_copy: "Diseñado y desarrollado con ♥ por Sergio Sánchez con Antigravity.",
            link_doc: "https://github.com/sergio-snchez/LoneWriter/blob/main/README_ES.md",
            link_change: "https://github.com/sergio-snchez/LoneWriter/blob/main/CHANGELOG_ES.md",
            link_roadmap: "https://github.com/sergio-snchez/LoneWriter/blob/main/ROADMAP_ES.md",
            nav_roadmap: "Roadmap",
            roadmap_sectitle: "Visión de Futuro y Roadmap",
            roadmap_secsub: "LoneWriter evoluciona cada día basándose en las necesidades de la comunidad. Esto es en lo que se está trabajando.",
            roadmap_high: "Prioridad Alta",
            roadmap_low: "Prioridad Baja",
            roadmap_status_planned: "Planificado",
            roadmap_status_backlog: "Pendiente",
            rd_1_title: "Pulido de la PWA Móvil",
            rd_1_desc: "Mejora de gestos táctiles y fiabilidad offline.",
            rd_2_title: "Líneas de Tiempo",
            rd_2_desc: "Mapeo visual de eventos y arcos cronológicos.",
            rd_3_title: "Sistema Zettelkasten",
            rd_3_desc: "Grafo 3D integrado en el Compendio.",
            rd_4_title: "Optimización Anáforas",
            rd_4_desc: "Mejor coherencia narrativa en textos largos.",
            rd_5_title: "Importación Extendida",
            rd_5_desc: "Soporte para archivos .pdf y .docx.",
            rd_6_title: "Integración MCP",
            rd_6_desc: "Extraer lore de referencias vía MCP.",
            rd_7_title: "Smart Bootstrap",
            rd_7_desc: "Mapear archivos MD en el árbol narrativo.",
            roadmap_view_full: "Ver Roadmap Completo"
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
        document.querySelectorAll('[data-i18n-href]').forEach(el => {
            const key = el.getAttribute('data-i18n-href');
            if (dictionary[key]) {
                el.href = dictionary[key];
            }
        });
        document.documentElement.lang = lang;
        langToggleBtn.textContent = lang === 'en' ? 'ES' : 'EN';
    }

    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'es' : 'en';
        applyTranslations(currentLang);
        if (typeof window.runMPCTyping === 'function') window.runMPCTyping();
    });

    // Apply translations initially to ensure everything is in sync
    applyTranslations(currentLang);

    // Feature Cards Glow Effect
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // Modal Interaction
    const modal = document.getElementById('feature-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const closeModalBtn = document.getElementById('close-modal');

    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const titleEl = card.querySelector('h3');
            const descEl = card.querySelector('p');
            const featureId = card.getAttribute('data-feature-id');

            if (titleEl && descEl) {
                modalTitle.innerHTML = titleEl.innerHTML;
                modalDesc.innerHTML = descEl.innerHTML;

                // Hide all mockups
                document.querySelectorAll('.mockup-ui').forEach(m => m.classList.remove('active'));

                // Show specific mockup
                if (featureId) {
                    const activeMockup = document.getElementById(`mockup-${featureId}`);
                    if (activeMockup) activeMockup.classList.add('active');
                }

                modal.classList.add('active');
            }
        });
    });

    const closeFeatureModal = () => {
        modal.classList.remove('active');
    };

    closeModalBtn.addEventListener('click', closeFeatureModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFeatureModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeFeatureModal();
        }
    });

    // Mockup flip interaction
    const heroMockup = document.getElementById('hero-mockup');
    if (heroMockup) {
        heroMockup.addEventListener('click', () => {
            heroMockup.classList.toggle('flipped');
        });
    }

    // MPC Typing Animation Logic
    const mpcAnimData = {
        en: [
            { type: 'text', content: 'The storm howled against the ' },
            { type: 'entity', content: 'Obsidian Spire', tab: 'loc' },
            { type: 'text', content: ', but inside the Spire, ' },
            { type: 'entity', content: 'Archmage Vaelen', tab: 'char' },
            { type: 'text', content: ' only smiled. He traced the glowing runes of the ' },
            { type: 'entity', content: 'Monolith', tab: 'obj' },
            { type: 'text', content: '...' }
        ],
        es: [
            { type: 'text', content: 'La tormenta aullaba contra la ' },
            { type: 'entity', content: 'Aguja de Obsidiana', tab: 'loc' },
            { type: 'text', content: ', pero dentro de la Aguja, el ' },
            { type: 'entity', content: 'Archimago Vaelen', tab: 'char' },
            { type: 'text', content: ' solo sonreía. Trazó las runas brillantes del ' },
            { type: 'entity', content: 'Monolito', tab: 'obj' },
            { type: 'text', content: '...' }
        ]
    };

    const mpcTypingArea = document.getElementById('mpc-typing-area');
    let typingSessionId = 0;

    window.runMPCTyping = function () {
        if (!mpcTypingArea) return;
        typingSessionId++;
        let currentSession = typingSessionId;
        let lang = currentLang;
        let data = mpcAnimData[lang];
        mpcTypingArea.innerHTML = '';

        let i = 0;
        let charIndex = 0;
        let currentSpan = null;
        let isEntity = false;

        const baseCounts = { char: 24, loc: 12, obj: 5, lore: 8 };
        Object.keys(baseCounts).forEach(k => {
            let el = document.getElementById(`c-count-${k}`);
            if (el) el.textContent = baseCounts[k];
        });

        const typeChar = () => {
            if (currentSession !== typingSessionId) return;

            if (i >= data.length) {
                setTimeout(() => {
                    if (currentSession === typingSessionId) runMPCTyping();
                }, 5000);
                return;
            }

            let item = data[i];
            isEntity = item.type === 'entity';

            if (charIndex === 0) {
                currentSpan = document.createElement('span');
                if (isEntity) currentSpan.className = 'mpc-entity-highlight';
                mpcTypingArea.appendChild(currentSpan);
            }

            currentSpan.textContent += item.content[charIndex];
            charIndex++;

            if (charIndex >= item.content.length) {
                if (isEntity) {
                    currentSpan.classList.add('extracted');
                    const tab = document.getElementById(`c-tab-${item.tab}`);
                    const countEl = document.getElementById(`c-count-${item.tab}`);
                    if (tab && countEl) {
                        tab.classList.add('pulse');
                        countEl.textContent = parseInt(countEl.textContent) + 1;
                        setTimeout(() => {
                            if (tab) tab.classList.remove('pulse');
                        }, 1000);
                    }
                }
                i++;
                charIndex = 0;
                setTimeout(typeChar, isEntity ? 500 : 100);
            } else {
                setTimeout(typeChar, isEntity ? 60 : 30);
            }
        };

        setTimeout(typeChar, 1000);
    };

    if (mpcTypingArea) window.runMPCTyping();
});
