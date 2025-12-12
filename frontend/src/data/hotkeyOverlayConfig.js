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
    defaultGroup: { ...DEFAULT_GROUP_CONFIG },
    groups: {},
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

export const getHotkeyGroupConfig = (groupId) => {
    const defaultConfig = hotkeyOverlayConfig.defaultGroup || DEFAULT_GROUP_CONFIG;
    const groupOverrides = (groupId && hotkeyOverlayConfig.groups && hotkeyOverlayConfig.groups[groupId]) || null;
    return {
        ...DEFAULT_GROUP_CONFIG,
        ...defaultConfig,
        ...(groupOverrides || {}),
    };
};

const normalizeOverrides = (overrides = {}) => {
    if (!overrides || typeof overrides !== 'object') {
        return {};
    }
    const normalized = { ...overrides };
    if (Object.prototype.hasOwnProperty.call(normalized, 'group')) {
        normalized.defaultGroup = {
            ...(normalized.defaultGroup || {}),
            ...normalized.group,
        };
        delete normalized.group;
    }
    return normalized;
};

export const overrideHotkeyOverlayConfig = (overrides = {}) => {
    const previous = clone(hotkeyOverlayConfig);
    const normalized = normalizeOverrides(overrides);
    deepMerge(hotkeyOverlayConfig, normalized);
    return () => {
        deepMerge(hotkeyOverlayConfig, previous);
    };
};

export const resetHotkeyOverlayConfig = () => {
    hotkeyOverlayConfig.defaultGroup = { ...DEFAULT_GROUP_CONFIG };
    hotkeyOverlayConfig.groups = {};
};
