import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "LoneWriter",
  description: "Official Documentation for LoneWriter",
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }]
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        socialLinks: [
          { icon: 'github', link: 'https://github.com/sergio-snchez/LoneWriter' }
        ],
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Open App', link: 'https://lonewriter.vercel.app' }
        ],
        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Philosophy', link: '/guide/philosophy' }
            ]
          },
          {
            text: 'AI & Setup',
            items: [
              { text: 'API Keys (Google, Anthropic...)', link: '/guide/setup/api-keys' },
              { text: 'Local Models (Ollama, LM Studio)', link: '/guide/setup/local-models' },
              { text: 'Model Selection Guide', link: '/guide/setup/model-guide' }
            ]
          },
          {
            text: 'Writing Tools',
            items: [
              { text: 'The Editor', link: '/guide/editor/basics' },
              { text: 'Smart Rewrites', link: '/guide/editor/rewrites' },
              { text: 'Context & Continuity', link: '/guide/editor/context' }
            ]
          },
          {
            text: 'Worldbuilding (Lore)',
            items: [
              { text: 'The Compendium', link: '/guide/worldbuilding/compendium' },
              { text: 'The MPC', link: '/guide/worldbuilding/mpc' },
              { text: 'Relationships & Entities', link: '/guide/worldbuilding/entities' }
            ]
          },
          {
            text: 'Analysis & Nexus',
            items: [
              { text: 'The Oracle (RAG)', link: '/guide/analysis/oracle' },
              { text: 'The Nexus & Timeline', link: '/guide/analysis/nexus' }
            ]
          },
          {
            text: 'Cloud & Sovereignty',
            items: [
              { text: 'Google Drive Sync', link: '/guide/cloud/sync' },
              { text: 'Exporting Your Work', link: '/guide/cloud/export' }
            ]
          }
        ],
        docFooter: { prev: 'Previous', next: 'Next' },
        outline: { label: 'On this page' },
        search: { provider: 'local' },
        footer: {
          message: 'Personal & Open Source Project. Built for writers.',
          copyright: 'Copyright © 2024-present'
        }
      }
    },
    es: {
      label: 'Español',
      lang: 'es',
      link: '/es/',
      title: 'LoneWriter',
      description: 'Documentación oficial de LoneWriter',
      themeConfig: {
        nav: [
          { text: 'Guía', link: '/es/guide/getting-started' },
          { text: 'Abrir App', link: 'https://lonewriter.vercel.app' }
        ],
        sidebar: [
          {
            text: 'Introducción',
            items: [
              { text: 'Primeros Pasos', link: '/es/guide/getting-started' },
              { text: 'Filosofía', link: '/es/guide/philosophy' }
            ]
          },
          {
            text: 'IA y Configuración',
            items: [
              { text: 'Claves API (Google, Anthropic...)', link: '/es/guide/setup/api-keys' },
              { text: 'Modelos Locales (Ollama, LM Studio)', link: '/es/guide/setup/local-models' },
              { text: 'Guía de Modelos', link: '/es/guide/setup/model-guide' }
            ]
          },
          {
            text: 'Herramientas de Escritura',
            items: [
              { text: 'El Editor', link: '/es/guide/editor/basics' },
              { text: 'Reescritura Inteligente', link: '/es/guide/editor/rewrites' },
              { text: 'Contexto y Continuidad', link: '/es/guide/editor/context' }
            ]
          },
          {
            text: 'Worldbuilding (Lore)',
            items: [
              { text: 'El Compendio', link: '/es/guide/worldbuilding/compendium' },
              { text: 'El MPC', link: '/es/guide/worldbuilding/mpc' },
              { text: 'Relaciones y Entidades', link: '/es/guide/worldbuilding/entities' }
            ]
          },
          {
            text: 'Análisis y Nexus',
            items: [
              { text: 'El Oráculo (RAG)', link: '/es/guide/analysis/oracle' },
              { text: 'El Nexus y Timeline', link: '/es/guide/analysis/nexus' }
            ]
          },
          {
            text: 'Nube y Soberanía',
            items: [
              { text: 'Sincronización en la Nube', link: '/es/guide/cloud/sync' },
              { text: 'Exportar tu Trabajo', link: '/es/guide/cloud/export' }
            ]
          }
        ],
        docFooter: { prev: 'Anterior', next: 'Siguiente' },
        outline: { label: 'En esta página' },
        search: { provider: 'local' },
        footer: {
          message: 'Proyecto Personal y de Código Abierto. Creado por y para escritores.',
          copyright: 'Copyright © 2024-presente'
        }
      }
    }
  },

  themeConfig: {
    logo: '/favicon.svg',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sergio-snchez/LoneWriter' }
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          es: {
            translations: {
              button: {
                buttonText: 'Buscar',
                buttonAriaLabel: 'Buscar'
              },
              modal: {
                noResultsText: 'No se han encontrado resultados',
                resetButtonTitle: 'Borrar búsqueda',
                footer: {
                  selectText: 'para seleccionar',
                  navigateText: 'para navegar',
                  closeText: 'para cerrar'
                }
              }
            }
          }
        }
      }
    }
  }
})
