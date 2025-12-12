import { useAccountStore } from './useAccount';

export const useSettings = () => {
    const account = useAccountStore();
    return computed({
        get: () => account.value.settings,
        set: (val) => {
            account.value.settings = val;
        }
    });
};
