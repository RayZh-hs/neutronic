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

export const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// This is special animation that does forth then back to the starting point
export const easeNope = (t) => {
    return Math.sin(t * Math.PI);
}

export const easeNopeGenerator = (amplitude = 1) => {
    return (t) => {
        return Math.sin(t * Math.PI) * amplitude;
    }
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
    (refObject, dest, time, easingFunction = easeLinear, finalSnapTo = dest) => {
        const start = { ...refObject.value };
        const animationStepsTotal = time / animationRefreshInterval;
        let animationStep = 0;
        let onUpdateCallback = () => { };
        let onFinishCallback = () => { };

        var animationContainer = setInterval(() => {
            onUpdateCallback(refObject);
            refObject.value = lerp(start, dest, easingFunction(animationStep / animationStepsTotal));
            animationStep++;
            if (animationStep > animationStepsTotal) {
                if (finalSnapTo) {
                    // Move to end and clear interval
                    refObject.value = finalSnapTo;
                    onUpdateCallback(refObject);
                }
                clearInterval(animationContainer);
                onFinishCallback();
            }
        }, animationRefreshInterval);

        return {
            onUpdate(callback) {
                onUpdateCallback = callback;
                return this;
            },
            onFinish(callback) {
                onFinishCallback = callback;
                return this;
            }
        };
    }

/**
 * Animates a vue reference to an object.
 * 
 * @param {import("vue").Ref} refObject The vue reference to animate;
 * @param {Object} dest The dictionary to animate to;
 * @param {number} time Time(in ms) to animate to the destination;
 * @param {Function} easingFunction A function [0, 1] -> [0, 1 ~ ] that determines the easing of the animation;
 * @param {Object} finalSnapTo The object to snap to after the animation is done, defaults to dest;
 */
export const refAnimateToObject = (refObject, dest, time, easingFunction = easeLinear, finalSnapTo = dest) => {
    const start = { ...refObject.value };
    const animationStepsTotal = time / animationRefreshInterval;
    let animationStep = 0;
    let onUpdateCallback = () => { };
    let onFinishCallback = () => { };

    var animationContainer = setInterval(() => {
        onUpdateCallback(refObject);
        for (const key in dest) {
            refObject.value[key] = lerp(
                start[key],
                dest[key],
                easingFunction(animationStep / animationStepsTotal)
            );
        }
        animationStep++;
        if (animationStep > animationStepsTotal) {
            // Move to end and clear interval
            if (finalSnapTo) {
                for (const key in finalSnapTo) {
                    refObject.value[key] = finalSnapTo[key];
                }
                onUpdateCallback(refObject);
            }
            clearInterval(animationContainer);
            onFinishCallback();
        }
    }, animationRefreshInterval);

    return {
        onUpdate(callback) {
            onUpdateCallback = callback;
            return this;
        },
        onFinish(callback) {
            onFinishCallback = callback;
            return this;
        }
    };
};
