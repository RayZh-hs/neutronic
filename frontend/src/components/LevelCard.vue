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
    },
    published: {
        type: Boolean,
        default: false,
    }
});

const emit = defineEmits(['edit', 'play', 'delete']);

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

const displayName = computed(() => {
    if (props.name.length > 20) {
        return props.name.substring(0, 20) + '...';
    }
    return props.name;
});

const handleEdit = () => emit('edit', props.uuid);
const handlePlay = () => emit('play', props.uuid);
const handleDelete = () => emit('delete', props.uuid);
</script>

<template>
    <div class="main-container">
        <div class="header">
            <h2 class="level-name" :title="name">{{ displayName }}</h2>
            <n-tag type="success" class="tag" v-if="published">Published</n-tag>
            <n-tag type="info" class="tag" v-else>Private</n-tag>
        </div>
        
        <div class="details-wrapper">
            <div class="details-content">
                <div class="level-info">
                    <p class="level-meta">
                        <span>{{ subtitle }}</span>
                        <span>Updated {{ updatedLabel }}</span>
                    </p>
                </div>
                <div class="button-group">
                    <IonButton name="trash-outline" class="btn btn-delete" @click="handleDelete"></IonButton>
                    <IonButton name="create-outline" class="btn btn-edit" @click="handleEdit"></IonButton>
                    <IonButton name="play-outline" class="btn btn-play" @click="handlePlay"></IonButton>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.main-container {
    min-width: 40vw;
    max-width: 600px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    transition: all 0.3s ease-in-out;

    &:hover {
        background: rgba(255, 255, 255, 0.075);
        
        .details-wrapper {
            grid-template-rows: 1fr;
            opacity: 1;
            margin-top: 0.5rem;
        }
    }
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .tag {
        font-size: 0.75rem;
    }
}

.details-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition: all 0.3s ease-in-out;
}

.details-content {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
    text-align: left;
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
    justify-content: flex-end;
    gap: 1rem;
    .btn {
        width: 1.8rem;
    }
}
</style>
