<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useHotkeyBindings, getPrimaryBindingLabel, getBindingsForAction, hotkeyUtils } from '@/functions/useHotkeys';
import { useHotkeyOverlayConfig } from '@/data/hotkeyOverlayConfig';

const isActive = ref(false);
const overlayItems = ref([]);
const dynamicTargets = ref([]);
const holdReleaseKey = ref(null);
const compoundStrokes = ref([]);
let isMounted = false;
const overlayConfig = useHotkeyOverlayConfig();

const MIN_DISPLAY_TOP = 12;
const DEFAULT_GROUP_SIDE = 'right';
const STANDALONE_VERTICAL_GAP = 12;
const STANDALONE_HORIZONTAL_GAP = 16;
const ESTIMATED_TAG_HEIGHT = 34;
const ESTIMATED_TAG_WIDTH = 80;
const MODIFIER_CHORDS = new Set(['ctrl', 'alt', 'shift', 'meta']);

const isNumericToken = (value = '') => /^\d+$/.test(value);

const formatCompoundKeyLabel = (key = '') => {
    if (!key || !key.includes(';')) {
        return key;
    }
    const segments = key.split(';').map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) {
        return '';
    }
    let result = segments[0];
    for (let index = 1; index < segments.length; index += 1) {
        const previous = segments[index - 1];
        const current = segments[index];
        const insertSpace = !(isNumericToken(previous) && isNumericToken(current));
        result += insertSpace ? ` ${current}` : current;
    }
    return result;
};

const normalizeCompoundParts = (segments = []) => {
    return segments
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => (isNumericToken(segment) ? segment : hotkeyUtils.normalizeChordFromString(segment)))
        .filter(Boolean);
};

const buildDynamicKeyData = (index, override) => {
    const buildFromIndex = () => {
        const parts = String(index).split('');
        return {
            matchKeyParts: parts,
            rawKey: parts.join(';'),
        };
    };
    if (override) {
        const overrideParts = normalizeCompoundParts(override.split(';'));
        if (overrideParts.length > 0) {
            return {
                matchKeyParts: overrideParts,
                rawKey: overrideParts.join(';'),
            };
        }
    }
    return buildFromIndex();
};

const arraysEqual = (a = [], b = []) => {
    if (a.length !== b.length) {
        return false;
    }
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] !== b[index]) {
            return false;
        }
    }
    return true;
};

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const elementPlacementStrategies = {
    below: ({ item, viewportWidth }) => ({
        left: clampValue(item.anchorX, 16, Math.max(16, viewportWidth - 16)),
        top: item.rect.bottom + STANDALONE_VERTICAL_GAP,
        align: 'center',
    }),
    above: ({ item, viewportWidth }) => ({
        left: clampValue(item.anchorX, 16, Math.max(16, viewportWidth - 16)),
        top: Math.max(item.rect.top - STANDALONE_VERTICAL_GAP - ESTIMATED_TAG_HEIGHT, MIN_DISPLAY_TOP),
        align: 'center',
    }),
    right: ({ item, viewportWidth }) => ({
        left: clampValue(item.rect.right + STANDALONE_HORIZONTAL_GAP, 16, Math.max(16, viewportWidth - 16)),
        top: item.anchorY - ESTIMATED_TAG_HEIGHT / 2,
        align: 'left',
    }),
    left: ({ item, viewportWidth }) => ({
        left: clampValue(item.rect.left - STANDALONE_HORIZONTAL_GAP - ESTIMATED_TAG_WIDTH, 16, Math.max(16, viewportWidth - 16)),
        top: item.anchorY - ESTIMATED_TAG_HEIGHT / 2,
        align: 'left',
    }),
    center: ({ item }) => ({
        left: item.anchorX,
        top: item.anchorY,
        align: 'middle',
    }),
};

const applyCompoundFilters = () => {
    const prefix = compoundStrokes.value;
    const hasPrefix = prefix.length > 0;
    overlayItems.value.forEach((item) => {
        if (!hasPrefix) {
            item.isDisabled = false;
            return;
        }
        if (!item.matchKeyParts) {
            item.isDisabled = true;
            return;
        }
        if (prefix.length > item.matchKeyParts.length) {
            item.isDisabled = true;
            return;
        }
        const matches = prefix.every((token, index) => item.matchKeyParts[index] === token);
        item.isDisabled = !matches;
    });
};

const clearCompoundStrokes = () => {
    compoundStrokes.value = [];
    applyCompoundFilters();
};

const recordCompoundStroke = (chord) => {
    compoundStrokes.value.push(chord);
    applyCompoundFilters();
};

const applyCompoundSelection = () => {
    if (compoundStrokes.value.length === 0) {
        return false;
    }
    const match = dynamicTargets.value.find((target) => arraysEqual(target.matchKeyParts, compoundStrokes.value));
    if (match && match.element) {
        match.element.click();
        return true;
    }
    return false;
};

const parseGroupPlacement = (rawValue = '') => {
    const normalized = (rawValue || DEFAULT_GROUP_SIDE).toLowerCase();
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const directives = tokens
        .map((token) => {
            if (token === 'left' || token === 'right') {
                return { axis: 'horizontal', direction: token };
            }
            if (token === 'top' || token === 'bottom') {
                return { axis: 'vertical', direction: token };
            }
            return null;
        })
        .filter(Boolean);
    if (directives.length === 0) {
        directives.push({ axis: 'horizontal', direction: DEFAULT_GROUP_SIDE });
    }
    return {
        directives,
        primary: directives[0],
        secondary: directives[1] || null,
        horizontal: directives.find((directive) => directive.axis === 'horizontal') || null,
        vertical: directives.find((directive) => directive.axis === 'vertical') || null,
    };
};

const getGroupBoundingBox = (groupItems) => {
    return groupItems.reduce((acc, item) => ({
        minX: Math.min(acc.minX, item.anchorX),
        maxX: Math.max(acc.maxX, item.anchorX),
        minY: Math.min(acc.minY, item.anchorY),
        maxY: Math.max(acc.maxY, item.anchorY),
    }), {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
    });
};

const buildConnectorSegments = ({ startX, startY, targetX, targetY, directives }) => {
    if ((targetX === undefined || targetX === null) && (targetY === undefined || targetY === null)) {
        return [];
    }
    const moves = [];
    directives.forEach((directive) => {
        if (directive.axis === 'vertical' && targetY !== null && targetY !== undefined) {
            moves.push('vertical');
        }
        if (directive.axis === 'horizontal' && targetX !== null && targetX !== undefined) {
            moves.push('horizontal');
        }
    });
    if (moves.length === 0) {
        if (targetY !== null && targetY !== undefined) {
            moves.push('vertical');
        }
        if (targetX !== null && targetX !== undefined) {
            moves.push('horizontal');
        }
    }
    const segments = [];
    let currentX = startX;
    let currentY = startY;
    const moveHorizontal = () => {
        if (targetX === null || targetX === undefined || currentX === targetX) {
            return;
        }
        segments.push({
            orientation: 'horizontal',
            left: Math.min(currentX, targetX),
            top: currentY,
            width: Math.abs(targetX - currentX),
        });
        currentX = targetX;
    };
    const moveVertical = () => {
        if (targetY === null || targetY === undefined || currentY === targetY) {
            return;
        }
        segments.push({
            orientation: 'vertical',
            left: currentX - 1,
            top: Math.min(currentY, targetY),
            height: Math.abs(targetY - currentY),
        });
        currentY = targetY;
    };
    moves.forEach((axis) => {
        if (axis === 'horizontal') {
            moveHorizontal();
        }
        else if (axis === 'vertical') {
            moveVertical();
        }
    });
    moveHorizontal();
    moveVertical();
    return segments;
};

const getConnectorOrigin = (item, placement) => {
    const rect = item.rect;
    const primaryDirection = placement?.primary?.direction;
    if (!primaryDirection) {
        return { x: item.anchorX, y: item.anchorY };
    }
    switch (primaryDirection) {
        case 'top':
            return { x: item.anchorX, y: rect.top };
        case 'bottom':
            return { x: item.anchorX, y: rect.bottom };
        case 'left':
            return { x: rect.left, y: item.anchorY };
        case 'right':
            return { x: rect.right, y: item.anchorY };
        default:
            return { x: item.anchorX, y: item.anchorY };
    }
};

const layoutColumnGroup = (groupItems, placement, viewportWidth) => {
    const config = overlayConfig.group;
    const boundingBox = getGroupBoundingBox(groupItems);
    const side = (placement.horizontal && placement.horizontal.direction) || DEFAULT_GROUP_SIDE;
    const anchorEdge = side === 'right' ? boundingBox.maxX : boundingBox.minX;
    const rawColumn = side === 'right'
        ? anchorEdge + config.columnOffset
        : anchorEdge - config.columnOffset;
    const viewportMinX = 16;
    const viewportMaxX = Math.max(16, viewportWidth - 16);
    const tagHalfWidth = config.tagHalfWidth || ESTIMATED_TAG_WIDTH / 2;
    const tagWidth = tagHalfWidth * 2;
    const clampTagLeft = (value) => clampValue(value, viewportMinX, Math.max(viewportMinX, viewportMaxX - tagWidth));
    const columnX = clampValue(rawColumn, viewportMinX, viewportMaxX);
    const verticalDirective = placement.vertical;
    const sorted = groupItems.slice().sort((a, b) => a.anchorY - b.anchorY);
    const spacing = config.verticalSpacing;
    const directionMultiplier = verticalDirective?.direction === 'top' ? -1 : 1;
    let currentTop = verticalDirective
        ? (verticalDirective.direction === 'top'
            ? Math.max(MIN_DISPLAY_TOP, boundingBox.minY - config.rowOffset)
            : boundingBox.maxY + config.rowOffset)
        : -Infinity;
    sorted.forEach((item, index) => {
        let displayTop;
        if (verticalDirective) {
            displayTop = index === 0 ? currentTop : currentTop + (spacing * directionMultiplier);
            currentTop = displayTop;
        }
        else {
            const desiredTop = Math.max(item.anchorY - config.tagHalfHeight + config.verticalBaselineOffset, MIN_DISPLAY_TOP);
            displayTop = Math.max(desiredTop, currentTop + spacing);
            currentTop = displayTop;
        }
        displayTop = Math.max(displayTop, MIN_DISPLAY_TOP);
        let displayLeft;
        let connectorX;
        if (side === 'left') {
            displayLeft = clampTagLeft(columnX - tagWidth);
            connectorX = displayLeft + tagWidth;
            item.inlineReverse = item.labelPlacement === 'inline';
        }
        else {
            displayLeft = clampTagLeft(columnX);
            connectorX = displayLeft;
            item.inlineReverse = false;
        }
        const targetY = displayTop + config.tagHalfHeight;
        const origin = getConnectorOrigin(item, placement);
        const segments = buildConnectorSegments({
            startX: origin.x,
            startY: origin.y,
            targetX: connectorX,
            targetY,
            directives: placement.directives,
        });
        item.displayLeft = displayLeft;
        item.displayTop = displayTop;
        item.align = side === 'right' ? 'right' : 'left';
        item.connectorSegments = segments.length ? segments : null;
    });
};

const layoutRowGroup = (groupItems, placement, viewportWidth) => {
    const config = overlayConfig.group;
    const boundingBox = getGroupBoundingBox(groupItems);
    const verticalDirective = placement.vertical || placement.primary || { direction: 'top' };
    const rowDirection = verticalDirective.direction === 'bottom' ? 'bottom' : 'top';
    const rowTop = rowDirection === 'top'
        ? Math.max(MIN_DISPLAY_TOP, boundingBox.minY - config.rowOffset)
        : boundingBox.maxY + config.rowOffset;
    const horizontalDirective = placement.horizontal;
    const sorted = groupItems.slice().sort((a, b) => a.anchorX - b.anchorX);
    const spacing = config.horizontalSpacing;
    const directionMultiplier = horizontalDirective?.direction === 'left' ? -1 : 1;
    let currentCenter = horizontalDirective
        ? (horizontalDirective.direction === 'left'
            ? boundingBox.minX - config.columnOffset
            : boundingBox.maxX + config.columnOffset)
        : -Infinity;
    sorted.forEach((item, index) => {
        let center;
        if (horizontalDirective) {
            center = index === 0 ? currentCenter : currentCenter + (spacing * directionMultiplier);
            currentCenter = center;
        }
        else {
            const desiredCenter = item.anchorX + config.horizontalBaselineOffset;
            center = desiredCenter > currentCenter + spacing
                ? desiredCenter
                : currentCenter + spacing;
            currentCenter = center;
        }
        center = clampValue(center, 16, Math.max(16, viewportWidth - 16));
        const targetX = center;
        const targetY = rowTop + config.tagHalfHeight;
        const origin = getConnectorOrigin(item, placement);
        const segments = buildConnectorSegments({
            startX: origin.x,
            startY: origin.y,
            targetX,
            targetY,
            directives: placement.directives,
        });
        item.displayLeft = center;
        item.displayTop = rowTop;
        item.align = 'center';
        item.connectorSegments = segments.length ? segments : null;
    });
};

const applyStandalonePlacements = (items, viewportWidth) => {
    items.forEach((item) => {
        if (item.groupId) {
            return;
        }
        const placementStrategy = elementPlacementStrategies[item.elementPlacement] || elementPlacementStrategies.below;
        const placement = placementStrategy({ item, viewportWidth });
        item.displayLeft = placement.left;
        item.displayTop = placement.top;
        item.align = placement.align || 'center';
    });
};

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
        const placement = parseGroupPlacement(groupItems[0].groupSide);
        if (!placement.horizontal) {
            layoutRowGroup(groupItems, placement, viewportWidth);
        }
        else {
            layoutColumnGroup(groupItems, placement, viewportWidth);
        }
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
        const groupSide = (node.dataset.hotkeyGroupSide || '').toLowerCase();
        const elementPlacement = (node.dataset.hotkeyElementPosition || 'below').toLowerCase();
        const labelPlacement = (node.dataset.hotkeyLabelPosition || 'inline').toLowerCase();
        const keyOverride = node.dataset.hotkeyHint || '';
        const baseLabel = node.dataset.hotkeyLabel || '';
        let keyLabel = keyOverride;
        let matchKeyParts = null;
        if (isDynamic) {
            const dynamicData = buildDynamicKeyData(dynamicIndex, keyOverride);
            dynamicIndex += 1;
            keyLabel = dynamicData.rawKey;
            matchKeyParts = dynamicData.matchKeyParts;
        }
        else {
            const bindingSequences = getBindingsForAction(actionId);
            if (!keyLabel) {
                keyLabel = getPrimaryBindingLabel(actionId) || '';
            }
            if (!keyLabel) {
                keyLabel = 'Unbound';
            }
            if (!matchKeyParts && bindingSequences.length > 0) {
                matchKeyParts = bindingSequences[0] ? [...bindingSequences[0]] : null;
            }
        }
        const displayKey = formatCompoundKeyLabel(keyLabel);
        const anchorX = rect.left + rect.width / 2;
        const anchorY = rect.top + rect.height / 2;
        const top = Math.max(rect.top - 28, 8);
        const left = Math.min(Math.max(anchorX, 12), Math.max(viewportWidth - 12, 12));
        const shouldShowRaw = node.dataset.hotkeyShow;
        const shouldShow = typeof shouldShowRaw === 'undefined' ? true : shouldShowRaw !== 'false';
        if (!shouldShow) {
            return;
        }
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
            rect,
            isDynamic,
            element: node,
            connectorSegments: null,
            align: 'center',
            groupId,
            groupSide,
            elementPlacement,
            labelPlacement,
            matchKeyParts,
            isDisabled: false,
            inlineReverse: false,
            displayKey,
        };
        items.push(entry);
        if (matchKeyParts && matchKeyParts.length > 0) {
            dynamics.push({
                matchKeyParts,
                element: node,
            });
        }
    });
    layoutHotkeyGroups(items, viewportWidth);
    applyStandalonePlacements(items, viewportWidth);
    overlayItems.value = items;
    dynamicTargets.value = dynamics;
    applyCompoundFilters();
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
    clearCompoundStrokes();
    buildOverlayTargets();
    isActive.value = true;
};

const hideOverlay = () => {
    clearCompoundStrokes();
    isActive.value = false;
    holdReleaseKey.value = null;
    overlayItems.value = [];
    dynamicTargets.value = [];
};

useHotkeyBindings('general', {
    'general.view-hotkeys': ({ event, binding }) => {
        event.preventDefault();
        showOverlay(binding);
    },
}, { allowInInput: false });

const handleKeyup = (event) => {
    if (!isActive.value || !holdReleaseKey.value) {
        return;
    }
    const normalized = hotkeyUtils.normalizeKeyToken(event.key || '');
    if (!normalized) {
        return;
    }
    if (normalized === holdReleaseKey.value) {
        applyCompoundSelection();
        hideOverlay();
    }
};

const compoundKeydownHandler = (event) => {
    if (!isActive.value || !holdReleaseKey.value) {
        return;
    }
    if (event.defaultPrevented) {
        return;
    }
    const chord = hotkeyUtils.normalizeChordFromEvent(event);
    if (!chord) {
        return;
    }
    if (chord === holdReleaseKey.value) {
        return;
    }
    if (MODIFIER_CHORDS.has(chord)) {
        return;
    }
    if (chord === 'escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearCompoundStrokes();
        return;
    }
    if (event.repeat) {
        event.preventDefault();
        return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    recordCompoundStroke(chord);
};

onMounted(() => {
    isMounted = true;
    window.addEventListener('keyup', handleKeyup, { capture: false });
    window.addEventListener('keydown', compoundKeydownHandler, { capture: true });
    window.addEventListener('blur', hideOverlay);
});

onBeforeUnmount(() => {
    isMounted = false;
    window.removeEventListener('keyup', handleKeyup, { capture: false });
    window.removeEventListener('keydown', compoundKeydownHandler, { capture: true });
    window.removeEventListener('blur', hideOverlay);
    clearCompoundStrokes();
});
</script>

<template>
    <div class="hotkey-overlay" :class="{ 'hotkey-overlay--visible': isActive }" aria-hidden="true">
        <div class="hotkey-overlay__backdrop"></div>
        <template v-for="item in overlayItems" :key="`${item.id}-connector`">
            <div
                v-if="item.connectorSegments && item.connectorSegments.length"
                class="hotkey-overlay__connector"
                :class="{ 'hotkey-overlay__connector--disabled': item.isDisabled }"
            >
                <div
                    v-for="(segment, index) in item.connectorSegments"
                    :key="`${item.id}-segment-${index}`"
                    class="hotkey-overlay__connector-segment"
                    :class="{
                        'hotkey-overlay__connector-segment--horizontal': segment.orientation === 'horizontal'
                    }"
                    :style="{
                        left: `${segment.left}px`,
                        top: `${segment.top}px`,
                        width: segment.orientation === 'horizontal' ? `${segment.width}px` : '2px',
                        height: segment.orientation === 'vertical' ? `${segment.height}px` : '2px'
                    }"
                ></div>
            </div>
        </template>
        <div
            v-for="item in overlayItems"
            :key="item.id"
            class="hotkey-overlay__tag"
            :class="[
                `hotkey-overlay__tag--${item.align || 'center'}`,
                { 'hotkey-overlay__tag--disabled': item.isDisabled }
            ]"
            :style="{
                left: `${item.displayLeft}px`,
                top: `${item.displayTop}px`
            }"
        >
            <div
                class="hotkey-overlay__tag-content"
                :class="[
                    `hotkey-overlay__tag-content--${item.labelPlacement || 'below'}`,
                    { 'hotkey-overlay__tag-content--reverse': item.inlineReverse }
                ]"
            >
                <div class="hotkey-overlay__tag-key">
                    {{ item.displayKey }}
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
    transition: opacity 0.1s ease;
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

.hotkey-overlay__tag--disabled {
    opacity: 0.2;
}

.hotkey-overlay__tag--center {
    transform: translate(-50%, 0);
    align-items: center;
}

.hotkey-overlay__tag--middle {
    transform: translate(-50%, -50%);
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

.hotkey-overlay__tag-content--inline {
    flex-direction: row;
    align-items: center;
}

.hotkey-overlay__tag-content--inline.hotkey-overlay__tag-content--reverse {
    flex-direction: row-reverse;
    justify-content: flex-end;
}

.hotkey-overlay__tag-content--below {
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
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
    text-align: center;
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

.hotkey-overlay__connector--disabled {
    opacity: 0.25;
}
</style>
