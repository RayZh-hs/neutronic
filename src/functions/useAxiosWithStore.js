import { useStorage } from "@vueuse/core"
import { useAxios } from "@vueuse/integrations/useAxios"
import { ref, computed, watch, watchEffect } from "vue"

export const useAxiosWithStore = (
    keyName, url, method = 'GET', storageType = sessionStorage
) => {
    const rawData = useStorage(keyName, '', storageType)
    const data = ref(null)
    const isFinished = computed(() => data.value !== null)

    console.log({ data })

    if (!rawData.value) {
        const { data: fetchedData, isFinished: fetchedIsFinished } = useAxios(
            url, { method }
        )
        watchEffect(() => {
            if (fetchedIsFinished.value) {
                rawData.value = JSON.stringify(fetchedData.value)
                // console.log("Data fetched", fetchedData.value)
                data.value = JSON.parse(rawData.value)
            }
        })
    }
    else {
        // console.log("Data already exists", rawData.value)
        data.value = JSON.parse(rawData.value)
    }

    return { data, isFinished }
}