import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from './views/HomeView.vue'
import AlbumView from './views/AlbumView.vue'

const routes = [
    { path: '/', component: HomeView },
    { path: '/album', component: AlbumView },
]

export const router = createRouter({
    history: createMemoryHistory(),
    routes,
})