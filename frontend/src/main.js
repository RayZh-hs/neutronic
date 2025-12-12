import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { register } from 'swiper/element'

import { router } from './router'

// Register the swiper components globally
register()

if (import.meta.env.PROD) {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
}

// Create the app instance and mount it
createApp(App)
    .use(router)
    .mount('#app')
