const { SERVER_LISTEN_PORT, reservedUsernames, levelTypeEnum } = require('./constants.cjs');
const { initDatabases, loadPremadeLevels, getLevel } = require('./database.cjs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Init the databases
initDatabases();
loadPremadeLevels();    // Call this iff you are running the server the first time!

// The main express app
const app = express();
app.use(cors());

//+ Favicon request
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

//+ Album request (GET)
const albums = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "data", "albums.json")
    , "utf8")
);
app.get('/api/albums', (req, res) => {
    console.log("Albums requested");
    res.json(albums);
});

//+ Level request (GET)
app.get('/api/level', (req, res) => {
    console.log("Level requested");
    const levelId = req.query.levelId;
    const level = getLevel(levelId);
    if (level == undefined) {
        console.warn('Level is undefined')
        res.status(404).json({ error: "Level not found" });
    }
    else if (level.levelType <= levelTypeEnum.PUBLIC) {
        // The public levels are available to everyone
        const filePath = path.resolve(
            __dirname, "data", "maps",
            level.levelType == levelTypeEnum.PREMADE ? "base" : "extended",
            `${levelId}.json`);
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                res.status(500).json({ error: "Internal server error" });
                console.error(err);
            }
            else {
                console.log(data)
                res.json(JSON.parse(data));
            }
        });
    }
})

//: Run server
app.listen(SERVER_LISTEN_PORT, () => {
    console.log(`Server listening on port ${SERVER_LISTEN_PORT}`);
});