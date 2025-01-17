# Neutronic

Neutronic is an open-source, web-based puzzle game where players cancel out particles to pass levels. It uses the popular Vue3 framework and is written in JavaScript.

## Installation

Since the game is still in its development phase, a web-based prebuilt version is not available. However, you can clone the repository and run the game locally.

```bash
git clone https://github.com/RayZh-hs/neutronic.git
cd neutronic
npm install
npm run dev
```

After running these commands, you can access the game in any web browser at `localhost:5174`. You can change the port in the `vite.config.js` file.

A prebuilt version (binary and online) will be available once the game is complete.

## Rules

The game is simple. A map is made of boards(floors) and particles. Each particle is either red or blue. Each particle must always stay on a board, and each board can hold at most one particle.

Each step you can choose one particle and move it to an adjacent board. Particles of the same color repel, so if that adjacent board has a particle of the same color, you cannot move the particle there. If the adjacent board has a particle of the opposite color, the two particles will cancel out, and they will disappear along with the board they were on.

Portals are special boards that will be introduced later in the game. When a particle is moved onto a portal, it will be immediately teleported to the other portal of the same color. If there is a particle of the same color on top of the other portal, you cannot perform the move; if there is a particle of the opposite color, the two particles will cancel out.

Every time a cancellation occurs on a portal, it will disappear along with the particles. The other half of the portal will then automatically degrade into a normal board.

Your aim is to cancel out all particles on the map. Good luck!

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.