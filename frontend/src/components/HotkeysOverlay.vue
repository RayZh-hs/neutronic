<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useHotkeyBindings, getPrimaryBindingLabel, hotkeyUtils } from '@/functions/useHotkeys';

const isActive = ref(false);
const overlayItems = ref([]);
const dynamicTargets = ref([]);
const holdReleaseKey = ref(null);
const digitBuffer = ref('');
let digitResetHandle = null;
let isMounted = false;

const clearDigitBuffer = () => {
    digitBuffer.value = '';
    if (digitResetHandle) {
        clearTimeout(digitResetHandle);
        digitResetHandle = null;
    }
};

const scheduleDigitReset = () => {
    if (digitResetHandle) {
        clearTimeout(digitResetHandle);
    }
    digitResetHandle = setTimeout(() => {
        digitBuffer.value = '';
        digitResetHandle = null;
    }, 700);
};

const MIN_DISPLAY_TOP = 12;
const GROUP_COLUMN_OFFSET = 110;
const GROUP_VERTICAL_SPACING = 40;
const GROUP_TAG_HALF_HEIGHT = 14;
const GROUP_VERTICAL_OFFSET = -20;

const layoutHotkeyGroups = (items, viewportWidth) => {
    const groups = new Map();
    items.forEach((item) => {
        if (!item.groupId) {
            return;
        }
        if (!groups.has(item.groupId)) {
            groups.set(item.groupId, []);
        }
        groups.get(item.groupId).push(item);
    });
    groups.forEach((groupItems) => {
        if (groupItems.length === 0) {
            return;
        }
        const averageX = groupItems.reduce((sum, entry) => sum + entry.anchorX, 0) / groupItems.length;
        const defaultSide = averageX > viewportWidth / 2 ? 'left' : 'right';
        const orientation = groupItems[0].groupSide || defaultSide;
        const anchorRange = orientation === 'right'
            ? Math.max(...groupItems.map((entry) => entry.anchorX))
            : Math.min(...groupItems.map((entry) => entry.anchorX));
        const column = orientation === 'right'
            ? anchorRange + GROUP_COLUMN_OFFSET
            : anchorRange - GROUP_COLUMN_OFFSET;
        const sorted = groupItems.slice().sort((a, b) => a.anchorY - b.anchorY);
        let currentTop = -Infinity;
        sorted.forEach((item) => {
            const desiredTop = Math.max(item.anchorY - GROUP_TAG_HALF_HEIGHT - GROUP_VERTICAL_OFFSET, MIN_DISPLAY_TOP);
            const displayTop = Math.max(desiredTop, currentTop + GROUP_VERTICAL_SPACING);
            currentTop = displayTop;
            const connectorY = displayTop + GROUP_TAG_HALF_HEIGHT;
            const verticalTop = Math.min(item.anchorY, connectorY);
            const verticalHeight = Math.abs(item.anchorY - connectorY);
            const horizontalLeft = Math.min(item.anchorX, column);
            const horizontalWidth = Math.abs(item.anchorX - column);
            item.displayTop = displayTop;
            item.displayLeft = column;
            item.align = orientation;
            item.connector = {
                vertical: {
                    left: item.anchorX - 1,
                    top: verticalTop,
                    height: verticalHeight,
                },
                horizontal: {
                    left: horizontalLeft,
                    top: connectorY,
                    width: horizontalWidth,
                },
            };
        });
    });
};

const buildOverlayTargets = () => {
    if (!isMounted || typeof document === 'undefined') {
        overlayItems.value = [];
        dynamicTargets.value = [];
        return;
    }
    const nodes = Array.from(document.querySelectorAll('[data-hotkey-target]'));
    const items = [];
    const dynamics = [];
    let dynamicIndex = 1;
    const viewportWidth = window.innerWidth || 0;
    nodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
            return;
        }
        if (!node.isConnected) {
            return;
        }
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            return;
        }
        const actionId = node.dataset.hotkeyTarget || '';
        const isDynamic = Object.prototype.hasOwnProperty.call(node.dataset, 'hotkeyDynamic');
        const groupId = node.dataset.hotkeyGroup || null;
        const groupSide = node.dataset.hotkeyGroupSide || null;
        const keyOverride = node.dataset.hotkeyHint || '';
        const baseLabel = node.dataset.hotkeyLabel || '';
        let keyLabel = keyOverride;
        if (!keyLabel && !isDynamic) {
            keyLabel = getPrimaryBindingLabel(actionId) || '';
        }
        if (!keyLabel && !isDynamic) {
            keyLabel = 'Unbound';
        }
        if (isDynamic) {
            keyLabel = String(dynamicIndex);
            dynamicIndex += 1;
        }
        const anchorX = rect.left + rect.width / 2;
        const anchorY = rect.top + rect.height / 2;
        const top = Math.max(rect.top - 28, 8);
        const left = Math.min(Math.max(anchorX, 12), Math.max(viewportWidth - 12, 12));
        const entry = {
            id: `${actionId}-${keyLabel}-${items.length}`,
            actionId,
            label: baseLabel,
            key: keyLabel,
            baseTop: top,
            baseLeft: left,
            displayTop: top,
            displayLeft: left,
            anchorX,
            anchorY,
            isDynamic,
            element: node,
            connector: null,
            align: 'center',
            groupId,
            groupSide,
        };
        items.push(entry);
        if (isDynamic) {
            dynamics.push({
                key: keyLabel,
                element: node,
            });
        }
    });
    layoutHotkeyGroups(items, viewportWidth);
    overlayItems.value = items;
    dynamicTargets.value = dynamics;
};

const tokenizeChord = (chord = '') => {
    if (!chord) {
        return [];
    }
    const tokens = [];
    const segments = chord.split('+');
    segments.forEach((segment, index) => {
        const value = segment.trim();
        if (value) {
            tokens.push(value);
        }
        else if (index > 0) {
            tokens.push('+');
        }
    });
    if (tokens.length === 0 && chord.trim() === '+') {
        return ['+'];
    }
    return tokens;
};

const deriveHoldReleaseKey = (binding = []) => {
    if (!Array.isArray(binding) || binding.length === 0) {
        return null;
    }
    const chord = binding[binding.length - 1];
    const tokens = tokenizeChord(chord);
    if (tokens.length === 0) {
        return null;
    }
    const releaseToken = tokens[tokens.length - 1];
    return hotkeyUtils.normalizeKeyToken(releaseToken);
};

const showOverlay = (binding) => {
    holdReleaseKey.value = deriveHoldReleaseKey(binding);
    buildOverlayTargets();
    isActive.value = true;
};

const hideOverlay = () => {
    isActive.value = false;
    holdReleaseKey.value = null;
    overlayItems.value = [];
    dynamicTargets.value = [];
    clearDigitBuffer();
};

useHotkeyBindings('general', {
    'general.view-hotkeys': ({ event, binding }) => {
        event.preventDefault();
        showOverlay(binding);
    },
}, { allowInInput: true });

const handleKeyup = (event) => {
    if (!isActive.value || !holdReleaseKey.value) {
        return;
    }
    const normalized = hotkeyUtils.normalizeKeyToken(event.key || '');
    if (!normalized) {
        return;
    }
    if (normalized === holdReleaseKey.value) {
        hideOverlay();
    }
};

const handleDigitSelection = (digit) => {
    if (dynamicTargets.value.length === 0) {
        return;
    }
    const nextBuffer = digitBuffer.value + digit;
    const exactMatch = dynamicTargets.value.find((target) => target.key === nextBuffer);
    if (exactMatch && exactMatch.element) {
        digitBuffer.value = '';
        scheduleDigitReset();
        exactMatch.element.click();
        return;
    }
    const hasPartial = dynamicTargets.value.some((target) => target.key.startsWith(nextBuffer));
    if (hasPartial) {
        digitBuffer.value = nextBuffer;
        scheduleDigitReset();
        return;
    }
    const restartMatch = dynamicTargets.value.find((target) => target.key.startsWith(digit));
    if (restartMatch) {
        digitBuffer.value = digit;
        scheduleDigitReset();
    }
    else {
        clearDigitBuffer();
    }
};

const digitKeydownHandler = (event) => {
    if (!isActive.value || dynamicTargets.value.length === 0) {
        return;
    }
    if (event.defaultPrevented) {
        return;
    }
    const isDigit = event.key.length === 1 && /[0-9]/.test(event.key);
    if (!isDigit) {
        return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    handleDigitSelection(event.key);
};

onMounted(() => {
    isMounted = true;
    window.addEventListener('keyup', handleKeyup, { capture: false });
    window.addEventListener('keydown', digitKeydownHandler, { capture: true });
    window.addEventListener('blur', hideOverlay);
});

onBeforeUnmount(() => {
    isMounted = false;
    window.removeEventListener('keyup', handleKeyup, { capture: false });
    window.removeEventListener('keydown', digitKeydownHandler, { capture: true });
    window.removeEventListener('blur', hideOverlay);
    clearDigitBuffer();
});
</script>

<template>
    <div class="hotkey-overlay" :class="{ 'hotkey-overlay--visible': isActive }" aria-hidden="true">
        <div class="hotkey-overlay__backdrop"></div>
        <template v-for="item in overlayItems" :key="`${item.id}-connector`">
            <div
                v-if="item.connector"
                class="hotkey-overlay__connector"
            >
                <div
                    class="hotkey-overlay__connector-segment"
                    :style="{
                        left: `${item.connector.vertical.left}px`,
                        top: `${item.connector.vertical.top}px`,
                        height: `${item.connector.vertical.height}px`
                    }"
                ></div>
                <div
                    class="hotkey-overlay__connector-segment hotkey-overlay__connector-segment--horizontal"
                    :style="{
                        left: `${item.connector.horizontal.left}px`,
                        top: `${item.connector.horizontal.top}px`,
                        width: `${item.connector.horizontal.width}px`
                    }"
                ></div>
            </div>
        </template>
        <div
            v-for="item in overlayItems"
            :key="item.id"
            class="hotkey-overlay__tag"
            :class="[`hotkey-overlay__tag--${item.align || 'center'}`]"
            :style="{
                left: `${item.displayLeft}px`,
                top: `${item.displayTop}px`
            }"
        >
            <div class="hotkey-overlay__tag-content">
                <div class="hotkey-overlay__tag-key">
                    {{ item.key }}
                </div>
                <div class="hotkey-overlay__tag-label" v-if="item.label">
                    {{ item.label }}
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.hotkey-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.18s ease;
    z-index: 2000;
    font-family: "Space Mono", "JetBrains Mono", "Fira Code", monospace;
}

.hotkey-overlay__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(2, 4, 12, 0.72);
    backdrop-filter: blur(2px) opacity(0);
}

.hotkey-overlay--visible {
    opacity: 1;
}

.hotkey-overlay__tag {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    pointer-events: none;
}

.hotkey-overlay__tag--center {
    transform: translate(-50%, 0);
    align-items: center;
}

.hotkey-overlay__tag--right,
.hotkey-overlay__tag--left {
    transform: translate(0, 0);
}

.hotkey-overlay__tag--right {
    align-items: flex-start;
}

.hotkey-overlay__tag--left {
    align-items: flex-end;
}

.hotkey-overlay__tag-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.hotkey-overlay__tag-key {
    padding: 0.35rem 0.55rem;
    border-radius: 0.4rem;
    background: rgba(20, 24, 32, 0.9);
    color: #f5f5f5;
    font-size: 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 0.3rem 1rem rgba(0, 0, 0, 0.35);
    min-width: 2.5rem;
    text-align: center;
}

.hotkey-overlay__tag-label {
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.75rem;
    text-transform: capitalize;
    white-space: nowrap;
}

.hotkey-overlay__connector {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.hotkey-overlay__connector-segment {
    position: absolute;
    width: 2px;
    background: rgba(255, 255, 255, 0.45);
}

.hotkey-overlay__connector-segment--horizontal {
    height: 2px;
}
</style>
