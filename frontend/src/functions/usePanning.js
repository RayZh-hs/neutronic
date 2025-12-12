import { useMouse } from '@vueuse/core';
import { gameRefreshFrequency } from '../data/constants';

export function usePanning(refreshFrequency = gameRefreshFrequency) {  
    const { x: mouseX, y: mouseY } = useMouse();
    const panningOffset = ref({ x: 0, y: 0 });
    let panningOffsetStart = { x: 0, y: 0 };
    let panningStart = { x: 0, y: 0 };
    let panningTracker = null;

    const onPanStart = () => {
        console.log("Middle mouse down");
        if (panningTracker) return;

        panningStart = { x: mouseX.value, y: mouseY.value };
        panningOffsetStart = panningOffset.value;

        panningTracker = setInterval(() => {
            panningOffset.value = {
                x: panningOffsetStart.x + mouseX.value - panningStart.x,
                y: panningOffsetStart.y + mouseY.value - panningStart.y
            };
        }, 1000 / gameRefreshFrequency);

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

    return { panningOffset, onPanStart, onPanEnd };
}
