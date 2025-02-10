<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NInput, NButton, NMessageProvider, useMessage } from 'naive-ui';

const router = useRouter();
const username = ref('');
const password = ref('');
const errorMessage = ref('');
const emit = defineEmits(['updateCredentials']);
const message = useMessage();

const login = () => {
    if (username.value === '' || password.value === '') {
        errorMessage.value = 'Username and password are required.';
        message.error(errorMessage.value);
        return;
    }
    errorMessage.value = '';
    emit('updateCredentials', { username: username.value, password: password.value });
    router.push('/album');
};
</script>

<template>
    <n-message-provider>
        <div class="user-login">
            <h1>User Login</h1>
            <div>
                <label for="username">Username:</label>
                <n-input type="text" v-model:value="username" required placeholder="Enter your username" />
            </div>
            <div>
                <label for="password">Password:</label>
                <n-input type="password" v-model:value="password" required placeholder="Enter your password" />
            </div>
            <n-button type="primary" @click="login">Login</n-button>
        </div>
    </n-message-provider>
</template>

<style scoped lang="scss">
.user-login {
    max-width: 24rem;
    h1{
        text-align: center;
    }
    div {
        margin-bottom: 1em;
    }
    label {
        margin-bottom: 0.5em;
        font-weight: bold;
    }
}

</style>