<script setup>

import { onBeforeMount, onMounted, ref } from 'vue';
import { useCookies } from '@vueuse/integrations/useCookies';

const cookies = useCookies(['neutronic-account-auth']);
const accountInfo = ref(null);

onMounted(() => {
    // This should be refreshed every time the card is mounted (ie. shown)
    accountInfo.value = cookies.get('neutronic-account-auth');
    console.log(accountInfo.value)
})

</script>

<template>
    <div class="account-card" v-if="accountInfo">
        <div class="user-info-container">
            <ion-icon class="user-info__icon" name="location-outline" v-if="accountInfo.type === 'local'"></ion-icon>
            <ion-icon class="user-info__icon" name="person-outline"  v-else></ion-icon>

            <h2 class="user-info-username">{{ accountInfo.type === 'local' ? 'Visitor' : accountInfo.username }}</h2>
        </div>
        <span class="extra-info" v-if="accountInfo.type === 'local'">
            Sign up to sync your progress and create custom levels!
        </span>
        <div class="user-actions-container">
            <!-- If the user is a visitor -->
            <a v-if="accountInfo.type === 'local'">Click to sign up</a>
            <a v-if="accountInfo.type === 'local'">Click to sign in</a>
            <!-- If the user has an account -->
            <a v-if="accountInfo.type === 'regular'">Click to switch account</a>
            <a v-if="accountInfo.type === 'regular'">Click to sign out</a>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.account-card {
    width: $account-card-width;
    background-color: $account-card-background-color;

    padding: 1rem;
    display: flex;
    flex-direction: column;

    .user-info-container {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 1.5rem;

        .user-info__icon {
            font-size: 1.5rem;
        }

        .user-info-username {
            display: inline-block;
            font-weight: 400;
            margin: 0;
        }

        margin-bottom: 1.5rem;
    }

    .extra-info {
        font-size: 0.8rem;
        margin-bottom: 1rem;
    }

    .user-actions-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        a {
            margin-left: 0.5rem;
            text-decoration: underline;
            cursor: pointer;
            transition: color 0.2s;

            &:hover {
                color: $n-primary;
            }
        }
    }
}
</style>