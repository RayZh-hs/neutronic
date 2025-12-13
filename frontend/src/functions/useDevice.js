import { useMediaQuery, useWindowSize } from '@vueuse/core';

export function useDevice() {
    const { width: viewportWidth, height: viewportHeight } = useWindowSize();
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

    const orientation = computed(() => {
        const w = viewportWidth.value || 0;
        const h = viewportHeight.value || 0;
        if (!w || !h) return 'unknown';
        if (w === h) return 'square';
        return w > h ? 'landscape' : 'portrait';
    });

    const aspectRatio = computed(() => {
        const w = viewportWidth.value || 0;
        const h = viewportHeight.value || 0;
        if (!w || !h) return 1;
        return w / h;
    });

    const deviceClass = computed(() => {
        const w = viewportWidth.value || 0;
        const ratio = aspectRatio.value;
        const withinPadAspect = ratio >= 3 / 4 && ratio <= 4 / 3;

        if (w >= 1024) return 'desktop';
        if (w >= 768 && w < 1024 && withinPadAspect) return 'pad';
        return 'mobile';
    });

    const isMobileDevice = computed(() => deviceClass.value === 'mobile');
    const isPadDevice = computed(() => deviceClass.value === 'pad');

    return {
        isTouchDevice,
        isDesktopDevice,
        isCoarsePointer,
        hasTouchPoints,
        hasTouchEvents,
        viewportWidth,
        viewportHeight,
        aspectRatio,
        orientation,
        deviceClass,
        isMobileDevice,
        isPadDevice,
    };
}
