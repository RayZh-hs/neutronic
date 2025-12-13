import { useDevice } from '@/functions/useDevice';

const APPLY_TARGET = typeof document !== 'undefined' ? document.documentElement : null;

const SETTERS = [
    {
        removePrefixes: ['device--touch', 'device--no-touch'],
        resolve: (device) => (device.isTouchDevice.value ? ['device--touch'] : ['device--no-touch']),
    },
    {
        removePrefixes: ['device--orientation-'],
        resolve: (device) => [`device--orientation-${device.orientation.value || 'unknown'}`],
    },
    {
        removePrefixes: ['device--form-'],
        resolve: (device) => [`device--form-${device.deviceClass.value || 'unknown'}`],
    },
    {
        removePrefixes: ['device--touch-vp-'],
        resolve: (device) => {
            if (!device.isTouchDevice.value) return [];
            const w = device.viewportWidth.value || 0;
            const h = device.viewportHeight.value || 0;
            const minVp = Math.min(w, h);
            if (minVp > 0 && minVp < 480) return ['device--touch-vp-sm'];
            if (minVp > 0 && minVp < 759) return ['device--touch-vp-md'];
            return ['device--touch-vp-lg'];
        },
    },
];

const removePrefixed = (target, prefix) => {
    if (!target) return;
    const toRemove = [];
    target.classList.forEach((cls) => {
        if (cls === prefix || cls.startsWith(prefix)) toRemove.push(cls);
    });
    toRemove.forEach((cls) => target.classList.remove(cls));
};

export function useDeviceDecorators(target = APPLY_TARGET) {
    const device = useDevice();

    watchEffect(() => {
        if (!target) return;

        for (const { removePrefixes, resolve } of SETTERS) {
            removePrefixes.forEach((prefix) => removePrefixed(target, prefix));
            const classes = resolve(device);
            classes.forEach((cls) => target.classList.add(cls));
        }
    });

    return { device };
}
