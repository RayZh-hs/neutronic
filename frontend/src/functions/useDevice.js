import { useMediaQuery } from '@vueuse/core';

export function useDevice() {
    const isCoarsePointer = useMediaQuery('(pointer: coarse)');
    const hasTouchPoints = computed(() => {
        if (typeof navigator === 'undefined') return false;
        return navigator.maxTouchPoints > 0;
    });
    const hasTouchEvents = computed(() => {
        if (typeof window === 'undefined') return false;
        return 'ontouchstart' in window;
    });

    const isTouchDevice = computed(() => {
        return isCoarsePointer.value || hasTouchPoints.value || hasTouchEvents.value;
    });

    const isDesktopDevice = computed(() => !isTouchDevice.value);

    return {
        isTouchDevice,
        isDesktopDevice,
        isCoarsePointer,
        hasTouchPoints,
        hasTouchEvents,
    };
}

