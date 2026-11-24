'use strict';
// Every tuning number of the game. Kept apart from the code so it can move to JSON / Godot as is.
/* =====================================================================
   TUNING CONSTANTS - every number of the game lives here
   Depth is counted in tiles: the first underground row is depth 1.
   ===================================================================== */
const CFG = {
  // ---- field ----
  COLS: 12,
  ROWS: 200,
  MAX_ASPECT: 0.60,          // max canvas width / height (keeps portrait on desktop)

  // ---- ores: depth range (tiles), value per unit, vein count and vein size ----
  ORES: [
    { name: 'Coal',    min: 5,   max: 40,  value: 5,   color: '#1d1d24', shine: '#7d7d90', veins: 16, veinSize: [3, 6] },
    { name: 'Copper',  min: 20,  max: 80,  value: 15,  color: '#e2793a', shine: '#ffc08a', veins: 20, veinSize: [3, 6] },
    { name: 'Silver',  min: 60,  max: 120, value: 40,  color: '#d5dde8', shine: '#ffffff', veins: 18, veinSize: [3, 5] },
    { name: 'Gold',    min: 100, max: 170, value: 100, color: '#ffcf1f', shine: '#fff6b0', veins: 18, veinSize: [3, 5] },
    { name: 'Crystal', min: 150, max: 200, value: 300, color: '#55efff', shine: '#ffffff', veins: 12, veinSize: [2, 4] },
  ],

  // ---- cargo ----
  CARGO_START: 10,
  CARGO_PER_LEVEL: 5,

  // ---- fuel ----
  FUEL_START: 100,
  FUEL_PER_LEVEL: 35,        // extra tank per upgrade level
  FUEL_PER_DIG: 2.5,         // fuel for digging one solid tile
  FUEL_PER_MOVE: 0.5,        // fuel for moving through an already dug tile
  LOW_FUEL_FRAC: 0.15,       // blinking warning below this share of the tank
  CLOSE_CALL_FRAC: 0.10,     // "CLOSE CALL" banner if you surface below this share

  // ---- speed (seconds per tile) ----
  DIG_TIME: 0.30,
  MOVE_TIME: 0.09,
  CRAWL_TIME: 0.55,          // out of fuel: slow crawl upward
  OUT_OF_FUEL_CARGO_LOSS: 0.5, // share of cargo dropped when the tank runs dry (0 = no penalty)
  SPEED_PER_LEVEL: 1.25,     // speed multiplier per upgrade level
  HARDNESS_AT_BOTTOM: 3.5,   // dig time multiplier at the deepest row (1.0 at the top)
  ROCK_HARDNESS: 3.0,        // fallen rock is this much slower to dig

  // ---- shop ----
  UPGRADE_BASE: { speed: 140, cargo: 90, fuel: 110, hull: 220 },
  HULL_PROTECT_PER_LEVEL: 0.2, // each hull level cuts cargo and fuel losses from hazards by 20%
  HULL_PROTECT_MAX: 0.8,
  UPGRADE_GROWTH: 1.6,
  SHOP_PANEL_FRAC: 0.34,     // share of the screen height used by the shop panel

  // ---- hazard: gas pocket ----
  GAS_FROM: 40,
  GAS_CHANCE_START: 0.015,   // share of tiles that are gas at GAS_FROM
  GAS_CHANCE_END: 0.07,      // ... at the deepest row
  GAS_CARGO_LOSS: 0.4,       // share of cargo lost in an explosion

  // ---- hazard: cave-in ----
  CAVE_FROM: 90,
  CAVE_CHANCE_START: 0.03,   // chance per dug tile at CAVE_FROM
  CAVE_CHANCE_END: 0.15,     // ... at the deepest row
  CAVE_WARN: 0.9,            // seconds of warning before the rock drops
  CAVE_FALL_SPEED: 9,        // tiles per second
  CAVE_MAX_HEIGHT: 8,        // rock starts at most this many tiles above
  CAVE_CARGO_LOSS: 0.25,
  CAVE_FUEL_LOSS: 10,

  // ---- hazard: magma (deep) ----
  MAGMA_FROM: 120,
  MAGMA_CHANCE_START: 0.02,  // share of tiles that are magma at MAGMA_FROM
  MAGMA_CHANCE_END: 0.08,
  MAGMA_FUEL_LOSS: 15,
  MAGMA_CARGO_LOSS: 0.3,

  // ---- progression: contracts, depth bonuses, daily crate ----
  DEPTH_BONUS_STEP: 25,      // first time at 25, 50, 75... m pays a bonus
  DEPTH_BONUS_PER_M: 4,      // bonus = mark * this
  CONTRACT_DELIVER_MIN: 3,
  CONTRACT_DELIVER_MAX: 8,
  CONTRACT_DELIVER_PAY: 0.8, // reward = ore value * amount * this + 30
  CONTRACT_DEPTH_AHEAD: 15,  // depth contract = record + this
  CONTRACT_DEPTH_PAY: 3,     // reward per m of the target
  CONTRACT_FULL_PAY: 2.5,    // full-load contract: 50 + record * this
  DAILY_BASE: 60,
  DAILY_PER_STREAK: 40,      // extra per day of the streak
  DAILY_PER_RECORD: 1.5,     // extra per m of the depth record
  DAILY_STREAK_MAX: 7,

  // ---- juice ----
  RECORD_STEP: 10,           // "NEW DEPTH RECORD" every N tiles of new depth
  DIG_PARTICLES_PER_SEC: 70,
  SHAKE_DIG: 1.5,
  SHAKE_ORE: 5,
  SHAKE_SELL: 9,
  SHAKE_EXPLOSION: 22,
  SHAKE_ROCK: 14,
  SHAKE_DECAY: 9,
  BANNER_TIME: 1.8,
  CAMERA_DRILL_FRAC: 0.36,   // vertical position of the drill on screen
  CAMERA_LERP: 10,

  // ---- controls ----
  DRAG_DEADZONE: 14,         // px before a drag counts as a direction
  JOY_RADIUS: 60,            // px, the anchor follows the finger beyond this

  // ---- sound ----
  VOLUME: 0.5,
};
