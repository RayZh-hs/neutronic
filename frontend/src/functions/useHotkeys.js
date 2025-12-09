import { onBeforeUnmount } from 'vue';
import { defaultHotkeyMap } from '@/data/hotkeys';

const HOTKEY_STORAGE_KEY = 'neutronic.hotkeys';
const SEQUENCE_HISTORY_LIMIT = 4;
const MODIFIER_ORDER = ['ctrl', 'meta', 'alt', 'shift'];
const MODIFIER_SET = new Set(MODIFIER_ORDER);
const SHIFT_IMPLIED_KEYS = new Set(['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?']);

const KEY_ALIASES = {
    ' ': 'space',
    spacebar: 'space',
    space: 'space',
    esc: 'escape',
    escape: 'escape',
    enter: 'enter',
    return: 'enter',
    cmd: 'meta',
    command: 'meta',
    meta: 'meta',
    option: 'alt',
    alt: 'alt',
    control: 'ctrl',
    ctrl: 'ctrl',
    shift: 'shift',
    super: 'meta',
    left: 'arrowleft',
    'left-arrow': 'arrowleft',
    arrowleft: 'arrowleft',
    right: 'arrowright',
    'right-arrow': 'arrowright',
    arrowright: 'arrowright',
    up: 'arrowup',
    'up-arrow': 'arrowup',
    arrowup: 'arrowup',
    down: 'arrowdown',
    'down-arrow': 'arrowdown',
    arrowdown: 'arrowdown',
    backspace: 'backspace',
    delete: 'delete',
};

const DISPLAY_ALIASES = {
    ctrl: 'Ctrl',
    meta: 'Meta',
    alt: 'Alt',
    shift: 'Shift',
    space: 'Space',
    enter: 'Enter',
    escape: 'Esc',
    backspace: 'Backspace',
    arrowleft: 'Left Arrow',
    arrowright: 'Right Arrow',
    arrowup: 'Up Arrow',
    arrowdown: 'Down Arrow',
    '+': '+',
    '-': '-',
};

const hotkeyState = {
    initialized: false,
    listeners: new Map(),
    history: [],
    overrides: {},
    contextCache: new Map(),
    overridesVersion: 0,
};

const storageAvailable = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const loadOverrides = () => {
    if (!storageAvailable) {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(HOTKEY_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed ? parsed : {};
    }
    catch {
        return {};
    }
};

const persistOverrides = () => {
    if (!storageAvailable) {
        return;
    }
    try {
        window.localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(hotkeyState.overrides));
    }
    catch {
        // Ignore storage errors
    }
};

hotkeyState.overrides = loadOverrides();

const normalizeToken = (token = '') => {
    if (typeof token !== 'string') {
        return '';
    }
    const lower = token.toLowerCase();
    if (KEY_ALIASES[lower]) {
        return KEY_ALIASES[lower];
    }
    const normalized = token.trim().toLowerCase();
    if (!normalized) {
        return '';
    }
    return KEY_ALIASES[normalized] || normalized;
};

const sortModifiers = (modifiers) => {
    const unique = Array.from(new Set(modifiers));
    return unique.sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b));
};

const tokenizeChord = (chord) => {
    if (!chord) {
        return [];
    }
    const rawTokens = chord.split('+');
    const tokens = [];
    rawTokens.forEach((raw, index) => {
        const value = raw.trim();
        if (value) {
            tokens.push(value);
            return;
        }
        if (index > 0) {
            tokens.push('+');
        }
    });
    if (tokens.length === 0 && chord.trim() === '+') {
        return ['+'];
    }
    return tokens;
};

const normalizeChordFromString = (chord) => {
    const tokens = tokenizeChord(chord);
    if (tokens.length === 0) {
        return '';
    }
    const modifiers = [];
    const keys = [];
    tokens.forEach((token) => {
        const normalized = normalizeToken(token);
        if (!normalized) {
            return;
        }
        if (MODIFIER_SET.has(normalized)) {
            modifiers.push(normalized);
        }
        else {
            keys.push(normalized);
        }
    });
    const orderedModifiers = sortModifiers(modifiers);
    const parts = [...orderedModifiers];
    if (keys.length > 0) {
        parts.push(keys[keys.length - 1]);
    }
    else if (parts.length === 0) {
        parts.push(normalizeToken(tokens[tokens.length - 1]));
    }
    return parts.filter(Boolean).join('+');
};

const normalizeChordFromEvent = (event) => {
    if (!event) {
        return '';
    }
    const baseKey = normalizeToken(event.key || '');
    if (!baseKey) {
        return '';
    }
    const isModifierKey = MODIFIER_SET.has(baseKey);
    const modifiers = [];
    if (event.ctrlKey && baseKey !== 'ctrl') {
        modifiers.push('ctrl');
    }
    if (event.metaKey && baseKey !== 'meta') {
        modifiers.push('meta');
    }
    if (event.altKey && baseKey !== 'alt') {
        modifiers.push('alt');
    }
    if (event.shiftKey && baseKey !== 'shift' && !SHIFT_IMPLIED_KEYS.has(event.key)) {
        modifiers.push('shift');
    }
    const orderedModifiers = sortModifiers(modifiers);
    const parts = [...orderedModifiers];
    if (!isModifierKey || orderedModifiers.length === 0) {
        parts.push(baseKey);
    }
    else if (isModifierKey && orderedModifiers.length === 0) {
        parts.push(baseKey);
    }
    return parts.filter(Boolean).join('+');
};

const sequenceMatchesHistory = (sequence = []) => {
    if (!Array.isArray(sequence) || sequence.length === 0) {
        return false;
    }
    if (hotkeyState.history.length < sequence.length) {
        return false;
    }
    const offset = hotkeyState.history.length - sequence.length;
    for (let index = 0; index < sequence.length; index += 1) {
        if (hotkeyState.history[offset + index] !== sequence[index]) {
            return false;
        }
    }
    return true;
};

const normalizeBindingValue = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => entry.trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split('|')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }
    return [];
};

const mergeBindingsForContext = (context) => {
    const defaultContext = defaultHotkeyMap[context] || {};
    const overrideContext = hotkeyState.overrides[context] || {};
    const merged = { ...defaultContext };
    Object.entries(overrideContext).forEach(([actionId, value]) => {
        const normalizedValues = normalizeBindingValue(value);
        if (normalizedValues.length === 0) {
            return;
        }
        merged[actionId] = normalizedValues;
    });
    return merged;
};

const parseBindingsForContext = (context) => {
    const cached = hotkeyState.contextCache.get(context);
    if (cached && cached.version === hotkeyState.overridesVersion) {
        return cached.bindings;
    }
    const merged = mergeBindingsForContext(context);
    const parsed = {};
    Object.entries(merged).forEach(([actionId, bindingValues]) => {
        const sequences = bindingValues.map((entry) => entry.split(/\s+/g).map(normalizeChordFromString).filter(Boolean)).filter((sequence) => sequence.length > 0);
        if (sequences.length > 0) {
            parsed[actionId] = sequences;
        }
    });
    hotkeyState.contextCache.set(context, {
        version: hotkeyState.overridesVersion,
        bindings: parsed,
    });
    return parsed;
};

const findMatchForContext = (context) => {
    const bindings = parseBindingsForContext(context);
    const entries = Object.entries(bindings);
    for (let index = 0; index < entries.length; index += 1) {
        const [actionId, sequences] = entries[index];
        for (let sequenceIndex = 0; sequenceIndex < sequences.length; sequenceIndex += 1) {
            const sequence = sequences[sequenceIndex];
            if (sequenceMatchesHistory(sequence)) {
                return {
                    actionId,
                    sequence,
                };
            }
        }
    }
    return null;
};

const isEditableTarget = (target) => {
    if (!target) {
        return false;
    }
    const tagName = target.tagName;
    if (!tagName) {
        return target.isContentEditable;
    }
    const lower = tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(lower)) {
        return true;
    }
    return target.isContentEditable;
};

const ensureInitialized = () => {
    if (hotkeyState.initialized || typeof window === 'undefined') {
        return;
    }
    const handleKeydown = (event) => {
        if (event.defaultPrevented) {
            return;
        }
        const chord = normalizeChordFromEvent(event);
        if (!chord) {
            return;
        }
        hotkeyState.history.push(chord);
        if (hotkeyState.history.length > SEQUENCE_HISTORY_LIMIT) {
            hotkeyState.history.shift();
        }
        const contexts = new Set();
        hotkeyState.listeners.forEach((listener) => {
            contexts.add(listener.context);
        });
        const contextMatches = {};
        contexts.forEach((context) => {
            contextMatches[context] = findMatchForContext(context);
        });
        hotkeyState.listeners.forEach((listener) => {
            const { context, options, handlers } = listener;
            const match = contextMatches[context];
            if (!match) {
                return;
            }
            const handler = handlers[match.actionId];
            if (typeof handler !== 'function') {
                return;
            }
            if (isEditableTarget(event.target) && !options.allowInInput) {
                return;
            }
            handler({
                event,
                context,
                action: match.actionId,
                binding: match.sequence,
            });
        });
    };
    window.addEventListener('keydown', handleKeydown);
    hotkeyState.initialized = true;
};

export const useHotkeyBindings = (context, handlers = {}, options = {}) => {
    ensureInitialized();
    if (!context) {
        return;
    }
    const listener = {
        id: Symbol('hotkey-listener'),
        context,
        handlers,
        options: {
            allowInInput: Boolean(options.allowInInput),
        },
    };
    hotkeyState.listeners.set(listener.id, listener);
    onBeforeUnmount(() => {
        hotkeyState.listeners.delete(listener.id);
    });
};

export const getBindingsForAction = (actionId) => {
    if (!actionId) {
        return [];
    }
    const [context] = actionId.split('.');
    if (!context) {
        return [];
    }
    const parsed = parseBindingsForContext(context);
    return parsed[actionId] || [];
};

const formatTokenForDisplay = (token = '') => {
    if (!token) {
        return '';
    }
    if (DISPLAY_ALIASES[token]) {
        return DISPLAY_ALIASES[token];
    }
    if (token.length === 1) {
        return token.toUpperCase();
    }
    return token.charAt(0).toUpperCase() + token.slice(1);
};

export const formatBindingSequence = (sequence = []) => {
    if (!Array.isArray(sequence) || sequence.length === 0) {
        return '';
    }
    return sequence
        .map((chord) => tokenizeChord(chord).map(formatTokenForDisplay).join(' + '))
        .join(' › ');
};

export const getPrimaryBindingLabel = (actionId) => {
    const bindings = getBindingsForAction(actionId);
    if (!bindings || bindings.length === 0) {
        return '';
    }
    return formatBindingSequence(bindings[0]);
};

export const setHotkeyBindings = (actionId, bindings) => {
    if (!actionId) {
        return;
    }
    const [context] = actionId.split('.');
    if (!context) {
        return;
    }
    if (!hotkeyState.overrides[context]) {
        hotkeyState.overrides[context] = {};
    }
    const normalizedBindings = normalizeBindingValue(bindings);
    hotkeyState.overrides[context][actionId] = normalizedBindings;
    hotkeyState.overridesVersion += 1;
    hotkeyState.contextCache.delete(context);
    persistOverrides();
};

export const resetHotkeyBindings = (actionId) => {
    if (!actionId) {
        return;
    }
    const [context] = actionId.split('.');
    if (!context || !hotkeyState.overrides[context]) {
        return;
    }
    delete hotkeyState.overrides[context][actionId];
    if (Object.keys(hotkeyState.overrides[context]).length === 0) {
        delete hotkeyState.overrides[context];
    }
    hotkeyState.overridesVersion += 1;
    hotkeyState.contextCache.delete(context);
    persistOverrides();
};

export const hotkeyUtils = {
    normalizeChordFromEvent,
    normalizeChordFromString,
    normalizeKeyToken: normalizeToken,
};
