const { SERVER_LISTEN_PORT, reservedUsernames } = require('./constants.cjs');
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

//: Run server
app.listen(SERVER_LISTEN_PORT, () => {
    console.log(`Server listening on port ${SERVER_LISTEN_PORT}`);
});