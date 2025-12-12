import { ref, computed } from 'vue';
import { useRecordingsStore, addRecordingForLevel } from '@/functions/useRecordings';
import { gameDefaultAnimationDuration } from "@/data/constants";

export function useLevelRecording({
    levelId,
    name,
    author,
    fullLevelData,
    gameState,
    selected,
    moveParticle,
    restoreBaseLevelState,
    disableInteraction,
    isCustomAnimating,
    isLevelLoaded
}) {
    const recordingsStore = useRecordingsStore();
    const recordingSession = ref({
        active: false,
        startedAt: null,
    });
    const isPlaybackActive = ref(false);
    const playbackQueue = ref([]);
    const playbackTimeoutHandle = ref(null);
    const recording = ref([]);

    const levelRecordings = computed(() => {
        const entries = recordingsStore.value[levelId];
        return Array.isArray(entries) ? entries : [];
    });

    const hasLocalPlayback = computed(() => levelRecordings.value.length > 0);
    const isRecordingActive = computed(() => recordingSession.value.active);
    const recordingButtonDisabled = computed(() => !isLevelLoaded.value || isPlaybackActive.value);

    const formatRecordingLabel = (entry) => {
        const date = entry.recordedAt ? new Date(entry.recordedAt) : null;
        const formattedDate = date ? date.toLocaleString() : 'Unknown date';
        return `${formattedDate} • ${entry.steps} steps`;
    };

    const playbackDropdownOptions = computed(() => levelRecordings.value.map((entry) => ({
        label: formatRecordingLabel(entry),
        key: entry.id
    })));

    const flattenRecordingEntries = (recordingData = []) => {
        const steps = [];
        recordingData.forEach((segment) => {
            if (!segment || typeof segment.id === 'undefined' || !Array.isArray(segment.direction)) {
                return;
            }
            segment.direction.forEach((dir) => {
                steps.push({
                    id: segment.id,
                    direction: dir
                });
            });
        });
        return steps;
    };

    const countRecordingSteps = (recordingData = []) => recordingData.reduce((total, segment) => {
        if (!segment || !Array.isArray(segment.direction)) {
            return total;
        }
        return total + segment.direction.length;
    }, 0);

    const recordMove = (particleId, direction) => {
        if (!recordingSession.value.active) {
            return;
        }
        const particleIdRaw = Number(particleId.split('-')[1]);
        if (recording.value.length === 0 || recording.value.at(-1).id !== particleIdRaw) {
            recording.value.push({
                id: particleIdRaw,
                direction: [direction]
            });
        }
        else {
            recording.value.at(-1).direction.push(direction);
        }
    };

    const clearRecordingSession = () => {
        recordingSession.value.active = false;
        recordingSession.value.startedAt = null;
    };

    const handleRecordingCompletion = () => {
        if (!recordingSession.value.active || recording.value.length === 0) {
            clearRecordingSession();
            return;
        }
        const steps = countRecordingSteps(recording.value);
        addRecordingForLevel(levelId, {
            levelId,
            levelName: name.value,
            author: author.value,
            steps,
            recording: JSON.parse(JSON.stringify(recording.value)),
            map: JSON.parse(JSON.stringify(fullLevelData.value))
        });
        clearRecordingSession();
    };

    const startRecordingSession = () => {
        if (!restoreBaseLevelState({ obscure: false, resetRecording: true })) {
            return;
        }
        recordingSession.value.active = true;
        recordingSession.value.startedAt = new Date().toISOString();
    };

    const stopPlayback = () => {
        isPlaybackActive.value = false;
        playbackQueue.value = [];
        if (playbackTimeoutHandle.value) {
            clearTimeout(playbackTimeoutHandle.value);
            playbackTimeoutHandle.value = null;
        }
    };

    const handleRecordButtonClick = () => {
        if (recordingButtonDisabled.value) {
            return;
        }
        stopPlayback();
        if (recordingSession.value.active) {
            clearRecordingSession();
            recording.value = [];
            return;
        }
        startRecordingSession();
    };

    const queueNextPlaybackStep = () => {
        if (!isPlaybackActive.value) {
            return;
        }
        if (disableInteraction.value || isCustomAnimating.value) {
            playbackTimeoutHandle.value = setTimeout(queueNextPlaybackStep, 100);
            return;
        }
        playbackTimeoutHandle.value = setTimeout(stepPlaybackQueue, gameDefaultAnimationDuration + 50);
    };

    const stepPlaybackQueue = () => {
        if (!isPlaybackActive.value) {
            return;
        }
        if (playbackQueue.value.length === 0) {
            stopPlayback();
            return;
        }
        const nextStep = playbackQueue.value.shift();
        const particle = gameState.value.particles.find((p) => Number(p.id.split('-')[1]) === nextStep.id);
        if (!particle) {
            stopPlayback();
            return;
        }
        selected.value = particle;
        moveParticle(nextStep.direction, { allowWhilePlayback: true });
        queueNextPlaybackStep();
    };

    const startPlayback = (entry) => {
        if (!entry) {
            return;
        }
        stopPlayback();
        recordingSession.value.active = false;
        if (!restoreBaseLevelState({ obscure: false, resetRecording: true })) {
            return;
        }
        const flattened = flattenRecordingEntries(entry.recording);
        if (flattened.length === 0) {
            return;
        }
        isPlaybackActive.value = true;
        playbackQueue.value = flattened;
        stepPlaybackQueue();
    };

    const playLatestRecordingEntry = () => {
        const latest = levelRecordings.value.at(-1);
        if (!latest) {
            return;
        }
        startPlayback(latest);
    };

    return {
        recordingSession,
        isPlaybackActive,
        playbackQueue,
        recording,
        levelRecordings,
        hasLocalPlayback,
        isRecordingActive,
        recordingButtonDisabled,
        playbackDropdownOptions,
        recordMove,
        clearRecordingSession,
        handleRecordingCompletion,
        startRecordingSession,
        handleRecordButtonClick,
        stopPlayback,
        startPlayback,
        playLatestRecordingEntry
    };
}
