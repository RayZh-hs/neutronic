import { useStorage } from '@vueuse/core';

const settingsState = useStorage('neutronic-settings', {
    disableAnimations: false,
    musicVolume: 50,
    sfxVolume: 50,
});

export const useSettings = () => settingsState;
