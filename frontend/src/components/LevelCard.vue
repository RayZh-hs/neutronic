<script setup>

import IonButton from "@/components/IonButton.vue";

const props = defineProps({
    name: String,
    uuid: String
})

</script>

<template>
    <div class="main-container">
        <h2 class="level-name">{{ name }}</h2>
        <IonButton name="create-outline" class="btn btn-edit"></IonButton>
        <IonButton name="play-outline"   class="btn btn-play"></IonButton>
    </div>
</template>

<style lang="scss" scoped>
.main-container {
    width: max(100%, 30rem);
    min-height: 4rem;
    outline: 1px solid rgba(245, 245, 245, 0.229);
    background: linear-gradient(45deg, #25252589, #1a1919c0);

    display: flex;
    align-items: center;

    .level-name {
        font-size: 1.6rem;
        font-weight: 200;
        margin: 0 auto;
    }

    .btn {
        margin-right: 1rem;
        &-edit {
            margin-left: 1rem;
            color: #f0f0f0;
        }
    }
}
</style>