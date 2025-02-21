export function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomFloatFromInterval(min, max) {
    return Math.random() * (max - min) + min;
}