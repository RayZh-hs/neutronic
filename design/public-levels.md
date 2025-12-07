# Neutronic Public Levels

Public levels can be accessed by anyone in the Online section.

## Level Tokens

Everyone can share levels and public levels are stored in the server, described by the uuid. The first time a level is published, a token will be sent to the user, and that token will be stored with the account. Henceforth any action on that level (update, delete) will require the token to be sent along with the request.

If a level is updated locally, the user can choose whether to republish it, in which case the remote level will be re-written.

## Level Metadata

Metadata that is defined by the creator include:
- Name and author (username) of the level
- Moves required to complete the level
- Description of the level
- Difficulty rating (1-5 stars)

Metadata that is recorded by the server include:
- Number of plays (total and weekly)
- Number of completions

The number of plays are recorded per download, and are used for ranking levels.

## Playing Public Levels

When playing public levels, the game will download the level data from the server and store it in a local cache. If the level has been played before, the local machine will send a request to compare the SHA-256 hash of the local cached version with the server version. If they differ, the server version will be downloaded and replace the local cached version.

When a level is completed, the local machine will send a request to the server to increment the completion count for that level. Each download of level will correspond to one completion only.