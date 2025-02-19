# Neutronic Storage Systems

This section describes the storage systems used in the game, with a focus on the design and operation.

## level

A level is defined using a json:
```json
{
    "type": "level",
    "meta": {
        "levelId": $level-uuid,
        "name": $level-name,
        "author": $author,
        "rows": $rows,
        "columns": $columns,
    },
    "content": {
        "containers": [
            {"type": "board", "row": $row, "column": $column},
            ...
            {"type": "portal", "row": $row, "column": $column, "index": $index},
            ...
        ],
        "particles": [
            {"color": "blue"/"red", "row": $row, "column": $column},
            ...
        ],
        "goal": $moves-count
    }
}
```

## album

An album is a collection of levels:
```json
{
    "type": "album",
    "meta": {
        "name": $album-name,
        "author": $author,
        "levels": $levels-count
    },
    "content": [
        {"levelId": $level-uuid, "name": $level-name},
        ...
    ]
}
```

## recording

A recording is the steps recorded for passing a single level:
```json
{
    "type": "recording",
    "meta": {
        "recordingId": $level-uuid,
        "levelId": $level-uuid,
        "author": $author,
        "moves": $moves-count
    },
    "content": [
        {"id": $particle-id, "direction": [
            "up"/"down"/"left"/"right",
        ]}
        ...
    ]
}
```

## level-view-config (sessionStorage)

This storage keeps track of transporting level information, centering upon the LevelView component.

1. When a level is selected in SubAlbumView, the level-view-config is updated as follows:
    
    ```json
    {
        "context": "album",
        "albumName": $name-of-the-album,
        "levelName": $name-of-the=level,
        "next": $url-to-the-next-level
    }
    ```

    If no next level exists in the album, `next` will be the url to the album, in the SubAlbumView.

2. When a level is played from the LevelEditor, the level-view-config is updated as follows:

    ```json
    {
        "context": "editor",
        "levelData": $json-of-the-level,
        "levelName": $name-of-the=level,
    }
    ```

3. When a level is finished in the view and returned to the level editor, the level-view-config is updated as follows:

    ```json
    {
        "context": "finished",
        "levelData": $json-of-the-level,
        "bestMovesCount": $number-of-moves,
        "recording": [
            {"row": $row, "col": $col, "dir": $direction},
            ...
        ]
    }
    ```

4. When a level is finished and NEXT is used, the LevelView updates on its own, same as 1.

## level-editor-config (sessionStorage)

This is simple. Basically the editor only needs to know whether to fetch the level and from where.

```json
{
    "newLevel": true/false,
    "localFetch": true/false,
}
```

## solver-config

Here is how a level is passed into a solver:

```text
$rows $columns
<table: rows x columns | no space>:
    - . for nothing
    - # for board
    - [a-z] for portals
$particles
<array: particles>:
    - $color(R/B) $row $column
```