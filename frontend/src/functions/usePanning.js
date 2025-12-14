import { useMouse } from '@vueuse/core';
import { gameRefreshFrequency } from '../data/constants';

export function usePanning(targetOrRefreshFrequency = gameRefreshFrequency, refreshFrequency = gameRefreshFrequency) {
    const targetRef = typeof targetOrRefreshFrequency === 'number' ? null : targetOrRefreshFrequency;
    const resolvedRefreshFrequency =
        typeof targetOrRefreshFrequency === 'number' ? targetOrRefreshFrequency : refreshFrequency;

    const { x: mouseX, y: mouseY } = useMouse();
    const panningOffset = ref({ x: 0, y: 0 });
    let panningOffsetStart = { x: 0, y: 0 };
    let panningStart = { x: 0, y: 0 };
    let panningTracker = null;
    let touchPanningActive = false;
    let touchRafHandle = 0;
    let lastTouchCentroid = null;

    const resolveTargetEl = () => {
        if (!targetRef) return null;
        if (typeof targetRef === 'object' && targetRef !== null && 'value' in targetRef) return targetRef.value;
        return targetRef;
    };

    const getTouchesCentroid = (touches) => {
        const a = touches?.[0];
        const b = touches?.[1];
        if (!a || !b) return null;
        return {
            x: (a.clientX + b.clientX) / 2,
            y: (a.clientY + b.clientY) / 2,
        };
    };

    const stopTouchPan = () => {
        touchPanningActive = false;
        lastTouchCentroid = null;
        if (touchRafHandle) {
            cancelAnimationFrame(touchRafHandle);
            touchRafHandle = 0;
        }
    };

    const startTouchPanFromEvent = (event) => {
        if (!event?.touches || event.touches.length < 2) return false;
        const centroid = getTouchesCentroid(event.touches);
        if (!centroid) return false;

        onPanEnd();
        stopTouchPan();

        touchPanningActive = true;
        lastTouchCentroid = centroid;
        panningStart = centroid;
        panningOffsetStart = { ...panningOffset.value };
        return true;
    };

    const updateTouchPan = (event) => {
        if (!touchPanningActive) return;
        if (!event?.touches || event.touches.length < 2) {
            stopTouchPan();
            return;
        }

        const centroid = getTouchesCentroid(event.touches);
        if (!centroid) return;
        lastTouchCentroid = centroid;

        if (touchRafHandle) return;
        touchRafHandle = requestAnimationFrame(() => {
            touchRafHandle = 0;
            if (!touchPanningActive || !lastTouchCentroid) return;
            panningOffset.value = {
                x: panningOffsetStart.x + lastTouchCentroid.x - panningStart.x,
                y: panningOffsetStart.y + lastTouchCentroid.y - panningStart.y,
            };
        });
    };

    const onPanStart = () => {
        console.log("Middle mouse down");
        if (panningTracker) return;

        panningStart = { x: mouseX.value, y: mouseY.value };
        panningOffsetStart = { ...panningOffset.value };

        panningTracker = setInterval(() => {
            panningOffset.value = {
                x: panningOffsetStart.x + mouseX.value - panningStart.x,
                y: panningOffsetStart.y + mouseY.value - panningStart.y
            };
        }, 1000 / resolvedRefreshFrequency);

        document.body.style.cursor = "move";
    };

    const onPanEnd = () => {
        console.log("Middle mouse up");
        if (panningTracker) {
            clearInterval(panningTracker);
            panningTracker = null;
            document.body.style.cursor = "default";
        }
    };

    const onTouchStart = (event) => {
        // Only engage panning once 2 fingers are down (avoid interfering with 1-finger swipe moves).
        startTouchPanFromEvent(event);
    };

    const onTouchMove = (event) => {
        if (event?.touches?.length < 2) return;
        // Prevent browser scroll/pinch zoom while two-finger panning.
        event.preventDefault?.();

        if (!touchPanningActive) startTouchPanFromEvent(event);
        updateTouchPan(event);
    };

    const onTouchEnd = (event) => {
        if (event?.touches?.length < 2) stopTouchPan();
    };

    onMounted(() => {
        const el = resolveTargetEl();
        if (!el) return;

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    });

    onBeforeUnmount(() => {
        const el = resolveTargetEl();
        if (!el) return;

        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
        stopTouchPan();
        onPanEnd();
    });

    return { panningOffset, onPanStart, onPanEnd };
}
