# Kaptajn Kaper i Kattegat — Web Remake

**A modern web-based remake of the classic 1985 Danish privateer trading and naval combat game**, built with **Phaser 3 + TypeScript + Vite**.

## 🎮 Game Status

| Phase | Status | Details |
|-------|--------|---------|
| **Asset Creation** | ✅ Complete | 5 sprite atlases (player ship, enemies, effects, boarding, UI) with Phaser JSON metadata |
| **Foundation** | ✅ Complete | Vite + TypeScript + Phaser 3 configured, 9 scene skeletons implemented |
| **Data Extraction** | ✅ Complete | All game data extracted from original .BAS files into JSON format |
| **Map Implementation** | ⏳ Next | Tiled tilemap + collision system |
| **Battle System** | ⏳ Next | Combat mechanics, enemy AI, damage calculations |
| **Trading System** | ⏳ Next | Harbor UI, buy/sell, crew management |
| **Polish & Audio** | ⏳ Future | Sound effects, music, responsive UI |

## 📂 Project Structure

```
src/
  ├── main.ts                     # Phaser game config & startup
  ├── scenes/                     # Game state machines
  │   ├── BootScene.ts            # Asset preload
  │   ├── TitleScene.ts           # Main menu
  │   ├── IntroStoryScene.ts      # Story intro (Komtesse Julie)
  │   ├── WorldMapScene.ts        # Tile-based navigation
  │   ├── BattleScene.ts          # Cannon combat
  │   ├── BoardingScene.ts        # Optional entring
  │   ├── HarborApproachScene.ts  # Harbor entry
  │   ├── HarborTradeScene.ts     # Trading system
  │   ├── GameOverScene.ts        # Results screen
  │   └── index.ts                # Scene exports
  ├── game/
  │   └── GameState.ts            # Core data model
  └── data/
      ├── game-config.json        # Initial resources, prices, limits
      ├── enemies.json            # 8 enemy ship types with stats
      ├── map.json                # 30×15 tile map + harbor locations
      ├── story.json              # Intro, help text, game over conditions
      └── index.ts                # TypeScript data loaders

assets/sprites/
  ├── ship_player.png/.json       # Player ship (4 damage states × 4 animations)
  ├── ships_enemy.png/.json       # 8 enemy types (topview + sideview)
  ├── battle_effects.png/.json    # Cannonballs, splashes, explosions
  ├── boarding.png/.json          # Dinghy & flags
  └── ui_atlas.png/.json          # Resource icons & UI elements

CONFIG FILES
  ├── package.json                # npm dependencies (Phaser, TypeScript, Vite)
  ├── tsconfig.json               # TypeScript compiler options
  ├── vite.config.ts              # Vite build configuration
  ├── index.html                  # HTML entry point
  └── .gitignore                  # Git configuration
```

## 🚀 Quick Start

### Docker Development

With Docker Desktop running:

```bash
docker compose up -d --build
```

Open http://localhost:5173. Stop with `docker compose down`; leaderboard data stays in its Docker volume.

### Prerequisites
- Node.js 18+ and npm

### Development

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser. The dev server will hot-reload as you edit files.

### Production Build

```bash
npm run build
```

Output goes to `dist/`, ready to deploy to GitHub Pages, Netlify, or Vercel.

## 📖 Game Data

All game data has been extracted from the original 1985 BASIC source code and converted to JSON:

### Core Configuration (`src/data/game-config.json`)
- Initial resources: 200 crew, 30 grain, 600 rigsdaler, 4 cannons
- 7 harbors with coordinates and names
- Price tables for goods and services
- Win conditions: 500 points or 325 turns
- Resource caps (crew: 500, grain: 700, rigsdaler: 30,000)

### Enemy Ships (`src/data/enemies.json`)
8 canonical enemy types extracted from `KAPER.BAS` lines 840-910:
1. **Handelsmand** (Merchant) — 5 cannons, 80 crew, 150 rigsdaler
2. **Troppetransport** — 10 cannons, 480 crew, 600 rigsdaler
3. **Kanonbåd** (Cannon Boat) — 2 cannons, 40 crew, 150 rigsdaler
4. **Galease** — 15 cannons, 140 crew, 450 rigsdaler
5. **Brig** — 6 cannons, 50 crew, 200 rigsdaler
6. **Skonnert** — 1 cannon, 10 crew, 30 rigsdaler
7. **Orlogsmand** (Warship) — 50 cannons, 140 crew, 900 rigsdaler
8. **Sørøverskib** (Pirate) — 70 cannons, 200 crew, 1500 rigsdaler

### Map (`src/data/map.json`)
- **30×15 tiles** covering the Kattegat region around Denmark
- **112 land tiles** for collision detection
- **7 harbors** with coordinates: København, Helsingør, Hundested, Grenå, Ebeltoft, Kalundborg, Mølle

### Story & Help (`src/data/story.json`)
- Full intro story (Komtesse Julie, Kaperbrev, English invasion)
- Navigation & combat guides
- Crew management mechanics
- Trading system description
- Game over conditions

See [`DATA_EXTRACTION.md`](DATA_EXTRACTION.md) for detailed source references and game formulas.

## 🎮 Gameplay Loop

1. **Title Screen** — New game or highscore
2. **Intro Story** — Historical context and romantic motivation
3. **World Map** — Navigate 8-directionally, encounter random enemies
4. **Battle** — Cannon duel or boarding action
5. **Harbors** — Buy/sell goods, hire crew, repair ship
6. **Victory/Defeat** — Reach 500 points to be ennobled and marry Komtesse Julie, or lose to combat/starvation/time

## 🔧 Architecture

### GameState Model (`src/game/GameState.ts`)
Pure TypeScript data model, independent of rendering:
- Resources: crew, grain, rigsdaler, cannons
- Ship condition: hullIntegrity (0-100%), damage state
- Progress: score, turns elapsed, current map position
- Helper functions: `getHullDamageLevel()`, `applyHullDamage()`, `canSail()`, etc.

### Scene Management (Phaser)
Each major game phase is a Phaser `Scene`:
- `BootScene` → `TitleScene` → `IntroStoryScene` → `WorldMapScene` (main loop)
- Encounters trigger `BattleScene` → back to `WorldMapScene`
- Harbor entry triggers `HarborApproachScene` → `HarborTradeScene` → back to `WorldMapScene`
- Win/lose conditions → `GameOverScene`

### Data Loaders (`src/data/index.ts`)
TypeScript helpers for type-safe data access:
```typescript
import { getEnemyTypes, getRandomEnemy, getMapData, getHarbors } from '../data'

const enemies = getEnemyTypes()           // Enemy[]
const foe = getRandomEnemy()              // Enemy
const map = getMapData()                  // MapData
const ports = getHarbors()                // Harbor[]
```

## 🎨 Sprite Assets

All spritesheets are **Phaser 3 JSON atlases** with embedded animation metadata:

| Asset | Frames | Use |
|-------|--------|-----|
| `ship_player.png` | 16 | Player ship: 4 damage states × 4 rocking animations |
| `ships_enemy.png` | 16 | 8 enemy types: topview (map) + sideview (battle) |
| `battle_effects.png` | 12 | Cannonball, splash (4-frame), explosion (6-frame), crosshair |
| `boarding.png` | 12 | Dinghy, Dannebrog flag, Jolly Roger |
| `ui_atlas.png` | 28 | Resource icons (crew, grain, cannon, coins, repair, gems), compass, wind |

Pixel art uses **20-32 color retro palette** with **no antialiasing**. All assets regenerable with PowerShell scripts in `tools/`.

## 📚 Documentation

- [`DATA_EXTRACTION.md`](DATA_EXTRACTION.md) — Detailed source references, extracted formulas
- [original-source/README.md](original-source/README.md) - Original BASIC source notes

## 🛠 Type Checking & Linting

```bash
npm run type-check      # Run TypeScript compiler
npm run lint            # Run ESLint
```

## 🎯 Configuration

### Game Settings (`vite.config.ts`)
- Resolution: 1024×768 (4:3 classic arcade)
- Pixel art mode enabled (nearest-neighbor filtering)
- Arcade physics for ship movement

### Phaser Config (`src/main.ts`)
- 9 scenes in boot order
- Physics: Arcade (gravity: 0)
- Rendering: Auto-detect (Canvas/WebGL) with pixelArt: true

## 📋 Current Limitations

- Map rendered as placeholder grid (will be replaced by Tiled tilemap)
- Battle is simplified (no wind/distance calculation yet)
- Harbor approach has no steering minigame yet
- No sound/music yet
- No localStorage highscore persistence yet
- No touch controls yet (keyboard only)

## 🔄 Roadmap

### Immediate (Next Phase)
1. Implement real tile-based world map with Tiled/Phaser tilemap
2. Add proper collision detection (land, harbor approach)
3. Implement full combat system (cannon fire, distance, wind, accuracy)
4. Build harbor trading UI

### Medium Term
1. Boarding minigame (crew combat)
2. Prize delivery system
3. Crew morale and starvation mechanics
4. Crew disease outbreaks

### Long Term
1. Sound effects and music (Web Audio API)
2. Full responsive layout (mobile touch controls)
3. Highscore leaderboard (localStorage)
4. Settings (difficulty, sound toggle)
5. Visual polish (animations, screen transitions)

## 📝 License

MIT (modern web version) — Original game © 1985 Peter Ole Frederiksen, preserved under GNU GPL v3.

See [original-source/README.md](original-source/README.md) for the original source documentation.

## 🙏 Credits

- **Original Game**: Peter Ole Frederiksen (1985)
- **Web Remake**: 2024
- **Source Preservation**: Det Kgl. Bibliotek (Royal Danish Library) via Thorbjørn Stegelmann
- **Sprite Assets**: Generated with GPT-6-Astra
- **Framework**: Phaser 3 + TypeScript + Vite
