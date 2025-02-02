import { createWebHistory, createRouter } from 'vue-router'

import HomeView from './views/HomeView.vue'
import AlbumView from './views/AlbumView.vue'
import SubAlbumView from './views/SubAlbumView.vue'
import CustomSelectionView from './views/CustomSelectionView.vue'
import LevelView from './views/LevelView.vue'

const routes = [
    { path: '/', component: HomeView },
    { path: '/album', component: AlbumView },
    { path: '/album/:id', component: SubAlbumView },
    { path: '/custom', component: CustomSelectionView },
    { path: '/album/:id/:levelId', component: LevelView },
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})