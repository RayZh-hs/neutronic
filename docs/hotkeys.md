# Neutronic Hotkeys

Neutronic can be played with hotkeys or mouse controls. Below is a list of the default hotkeys available in the game. All are configurable in the settings menu.

## General Hotkeys

- `general.view-hotkeys`: Show hotkeys overlay, defaults to `space`.
- `general.toggle-account`: Toggle account menu, defaults to `-`.
- `general.open-github`: Open GitHub repository, defaults to `=`.

## Landing Page

Vue component: `HomeView.vue`

- `landing.info`: Show game information, defaults to `j`.
- `landing.play`: Start game, defaults to `k`.
- `landing.settings`: Open settings, defaults to `l`.

## Album View

Vue component: `AlbumView.vue`

- `album.previous`: Previous album, defaults to `j|a|left-arrow`.
- `album.next`: Next album, defaults to `l|d|right-arrow`.
- `album.enter`: Enter current album, defaults to `k|enter`.
- `album.back`: Back to landing page, defaults to `escape|backspace`.

## Sub-Album View

Vue component: `SubAlbumView.vue`

- `sub-album.previous`: Previous page, defaults to `j|a|left-arrow`.
- `sub-album.next`: Next page, defaults to `l|d|right-arrow`.
- `sub-album.enter`: Enter level, defaults to `k|enter`.
- `sub-album.back`: Back to album view, defaults to `escape|backspace`.

## Level View

Vue component: `LevelView.vue`

When pressing space, all the bindings to the particles will show on top of the particles, incrementing from 1.

- `level.up`: Move up, defaults to `w|up-arrow`.
- `level.down`: Move down, defaults to `s|down-arrow`.
- `level.left`: Move left, defaults to `a|left-arrow`.
- `level.right`: Move right, defaults to `d|right-arrow`.
- `level.previous-particle`: Focus previous particle, defaults to `j`.
- `level.next-particle`: Focus next particle, defaults to `l`.
- `level.toggle-focus`: Toggle the focus of the current particle, defaults to `k|enter`.
- `level.undo`: Undo last move, defaults to `z`.
- `level.reset`: Reset level, defaults to `r`.
- `level.toggle-record`: Toggle recording mode, defaults to `q`.
- `level.play-recording`: Play recording, defaults to `shift+q`.
- `level.back`: Go back, defaults to `escape|backspace`.
- `level.on-finish.restart`: Restart level, defaults to `j`.
- `level.on-finish.level-select`: Level select, defaults to `k`.
- `level.on-finish.next`: Next level, defaults to `l`.

Typing the binding key of a particle will shift focus to it.

## Level Editor

Vue component: `LevelEditorView.vue`

- `editor.board-tool`: Select board tool, defaults to `b|1`.
- `editor.portal-tool`: Select portal tool, defaults to `p|2`.
- `editor.positron-tool`: Select positron tool, defaults to `+|3`.
- `editor.electron-tool`: Select electron tool, defaults to `-|4`.
- `editor.remover-tool`: Select remover tool, defaults to `r|x|5`.
- `editor.clear-all`: Clear all elements from level, defaults to `ctrl+q`.
- `editor.focus`: Focus level, defaults to `ctrl+space`
- `editor.save`: Save level, defaults to `ctrl+s`.
- `editor.delete-selection`: Remove selection, defaults to `delete`.
- `editor.delete-containers`: Remove containers in selection, defaults to `shift+delete`.
- `editor.apply-tool`: Apply tool to selection, defaults to `f`.
- `editor.cancel-selection`: Cancel selection, defaults to `escape`.
- `editor.copy`: Copy level to clipboard, defaults to `ctrl+c`.
- `editor.back`: Go back to custom levels, defaults to `escape|backspace`.
- `editor.play`: Play level, defaults to `ctrl+enter`.

## Playback View

Vue component: `PlaybackView.vue`

- `playback.play-pause`: Toggle play/pause, defaults to `ctrl+space`.
- `playback.goto-beginning`: Go to playback beginning, defaults to `h`.
- `playback.goto-end`: Go to playback end, defaults to `l`.
- `playback.step-backward`: Step backward, defaults to `j`.
- `playback.step-forward`: Step forward, defaults to `k`.

## Custom Selection View

Vue component: `CustomSelectionView.vue`

- `custom-selection.toggle-mode`: Toggle between recordings and levels, defaults to `ctrl+tab`.
- `custom-selection.new-level`: Create new level, defaults to `+`.
- `custom-selection.previous-level`: Previous level/recording, defaults to `j|w|up-arrow`.
- `custom-selection.next-level`: Next level/recording, defaults to `l|s|down-arrow`.
- `custom-selection.edit-level`: Edit selected level, defaults to `k|enter`.
- `custom-selection.delete`: Delete selected level/recording, defaults to `delete`.
- `custom-selection.play`: Play selected level/recording, defaults to `ctrl+enter`.
- `custom-selection.back`: Back to album view, defaults to `escape|backspace`.
- `custom-selection.back`: Go back to landing page, defaults to `escape|backspace`.
