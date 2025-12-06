<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStorage } from '@vueuse/core';
import { v4 as uuidV4Generator } from 'uuid';
import { useMessage } from 'naive-ui';
import LevelCard from '@/components/LevelCard.vue';
import IonButton from '@/components/IonButton.vue';
import { customSelectionWindowSize } from '@/data/constants';
import { useAccountStore, renameAccount } from '@/functions/useAccount';

const router = useRouter();
const account = useAccountStore();
const message = useMessage();

const sliceWindow = ref({
    begin: 0,
    end: customSelectionWindowSize,
});

const sortedCustomLevels = computed(() => {
    return [...account.value.customLevels].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
});

const total = computed(() => sortedCustomLevels.value.length);

const pagedLevels = computed(() => {
    return sortedCustomLevels.value.slice(sliceWindow.value.begin, sliceWindow.value.end);
});

const levelEditorConfig = useSessionStorage('level-editor-config', {
    loadFromLevelView: false,
});
const levelViewConfig = useSessionStorage('level-view-config', {});

const adjustWindowBounds = () => {
    if (sliceWindow.value.begin >= total.value) {
        sliceWindow.value.begin = Math.max(0, total.value - customSelectionWindowSize);
        sliceWindow.value.end = sliceWindow.value.begin + customSelectionWindowSize;
    } else {
        sliceWindow.value.end = sliceWindow.value.begin + customSelectionWindowSize;
    }
};

watch(total, adjustWindowBounds);

const nextWindow = () => {
    if (sliceWindow.value.end >= total.value) { return; }
    sliceWindow.value.begin += customSelectionWindowSize;
    sliceWindow.value.end += customSelectionWindowSize;
};

const prevWindow = () => {
    if (sliceWindow.value.begin <= 0) { return; }
    sliceWindow.value.begin -= customSelectionWindowSize;
    sliceWindow.value.end -= customSelectionWindowSize;
};

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
</script>

<template>
    <div class="wrapper">
        <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in"
            @click="router.push('/album')"></ion-icon>
        <n-flex align="baseline">
            <h1 class="a-fade-in">Custom Levels</h1>
            <div class="gap-5" />
            <IonButton name="add-circle-outline" class="a-fade-in" size="2.2rem"
                @click="createCustomLevel"
            ></IonButton>
        </n-flex>
        <div class="level-container">
            <level-card v-for="(level, index) in pagedLevels" :name="level.level.meta.name" :uuid="level.id"
                :best-moves="level.bestMoves" :updated-at="level.updatedAt" :key="level.id"
                class="a-fade-in"
                :class="{ [`a-delay-${index + 1}`]: true }"
                @edit="editLevel"
                @play="playLevel"
            ></level-card>
            <p v-if="total === 0" class="a-fade-in a-delay-5">You don't have any yet. Click on the <span class="u-green">add</span> button to start building.</p>
        </div>
    </div>
    <ion-icon name="chevron-back-outline" class="control-btn control-btn__backward a-fade-in" @click="prevWindow"
        :class="{ disabled: sliceWindow.begin <= 0 }"></ion-icon>
    <ion-icon name="chevron-forward-outline" class="control-btn control-btn__forward a-fade-in" @click="nextWindow"
        :class="{ disabled: sliceWindow.end >= total }"></ion-icon>
    <n-modal v-model:show="showNamePrompt" preset="dialog" title="What should we call you?" positive-text="Continue"
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
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;

        p {
            font-weight: 400;
            letter-spacing: .25pt;
        }
    }
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
