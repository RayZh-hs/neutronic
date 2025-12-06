<script setup>
import { computed } from 'vue';
import IonButton from "@/components/IonButton.vue";

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    uuid: {
        type: String,
        required: true,
    },
    bestMoves: {
        type: Number,
        default: null,
    },
    updatedAt: {
        type: String,
        default: null,
    }
});

const emit = defineEmits(['edit', 'play']);

const subtitle = computed(() => {
    if (props.bestMoves === null || props.bestMoves === undefined) {
        return 'Not cleared yet';
    }
    return `Best: ${props.bestMoves} steps`;
});

const updatedLabel = computed(() => {
    if (!props.updatedAt) {
        return 'Never saved';
    }
    return new Date(props.updatedAt).toLocaleDateString();
});

const handleEdit = () => emit('edit', props.uuid);
const handlePlay = () => emit('play', props.uuid);
</script>

<template>
    <div class="main-container">
        <div class="level-info">
            <h2 class="level-name">{{ name }}</h2>
            <p class="level-meta">
                <span>{{ subtitle }}</span>
                <span>Updated {{ updatedLabel }}</span>
            </p>
        </div>
        <div class="button-group">
            <IonButton name="create-outline" class="btn btn-edit" @click="handleEdit"></IonButton>
            <IonButton name="play-outline" class="btn btn-play" @click="handlePlay"></IonButton>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.main-container {
    width: max(100%, 30rem);
    min-height: 4.5rem;
    background: linear-gradient(45deg, #25252589, #1a1919c0);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    animation: all 0.3s ease-in-out;

    &:hover {
        outline: 1px solid rgba(245, 245, 245, 0.229);
        background: linear-gradient(45deg, #25252589, #1a1919c0);
    }
}

.level-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.level-name {
    font-size: 1.4rem;
    font-weight: 300;
    margin: 0;
}

.level-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: $footnote-color;
    margin: 0;
    flex-wrap: wrap;
}

.button-group {
    display: flex;
    gap: 1rem;

    .btn {
        width: 1.5rem;
        color: #f0f0f0;
    }
}
</style>
