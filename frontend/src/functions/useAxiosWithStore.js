import { useStorage } from "@vueuse/core"
import { useAxios } from "@vueuse/integrations/useAxios"

export const useAxiosWithStore = (
    keyName,
    url,
    method = 'GET',
    storageType = sessionStorage,
    { validate = (value) => value !== null && value !== undefined, axiosConfig = {} } = {}
) => {
    const rawData = useStorage(keyName, '', storageType)
    const data = ref(null)
    const error = ref(null)
    const isFinished = computed(() => validate(data.value) && !error.value)

    const hydrateFromCache = () => {
        if (!rawData.value) {
            return false
        }
        try {
            const parsed = JSON.parse(rawData.value)
            if (!validate(parsed)) {
                rawData.value = ''
                return false
            }
            data.value = parsed
            return true
        } catch {
            rawData.value = ''
            return false
        }
    }

    console.log("UseAxios got data: ", { data })
    console.log("Axios fetching data from URL: ", { url, method })

    if (!hydrateFromCache()) {
        const {
            data: fetchedData,
            isFinished: fetchedIsFinished,
            error: fetchedError,
            response,
        } = useAxios(
            url,
            {
                ...axiosConfig,
                method,
                responseType: 'json',
                headers: {
                    ...(axiosConfig.headers ?? {}),
                    Accept: 'application/json',
                },
            }
        )
        watchEffect(() => {
            if (!fetchedIsFinished.value) return

            if (fetchedError.value) {
                error.value = fetchedError.value
                return
            }

            if (fetchedData.value && validate(fetchedData.value)) {
                console.log("Axios fetched data: ", { fetchedData })
                rawData.value = JSON.stringify(fetchedData.value)
                hydrateFromCache()
            } else if (response.value) {
                error.value = new Error(
                    `Unexpected response from ${url} (status ${response.value.status})`
                )
            }
        })
    }

    return { data, isFinished, error }
}
