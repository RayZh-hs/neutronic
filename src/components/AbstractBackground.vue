<script setup></script>

<template>
    <div class="bg bg-lay-1" />
    <div class="bg bg-lay-2" />
    <div class="bg bg-lay-3" />
</template>

<style lang="scss">
.bg {
    position: absolute;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    mix-blend-mode: screen;

    &.bg-lay- {
        &1 {
            background-image: url(@/assets/dotgrid/JS-dotGrid-0.png);
            background-size: 50rem;
            opacity: 30%;
            animation: scroll-bg-1 40s linear infinite; /* Added animation */
        }
        &2 {
            background-image: url(@/assets/dotgrid/JS-dotGrid-1.png);
            background-size: 40rem;
            opacity: 20%;
            animation: scroll-bg-2 60s linear infinite; /* Added animation */
        }
        &3 {
            background-image: url(@/assets/dotgrid/JS-dotGrid-2.png);
            background-size: 40rem;
            opacity: 20%;
            animation: scroll-bg-3 80s linear infinite; /* Added animation */
        }
    }
}

@keyframes scroll-bg-1 {
    from {
        background-position-x: -100%;
    }
    to {
        background-position-x: 100%;
    }
}

@keyframes scroll-bg-2 {
    from {
        background-position-x: -100%;
    }
    to {
        background-position-x: 100%;
    }
}

@keyframes scroll-bg-3 {
    from {
        background-position-x: -100%;
    }
    to {
        background-position-x: 100%;
    }
}
</style>