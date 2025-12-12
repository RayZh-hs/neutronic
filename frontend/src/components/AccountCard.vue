<script setup>
import { useFileDialog, useWindowSize } from '@vueuse/core';
import {
    useAccountStore,
    renameAccount,
    getAccountExportPayload,
    markAccountSaved,
    importAccountFromString,
    hasAnyStoredProgress,
    hasUnsavedChanges,
    resetAccount,
} from '@/functions/useAccount';
import { downloadString } from '@/functions/downloadUtils';

const account = useAccountStore();
const message = useMessage();
const dialog = useDialog();
const editableName = ref(account.value.profile.username);
const windowSize = useWindowSize();

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

const handleResetAccount = () => {
    dialog.warning({
        title: 'Reset Account',
        content: 'Are you sure you want to reset all account data? This action cannot be undone and will permanently delete all your progress, custom levels, and settings.',
        positiveText: 'Reset',
        negativeText: 'Cancel',
        onPositiveClick: () => {
            resetAccount();
            message.success('Account has been reset');
        },
    });
};
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
            <span class="status-pill" :class="{ 'status-pill--saved': account.profile.saved }">
                {{ account.profile.saved ? 'SAVED' : 'UNSAVED' }}
            </span>
            <small v-if="account.profile.lastExportedAt && windowSize.width.value > 1300" class="status-meta">
                Last export {{ new Date(account.profile.lastExportedAt).toLocaleString() }}
            </small>
        </div>
        <p class="extra-info">
            Your progress and custom levels live in this browser. Export to back up or share, import to restore.
        </p>
        <div class="user-actions-container">
            <n-button class="user-action-button" @click="handleExport">
                <template #default>Export</template>
                <template #icon>
                    <ion-icon name="download-outline"></ion-icon>
                </template>
            </n-button>
            <n-button class="user-action-button" @click="startImport">
                <template #default>Import</template>
                <template #icon>
                    <ion-icon name="folder-open-outline"></ion-icon>
                </template>
            </n-button>
        </div>
            <n-button class="user-action-button" type="error" outline @click="handleResetAccount">
                <template #default>Reset Account</template>
                <template #icon>
                    <ion-icon name="trash-outline"></ion-icon>
                </template>
            </n-button>
    </div>
</template>

<style lang="scss" scoped>
.account-card {
    width: calc($account-card-width + 7.5rem);
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
    font-size: 0.6rem;
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
    flex-direction: row;
    justify-content: space-between;
}

.user-action-button {
    flex: 1;
    margin-right: 0.5rem;

    &:last-child {
        margin-right: 0;
    }
}

.account-footnote {
    margin: 0.3rem 0 0;
    font-size: 0.7rem;
    color: $footnote-color;
    max-width: calc($account-card-width + 6rem);
}
</style>
