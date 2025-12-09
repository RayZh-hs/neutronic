import { reactive } from 'vue';

const DEFAULT_GROUP_CONFIG = {
    columnOffset: 110,
    rowOffset: 20,
    verticalSpacing: 40,
    horizontalSpacing: 80,
    tagHalfHeight: 14,
    tagHalfWidth: 40,
    verticalBaselineOffset: 30,
    horizontalBaselineOffset: 0,
};

const DEFAULT_CONFIG = {
    group: { ...DEFAULT_GROUP_CONFIG },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const hotkeyOverlayConfig = reactive(clone(DEFAULT_CONFIG));

const deepMerge = (target, source) => {
    Object.entries(source || {}).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            deepMerge(target[key], value);
        } else {
            target[key] = value;
        }
    });
};

export const useHotkeyOverlayConfig = () => hotkeyOverlayConfig;

export const overrideHotkeyOverlayConfig = (overrides = {}) => {
    const previous = clone(hotkeyOverlayConfig);
    deepMerge(hotkeyOverlayConfig, overrides);
    return () => {
        deepMerge(hotkeyOverlayConfig, previous);
    };
};

export const resetHotkeyOverlayConfig = () => {
    hotkeyOverlayConfig.group = { ...DEFAULT_GROUP_CONFIG };
};
