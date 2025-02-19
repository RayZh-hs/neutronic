// ! important: this file ASSUMES that the album request has been made, and does not check for it

export const albums = JSON.parse(sessionStorage.getItem('neutronic-album'));

export const getPrebuiltLevelInfo = (levelId) => {
    const albums = JSON.parse(sessionStorage.getItem('neutronic-album'));

    for (let albumIndex = 0; albumIndex < albums.length; albumIndex++) {
        const levelIndex = albums[albumIndex].content.findIndex(
            (level) => level.levelId === levelId
        )
        if (levelIndex !== -1) {
            return {
                albumIndex: albumIndex,
                levelIndex: levelIndex,
                level: albums[albumIndex].content[levelIndex]
            }
        }
    }
    return null;
}

export const getLevelInfo = (levelId) => {
    return getPrebuiltLevelInfo(levelId);
}