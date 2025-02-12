<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

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
    <div class="user-login-container">
        <h1 class="user-login-title">Choose your login method</h1>
        <div class="user-login-methods-container">
            <div class="user-login-method-button user-login-method-button--regular u-show">
                <h2 class="user-login-method-name">Regular</h2>
                <ion-icon name="cloud-done-outline" class="user-login-method-icon"></ion-icon>
                <p class="user-login-method-description">All your account info will be stored in the cloud so you can log in from any account. You will be able to create and publish custom levels. Recommended choice.</p>
            </div>
            <div class="user-login-method-button user-login-method-button--visitor u-show">
                <h2 class="user-login-method-name">Local</h2>
                <ion-icon name="cloud-offline-outline" class="user-login-method-icon"></ion-icon>
                <p class="user-login-method-description">Your account will be stored in your browser, and is tied to such. You cannot create custom levels, but you can register as a Regular user later. Recommended for those who want to try out the game.</p>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.user-login-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;

    .user-login-title {
        font-size: 2rem;
    }

    .user-login-methods-container {
        display: flex;
        width: $user-login-methods-container-width;
        justify-content: space-between;
        gap: 2rem;

        .user-login-method-button {
            display: flex;
            flex-direction: column;
            width: 50%;
            // min-height: $user-login-methods-button-height;
            padding: 1rem;
            text-wrap: wrap;
            cursor: pointer;

            .user-login-method-name {
                font-family: 'Electrolize', sans-serif;
                font-weight: 100;
                font-size: 1.5rem;
                letter-spacing: 1pt;
            }

            .user-login-method-icon {
                font-size: 8rem;
                align-self: center;
                font-weight: 100;
                --ionicon-stroke-width: 16px;
            }
        }
    }
}
</style>