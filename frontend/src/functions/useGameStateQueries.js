export const useGameStateQueries = (gameState) => {
    const containers = () => gameState.value.containers;
    const particles = () => gameState.value.particles;

    const hasBoardAt = (row, column) =>
        containers().some(item => item.row === row && item.column === column && item.type === 'board');

    const hasPortalAt = (row, column) =>
        containers().some(item => item.row === row && item.column === column && item.type === 'portal');

    const hasContainerAt = (row, column) =>
        containers().some(item => item.row === row && item.column === column);

    const hasParticleWithColorAt = (row, column, color) =>
        particles().some(item => item.row === row && item.column === column && item.color === color);

    const getPortalIndexAt = (row, column) =>
        containers().find(item => item.row === row && item.column === column)?.index;

    const getOtherPortal = (row, column) => {
        const index = getPortalIndexAt(row, column);
        if (index === undefined) {
            return null;
        }
        return containers().find(item =>
            item.index === index && (item.row !== row || item.column !== column)
        );
    };

    const getParticlesAt = (row, column) =>
        particles().filter(item => item.row === row && item.column === column);

    const getParticleAt = (row, column) =>
        particles().find(item => item.row === row && item.column === column);

    const getContainerAt = (row, column) =>
        containers().find(item => item.row === row && item.column === column);

    const negateColor = (color) => (color === 'red' ? 'blue' : 'red');

    return {
        hasBoardAt,
        hasPortalAt,
        hasContainerAt,
        hasParticleWithColorAt,
        getOtherPortal,
        getParticlesAt,
        getParticleAt,
        getContainerAt,
        negateColor,
    };
};
