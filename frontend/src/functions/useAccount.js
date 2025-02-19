import { assert, useStorage } from "@vueuse/core";
import { albums, getPrebuiltLevelInfo } from "./levelUtils";

import defaultPlayerProgress from "@/data/defaultPlayerProgress";
const accountProgress = useStorage("neutronic-account-progress", defaultPlayerProgress);
const accountAuth = useStorage("neutronic-account-auth", { type: 'local', username: null, password: null }, sessionStorage);

export const getAccountAuth = () => {
    return accountAuth.value;
}

export const getAccountProgress = () => {
    return accountProgress.value;
}

export const setAndPushAccountProgress = (newProgress) => {
    const accountAuth = getAccountAuth();
    // if (accountAuth.value['type'] === 'regular') {
    //     // The progress should be uploaded to the server
    //     pushAccountProgress();
    // }
    accountProgress.value = newProgress;
}

export const fetchAccountProgress = async () => {
    console.warn('Not implemented: fetchAccountProgress at useAccount.js');
    console.log('Fetch account progress from server');
    return defaultPlayerProgress;
}

export const pushAccountProgress = async () => {
    console.warn('Not implemented: pushAccountProgress at useAccount.js');
    console.log('Push account progress to server');
}

export const isAccessibleToPrebuiltLevel = (levelId) => {
    const accountProgress = getAccountProgress();
    const levelInfo = getPrebuiltLevelInfo(levelId);
    if (levelInfo === null) {
        return false;
    }
    if (levelInfo.albumIndex >= 1 && !hasFinishedAlbum(levelInfo.albumIndex - 1)) {
        return false;
    }
    if (levelInfo.levelIndex === 0) {
        // The first level of an unlocked album is always accessible
        return true;
    }
    // Check whether the last level of this album has been passed or perfected
    const lastLevelId = albums[levelInfo.albumIndex].content[levelInfo.levelIndex - 1].levelId;
    return accountProgress.perfected.includes(lastLevelId) || accountProgress.passed.includes(lastLevelId);
}

export const hasFinishedAlbum = (albumIndex) => {
    assert(0 <= albumIndex && albumIndex < albums.length, 'Invalid albumIndex');
    const currentAlbumLookup = accountProgress.value.lookup[
        albums[albumIndex].meta.name
    ]
    if (!currentAlbumLookup){return false;}
    else {
        return albums[albumIndex].content.length === currentAlbumLookup.passed + currentAlbumLookup.perfected;
    }
}