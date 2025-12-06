# Refactor Plan

## Overview

The goal of this refactor is to clean up the existing backend and frontend modules without changing the observable behaviour of the game or any of its visuals. The focus is on clarifying responsibilities, reducing duplicated logic, and surfacing domain concepts in their own helpers so that future work is simpler and safer.

## Backend Targets

### `backend/api/server.cjs`

- Introduce clear helper functions for loading static JSON assets (albums, level files).
- Normalize request logging and error handling so every exit path is obvious.
- Guard early when parameters are missing or invalid to keep handlers linear.

### `backend/api/database.cjs`

- Extract repeated setup logic for the SQLite databases into small factory helpers.
- Keep read helpers (`getLevel`, `levelExists`) in a single section alongside their callers for easier scanning.

### `backend/api/scripts/levelSearcher.py`

- Encapsulate the filtering pipeline in functions, accept a directory argument, and provide docstrings / safe defaults so the script can be reused without editing globals.

## Frontend Targets

### `frontend/src/functions/useAxiosWithStore.js`

- Flatten the orchestration between storage and axios by splitting concerns into helpers (reading cached data vs fetching).
- Remove unnecessary reactive watchers once the data lifecycle is explicit.

### `frontend/src/views/SubAlbumView.vue`

- Replace manual index math with computed properties for the current album, total levels, player progress, and the window slices.
- Collocate navigation helpers (`enterLevel`, `nextWindow`, `prevWindow`) with the computed state they rely on and memoize repeated lookups.
- Preserve the public API of the component and emitted events so the UI remains unchanged while the internals become easier to follow.

