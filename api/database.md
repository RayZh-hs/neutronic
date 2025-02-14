# Neutronic Databases

This is an explanatory document, listing the internal structures of databases using in Project Neutronic.

## List of Databases

At the time being, the databases in the project contain:
- `level.db` /api/data/level.db: Contains information for all levels in the game.
- `account.db` /api/data/account.db: Contains information for all registered accounts.

All databases use SQLite as their engine.

## Database Structures

Here is a detailed explanation of the structure of each database:

### level.db

This is a single-table database with the table named `levelTable`.

| levelId * | levelName | author | lastUpdatedTime | levelType |
|-----------|-----------|--------|-----------------|-----------|
| TEXT      | TEXT      | TEXT   | TEXT            | INTEGER   |

- The `levelId` is the primary key for this table.
- The `levelType` is an integer, corresponding to this enum:
    - 0: **(Public)** Levels published by the Neutronic team for standard game play.
    - 1: **(Public)** Third-party levels that have been published.
    - 2: **(Private)** In-dev levels by the Neutronic team.
    - 3: **(Private)** Private custom levels by users.

The type of a map will first be queried following any GET request received by the server.
Regular and local accounts only have access to public levels. The Neutronic team has access to the first three types. The last type can only be accessed by the user who created the level.