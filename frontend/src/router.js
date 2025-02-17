import { createWebHistory, createRouter } from 'vue-router'

import HomeView from './views/HomeView.vue'
import AlbumView from './views/AlbumView.vue'
import SubAlbumView from './views/SubAlbumView.vue'
import CustomSelectionView from './views/CustomSelectionView.vue'
import LevelView from './views/LevelView.vue'
import LevelEditorView from './views/LevelEditorView.vue'
// import UserLoginView from './views/UserLoginView.disabled.vue'

const routes = [
    { path: '/', component: HomeView },
    { path: '/album', component: AlbumView },
    { path: '/album/:id', component: SubAlbumView },
    { path: '/custom', component: CustomSelectionView },
    { path: '/album/:id/:levelId', component: LevelView },
    { path: '/custom/edit/:uuid', component: LevelEditorView },
    { path: '/custom/play/:uuid', component: LevelView },
    // { path: '/login', component: UserLoginView },
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})