import { assert, useStorage } from "@vueuse/core";
import { getAlbums, getPrebuiltLevelInfo } from "./levelUtils";
import defaultPlayerProgress from "@/data/defaultPlayerProgress.json";

const cloneDefaultProgress = () => JSON.parse(JSON.stringify(defaultPlayerProgress));

const createDefaultAccount = () => ({
    version: 1,
    profile: {
        username: "Player",
        saved: true,
        lastExportedAt: null,
    },
    progress: {
        ...cloneDefaultProgress(),
        custom: {},
    },
    customLevels: [],
});

const normalizeProgress = (progress = {}) => {
    const base = cloneDefaultProgress();
    return {
        perfected: Array.isArray(progress.perfected) ? [...progress.perfected] : [],
        passed: Array.isArray(progress.passed) ? [...progress.passed] : [],
        lookup: {
            ...base.lookup,
            ...(progress.lookup || {}),
        },
        custom: progress.custom && typeof progress.custom === "object" ? progress.custom : {},
    };
};

const normalizeCustomLevels = (levels = []) => {
    if (!Array.isArray(levels)) {
        return [];
    }
    return levels
        .filter((entry) => entry && typeof entry === "object" && entry.id && entry.level)
        .map((entry) => {
            const id = String(entry.id);
            const level = entry.level;
            if (level.meta) {
                level.meta.levelId = id;
            }
            return {
                id,
                level,
                createdAt: entry.createdAt || new Date().toISOString(),
                updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
                bestMoves: typeof entry.bestMoves === "number" ? entry.bestMoves : null,
            };
        });
};

const accountState = useStorage(
    "neutronic-account",
    createDefaultAccount(),
    localStorage,
    { mergeDefaults: true }
);

const markDirty = () => {
    if (accountState.value.profile.saved) {
        accountState.value.profile.saved = false;
    }
};

export const useAccountStore = () => accountState;

export const getAccountProfile = () => accountState.value.profile;

export const renameAccount = (rawName) => {
    const name = rawName?.trim() ? rawName.trim().slice(0, 32) : "Player";
    if (accountState.value.profile.username === name) {
        return;
    }
    accountState.value.profile.username = name;
    markDirty();
};

export const getAccountProgress = () => accountState.value.progress;

export const setAndPushAccountProgress = (newProgress) => {
    accountState.value.progress = normalizeProgress({
        ...newProgress,
        custom: newProgress.custom ?? accountState.value.progress.custom,
    });
    markDirty();
};

export const getCustomLevels = () => accountState.value.customLevels;

export const getCustomLevelById = (levelId) => {
    return accountState.value.customLevels.find((entry) => entry.id === levelId) || null;
};

export const upsertCustomLevel = (levelPayload) => {
    const normalizedLevel = {
        id: levelPayload.id,
        level: levelPayload.level,
        createdAt: levelPayload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bestMoves: typeof levelPayload.bestMoves === "number" ? levelPayload.bestMoves : null,
    };
    if (normalizedLevel.level?.meta) {
        normalizedLevel.level.meta.levelId = normalizedLevel.id;
    }
    const existingIndex = accountState.value.customLevels.findIndex(
        (entry) => entry.id === normalizedLevel.id
    );
    if (existingIndex === -1) {
        accountState.value.customLevels.push(normalizedLevel);
    } else {
        accountState.value.customLevels[existingIndex] = {
            ...accountState.value.customLevels[existingIndex],
            ...normalizedLevel,
            createdAt: accountState.value.customLevels[existingIndex].createdAt,
        };
    }
    markDirty();
};

export const removeCustomLevel = (levelId) => {
    accountState.value.customLevels = accountState.value.customLevels.filter(
        (entry) => entry.id !== levelId
    );
    markDirty();
};

export const recordCustomLevelResult = (levelId, payload) => {
    const targetLevel = getCustomLevelById(levelId);
    if (!targetLevel) {
        return;
    }
    if (typeof payload.bestMoves === "number") {
        if (
            targetLevel.bestMoves === null ||
            payload.bestMoves < targetLevel.bestMoves
        ) {
            targetLevel.bestMoves = payload.bestMoves;
            targetLevel.updatedAt = new Date().toISOString();
        }
    }
    accountState.value.progress.custom[levelId] = {
        ...(accountState.value.progress.custom[levelId] || {}),
        ...(payload || {}),
    };
    markDirty();
};

export const getAccountExportPayload = () => JSON.stringify(accountState.value, null, 2);

export const markAccountSaved = () => {
    accountState.value.profile.saved = true;
    accountState.value.profile.lastExportedAt = new Date().toISOString();
};

export const importAccountFromString = (raw) => {
    const parsed = JSON.parse(raw);
    accountState.value = {
        version: 1,
        profile: {
            username: parsed.profile?.username?.trim() || "Player",
            saved: true,
            lastExportedAt: parsed.profile?.lastExportedAt || null,
        },
        progress: normalizeProgress(parsed.progress),
        customLevels: normalizeCustomLevels(parsed.customLevels),
    };
};

export const hasAnyStoredProgress = () => {
    const progress = accountState.value.progress;
    return (
        progress.perfected.length > 0 ||
        progress.passed.length > 0 ||
        Object.keys(progress.custom || {}).length > 0 ||
        accountState.value.customLevels.length > 0
    );
};

export const hasUnsavedChanges = () => !accountState.value.profile.saved;

export const resetAccount = () => {
    accountState.value = createDefaultAccount();
};

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
    const albums = getAlbums();
    if (!albums) return false;
    const lastLevelId =
        albums[levelInfo.albumIndex].content[levelInfo.levelIndex - 1].levelId;
    return (
        accountProgress.perfected.includes(lastLevelId) ||
        accountProgress.passed.includes(lastLevelId)
    );
};

export const hasFinishedAlbum = (albumIndex) => {
    const albums = getAlbums();
    if (!albums) return false;
    assert(0 <= albumIndex && albumIndex < albums.length, "Invalid albumIndex");
    const accountProgress = getAccountProgress();
    const currentAlbumLookup = accountProgress.lookup[albums[albumIndex].meta.name];
    if (!currentAlbumLookup) { return false; }
    return (
        albums[albumIndex].content.length ===
        currentAlbumLookup.passed + currentAlbumLookup.perfected
    );
};
