import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from './views/HomeView.vue'
import SelectView from './views/SelectView.vue'
import Level1 from './views/Level1.vue'

const routes = [
    { path: '/', component: HomeView },
    { path: '/game', component: SelectView, props: true },
    {
        path:'/game/1',component: Level1, props: true
    }
]

export const router = createRouter({
    history: createMemoryHistory(),
    routes,
})