<script setup>
import { useRouter } from 'vue-router';
import { useSessionStorage, useWindowSize } from '@vueuse/core';
import { v4 as uuidV4Generator } from 'uuid';
import LevelCard from '@/components/LevelCard.vue';
import IonButton from '@/components/IonButton.vue';
import { useAccountStore, renameAccount, removeCustomLevel } from '@/functions/useAccount';
import { useRecordingsStore, removeRecordingForLevel } from '@/functions/useRecordings';
import { getPrebuiltLevelInfo } from '@/functions/levelUtils';
import { useHotkeyBindings } from '@/functions/useHotkeys';
import { useDevice } from '@/functions/useDevice';
import { useBackHandler } from '@/functions/useBackNavigation';

const router = useRouter();
const account = useAccountStore();
const message = useMessage();
const dialog = useDialog();
const device = useDevice();
const isTouchDevice = computed(() => device.isTouchDevice.value);
const isTouchPortrait = computed(() => isTouchDevice.value && device.orientation.value === 'portrait');

const headerHover = ref(false);
const isCreateIconVisible = ref(false);

const currentView = ref('levels'); // 'levels', 'recordings'
const pendingView = ref('levels');
const options = ['levels', 'recordings'];

watch(headerHover, (newVal) => {
    if (newVal) {
        pendingView.value = currentView.value;
    } else {
        currentView.value = pendingView.value;
    }
});

const handleWheel = (e) => {
    if (!headerHover.value) return;
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    const idx = options.indexOf(pendingView.value);
    let newIdx = idx + delta;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= options.length) newIdx = options.length - 1;
    pendingView.value = options[newIdx];
};

const selectOption = (opt) => {
    pendingView.value = opt;
};

const setCurrentView = (opt) => {
    currentView.value = opt;
    pendingView.value = opt;
    headerHover.value = false;
};

const { height: viewportHeight } = useWindowSize();
const pageSize = computed(() => {
    const h = viewportHeight.value || 0;
    if (h > 0 && h < 560) return 3;
    if (h > 0 && h < 720) return 4;
    return 5;
});

const sliceWindow = ref({
    begin: 0,
    end: pageSize.value,
});

const sortedCustomLevels = computed(() => {
    return [...account.value.customLevels].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
});

const recordingsStore = useRecordingsStore();
const allRecordings = computed(() => {
    const all = [];
    for (const [levelId, recordings] of Object.entries(recordingsStore.value)) {
        if (Array.isArray(recordings)) {
            recordings.forEach(rec => {
                all.push({ ...rec, levelId });
            });
        }
    }
    return all.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
});

const total = computed(() => {
    if (currentView.value === 'levels') return sortedCustomLevels.value.length;
    if (currentView.value === 'recordings') return allRecordings.value.length;
    return 0;
});

const pagedItems = computed(() => {
    const list = currentView.value === 'levels' ? sortedCustomLevels.value :
                 allRecordings.value;
    return list.slice(sliceWindow.value.begin, sliceWindow.value.end);
});

const visibleItems = computed(() => {
    if (isTouchPortrait.value) {
        return currentView.value === 'levels' ? sortedCustomLevels.value : allRecordings.value;
    }
    return pagedItems.value;
});

const levelEditorConfig = useSessionStorage('level-editor-config', {
    loadFromLevelView: false,
});
const levelViewConfig = useSessionStorage('level-view-config', {});

const focusedIndex = ref(-1);

watch([currentView, pagedItems], () => {
    focusedIndex.value = -1;
});

useHotkeyBindings('custom-selection', {
    'custom-selection.toggle-mode': ({ event }) => {
        event.preventDefault();
        const idx = options.indexOf(currentView.value);
        const nextIdx = (idx + 1) % options.length;
        currentView.value = options[nextIdx];
    },
    'custom-selection.new-level': ({ event }) => {
        event.preventDefault();
        createItem();
    },
    'custom-selection.previous-level': ({ event }) => {
        event.preventDefault();
        if (focusedIndex.value > 0) {
            focusedIndex.value--;
        } else if (sliceWindow.value.begin > 0) {
            prevWindow();
            setTimeout(() => {
                focusedIndex.value = pagedItems.value.length - 1;
            }, 0);
        }
    },
    'custom-selection.next-level': ({ event }) => {
        event.preventDefault();
        if (focusedIndex.value < pagedItems.value.length - 1) {
            focusedIndex.value++;
        } else if (sliceWindow.value.end < total.value) {
            nextWindow();
            setTimeout(() => {
                focusedIndex.value = 0;
            }, 0);
        } else if (focusedIndex.value === -1 && pagedItems.value.length > 0) {
            focusedIndex.value = 0;
        }
    },
    'custom-selection.previous-page': ({ event }) => {
        event.preventDefault();
        prevWindow();
        focusedIndex.value = -1;
    },
    'custom-selection.next-page': ({ event }) => {
        event.preventDefault();
        nextWindow();
        focusedIndex.value = -1;
    },
    'custom-selection.deselect': ({ event }) => {
        event.preventDefault();
        focusedIndex.value = -1;
    },
    'custom-selection.edit-level': ({ event }) => {
        event.preventDefault();
        if (focusedIndex.value === -1) return;
        const item = pagedItems.value[focusedIndex.value];
        if (currentView.value === 'levels') {
            editLevel(item.id);
        } else {
            playRecording(item);
        }
    },
    'custom-selection.play': ({ event }) => {
        event.preventDefault();
        if (focusedIndex.value === -1) return;
        const item = pagedItems.value[focusedIndex.value];
        if (currentView.value === 'levels') {
            playLevel(item.id);
        } else {
            playRecording(item);
        }
    },
    'custom-selection.delete': ({ event }) => {
        event.preventDefault();
        if (focusedIndex.value === -1) return;
        const item = pagedItems.value[focusedIndex.value];
        if (currentView.value === 'levels') {
            deleteLevel(item.id);
        } else {
            deleteRecording(item);
        }
    },
});

useBackHandler(() => {
    router.push('/album');
    return true;
});

const adjustWindowBounds = () => {
    if (sliceWindow.value.begin >= total.value) {
        sliceWindow.value.begin = Math.max(0, total.value - pageSize.value);
        sliceWindow.value.end = sliceWindow.value.begin + pageSize.value;
    } else {
        sliceWindow.value.end = sliceWindow.value.begin + pageSize.value;
    }
};

watch([total, currentView], () => {
    sliceWindow.value.begin = 0;
    sliceWindow.value.end = pageSize.value;
    if (currentView.value === 'recordings') {
        isCreateIconVisible.value = false;
    }
});

const nextWindow = () => {
    if (isTouchPortrait.value) return;
    if (sliceWindow.value.end >= total.value) { return; }
    sliceWindow.value.begin += pageSize.value;
    sliceWindow.value.end += pageSize.value;
};

const prevWindow = () => {
    if (isTouchPortrait.value) return;
    if (sliceWindow.value.begin <= 0) { return; }
    sliceWindow.value.begin -= pageSize.value;
    sliceWindow.value.end -= pageSize.value;
};

watch(pageSize, () => {
    if (isTouchPortrait.value) return;
    sliceWindow.value.end = sliceWindow.value.begin + pageSize.value;
    adjustWindowBounds();
}, { immediate: false });

const showNamePrompt = ref(false);
const pendingAction = ref(null);
const nameInput = ref('');

const needsUsername = computed(() => {
    const username = account.value.profile.username?.trim();
    return !username || username === 'Player';
});

const openNamePrompt = (action) => {
    pendingAction.value = action;
    nameInput.value = '';
    showNamePrompt.value = true;
};

const closeNamePrompt = () => {
    showNamePrompt.value = false;
    pendingAction.value = null;
};

const confirmNamePrompt = () => {
    const trimmed = nameInput.value.trim();
    if (!trimmed) {
        message.warning('Please enter a name');
        return false;
    }
    renameAccount(trimmed);
    const action = pendingAction.value;
    closeNamePrompt();
    action?.();
    return true;
};

const requireUsername = (action) => {
    if (needsUsername.value) {
        openNamePrompt(action);
        return;
    }
    action();
};

const createCustomLevel = () => {
    requireUsername(() => {
        const uuid = uuidV4Generator();
        levelEditorConfig.value = { loadFromLevelView: false };
        router.push(`/custom/edit/${uuid}`);
    });
};

const createItem = () => {
    if (currentView.value === 'levels') createCustomLevel();
};

const editLevel = (uuid) => {
    levelEditorConfig.value = { loadFromLevelView: false };
    router.push(`/custom/edit/${uuid}`);
};

const playLevel = (uuid) => {
    levelViewConfig.value = {
        context: 'custom',
        customLevelId: uuid,
    };
    router.push(`/custom/play/${uuid}`);
};

const deleteLevel = (uuid) => {
    dialog.warning({
        title: 'Delete Level',
        content: 'Are you sure you want to delete this level? This action cannot be undone.',
        positiveText: 'Delete',
        negativeText: 'Cancel',
        onPositiveClick: () => {
            removeCustomLevel(uuid);
            message.success('Level deleted');
        }
    });
};

const deleteRecording = (rec) => {
    dialog.warning({
        title: 'Delete Recording',
        content: 'Are you sure you want to delete this recording?',
        positiveText: 'Delete',
        negativeText: 'Cancel',
        onPositiveClick: () => {
            removeRecordingForLevel(rec.levelId, rec.id);
            message.success('Recording deleted');
        }
    });
};

const playRecording = (rec) => {
    router.push({
        path: `/playback/${rec.levelId}`,
        query: { recordingId: rec.id }
    });
};
</script>

<template>
    <div class="wrapper" :class="{ 'wrapper--touch-portrait': isTouchPortrait }">
        <div class="overlay" :class="{ active: headerHover }"></div>
        <n-flex align="center" class="header-container">
            <h1 class="a-fade-in title-text">
                <template v-if="!isTouchDevice">
                    My 
                    <span class="view-selector" @mouseenter="headerHover = true" @mouseleave="headerHover = false" @wheel="handleWheel"
                        data-hotkey-target="custom-selection.toggle-mode"
                        data-hotkey-label="Toggle Mode"
                        data-hotkey-element-position="below"
                    >
                        <span class="current-text" :class="{ hidden: headerHover }">
                            {{ currentView.charAt(0).toUpperCase() + currentView.slice(1) }}
                        </span>
                        <div class="view-menu" v-show="headerHover">
                            <div class="view-list" :style="{ transform: `translateY(calc(-${options.indexOf(pendingView)} * 1.5em))` }">
                                <div 
                                    v-for="opt in options" 
                                    :key="opt" 
                                    class="view-option" 
                                    :class="{ selected: opt === pendingView }"
                                    @click="selectOption(opt)"
                                >
                                    {{ opt.charAt(0).toUpperCase() + opt.slice(1) }}
                                </div>
                            </div>
                        </div>
                    </span>
                </template>
                <template v-else>
                    <div class="touch-tabs">
                        <n-button
                            class="touch-tab"
                            :type="currentView === 'levels' ? 'primary' : 'default'"
                            @click="setCurrentView('levels')"
                        >
                            My Levels
                        </n-button>
                        <n-button
                            class="touch-tab"
                            :type="currentView === 'recordings' ? 'primary' : 'default'"
                            @click="setCurrentView('recordings')"
                        >
                            My Recordings
                        </n-button>
                    </div>
                </template>
            </h1>
            <div class="gap-5" />
            <IonButton v-if="currentView !== 'recordings'" name="add-circle-outline" class="a-fade-in create-icon" :class="{'create-icon-hide': headerHover, 'a-fade-in--visible': isCreateIconVisible}" size="2.2rem"
                @click="createItem"
                @animationend="isCreateIconVisible = true"
                data-hotkey-target="custom-selection.new-level"
                data-hotkey-label="New Level"
                data-hotkey-element-position="right"
            ></IonButton>
        </n-flex>
        <div class="level-container">
            <div class="level-annotation-container">
                <div
                    class="hotkey-annotation"
                    data-hotkey-target="custom-selection.previous-level"
                    data-hotkey-label="Previous"
                    data-hotkey-label-position="below"
                ></div>
                <div
                    class="hotkey-annotation"
                    data-hotkey-target="custom-selection.play"
                    :data-hotkey-label="'Enter ' + (currentView === 'levels' ? 'Level' : 'Recording')"
                    data-hotkey-label-position="below"
                ></div>
                <div
                    class="hotkey-annotation"
                    data-hotkey-target="custom-selection.next-level"
                    data-hotkey-label="Next"
                    data-hotkey-label-position="below"
                ></div>
            </div>
            <template v-if="currentView === 'levels'">
                <level-card v-for="(level, index) in visibleItems" :name="level.level.meta.name" :uuid="level.id"
                    :best-moves="level.bestMoves" :updated-at="level.updatedAt" :key="level.id"
                    :published="level.level.meta.published"
                    class="a-fade-in"
                    :class="{ [`a-delay-${index + 1}`]: true, focused: index === focusedIndex }"
                    @edit="editLevel"
                    @play="playLevel"
                    @delete="deleteLevel"
                ></level-card>
            </template>
            <template v-else-if="currentView === 'recordings'">
                <div v-for="(rec, index) in visibleItems" :key="rec.id" class="recording-card a-fade-in" :class="{ [`a-delay-${index + 1}`]: true, focused: index === focusedIndex }">
                    <div class="rec-info">
                        <span class="rec-level">{{ rec.levelName || rec.levelId }}<span class="rec-steps">Steps: {{ rec.steps }}</span></span>
                        <span class="rec-date">{{ new Date(rec.recordedAt).toLocaleString() }}</span>
                    </div>
                    <div class="rec-actions">
                        <ion-icon name="play-circle-outline" @click="playRecording(rec)"></ion-icon>
                        <ion-icon name="trash-outline" @click="deleteRecording(rec)"></ion-icon>
                    </div>
                </div>
            </template>

            <p v-if="total === 0" class="a-fade-in a-delay-5">
                You don't have any {{ currentView }} yet. 
                <span v-if="currentView !== 'recordings'">Click on the <span class="u-green">add</span> button to start building.</span>
            </p>
        </div>
    </div>
    <ion-icon v-if="!isTouchPortrait" name="chevron-back-outline" class="control-btn control-btn__backward a-fade-in" @click="prevWindow"
        :class="{ disabled: sliceWindow.begin <= 0 }"
        data-hotkey-target="custom-selection.previous-page"
        data-hotkey-label="Previous Page"
    ></ion-icon>
    <ion-icon v-if="!isTouchPortrait" name="chevron-forward-outline" class="control-btn control-btn__forward a-fade-in" @click="nextWindow"
        :class="{ disabled: sliceWindow.end >= total }"
        data-hotkey-target="custom-selection.next-page"
        data-hotkey-label="Next Page"
    ></ion-icon>
    <n-modal v-model:show="showNamePrompt" preset="dialog" title="What should we call you?" positive-text="Continue"
        data-hotkey-popup="true"
        negative-text="Cancel" @positive-click="confirmNamePrompt" @negative-click="closeNamePrompt">
        <p>Pick a name so we can sign your custom levels.</p>
        <n-input class="u-mt-2" v-model:value="nameInput" placeholder="Enter a display name" maxlength="32"
            autofocus />
    </n-modal>
</template>

<style lang="scss" scoped>
.wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    position: relative;

    & * h1 {
        transition: transform 0.5s ease;
    }

    .level-container {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;
        width: 100%;

        .level-annotation-container {
            position: absolute;
            display: flex;
            top: 30%;
            width: 60%;
            height: 2px;

            .hotkey-annotation {
                flex: 1;
                height: 100%;
            }
        }

        p {
            font-weight: 400;
            letter-spacing: .25pt;
        }
    }
}

.wrapper--touch-portrait {
    width: 94vw;

    .level-container {
        max-height: 72vh;
        overflow-y: auto;
        padding-bottom: 1rem;
        -webkit-overflow-scrolling: touch;
    }
}

.focused {
    transform: scale(1.02);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    border: 1px solid var(--n-primary);
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 10;

    &.active {
        opacity: 1;
    }
}

.header-container {
    position: relative;
    z-index: 20;
}

.view-selector {
    position: relative;
    cursor: pointer;
    display: inline-block;
    height: 1.5em;
    line-height: 1.5em;
    overflow: visible;
    
    .current-text {
        display: inline-block;
        transition: opacity 0.2s;
        &.hidden {
            opacity: 0;
        }
    }

    .view-menu {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 1.5em;
        overflow: visible;
        
        .view-list {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            
            .view-option {
                height: 1.5em;
                line-height: 1.5em;
                white-space: nowrap;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.3s, transform 0.3s;
                transform: scale(0.9);
                transform-origin: left center;
                
                &.selected {
                    transform: scale(1);
                }
                
                &:hover {
                    opacity: 1;
                }
            }
        }
    }
}

.touch-tabs {
    display: flex;
    gap: 0.6rem;
    align-items: center;
}

.touch-tab {
    font-size: 1rem;
}

.create-icon {
    transition: all 0.3s ease !important;
    visibility: visible;

    &.create-icon-hide {
        opacity: 0 !important;
    }
}

.recording-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 40vw;
    max-width: 600px;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    transition: background 0.1s;
    
    .rec-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.2rem;
        
        .rec-date {
            font-size: 0.7rem;
            color: #aaa;
        }
        .rec-level {
            font-weight: bold;
            .rec-steps {
                margin-left: 1rem;
                font-weight: normal;
                color: #ccc;
            }
        }
    }
    
    .rec-actions {
        display: flex;
        gap: 1rem;
        font-size: 1.5rem;

        ion-icon {
            cursor: pointer;
            transition: color 0.2s, transform 0.2s;

            &:hover {
                transform: scale(1.1);
            }

            &[name="play-circle-outline"]:hover {
                color: $n-primary;
            }

            &[name="trash-outline"]:hover {
                color: #ff4d4f;
            }
        }
    }
}

html.device--touch.device--orientation-portrait .recording-card {
    width: 75vw;
}

.control-btn {
    position: absolute;
    font-size: 3.2rem;
    top: 50%;
    transform: translateY(-50%);
    visibility: visible;

    transform-origin: center;

    &.disabled {
        cursor: not-allowed;
        transform: translateY(-20%);
        opacity: 0.5 !important;
    }

    &.control-btn__backward {
        left: 16.2vw;
    }

    &.control-btn__forward {
        right: 16.2vw;
    }

    transition: all 0.3s;

    &:not(.disabled):hover {
        transform: translateY(-50%) scale(1.1);
        color: $n-primary;
    }
}
</style>
