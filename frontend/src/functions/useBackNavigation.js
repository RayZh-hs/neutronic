import { onBeforeUnmount, shallowRef } from 'vue';

const handlerStack = shallowRef([]);

export const registerBackHandler = (handler) => {
    if (typeof handler !== 'function') {
        return () => {};
    }
    const token = Symbol('back-handler');
    handlerStack.value = [...handlerStack.value, { token, handler }];
    return () => {
        handlerStack.value = handlerStack.value.filter((entry) => entry.token !== token);
    };
};

export const useBackHandler = (handler) => {
    const unregister = registerBackHandler(handler);
    onBeforeUnmount(unregister);
    return unregister;
};

export const triggerBack = (payload) => {
    const active = handlerStack.value[handlerStack.value.length - 1]?.handler;
    if (typeof active !== 'function') {
        return false;
    }
    return active(payload);
};

