const { SERVER_LISTEN_PORT, levelTypeEnum } = require('./constants.cjs');
const { initDatabases, loadPremadeLevels, getLevel } = require('./database.cjs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const resolveDataPath = (...segments) => path.resolve(__dirname, 'data', ...segments);

const readJsonSync = (...segments) => JSON.parse(
    fs.readFileSync(resolveDataPath(...segments), 'utf8')
);

const getMapFolderByType = (levelType) =>
    levelType === levelTypeEnum.PREMADE ? 'base' : 'extended';

const respondWithJsonFile = async (res, filePath, onSuccessLog) => {
    try {
        const fileContent = await fsp.readFile(filePath, 'utf8');
        res.json(JSON.parse(fileContent));
        if (onSuccessLog) {
            onSuccessLog();
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Init the databases
initDatabases();
loadPremadeLevels();

if (process.env.NODE_ENV === 'production') {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
}

// The main express app
const app = express();
app.use(cors());

//+ Favicon request
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

//+ Album request (GET)
const albums = readJsonSync('albums.json');
app.get('/api/albums', (req, res) => {
    console.log("Albums requested");
    res.json(albums);
});

//+ Level request (GET)
app.get('/api/level', async (req, res) => {
    console.log("Level requested");
    const levelId = req.query.levelId;
    const level = getLevel(levelId);
    if (level == undefined) {
        console.warn('Level is undefined')
        res.status(404).json({ error: "Level not found" });
        return;
    } else if (level.levelType <= levelTypeEnum.PUBLIC) {
        // The public levels are available to everyone
        const filePath = resolveDataPath(
            'maps',
            getMapFolderByType(level.levelType),
            `${levelId}.json`
        );
        await respondWithJsonFile(res, filePath, () => {
            console.log(`Level ${levelId} fetched and sent`);
        });
    }
})

//: Run server
app.listen(SERVER_LISTEN_PORT, () => {
    console.log(`Server listening on port ${SERVER_LISTEN_PORT}`);
});
