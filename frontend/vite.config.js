import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  // The base path for the deployed application, configure if you wish to deploy this game under another
  base: '/neutronic/',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // isCustomElement: (tag) => tag.startsWith('ion-') // All tags starting with "ion-"
          isCustomElement: (tag) => tag === 'ion-icon'
        }
      }
    }),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': [
            'useDialog',
            'useMessage',
            'useNotification',
            'useLoadingBar'
          ]
        }
      ]
    }),
    Components({
      resolvers: [
        NaiveUiResolver()
      ]
    })
  ],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "@/styles/inject.scss" as *;',
      },
    },
  }
})
