import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from './views/HomeView.vue'
import AlbumView from './views/AlbumView.vue'
import SubAlbumView from './views/SubAlbumView.vue'
import LevelView from './views/LevelView.vue'

const routes = [
    { path: '/', component: HomeView },
    { path: '/album', component: AlbumView },
    { path: '/album/:id', component: SubAlbumView },
    { path: '/album/:id/:levelId', component: LevelView },
]

export const router = createRouter({
    history: createMemoryHistory(),
    routes,
})