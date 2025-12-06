<script setup>
import { ref, watch } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useFileDialog } from '@vueuse/core';
import {
    useAccountStore,
    renameAccount,
    getAccountExportPayload,
    markAccountSaved,
    importAccountFromString,
    hasAnyStoredProgress,
    hasUnsavedChanges,
} from '@/functions/useAccount';
import { downloadString } from '@/functions/downloadUtils';

const account = useAccountStore();
const message = useMessage();
const dialog = useDialog();
const editableName = ref(account.value.profile.username);

watch(
    () => account.value.profile.username,
    (next) => {
        editableName.value = next;
    }
);

const commitRename = () => {
    renameAccount(editableName.value);
    editableName.value = account.value.profile.username;
};

const handleNameKeydown = (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.target.blur();
    }
};

const handleExport = () => {
    const payload = getAccountExportPayload();
    downloadString(payload, 'application/json', `neutronic-account-${Date.now()}.json`);
    markAccountSaved();
    message.success('Account exported');
};

const { open: openImportDialog, onChange } = useFileDialog({
    accept: '.json',
    multiple: false,
});

const startImport = () => {
    if (hasUnsavedChanges() && hasAnyStoredProgress()) {
        dialog.warning({
            title: 'Unsaved progress',
            content: 'Export your current data first if you want to keep it, or override to continue importing.',
            positiveText: 'Override',
            negativeText: 'Export first',
            onPositiveClick: () => {
                openImportDialog();
            },
            onNegativeClick: () => {
                handleExport();
            },
        });
        return;
    }
    openImportDialog();
};

onChange(async (files) => {
    const file = files?.[0];
    if (!file) { return; }
    try {
        const content = await file.text();
        importAccountFromString(content);
        message.success('Account imported');
    }
    catch (error) {
        console.error(error);
        message.error('Failed to import account file');
    }
});
</script>

<template>
    <div class="account-card">
        <div class="user-info-container">
            <ion-icon class="user-info__icon" name="person-outline"></ion-icon>
            <div class="user-info-details">
                <label class="user-info-label" for="account-name-input">Local username</label>
                <input id="account-name-input" v-model="editableName" class="user-info-input" maxlength="32"
                    @blur="commitRename" @keydown="handleNameKeydown" />
            </div>
        </div>
        <div class="account-status-row">
            <span class="status-pill" :class="{ 'status-pill--saved': account.value.profile.saved }">
                {{ account.value.profile.saved ? 'SAVED' : 'UNSAVED' }}
            </span>
            <small v-if="account.value.profile.lastExportedAt" class="status-meta">
                Last export {{ new Date(account.value.profile.lastExportedAt).toLocaleString() }}
            </small>
        </div>
        <p class="extra-info">
            Your progress and custom levels live in this browser. Export to back up or share, import to restore.
        </p>
        <div class="user-actions-container">
            <button class="card-button" type="button" @click="handleExport">Export account (.json)</button>
            <button class="card-button" type="button" @click="startImport">Import account (.json)</button>
        </div>
    </div>
    <p class="account-footnote">
        File exports are plain JSON so you can inspect or tweak them before sharing.
    </p>
</template>

<style lang="scss" scoped>
.account-card {
    width: calc($account-card-width + 6rem);
    background-color: $account-card-background-color;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.user-info-container {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.user-info__icon {
    font-size: 1.8rem;
}

.user-info-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.user-info-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $footnote-color;
}

.user-info-input {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    color: inherit;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
        border-color: $n-primary;
    }
}

.account-status-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.status-pill {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    border: 1px solid $n-red;
    color: $n-red;

    &--saved {
        border-color: $n-primary;
        color: $n-primary;
    }
}

.status-meta {
    color: $footnote-color;
}

.extra-info {
    font-size: 0.85rem;
    color: $footnote-color;
    margin: 0;
}

.user-actions-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.card-button {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 0.35rem;
    padding: 0.4rem 0.8rem;
    color: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: $n-primary;
        color: $n-primary;
    }
}

.account-footnote {
    margin: 0.3rem 0 0;
    font-size: 0.7rem;
    color: $footnote-color;
    max-width: calc($account-card-width + 6rem);
}
</style>
