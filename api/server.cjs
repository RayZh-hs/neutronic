const { SERVER_LISTEN_PORT } = require('./constants.cjs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

//: Favicon request
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

//: Album request (GET)
const albums = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "data", "albums.json")
    , "utf8")
);
app.get('/api/albums', (req, res) => {
    console.log("Albums requested");
    res.json(albums);
}); 


app.listen(SERVER_LISTEN_PORT, () => {
    console.log(`Server listening on port ${SERVER_LISTEN_PORT}`);
});