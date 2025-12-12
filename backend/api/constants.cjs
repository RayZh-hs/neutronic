const SERVER_LISTEN_PORT = process.env.PORT || 9721;
const reservedUsernames = [
    "Neutronic",
    "Admin",
    "Administrator",
]
const levelTypeEnum = {
    PREMADE: 0,
    PUBLIC: 1,
    PRERELEASE: 2,
    PRIVATE: 3,
}

module.exports = {
    SERVER_LISTEN_PORT,
    reservedUsernames,
    levelTypeEnum,
};