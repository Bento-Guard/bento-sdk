import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    title: "Bento Guard SDK",
    description: "AI-powered security infrastructure for autonomous agents",
    base: '/bento-sdk/',
    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Guide', link: '/guide/getting-started' }
      ],

      sidebar: [
        {
          text: '📘 User Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Architecture', link: '/architecture-overview' }
          ]
        },
        {
          text: '🛠️ Contributors',
          items: [
            { text: 'Workflows', link: '/workflow-guidelines' }
          ]
        }
      ],

      socialLinks: [
        { icon: 'github', link: 'https://github.com/bentoguard/sdk' }
      ],
      
      footer: {
        message: 'Released under the Apache-2.0 License.',
        copyright: 'Copyright © 2024-present Bento Team'
      }
    }
  })
)
