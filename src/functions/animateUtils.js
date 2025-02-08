//: Constants :

export const animationRefreshInterval = 1000 / 60;

//: Custom easing functions :

export const easeLinear = (t) => {
    return t;
}

export const easeOutSquare = (t) => {
    return 1 - (1 - t) * (1 - t);
}

export const easeOutCubic = (t) => {
    return 1 - (1 - t) * (1 - t) * (1 - t);
}

export const easeOutQuart = (t) => {
    return 1 - (1 - t) * (1 - t) * (1 - t) * (1 - t);
}

export const easeOutSine = (t) => {
    return Math.sin(t * Math.PI / 2);
}

export const easeOutExpo = (t) => {
    return 1 - Math.pow(2, -10 * t);
}

//: Animation tools :

/**
 * Lerp shorthand for linear interpolation.
 * 
 * @param {any} start The starting point;
 * @param {any} end The ending point or destination;
 * @param {number} ratio The blend ratio;
 */
const lerp = (start, end, ratio) => {
    // return start + (end - start) * ratio;
    return (1 - ratio) * start + ratio * end;
}

/**
 * Animates a vue reference to a destination value with an easing function.
 * 
 * @param {import("vue").Ref} refObject The vue reference to animate;
 * @param {any} dest The type refObject points to, and should be compatible with numeric multiplication;
 * @param {number} time Time(in ms) to animate to the destination;
 * @param {Function} easingFunction A function [0, 1] -> [0, 1 ~ ] that determines the easing of the animation;
 */
export const refAnimateTo =
    (refObject, dest, time, easingFunction = easeLinear) => {
        const start = refObject.value;
        const animationStepsTotal = time / animationRefreshInterval;
        let animationStep = 0;
        
        var animationContainer = setInterval(() => {
            refObject.value = lerp(start, dest, easingFunction(animationStep / animationStepsTotal));
            animationStep++;
            if (animationStep > animationStepsTotal) {
                // Move to end and clear interval
                refObject.value = dest;
                clearInterval(animationContainer);
            }
        }, animationRefreshInterval);
    }

/**
 * Animates a vue reference to an object.
 * 
 * @param {import("vue").Ref} refObject The vue reference to animate;
 * @param {Object} dest The dictionary to animate to;
 * @param {number} time Time(in ms) to animate to the destination;
 * @param {Function} easingFunction A function [0, 1] -> [0, 1 ~ ] that determines the easing of the animation;
 */
export const refAnimateToObject =
    (refObject, dest, time, easingFunction = easeLinear) => {
        const start = refObject.value;
        const animationStepsTotal = time / animationRefreshInterval;
        let animationStep = 0;

        var animationContainer = setInterval(() => {
            for (const key in dest) {
                refObject.value[key] = lerp(start[key], dest[key], easingFunction(animationStep / animationStepsTotal));
            }
            animationStep++;
            if (animationStep > animationStepsTotal) {
                // Move to end and clear interval
                for (const key in dest) {
                    refObject.value[key] = dest[key];
                }
                clearInterval(animationContainer);
            }
        }, animationRefreshInterval);
    }