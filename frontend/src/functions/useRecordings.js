import { useAccountStore } from "./useAccount";

const account = useAccountStore();
const recordingsStore = computed({
    get: () => account.value.recordings,
    set: (val) => { account.value.recordings = val; }
});

const normalizeEntry = (payload = {}) => ({
    id: payload.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: payload.recordedAt || new Date().toISOString(),
    steps: typeof payload.steps === "number" ? payload.steps : 0,
    levelId: payload.levelId || null,
    levelName: payload.levelName || null,
    author: payload.author || null,
    recording: Array.isArray(payload.recording) ? payload.recording : [],
    map: payload.map || null,
});

export const useRecordingsStore = () => recordingsStore;

export const getRecordingsForLevel = (levelId) => {
    if (!levelId) {
        return [];
    }
    const entries = recordingsStore.value[levelId];
    return Array.isArray(entries) ? entries : [];
};

export const addRecordingForLevel = (levelId, payload) => {
    if (!levelId) {
        return null;
    }
    if (!Array.isArray(recordingsStore.value[levelId])) {
        recordingsStore.value[levelId] = [];
    }
    const entry = normalizeEntry(payload);
    recordingsStore.value[levelId].unshift(entry);
    return entry;
};

export const removeRecordingForLevel = (levelId, recordingId) => {
    if (!levelId || !recordingId || !Array.isArray(recordingsStore.value[levelId])) {
        return;
    }
    recordingsStore.value[levelId] = recordingsStore.value[levelId].filter(
        (entry) => entry.id !== recordingId
    );
};
