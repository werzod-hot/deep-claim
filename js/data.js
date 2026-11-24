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
    { name: 'Coal',    min: 5,   max: 40,  value: 5,   color: '#1d1d24', shine: '#7d7d90', glint: '#9a9ab8', veins: 16, veinSize: [3, 6] },
    { name: 'Copper',  min: 20,  max: 80,  value: 15,  color: '#e2793a', shine: '#ffc08a', glint: '#e2793a', veins: 20, veinSize: [3, 6] },
    { name: 'Silver',  min: 60,  max: 120, value: 40,  color: '#d5dde8', shine: '#ffffff', glint: '#d5dde8', veins: 18, veinSize: [3, 5] },
    { name: 'Gold',    min: 100, max: 170, value: 100, color: '#ffcf1f', shine: '#fff6b0', glint: '#ffcf1f', veins: 18, veinSize: [3, 5] },
    { name: 'Crystal', min: 150, max: 200, value: 300, color: '#55efff', shine: '#ffffff', glint: '#55efff', veins: 12, veinSize: [2, 4] },
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
  SND: {
    DIG_VOL: 0.35, DIG_F_TOP: 1500, DIG_F_BOTTOM: 420,      // crunch filter: high near the top, low deep down
    DIG_THUD_TOP: 190, DIG_THUD_BOTTOM: 70,
    ORE_VOL: 0.2, ORE_BASE: 660, ORE_OCTAVES: 1.6,          // chime pitch rises with ore value over this many octaves
    UP_VOL: 0.15,
    BEEP_VOL: 0.16, BEEP_FREQ: 880, BEEP_EVERY: 1.0,        // low fuel
    DRONE_VOL: 0.1, DRONE_F_TOP: 72, DRONE_F_BOTTOM: 36, DRONE_FADE_DEPTH: 6,
  },
  MUTE_KEY: 'deepclaim.mute',

  // ---- art: depth bands (from = depth in tiles). Palette: base, hi (top bevel), lo (bottom bevel), dark/light speckles ----
  BAND_BLEND: 3,             // tiles over which neighbouring bands blend
  BACK_DARK: 0.30,           // brightness of the dug-tunnel back wall relative to the band colour
  SHADOW_FRAC: 0.30, SHADOW_A: 0.55,   // soft inner shadow of tunnel edges
  BANDS: [
    { name: 'Topsoil', from: 0,   style: 'pebbles',    base: '#a0713f', hi: '#c0905a', lo: '#69462a', dark: '#74502e', light: '#cfa672' },
    { name: 'Clay',    from: 20,  style: 'streaks',    base: '#9a4a35', hi: '#b8664f', lo: '#64301f', dark: '#78372a', light: '#c97c60' },
    { name: 'Stone',   from: 60,  style: 'cracks',     base: '#5f6b7e', hi: '#7f8da2', lo: '#3a4352', dark: '#465063', light: '#94a2b6' },
    { name: 'Basalt',  from: 120, style: 'glowcracks', base: '#3f3a4c', hi: '#585270', lo: '#221e2c', dark: '#2b2736', light: '#686080', crack: '#ff7a30' },
    { name: 'Crystal', from: 150, style: 'crystal',    base: '#17171f', hi: '#2a2a3a', lo: '#0a0a10', dark: '#0e0e15', light: '#30313f', speck: '#4fe6ff' },
  ],

  // ---- art: light below LIGHT_FROM (radius in tiles) ----
  LIGHT_FROM: 15,
  LIGHT_RADIUS_TOP: 7,
  LIGHT_RADIUS_BOTTOM: 3.5,
  LIGHT_RAMP: 5,             // tiles over which the darkness fades in
  LIGHT_DARK: 0.94,          // darkness alpha outside the light
  LIGHT_TINT: '4,6,14',
  GLINT_ORE: 0.7, GLINT_GAS: 0.25, GLINT_MAGMA: 0.3, GLINT_TUNNEL: 0.10,

  // ---- art: surface ----
  SKY: ['#2c68b0', '#79bde6', '#ffdfa6'],
  HILL_FAR: '#6e9f8c', HILL_NEAR: '#4f8a4a', GRASS: '#58b040', GRASS_DARK: '#3a7a2c',
  CLOUD_COLOR: 'rgba(255,255,255,0.86)',

  // ---- art: drill ----
  DRILL_BODY: '#ffb21f', DRILL_BODY_OFF: '#8a8f99', DRILL_OUTLINE: '#7a4a00', DRILL_OUTLINE_OFF: '#4d5159',
  DRILL_GLASS: '#2b4a6e', DRILL_TREAD: '#2a2d36',
};
