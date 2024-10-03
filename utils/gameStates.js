
const gameStates = new Map();

function createGameState(lobbyId) {
    const state = {
        isActive: true,
        scores: { team1: 0, team2: 0 },
        currentQuestion: null,
        blacklist: new Set(),
        kickVotes: {},
        roundsThreshold: 0
    };
    gameStates.set(lobbyId, state);
    return state;
}

function getGameState(lobbyId) {
    return gameStates.get(lobbyId);
}

function deleteGameState(lobbyId) {
    gameStates.delete(lobbyId);
}

function isGameActive(lobbyId) {
    const state = getGameState(lobbyId);
    return state ? state.isActive : false;
}

function setGameInactive(lobbyId) {
    const state = getGameState(lobbyId);
    if (state) {
        state.isActive = false;
    }
}

module.exports = {
    createGameState,
    getGameState,
    deleteGameState,
    isGameActive,
    setGameInactive
};