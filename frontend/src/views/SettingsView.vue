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
const recordingAction = ref(null);

const getHotkeysByCategory = (category) => {
    return Object.entries(defaultHotkeyMap[category] || {});
};

const getBindingLabel = (actionId) => {
    const bindings = getBindingsForAction(actionId);
    if (!bindings || bindings.length === 0) return 'None';
    return bindings.map(b => formatBindingSequence([b])).join(', ');
};

const startRecording = (actionId) => {
    recordingAction.value = actionId;
    message.info('Press a key combination...');
};

const handleKeyDown = (e) => {
    if (!recordingAction.value) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Allow escape to cancel
    if (e.key === 'Escape') {
        recordingAction.value = null;
        return;
    }

    const chord = hotkeyUtils.normalizeChordFromEvent(e);
    // Don't bind just modifier keys
    if (['ctrl', 'shift', 'alt', 'meta'].includes(chord)) return;

    setHotkeyBindings(recordingAction.value, chord);
    recordingAction.value = null;
    message.success('Hotkey updated');
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
    <div class="settings-view-container">
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
                <!-- General Settings -->
                <div v-if="activeTab === 'general'" class="settings-group">
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
                </div>

                <!-- Account Settings -->
                <div v-if="activeTab === 'account'" class="settings-group">
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
                            <n-button type="error" @click="handleDeleteAccount">Delete Account</n-button>
                        </div>
                    </div>
                </div>

                <!-- Hotkey Settings -->
                <div v-if="activeTab === 'hotkeys'" class="settings-group hotkeys-list">
                    <n-collapse>
                        <n-collapse-item v-for="(actions, category) in defaultHotkeyMap" :key="category" :title="category.charAt(0).toUpperCase() + category.slice(1)" :name="category">
                            <div class="hotkey-grid">
                                <div v-for="([actionId, defaultBindings]) in Object.entries(actions)" :key="actionId" class="hotkey-row">
                                    <span class="hotkey-name">{{ formatActionName(actionId) }}</span>
                                    <div class="hotkey-controls">
                                        <n-button 
                                            size="small" 
                                            :type="recordingAction === actionId ? 'primary' : 'default'"
                                            @click="startRecording(actionId)"
                                        >
                                            {{ recordingAction === actionId ? 'Press keys...' : getBindingLabel(actionId) }}
                                        </n-button>
                                        <n-button size="small" circle @click="resetHotkey(actionId)" title="Reset to default">
                                            <template #icon><ion-icon name="refresh-outline"></ion-icon></template>
                                        </n-button>
                                    </div>
                                </div>
                            </div>
                        </n-collapse-item>
                    </n-collapse>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">

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
        width: min(30%, 15rem);
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
            
            &.active {
                border-left: 3px solid white;
                background-color: rgba(255, 255, 255, 0.1)
            };
        }
        
        .back-button-container {
            margin-top: auto;
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
            height: 5rem;
            flex-shrink: 0;
        }
        
        .settings-content {
            flex: 1;
            overflow-y: auto;
            padding-bottom: 4rem;
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
}

.setting-item {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    // background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 0.5rem;

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
        min-width: 200px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 1rem;
    }
    
    .setting-actions {
        display: flex;
        gap: 1rem;
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
            font-size: 1rem;
        }
        
        .hotkey-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
    }
}
</style>
