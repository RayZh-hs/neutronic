import { watch } from 'vue';
import { SERVER_URL } from "@/data/constants";
import { useAxiosWithStore } from "@/functions/useAxiosWithStore";
import { getAccountProgress, setAndPushAccountProgress } from "@/functions/useAccount";

export const {
    data: album,
    isFinished: isAlbumLoaded,
    error: albumError,
} = useAxiosWithStore('neutronic-album', `${SERVER_URL}/albums`, 'GET', undefined, {
    validate: Array.isArray,
});

// Background job to repair corrupted album lookup counts
export const repairAccountLookupCounts = () => {
    console.log('Repairing album lookup counts...');
    if (!isAlbumLoaded.value || !album.value || !Array.isArray(album.value)) {
        return;
    }

    const accountProgress = getAccountProgress();
    const newLookup = {};

    // Iterate through all albums and recalculate passed/perfected counts
    var hasFinishedLastAlbum = true
    album.value.forEach((currentAlbum) => {
        const albumName = currentAlbum.meta.name;
        let passedCount = 0;
        let perfectCount = 0;

        // Count passes and perfects from the ground truth lists
        if (Array.isArray(currentAlbum.content)) {
            currentAlbum.content.forEach((levelItem) => {
                const levelId = levelItem.levelId;
                if (accountProgress.perfected.includes(levelId)) {
                    perfectCount++;
                } else if (accountProgress.passed.includes(levelId)) {
                    passedCount++;
                }
            });
        }

        if (hasFinishedLastAlbum) {
            newLookup[albumName] = {
                passed: passedCount,
                perfected: perfectCount,
            };
            hasFinishedLastAlbum = (passedCount + perfectCount) >= currentAlbum.content.length;
        } else {
            // Clear the counts if the previous album wasn't finished
            newLookup[albumName] = undefined;
        }
    });

    // Update account progress with recalculated lookup table
    const updatedProgress = {
        ...accountProgress,
        lookup: newLookup,
    };
    setAndPushAccountProgress(updatedProgress);
};
