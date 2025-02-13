import { useStorage } from "@vueuse/core";
import { useCookies } from "@vueuse/integrations/useCookies";

import defaultPlayerProgress from "@/data/defaultPlayerProgress";
const accountProgress = useStorage("account-progress", defaultPlayerProgress);

const cookies = useCookies(['neutronic-account-auth']);

export const getAccountAuth = () => {
    return cookies.get('neutronic-account-auth');
}

export const getAccountProgress = () => {
    return accountProgress.value;
}

export const setAccountProgress = (newProgress) => {
    if (getAccountAuth().value['type'] === 'regular') {
        // The progress should be uploaded to the server
        pushAccountProgress();
    }
    accountProgress.value = newProgress;
}

export const fetchAccountProgress = async () => {
    console.warn('Not implemented: fetchAccountProgress at useAccount.js');
    console.log('Fetch account progress from server');
    return defaultPlayerProgress;
}

export const pushAccountProgress = async () => {
    console.warn('Not implemented: pushAccountProgress at useAccount.js');
    console.log('Push account progress to server');
}