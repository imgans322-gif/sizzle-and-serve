// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot that
// works out what the most urgent order needs and walks the chef there, so the frame is what a
// real game looks like and the same seed always gives the same frame.
import { BINS, BIN_Y, DISHES, INGREDIENTS, PLATE, STATIONS, STEP, TRASH } from './config.js';
import { createRandom } from './random.js';
import { dishForPlate } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_LIMIT_SECONDS = 45;
const SERVE_LIMIT_SECONDS = 120;
const END_LIMIT_SECONDS = 600;

/** Points the autopilot clicks: bins, stations, the plate, the serve button, the trash. */
function stationPoint(name) {
  const s = STATIONS[name];
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}
function binPoint(key) {
  const bin = BINS.find((b) => b.key === key);
  return { x: bin.x, y: BIN_Y };
}
const PLATE_POINT = { x: PLATE.x + PLATE.w / 2, y: PLATE.y + PLATE.h / 2 };
const SERVE_POINT = { x: PLATE.x + PLATE.w / 2, y: PLATE.y + PLATE.h + 21 };
const TRASH_POINT = { x: TRASH.x + TRASH.w / 2, y: TRASH.y + TRASH.h / 2 };

/**
 * The autopilot's next click, or null to wait. `careless` plays badly on purpose (wrong
 * ingredients, slow pickups) so the end scene shows a shift that went wrong.
 */
function nextClick(world, careless, rng) {
  const state = world.state;
  const chef = state.chef;
  // The most urgent order is the one with the least time left.
  let order = null;
  for (const o of state.orders) {
    if (order === null || o.timeLeft < order.timeLeft) order = o;
  }
  // A finished plate that matches an order is served at once.
  const dishKey = dishForPlate(state.plate);
  if (dishKey !== null && state.orders.some((o) => o.dish === dishKey)) {
    return SERVE_POINT;
  }
  // Burnt food goes straight in the trash.
  if (chef.carrying !== null && chef.carrying.state === 'burnt') return TRASH_POINT;
  // A ready ingredient in hand goes on the plate.
  if (chef.carrying !== null && chef.carrying.state === 'ready') return PLATE_POINT;
  // Raw food in hand goes to its prep station; if that station is busy, the raw food is
  // dumped so the chef never stalls holding it with nowhere to put it.
  if (chef.carrying !== null && chef.carrying.state === 'raw') {
    const prep = INGREDIENTS[chef.carrying.key].prep;
    if (state.stations[prep] !== null) return TRASH_POINT;
    return stationPoint(prep);
  }
  // A plate that can no longer become the urgent order's dish gets dumped.
  if (chef.carrying === null && state.plate.length > 0 && order !== null) {
    const recipe = [...DISHES[order.dish].items];
    const compatible = state.plate.every((key) => {
      const i = recipe.indexOf(key);
      if (i === -1) return false;
      recipe.splice(i, 1);
      return true;
    });
    if (!compatible) return PLATE_POINT;
  }
  // Nothing in hand: collect what the most urgent order still needs.
  if (order !== null) {
    // What is already on the plate, in a station, or in hand does not need fetching again.
    const inFlight = new Set(state.plate);
    for (const item of Object.values(state.stations)) {
      if (item !== null) inFlight.add(item.key);
    }
    if (chef.carrying !== null) inFlight.add(chef.carrying.key);
    const recipe = DISHES[order.dish].items;
    const missing = recipe.filter((key) => !inFlight.has(key));
    if (missing.length > 0) {
      // Only fetch an ingredient whose prep station is free right now: fetching a second
      // item for a busy station leaves the chef holding raw food with nowhere to put it.
      const fetchable = missing.filter((key) => {
        const prep = INGREDIENTS[key].prep;
        return prep === null || state.stations[prep] === null;
      });
      if (fetchable.length > 0) {
        // A careless chef sometimes grabs the wrong ingredient entirely.
        if (careless && rng() < 0.35) {
          const wrong = Object.keys(INGREDIENTS).filter((k) => !recipe.includes(k));
          return binPoint(wrong[Math.floor(rng() * wrong.length)]);
        }
        return binPoint(fetchable[0]);
      }
      // Everything missing is stuck behind a busy station: collect the finished item first.
      for (const [name, item] of Object.entries(state.stations)) {
        if (item !== null && item.state === 'ready') return stationPoint(name);
      }
      return null;
    }
    // Everything the order needs is already in flight: wait for a station to finish.
    for (const [name, item] of Object.entries(state.stations)) {
      if (item !== null && item.state === 'ready') {
        if (careless && rng() < 0.5) return null; // dawdle: the food may burn.
        return stationPoint(name);
      }
    }
    return null;
  }
  return null;
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start) and
 * return the screen to draw over it and the coins total to show.
 */
export function stageShot(name, world) {
  const rng = createRandom(12345);
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, null, false, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const careless = name === 'end';
  const limit = name === 'serve' ? SERVE_LIMIT_SECONDS : name === 'play' ? PLAY_LIMIT_SECONDS : END_LIMIT_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    const state = world.state;
    if (state.over) break;
    if (name === 'serve') {
      const dishKey = dishForPlate(state.plate);
      if (dishKey !== null && state.orders.some((o) => o.dish === dishKey)) break;
    }
    if (name === 'play') {
      // Stop once a dish is visibly mid-assembly on the plate, an order or two is on the
      // board, and something is still cooking or in hand: the fullest kitchen frame.
      const cooking = Object.values(state.stations).some((item) => item !== null && item.state === 'cooking');
      if (state.time >= 14 && state.plate.length >= 1 && state.orders.length >= 2
        && (cooking || state.chef.carrying !== null)) break;
    }
    if (state.chef.target === null) {
      const click = nextClick(world, careless, rng);
      world.step(STEP, null, false, click);
    } else {
      world.step(STEP, null, false, null);
    }
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.coins };
}
