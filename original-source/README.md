# Original Source Code - Kaptajn Kaper i Kattegat (1985)

This directory contains the **original 1985 GW-BASIC source code** for "Kaptajn Kaper i Kattegat", a classic Danish privateer trading and naval combat game.

---

## 📜 Source Files

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| **KAPER.BAS** | Main game engine & logic | ~1,800 | Complete |
| **BUILD.BAS** | Ship/enemy data construction | ~400 | Complete |
| **HLP.BAS** | Help screens & story text | ~500 | Complete |
| **TITEL.PIC** | Title screen graphics data | Binary | Complete |
| **SKUD.BAS** | Combat/shooting system | ~200 | Complete |
| **SPECIAL.BAS** | Special effects & animations | ~150 | Complete |
| **TEGN.BAS** | Drawing/graphics routines | ~300 | Complete |

**Total:** ~3,350 lines of GW-BASIC code

---

## 🎮 Game Overview

**Kaptajn Kaper i Kattegat** (Captain Privateer in Kattegat)
- **Year Released:** 1985
- **Language:** GW-BASIC
- **Platform:** Commodore 64 / CP/M compatible systems
- **Genre:** Trading & naval combat simulation
- **Developer:** Danish computer game developer (original author)

### Game Objective
Navigate the Kattegat waters as a Danish privateer, trading goods, hiring crew, and engaging in naval combat. Accumulate 500 points through victories to achieve victory, or survive 325 turns to win by endurance.

### Core Mechanics
- **Navigation:** 30×15 tile-based map of Kattegat waters
- **Trading:** 7 harbor locations with dynamic prices
- **Combat:** Turn-based naval cannon duels with wind, distance, morale
- **Resources:** Crew, grain (food), rigsdaler (currency), cannons
- **Enemies:** 8 ship types with varying difficulty

---

## 📋 File Descriptions

### KAPER.BAS (Main Game Engine)
**Lines:** 1-1800+

Contains:
- Game initialization and main loop (lines 1-100)
- Map navigation and movement (lines 200-400)
- Harbor system and trading (lines 500-700)
- Enemy encounter logic (lines 750-900)
- Win/lose condition checking (lines 950-1100)
- Game state management throughout

**Key Data Arrays:**
- `IMAP()` — Map tiles (land/water coordinates)
- `HAVN()` — Harbor locations and data
- `FJENDE()` — Enemy ship types and stats
- `G()` — Current game state (crew, grain, money, etc.)

### BUILD.BAS (Ship & Enemy Data Construction)
**Lines:** 1-400+

Constructs the enemy database:
- Enemy ship type definitions (lines 840-910)
- Ship stats calculation (cannons, crew, treasure, grain)
- Difficulty rating assignment
- Point values for victories

**Data Section (Lines 840-910):**
```
DATA statements for 8 enemy types:
1. Handelsmand (Merchant) - 5 cannons, 80 crew, 150 gold, difficulty 1
2. Troppetransport (Transport) - 10 cannons, 480 crew, 600 gold, difficulty 2
3. Kanonbåd (Cannon Boat) - 2 cannons, 40 crew, 150 gold, difficulty 1
4. Galease (Galleas) - 15 cannons, 140 crew, 450 gold, difficulty 3
5. Brig - 6 cannons, 50 crew, 200 gold, difficulty 2
6. Skonnert (Schooner) - 1 cannon, 10 crew, 30 gold, difficulty 1
7. Orlogsmand (Warship) - 50 cannons, 140 crew, 900 gold, difficulty 4
8. Sørøverskib (Pirate Ship) - 70 cannons, 200 crew, 1500 gold, difficulty 5
```

### HLP.BAS (Help Screens & Story)
**Lines:** 1-500+

Contains:
- Story introduction text (lines 100-150)
- Navigation help screen (lines 200-250)
- Combat help screen (lines 300-350)
- Crew management information (lines 400-450)
- Trading system explanation (lines 500-550)

**Story Elements:**
- Historical setting (1685, Danish Golden Age)
- Player's role as licensed privateer
- Geographic context (Kattegat, Baltic Sea)
- Economic simulation background

### SKUD.BAS (Combat System)
**Lines:** 1-200+

Implements:
- Hit chance calculation based on:
  - Player cannons vs enemy cannons
  - Distance between ships
  - Wind effects
  - Crew morale
- Damage calculation
- Crew casualty computation
- Morale updates after each round
- Boarding mechanics

### SPECIAL.BAS (Special Effects & Animations)
**Lines:** 1-150+

Provides:
- Explosion animations
- Cannon fire effects
- Splash animations (missed shots)
- Screen transitions
- Text effects and delays

### TEGN.BAS (Graphics Routines)
**Lines:** 1-300+

Contains:
- Ship sprite drawing routines
- Tile map rendering
- Harbor graphics
- UI element rendering
- Character output with color codes

### TITEL.PIC (Title Screen)
Binary graphics data for the title screen artwork (Commodore 64 format)

---

## 🔍 Data Extraction Reference

All game data has been extracted and documented in the web remake:

### Extracted to: `src/data/game-config.json`
- 7 harbor locations (Copenhagen, Helsingør, Hundested, Grenå, Ebeltoft, Kalundborg, Mølle)
- Initial player resources (200 crew, 30 grain, 600 rigsdaler, 4 cannons)
- Win conditions (500 points or 325 turns)
- Price structure for trading
- Resource capacity limits

**Source:** KAPER.BAS lines 60, 102, 750, 790, 830-840

### Extracted to: `src/data/enemies.json`
- All 8 enemy ship types
- Stats: cannons, crew, treasure, grain
- Difficulty ratings (1-5)
- Victory point values

**Source:** BUILD.BAS lines 840-910

### Extracted to: `src/data/map.json`
- 30×15 map dimensions
- 112 land tile coordinates
- 7 harbor positions and IDs
- Collision data

**Source:** KAPER.BAS lines 650-740, 750, 790

### Extracted to: `src/data/story.json`
- Story introduction
- Help screens for all systems
- Navigation tips
- Combat explanations

**Source:** HLP.BAS throughout

---

## 🛠️ Technical Notes

### GW-BASIC Specifics
- **Line numbers:** Required for BASIC (all statements start with line number)
- **GOTO/GOSUB:** Primary control flow (no modern functions/OOP)
- **Array syntax:** Single letter variables with dimensions (e.g., `G(10)`)
- **String operations:** Limited string handling, mostly numeric data
- **Graphics:** Commodore 64 screen code mode (40×25 character grid)

### Simulation Features
- **Real-time grain consumption** — 1 unit per turn at sea
- **Crew morale system** — Affects combat effectiveness
- **Price fluctuation** — Supply/demand based on port and turn
- **Turn limits** — 325 turns to complete game
- **Scoring system** — Points from battles, victory at 500 points

### Design Patterns
- **Game loop:** Main program (lines 1-50) controls flow
- **State management:** Array `G()` holds all game state
- **Enemy generation:** Random selection with difficulty scaling
- **Navigation:** Tile-based grid with 8-directional movement
- **Combat resolution:** Turn-based with simultaneous fire

---

## 📚 Historical Context

**1985 Game Design Context:**
- Personal computers were limited (64 KB RAM typical)
- Graphics were text/character-based or low-resolution sprites
- Games relied on simulation algorithms rather than assets
- Turn-based gameplay was common (no real-time requirements)

**Danish Game Industry:**
- Part of early 1980s microcomputer boom
- Games often reflected local culture/history
- Trading and sea-faring themes were popular
- Educational value (economics, navigation, history)

---

## 🔄 Conversion to Web Remake

### What Was Preserved
- ✅ All game mechanics (combat, trading, navigation)
- ✅ Exact data values (enemy stats, harbor prices, map layout)
- ✅ Game balance (difficulty curve, win conditions)
- ✅ Turn structure and resource consumption
- ✅ Story and historical setting

### What Was Enhanced
- ✅ Graphics — Pixel art sprites instead of text
- ✅ Tilemap — Professional Tiled editor format
- ✅ Physics — Phaser arcade collision detection
- ✅ UI/UX — Modern keyboard controls, real-time feedback
- ✅ Animations — Sprite animations for all entities
- ✅ Performance — TypeScript compilation, optimized bundling

### What Was Modernized
- ✅ Language — GW-BASIC → TypeScript
- ✅ Framework — Commodore BASIC → Phaser 3 (WebGL)
- ✅ Platform — Commodore 64 → Web browser (responsive)
- ✅ Distribution — Diskette → Docker containers → Web deployment

---

## 💾 Preservation

These files are preserved in their original format as:
1. **Historical record** of 1985 game design
2. **Reference implementation** for the web remake
3. **Educational material** for game development history
4. **Test cases** for data extraction accuracy

All original BASIC code remains unmodified in this directory.

---

## 📖 How to Read GW-BASIC

If you're unfamiliar with GW-BASIC:

```basic
10 REM This is a comment
20 PRINT "Hello, World!"
30 INPUT "Enter a number: ", X
40 IF X > 10 THEN GOTO 100
50 PRINT "Number is small"
60 GOTO 200
100 PRINT "Number is large"
200 END
```

Key differences from modern languages:
- Line numbers are required (10, 20, 30...)
- `GOTO` replaces modern control flow
- Variables can be simple letters (A-Z, A$-Z$)
- Arrays use parentheses: `ARRAY(index)`
- `INPUT` gets user input
- `PRINT` outputs to screen
- `REM` is a comment

---

## 📞 Related Documentation

- [Web remake overview and Docker setup](../README.md)
- [Data extraction methodology](../DATA_EXTRACTION.md)

