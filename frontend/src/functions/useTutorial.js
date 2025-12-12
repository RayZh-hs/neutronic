const tutorialContext = {
    // The context acts like a singleton, relaying data from the level view to the tutorial handler.
    currentLevelTutorialState: ref('none'),
    tutorialStageId: ref('none:none'),
    isStartingAnimation: ref(true),
    userSelection: ref(null),
    steps: ref(0),
    particleCount: ref(0),
    hasWon: ref(false),
}

export const useTutorial = () => {
    const tutorialState = (uuid) => {
        switch(uuid) {
            case '2451607c-4c1a-4cee-a509-79d2fd89af88':
                return 'simple';
            case '2ca1b223-6c3e-46ca-adf3-795847b9e521':
                return 'advanced';
            default:
                return 'none';
        }
    }
    return {
        tutorialState, tutorialContext,
    }
}