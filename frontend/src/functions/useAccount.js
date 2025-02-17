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

const isAccessibleToPrebuiltLevel = (levelId) => {
    const accountProgress = getAccountProgress();
    const levelInfo = getPrebuiltLevelInfo(levelId);
    if (levelInfo === null) {
        return false;
    }
    if (levelInfo.albumIndex >= 1 && !hasFinishedAlbum(levelInfo.albumIndex - 1)) {
        return false;
    }
    // TODO unfinished code
}

const hasFinishedAlbum = (albumId) => {
    assert(0 <= albumId && albumId < albums.length, 'Invalid albumId');
    const currentAlbumLookup = accountProgress.value.lookup[
        albums[albumId].meta.name
    ]
    if (!currentAlbumLookup){return false;}
    else {
        return albums[albumId].content.length === currentAlbumLookup.passed + currentAlbumLookup.perfected;
    }
}