<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const username = ref('');
const password = ref('');

const login = () => {
    router.push('/album');
};
</script>

<template>
    <div class="user-login">
        <h1>User Login</h1>
            <div>
                <label for="username">Username:</label>
                <input type="text" id="username" v-model="username" required>
            </div>
            <div>
                <label for="password">Password:</label>
                <input type="text" id="password" v-model="password" required>
            </div>
            <n-button type="submit" @click="login">Login</n-button>
    </div>
</template>

<style scoped>
.user-login {
    max-width: 400px;
    margin: 0 auto;
    padding: 1em;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.user-login h1 {
    text-align: center;
}

.user-login form {
    display: flex;
    flex-direction: column;
}

.user-login div {
    margin-bottom: 1em;
}

.user-login label {
    margin-bottom: 0.5em;
    font-weight: bold;
}

.user-login input {
    padding: 0.5em;
    font-size: 1em;
}

.user-login button {
    padding: 0.5em;
    font-size: 1em;
    cursor: pointer;
}
</style>