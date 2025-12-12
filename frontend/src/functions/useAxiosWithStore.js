import { useStorage } from "@vueuse/core"
import { useAxios } from "@vueuse/integrations/useAxios"

export const useAxiosWithStore = (
    keyName, url, method = 'GET', storageType = sessionStorage
) => {
    const rawData = useStorage(keyName, '', storageType)
    const data = ref(null)
    const isFinished = computed(() => data.value !== null)

    const hydrateFromCache = () => {
        if (!rawData.value) {
            return false
        }
        data.value = JSON.parse(rawData.value)
        return true
    }

    console.log({ data })

    if (!hydrateFromCache()) {
        const { data: fetchedData, isFinished: fetchedIsFinished } = useAxios(
            url, { method }
        )
        watchEffect(() => {
            if (fetchedIsFinished.value && fetchedData.value) {
                rawData.value = JSON.stringify(fetchedData.value)
                hydrateFromCache()
            }
        })
    }

    return { data, isFinished }
}
