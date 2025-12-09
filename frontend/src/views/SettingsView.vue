<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useSettings } from '@/functions/useSettings';
import { 
    useAccountStore, 
    renameAccount, 
    getAccountProfile, 
    getAccountProgress, 
    setAndPushAccountProgress 
} from '@/functions/useAccount';
import { defaultHotkeyMap } from '@/data/hotkeys';
import { 
    getBindingsForAction, 
    setHotkeyBindings, 
    addHotkeyBinding,
    resetHotkeyBindings, 
    hotkeyUtils,
    formatBindingSequence
} from '@/functions/useHotkeys';
import { useMessage, useDialog } from 'naive-ui';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const settings = useSettings();
const accountStore = useAccountStore();

const activeTab = ref('general');
const settingsTitleFillIn = computed(() => {
    return activeTab.value.charAt(0).toUpperCase() + activeTab.value.slice(1);
});

// --- Account Settings ---
const username = computed({
    get: () => accountStore.value.profile.username,
    set: (val) => renameAccount(val)
});

const fileInput = ref(null);

const handleExport = () => {
    const data = JSON.stringify(accountStore.value, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neutronic-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Account data exported successfully');
};

const triggerImport = () => {
    fileInput.value.click();
};

const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // Basic validation
            if (!data.profile || !data.progress) {
                throw new Error('Invalid account data format');
            }
            
            dialog.warning({
                title: 'Confirm Import',
                content: 'This will overwrite your current progress. Are you sure?',
                positiveText: 'Yes, Overwrite',
                negativeText: 'Cancel',
                onPositiveClick: () => {
                    accountStore.value = data;
                    message.success('Account data imported successfully');
                }
            });
        } catch (err) {
            message.error('Failed to import account data: ' + err.message);
        }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
};

const handleDeleteAccount = () => {
    dialog.error({
        title: 'Delete Account',
        content: 'Are you sure you want to delete your account? This action cannot be undone.',
        positiveText: 'Delete',
        negativeText: 'Cancel',
        onPositiveClick: () => {
            localStorage.removeItem('neutronic-account');
            window.location.reload();
        }
    });
};

// --- Hotkey Settings ---
const recordingState = ref({ actionId: null, mode: null });

const getHotkeysByCategory = (category) => {
    return Object.entries(defaultHotkeyMap[category] || {});
};

const getBindingLabel = (actionId) => {
    const bindings = getBindingsForAction(actionId);
    if (!bindings || bindings.length === 0) return 'None';
    return bindings.map(b => formatBindingSequence(b)).join(', ');
};

const startRecording = (actionId, mode = 'replace') => {
    recordingState.value = { actionId, mode };
    message.info('Press a key combination...');
};

const handleKeyDown = (e) => {
    if (!recordingState.value.actionId) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Allow escape to cancel
    if (e.key === 'Escape') {
        recordingState.value = { actionId: null, mode: null };
        return;
    }

    const chord = hotkeyUtils.normalizeChordFromEvent(e);
    // Don't bind just modifier keys
    if (['ctrl', 'shift', 'alt', 'meta'].includes(chord)) return;

    if (recordingState.value.mode === 'add') {
        addHotkeyBinding(recordingState.value.actionId, chord);
        message.success('Hotkey added');
    } else {
        setHotkeyBindings(recordingState.value.actionId, chord);
        message.success('Hotkey updated');
    }
    recordingState.value = { actionId: null, mode: null };
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown, true);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown, true);
});

const resetHotkey = (actionId) => {
    resetHotkeyBindings(actionId);
    message.success('Hotkey reset to default');
};

const formatActionName = (actionId) => {
    const name = actionId.split('.')[1] || actionId;
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="router.push('/')"
        data-hotkey-target="settings.back"
        data-hotkey-label="Back"
        data-hotkey-element-position="right"
        data-hotkey-label-position="right"
    ></ion-icon>
    <div class="settings-view-container a-fade-in">
        <div class="settings-left-container">
            <n-button text class="settings-section-button" :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">
                <template #icon>
                    <ion-icon name="settings-outline" class="form-button"></ion-icon>
                </template>
                <template #default>
                    General
                </template>
            </n-button>
            <n-button text class="settings-section-button" :class="{ active: activeTab === 'account' }" @click="activeTab = 'account'">
                <template #icon>
                    <ion-icon name="person-outline" class="form-button"></ion-icon>
                </template>
                <template #default>
                    Account
                </template>
            </n-button>
            <n-button text class="settings-section-button" :class="{ active: activeTab === 'hotkeys' }" @click="activeTab = 'hotkeys'">
                <template #icon>
                    <ion-icon name="keypad-outline" class="form-button"></ion-icon>
                </template>
                <template #default>
                    Hotkeys
                </template>
            </n-button>
        </div>
        
        <div class="settings-right-container">
            <h2 class="settings-title">
                <span class="settings-title-filled">
                    {{ settingsTitleFillIn }}
                </span>
                Settings
            </h2>

            <div class="settings-content">
                <Transition name="fade" mode="out-in">
                    <!-- General Settings -->
                    <div v-if="activeTab === 'general'" class="settings-group" key="general">
                        <div class="setting-item">
                            <div class="setting-label">
                                <h3>Disable Background Animations</h3>
                                <p>Turn off the moving background for better performance.</p>
                            </div>
                            <n-switch v-model:value="settings.disableAnimations" />
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <h3>Music Volume</h3>
                                <p>Adjust the background music volume.</p>
                            </div>
                            <div class="setting-control">
                                <!-- <n-slider v-model:value="settings.musicVolume" :step="1" disabled /> -->
                                <span class="coming-soon">(Coming Soon)</span>
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <h3>SFX Volume</h3>
                                <p>Adjust the sound effects volume.</p>
                            </div>
                            <div class="setting-control">
                                <!-- <n-slider v-model:value="settings.sfxVolume" :step="1" disabled /> -->
                                <span class="coming-soon">(Coming Soon)</span>
                            </div>
                        </div>

                        <div style="height: 5rem;" />
                    </div>

                    <!-- Account Settings -->
                    <div v-else-if="activeTab === 'account'" class="settings-group" key="account">
                        <div class="setting-item">
                            <div class="setting-label">
                                <h3>Display Name</h3>
                                <p>How you appear on leaderboards and shared levels.</p>
                            </div>
                            <div class="setting-control">
                                <n-input v-model:value="username" placeholder="Enter username" maxlength="32" />
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <h3>Data Management</h3>
                                <p>Import or export your progress and levels.</p>
                            </div>
                            <div class="setting-actions">
                                <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleImport" />
                                <n-button @click="handleExport">Export Data</n-button>
                                <n-button @click="triggerImport">Import Data</n-button>
                            </div>
                        </div>

                        <div class="setting-item danger-zone">
                            <div class="setting-label">
                                <h3>Danger Zone</h3>
                                <p>Irreversible actions.</p>
                            </div>
                            <div class="setting-actions">
                                <n-button type="error" @click="handleDeleteAccount" class="full-button">
                                    <template #icon><ion-icon name="trash-outline"></ion-icon></template>
                                    Delete Account
                                </n-button>
                            </div>
                        </div>

                        <div style="height: 5rem;" />
                    </div>

                    <!-- Hotkey Settings -->
                    <div v-else-if="activeTab === 'hotkeys'" class="settings-group hotkeys-list" key="hotkeys">
                        <n-collapse class="hotkey-container">
                            <n-collapse-item v-for="(actions, category) in defaultHotkeyMap" :key="category" :title="category.charAt(0).toUpperCase() + category.slice(1)" :name="category" class="hotkey-collapse-item">
                                <div class="hotkey-grid">
                                    <div v-for="([actionId, defaultBindings]) in Object.entries(actions)" :key="actionId" class="hotkey-row">
                                        <span class="hotkey-name"> •&nbsp&nbsp{{ formatActionName(actionId) }}</span>
                                        <div class="hotkey-controls">
                                            <n-button 
                                                size="small" 
                                                :type="recordingState.actionId === actionId && recordingState.mode === 'replace' ? 'primary' : 'default'"
                                                @click="startRecording(actionId, 'replace')"
                                                class="keystroke-record-btn"
                                            >
                                                {{ recordingState.actionId === actionId && recordingState.mode === 'replace' ? 'Press keys...' : getBindingLabel(actionId) }}
                                            </n-button>
                                            <n-button 
                                                size="small" 
                                                @click="startRecording(actionId, 'add')" 
                                                title="Add hotkey"
                                                :type="recordingState.actionId === actionId && recordingState.mode === 'add' ? 'primary' : 'default'"
                                            >
                                                <template #icon><ion-icon name="add-outline"></ion-icon></template>
                                            </n-button>
                                            <n-button size="small" @click="resetHotkey(actionId)" title="Reset to default">
                                                <template #icon><ion-icon name="refresh-outline"></ion-icon></template>
                                            </n-button>
                                            <div style="width: 3rem"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </n-collapse-item>
                        </n-collapse>
                    </div>
                </Transition>
            </div>
        </div>
    </div>
</template>

<style>
.n-collapse-item__header-main {
    font-size: 1.2rem;
}
</style>

<style scoped lang="scss">

/* Stagger Animation Keyframes */
@keyframes slideInStagger {
    from {
        opacity: 0;
        transform: translateX(20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.keystroke-record-btn {
    min-width: 10rem;
}

.form-button {
    min-width: 1.5rem;
    font-size: 2.5rem;
    margin-right: 1rem;
}

.settings-view-container {
    min-width: 80vw;
    height: 80vh;
    display: flex;

    .settings-left-container {
        position: relative;
        top: 30%;
        width: calc(min(30%, 15rem) - 0.6rem);
        margin-right: 0.6rem;
        height: 60%;

        display: flex;
        flex-direction: column;
        justify-content: flex-start;

        .settings-section-button {
            align-self: center;
            justify-content: center;
            font-size: 1rem;
            border-radius: 0;
            width: 100%;
            padding: 1rem;
            // erase hint box
            outline: none !important;
            opacity: 0; /* Start hidden */
            animation: slideInStagger 0.5s ease-out forwards;

            &.active {
                border-left: 3px solid white;
                background-color: rgba(255, 255, 255, 0.1)
            };
        }
        
        .back-button-container {
            margin-top: auto;
        }

        /* Stagger delays for sidebar items */
        > .settings-section-button:nth-child(1) { animation-delay: 0.1s; }
        > .settings-section-button:nth-child(2) { animation-delay: 0.2s; }
        > .settings-section-button:nth-child(3) { animation-delay: 0.3s; }
        
        .back-button-container .settings-section-button {
            animation-delay: 0.4s;
        }
    }

    .settings-right-container {
        width: calc(100% - min(30%, 15rem));
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 0 2rem;
        outline: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 4px;

        h2 {
            font-size: 2.4rem;
            font-weight: 400;
            margin: 1.4rem 0;
            margin-top: 2rem;
            height: 5rem;
            flex-shrink: 0;
        }
        
        .settings-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            margin-bottom: 2rem;
            display: flex;
            
            /* Scrollbar styling */
            &::-webkit-scrollbar {
                width: 8px;
            }
            &::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
            }
            &::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
            }
            &::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }
        }
    }
}

.settings-group {
    display: flex;
    width: 100%;
    margin: auto 0;
    flex-direction: column;

    .setting-item {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        // background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 0.5rem;
        opacity: 0; /* Start hidden */
        animation: slideInStagger 0.5s ease-out forwards;

        &.danger-zone {
            border: 1px solid rgba(255, 0, 0, 0.3);
            background: rgba(255, 0, 0, 0.05);
        }

        .setting-label {
            h3 {
                text-align: left;
                margin: 0 0 0.5rem 0;
                font-size: 1.2rem;
            }
            p {
                margin: 0;
                opacity: 0.7;
                font-size: 0.9rem;
            }
        }
        
        .setting-control {
            min-width: 250px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 1rem;
        }
        
        .setting-actions {
            min-width: 250px;
            display: flex;
            gap: 1rem;

            .full-button {
                width: 100%;
            }
        }

        /* Generate delays for up to 10 items */
        @for $i from 1 through 10 {
            &:nth-child(#{$i}) {
                animation-delay: #{$i * 0.1}s;
            }
        }
    }
}

.coming-soon {
    position: relative;
    right: 0;
    font-size: 0.8rem;
    opacity: 0.5;
    white-space: nowrap;
}

.hotkeys-list {
    .hotkey-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .hotkey-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        
        &:last-child {
            border-bottom: none;
        }
        
        .hotkey-name {
            margin-left: 1rem;
            font-size: 1rem;
        }
        
        .hotkey-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
    }

    /* Target the collapse items which are the direct children of the collapse component's content slot usually, 
       but here we target the n-collapse-item component which renders as a div usually */
    :deep(.n-collapse-item) {
        opacity: 0;
        animation: slideInStagger 0.5s ease-out forwards;
        
        @for $i from 1 through 15 {
            &:nth-child(#{$i}) {
                animation-delay: #{$i * 0.05}s;
            }
        }
    }
}

.hotkey-container {
    margin: 16px;

    .hotkey-collapse-item {
        margin-right: calc(16px + 1.2rem);
    }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

.settings-section-button {
    transition: all 0.3s ease;
}

.settings-section-button:hover:not(.active) {
    background-color: rgba(255, 255, 255, 0.05);
    padding-left: 1.2rem;
}

.settings-section-button.active {
    transition: all 0.3s ease;
    padding-left: 1.5rem;
}

.setting-item {
    transition: all 0.3s ease;
}

.setting-item:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(5px);
}
</style>
