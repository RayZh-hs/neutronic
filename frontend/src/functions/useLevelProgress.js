import { getAccountProgress, setAndPushAccountProgress, recordCustomLevelResult, isAccessibleToPrebuiltLevel, hasFinishedAlbum } from '@/functions/useAccount';
import { album } from '@/functions/useAlbum';

export function useLevelProgress({
    gameState,
    hasWon,
    stepsCounter,
    stepsGoal,
    levelId,
    albumIndex,
    levelViewConfig,
    currentBest,
    triggerEndingAnimation,
    handleRecordingCompletion,
    ensureContext
}) {
    const getGameRank = () => {
        return stepsCounter.value <= stepsGoal.value ? 'Perfect' : 'Pass';
    }

    const accountInsertHasWon = () => {
        const context = ensureContext();
        if (context === 'custom' || context === 'editor') {
            recordCustomLevelResult(levelId, {
                bestMoves: stepsCounter.value,
                rank: getGameRank(),
            });
            return;
        }
        if (context !== 'album' || albumIndex === null || Number.isNaN(albumIndex)) {
            return;
        }
        let hasPerfected = false;
        const account = getAccountProgress();
        const rank = getGameRank();
        if (rank === 'Perfect' && !account.perfected.includes(levelId)) {
            account.perfected.push(levelId);
            account.lookup[levelViewConfig.value.albumName].perfected += 1;
            if (account.passed.includes(levelId)) {
                account.passed = account.passed.filter(item => item !== levelId);
                account.lookup[levelViewConfig.value.albumName].passed -= 1;
            }
        }
        else if (rank === 'Pass' && !account.passed.includes(levelId) && !account.perfected.includes(levelId)) {
            account.passed.push(levelId);
            account.lookup[levelViewConfig.value.albumName].passed += 1;
        }
        else {
            hasPerfected = true;
        }
        if (hasFinishedAlbum(albumIndex)) {
            if (albumIndex < album.value.length - 1 && !account.lookup[album.value[albumIndex + 1].meta.name]) {
                account.lookup[album.value[albumIndex + 1].meta.name] = {
                    perfected: 0,
                    passed: 0
                }
            }
        }
        if (!hasPerfected) {
            setAndPushAccountProgress(account);
        }
    }

    const updateHasWon = () => {
        console.log("particles: ", gameState.value.particles.length);
        if (gameState.value.particles.length === 0) {
            hasWon.value = true;
            const context = ensureContext();
            if (context === 'album' && isAccessibleToPrebuiltLevel(levelId)) {
                accountInsertHasWon();
            }
            else if (context === 'custom' || context === 'editor') {
                accountInsertHasWon();
            }
            currentBest.value = currentBest.value == null
                ? stepsCounter.value
                : Math.min(currentBest.value, stepsCounter.value);
            triggerEndingAnimation();
            handleRecordingCompletion();
        }
    }

    return {
        getGameRank,
        updateHasWon
    };
}
