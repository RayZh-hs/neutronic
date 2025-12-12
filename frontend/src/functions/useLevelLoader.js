import { ref } from 'vue';
import axios from 'axios';
import { SERVER_URL } from "@/data/constants"
import { getCustomLevelById } from '@/functions/useAccount';

export function useLevelLoader({
    levelViewConfig,
    levelId,
    isCustomLevelRoute,
    loadLevelFromString,
    fullLevelData
}) {
    const responseCode = ref(0);
    const currentBest = ref(null);

    const loadLevelFromStringWrapper = (levelString) => {
        fullLevelData.value = levelString;
        loadLevelFromString(levelString);
    }

    const ensureContext = () => {
        if (isCustomLevelRoute) {
            if (levelViewConfig.value.context !== 'editor') {
                levelViewConfig.value.context = 'custom';
            }
        }
        else if (!isCustomLevelRoute && levelViewConfig.value.context !== 'editor') {
            levelViewConfig.value.context = 'album';
        }
        return levelViewConfig.value.context;
    };

    const loadLevelConfig = async () => {
        console.log({ levelViewConfig })
        const context = ensureContext();
        console.log("context: ", context)
        if (context === 'editor') {
            loadLevelFromStringWrapper(levelViewConfig.value.levelData);
            responseCode.value = 200;
            return;
        }
        if (context === 'custom') {
            const customLevel = getCustomLevelById(levelId);
            if (!customLevel) {
                responseCode.value = 404;
                console.warn('Custom level not found for id', levelId);
                return;
            }
            levelViewConfig.value.customLevelId = levelId;
            loadLevelFromStringWrapper(customLevel.level);
            currentBest.value = customLevel.bestMoves;
            responseCode.value = 200;
            return;
        }
        console.log(SERVER_URL + '/level?levelId=' + String(levelId));
        await axios
            .get(SERVER_URL + '/level?levelId=' + String(levelId))
            .then((res) => {
                console.log(res);
                responseCode.value = res.status;
                if (res.status == 200) {
                    const levelConfig = res.data;
                    loadLevelFromStringWrapper(levelConfig);
                }
                return res;
            })
            .catch((err) => {
                responseCode.value = err.status;
                console.log(err);
                return err;
            });
    };

    return {
        responseCode,
        currentBest,
        ensureContext,
        loadLevelConfig
    };
}
