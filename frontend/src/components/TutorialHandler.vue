<script setup>
import { ref, Transition, watch, onUnmounted } from 'vue';
import { useTutorial } from '@/functions/useTutorial';
import { contract } from '@/functions/mathUtils';
import { useElementBounding } from '@vueuse/core';

const usingTutorial = useTutorial()
const context = usingTutorial.tutorialContext;

const initTutorialCanvas = () => {
    // This gives us an SVG overlay to draw stuff, if needed.
    let overlay = document.getElementById('tutorial-line-overlay')
    if (!overlay) {
        overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        overlay.setAttribute('id', 'tutorial-line-overlay')
        overlay.style.position = 'fixed'
        overlay.style.top = '0'
        overlay.style.left = '0'
        overlay.style.pointerEvents = 'none'
        overlay.style.width = '100%'
        overlay.style.height = '100%'
        overlay.style.zIndex = '9999'
        document.body.appendChild(overlay)
    }
    overlay.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`)
    return overlay;
}
const overlay = initTutorialCanvas();

const handleResize = () => {
    overlay.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
};
window.addEventListener('resize', handleResize);

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});

// Internal aux reactive elements
const internal = {
    particle3Rect: (() => {
        const el = document.getElementById('particle-3');
        if (el) {
            return useElementBounding(el);
        } else {
            return null;
        }
    })()
}

let currentAnimFrame = null;

const clearOverlay = () => {
    if (currentAnimFrame) cancelAnimationFrame(currentAnimFrame);
    while (overlay.lastChild) {
        overlay.removeChild(overlay.lastChild);
    }
}

const addPulseToElement = (elementId, color='#fff') => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '2');
    overlay.appendChild(circle);
    
    let start = null;
    const duration = 1500;
    let lastLoopIndex = -1;
    let currentR = 0;

    const updatePosition = () => {
        const el = document.getElementById(elementId);
        if (!el) return false;
        
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        currentR = rect.width / 2;
        
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', currentR);
        return true;
    };

    if (!updatePosition()) {
        overlay.removeChild(circle);
        return;
    }
    
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const loopIndex = Math.floor(elapsed / duration);
        const progress = (elapsed % duration) / duration;

        if (loopIndex > lastLoopIndex) {
            updatePosition();
            lastLoopIndex = loopIndex;
        }
        
        const scale = 1 + progress * 1.0; 
        const opacity = 1 - progress;
        
        circle.setAttribute('r', currentR * scale);
        circle.setAttribute('stroke-opacity', opacity);
        
        currentAnimFrame = requestAnimationFrame(animate);
    };
    currentAnimFrame = requestAnimationFrame(animate);
}

const arrowFromElToEl = (fromElId, toElId, color='#fff', requireSeparate=false) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.appendChild(g);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    g.appendChild(line);
    
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.setAttribute('fill', color);
    head.style.opacity = '0';
    g.appendChild(head);

    let start = null;
    const duration = 2000;
    let lastLoopIndex = -1;
    let currentLength = 0;

    const updatePosition = () => {
        const fromEl = document.getElementById(fromElId);
        const toEl = document.getElementById(toElId);
        if (!fromEl || !toEl) return false;
        
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        if (requireSeparate) {
            const dx = (fromRect.left + fromRect.width / 2) - (toRect.left + toRect.width / 2);
            const dy = (fromRect.top + fromRect.height / 2) - (toRect.top + toRect.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (fromRect.width + toRect.width) / 2 + 10) {
                return false;
            }
        }
        
        const x1 = fromRect.left + fromRect.width / 2;
        const y1 = fromRect.top + fromRect.height / 2;
        const x2 = toRect.left + toRect.width / 2;
        const y2 = toRect.top + toRect.height / 2;
        
        const headLen = 8;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const hx1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
        const hy1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
        const hx2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
        const hy2 = y2 - headLen * Math.sin(angle + Math.PI / 6);

        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2 - headLen * Math.cos(angle));
        line.setAttribute('y2', y2 - headLen * Math.sin(angle));
        
        head.setAttribute('points', `${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`);
        
        currentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        line.setAttribute('stroke-dasharray', currentLength);
        return true;
    }

    if (!updatePosition()) {
        overlay.removeChild(g);
        return;
    }
    
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const loopIndex = Math.floor(elapsed / duration);
        const progress = (elapsed % duration) / duration;
        
        if (loopIndex > lastLoopIndex) {
            updatePosition();
            lastLoopIndex = loopIndex;
        }
        
        let drawProgress = 0;
        let opacity = 1;
        
        if (progress < 0.5) {
            drawProgress = progress / 0.5;
            drawProgress = 1 - Math.pow(1 - drawProgress, 3);
            head.style.opacity = drawProgress > 0.8 ? (drawProgress - 0.8) * 10 : 0;
        } else if (progress < 0.8) {
            drawProgress = 1;
            head.style.opacity = 1;
        } else {
            drawProgress = 1;
            opacity = 1 - (progress - 0.8) / 0.2;
            head.style.opacity = opacity;
        }
        
        line.setAttribute('stroke-dashoffset', currentLength * (1 - drawProgress));
        g.style.opacity = opacity;
        
        currentAnimFrame = requestAnimationFrame(animate);
    };
    currentAnimFrame = requestAnimationFrame(animate);
}

// Special animTop-down api for invoking functions at each tutorial stage
const invokeAnimationFunction = (stageId) => {
    clearOverlay();
    const func = animationFunctionMapping[stageId];
    context.tutorialStageId.value = 'none:none';
    setTimeout(() => {
        context.tutorialStageId.value = stageId;
    }, 500);
    if (func) {
        func();
    }
}
const animationFunctionMapping = {
    'simple:click': () => {
        setTimeout(() => {
            addPulseToElement('particle-3', '#eb4b36');
        }, 800);
    },
    'simple:move': () => {
        setTimeout(() => {
            arrowFromElToEl('particle-3', 'container-4', '#fff', true);
        }, 800)
    },
    'simple:meet': () => {
        setTimeout(() => {
            arrowFromElToEl('container-2', 'particle-2', '#fff', true);
        }, 800);
    },
}

/**
 * ## Stage ID Specification
 * 
 * The stage id ref uniquely defines the stage of tutorial the game is in.  
 * It takes the form `section:step`, where section is uniquely defined by the level.  
 * Valid section names are: `none`, `simple`, `advanced`.
 * 
 * @note Some tutorials have different forms on different platforms.
 * 
 * - `none:none`    No tutorial. Used as a placeholder.
 * - `simple:click` Prompt the user to click a particle.
 * - `simple:move`  Prompt the user to move a particle.
 * - `simple:meet`  Prompt the user about what happens when two particles meet.
 * - `simple:goal`  Prompt the user about the goal of the game.
 * - `advanced:space`   Inform the user to press space to display usage.
 * - `advanced:select`  Inform the user about selecting particles with number keys.
 * - `advanced:cycle`   Inform the user about using j and l to cycle through particles.
 * - `advanced:configure`   Inform the user that hotkeys can be configured in the settings system.
 */
const stageId = context.tutorialStageId;
watch(context.isStartingAnimation, (newVal) => {
    console.log("Starting animation changed:", newVal)
    if (!newVal) {
        switch(context.currentLevelTutorialState.value) {
            case 'simple':
                invokeAnimationFunction('simple:click')
                break;
            case 'advanced':
                invokeAnimationFunction('advanced:space')
                break;
            default:
                // Do nothing here
                invokeAnimationFunction('none:none')
                break;
        }
    }
});

watch(context.userSelection, (newVal) => {
    if (newVal && stageId.value === 'simple:click') {
        invokeAnimationFunction('simple:move');
    }
});

watch(context.steps, (newVal) => {
    if (newVal > 0 && stageId.value === 'simple:move') {
        invokeAnimationFunction('simple:meet');
    }
});

watch(context.particleCount, (newVal, oldVal) => {
    if (newVal < oldVal && stageId.value === 'simple:meet') {
        invokeAnimationFunction('simple:goal');
    }
});

watch(context.hasWon, (newVal) => {
    if (newVal && stageId.value === 'simple:goal') {
        invokeAnimationFunction('none:none');
    }
});

</script>

<template>
    <div class="tutorial-container">
        <!-- <span style="position: absolute;">{{ stageId }}</span> -->
        <div class="tooltip-section">
            <transition name="tooltip">
                <div v-show="stageId == 'simple:click'" class="tooltip-block simple-click">
                    <!-- Mouse Left Click -->
                    <ion-icon name="locate-outline"></ion-icon>
                    <span><span class="text-green">Click</span> on a particle to select it.
                    </span>
                </div>
            </transition>
            <transition name="tooltip">
                <div v-show="stageId == 'simple:move'" class="tooltip-block simple-move">
                    <!-- Arrow Keys -->
                    <ion-icon name="move-outline"></ion-icon>
                    <span>Use <span class="text-green">Arrow Keys</span> or <span class="text-green">WASD</span> to move.</span>
                </div>
            </transition>
            <transition name="tooltip">
                <div v-show="stageId == 'simple:meet'" class="tooltip-block simple-meet">
                    <!-- Particles Meeting -->
                    <ion-icon name="git-merge-outline"></ion-icon>
                    <span>When particles of different colors meet, they <span class="text-green">dissipate</span> along with the floor below.</span>
                </div>
            </transition>
            <transition name="tooltip">
                <div v-show="stageId == 'simple:goal'" class="tooltip-block simple-goal">
                    <!-- Goal of the Game -->
                    <ion-icon name="trophy-outline"></ion-icon>
                    <span>Your goal: <span class="text-green">Cancel out</span> all particles</span>
                </div>
            </transition>
        </div>
    </div>
</template>

<style scoped lang="scss">
@use '@/styles/constants.scss';

.text-green {
    color: $n-primary;
}

.tooltip-enter-active, .tooltip-leave-active {
    transition: transform 300ms ease, opacity 300ms ease;
}
.tooltip-enter-to, .tooltip-leave-from {
    opacity: 1;
    transform: translate(-50%, 0) !important;
}
.tooltip-enter-from {
    opacity: 0;
    transform: translate(-50%, -0.3rem) !important;
}
.tooltip-leave-to {
    opacity: 0;
    transform: translate(-50%, 0.3rem) !important;
}

.tutorial-container {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    justify-content: center;

    .tooltip-section {
        position: relative;
        top: 25%;

        .tooltip-block {
            position: absolute;
            width: max-content;
            transform: translate(-50%, 0);
            display: flex;
            align-content: center;

            ion-icon {
                color: #ffffff;
                font-size: 1.6rem;
                margin-right: 10px;
                align-self: center;
            }

            span {
                font-family: "Electrolize", serif;
                align-self: center;
                letter-spacing: 0.5pt;
                font-weight: 400;
                font-size: 1.1rem;
            }
        }
    }
}
</style>