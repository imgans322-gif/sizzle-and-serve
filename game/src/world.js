// The kitchen simulation: orders, the chef, prep stations, the plate, and the score. The
// world advances in fixed 1/60 s steps with a seeded random source, so the same seed always
// plays the same way. It never touches the DOM: the renderer paints `state`, main.js reads the
// events each step returns.
import {
  BINS, BIN_Y, BOARD, CHEF, DISHES, DISH_POOLS, INGREDIENTS, LEVEL, ORDER, PLATE,
  PREP, REPUTATION, SHIFT_SECONDS, STATIONS, TRASH,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_PLACE = 2;
export const EVENT_CHOP = 4;
export const EVENT_SIZZLE = 8;
export const EVENT_SERVE = 16;
export const EVENT_FAIL = 32;
export const EVENT_BURN = 64;
export const EVENT_MISTAKE = 128;
export const EVENT_OVER = 256;
export const EVENT_READY = 512;
export const EVENT_CLEAR = 1024;

const SKINS = ['#f2c9a0', '#d9a066', '#a06a3b', '#f7d7b0'];
const HAIRS = ['#2b2118', '#5a3a1a', '#8a8a8a', '#c94f30', '#3a2a5a'];
const SHIRTS = ['#4fc3f7', '#e5534b', '#58b368', '#f2c94c', '#b388eb', '#ff8a65'];

/** The plate can hold at most this many ingredients. */
const PLATE_MAX = 4;

/** Where the chef starts each shift. */
const CHEF_START = { x: 760, y: 520 };

/** Chef walk bounds: the kitchen floor, clear of the order board. */
const WALK = { minX: 312, maxX: 1262, minY: 352, maxY: 700 };

function makeCustomer(random) {
  return {
    skin: SKINS[Math.floor(random() * SKINS.length)],
    hair: HAIRS[Math.floor(random() * HAIRS.length)],
    shirt: SHIRTS[Math.floor(random() * SHIRTS.length)],
  };
}

function levelFor(time) {
  return Math.min(LEVEL.max, Math.floor(time / LEVEL.seconds) + 1);
}

function orderLifetime(level) {
  return Math.max(ORDER.minLifetime, ORDER.lifetime - ORDER.lifetimePerLevel * (level - 1));
}

function orderInterval(level) {
  return Math.max(ORDER.minInterval, ORDER.interval - ORDER.intervalPerLevel * (level - 1));
}

/** The dish a plate of `items` makes, or null when it matches no dish. */
export function dishForPlate(items) {
  if (items.length === 0) return null;
  const sorted = [...items].sort();
  for (const [key, dish] of Object.entries(DISHES)) {
    const want = [...dish.items].sort();
    if (want.length === sorted.length && want.every((item, i) => item === sorted[i])) return key;
  }
  return null;
}

/** Which order a finished plate should serve: the matching one with the least time left. */
function matchingOrder(state, dishKey) {
  let best = null;
  for (const order of state.orders) {
    if (order.dish !== dishKey) continue;
    if (best === null || order.timeLeft < best.timeLeft) best = order;
  }
  return best;
}

/** Distance from the chef to a point. */
function dist(chef, x, y) {
  return Math.hypot(chef.x - x, chef.y - y);
}

/** The nearest thing the chef can interact with right now, or null. */
export function nearestInteractable(state) {
  const chef = state.chef;
  let best = null;
  let bestDist = CHEF.interactRadius;
  function consider(kind, label, x, y, data) {
    const d = dist(chef, x, y);
    if (d < bestDist) {
      bestDist = d;
      best = { kind, label, x, y, data };
    }
  }
  for (const bin of BINS) consider('bin', `Pick up ${INGREDIENTS[bin.key].name}`, bin.x, BIN_Y, bin.key);
  for (const [name, station] of Object.entries(STATIONS)) {
    const item = state.stations[name];
    const cx = station.x + station.w / 2;
    const cy = station.y + station.h / 2;
    if (item !== null && item.state === 'ready') {
      consider('station', `Take ${INGREDIENTS[item.key].cookedName}`, cx, cy, name);
    } else if (item !== null && item.state === 'burnt') {
      consider('station', 'Take burnt food', cx, cy, name);
    } else if (item === null && chef.carrying !== null && INGREDIENTS[chef.carrying.key].prep === name) {
      consider('station', `Start ${name === 'chop' ? 'chopping' : name === 'grill' ? 'grilling' : name === 'fry' ? 'frying' : 'boiling'}`, cx, cy, name);
    } else if (item !== null) {
      consider('station', `${station.label} (${Math.ceil(PREP[name].seconds - item.progress)}s)`, cx, cy, name);
    } else {
      consider('station', station.label, cx, cy, name);
    }
  }
  const plateCx = PLATE.x + PLATE.w / 2;
  const plateCy = PLATE.y + PLATE.h / 2;
  if (chef.carrying !== null && chef.carrying.state === 'ready' && state.plate.length < PLATE_MAX) {
    consider('plate', `Add ${INGREDIENTS[chef.carrying.key].cookedName} to plate`, plateCx, plateCy, null);
  } else if (chef.carrying === null && state.plate.length > 0) {
    const dishKey = dishForPlate(state.plate);
    if (dishKey !== null && matchingOrder(state, dishKey) !== null) {
      consider('plate', `Serve ${DISHES[dishKey].name}!`, plateCx, plateCy, null);
    } else {
      consider('plate', 'Dump plate', plateCx, plateCy, null);
    }
  }
  consider('trash', 'Trash it', TRASH.x + TRASH.w / 2, TRASH.y + TRASH.h / 2, null);
  return best;
}

export function createWorld(random) {
  const state = {
    time: 0,
    level: 1,
    coins: 0,
    served: 0,
    failed: 0,
    combo: 0,
    bestCombo: 0,
    reputation: REPUTATION,
    nextOrderAt: ORDER.firstAt,
    nextOrderId: 1,
    orders: [],
    chef: { x: CHEF_START.x, y: CHEF_START.y, carrying: null, target: null, facing: 1 },
    stations: { grill: null, chop: null, fry: null, boil: null },
    plate: [],
    over: false,
    overReason: null,
  };

  function reset() {
    state.time = 0;
    state.level = 1;
    state.coins = 0;
    state.served = 0;
    state.failed = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.reputation = REPUTATION;
    state.nextOrderAt = ORDER.firstAt;
    state.nextOrderId = 1;
    state.orders = [];
    state.chef = { x: CHEF_START.x, y: CHEF_START.y, carrying: null, target: null, facing: 1 };
    state.stations = { grill: null, chop: null, fry: null, boil: null };
    state.plate = [];
    state.over = false;
    state.overReason = null;
  }

  function spawnOrder() {
    const level = state.level;
    const pool = DISH_POOLS[level - 1];
    const dishKey = pool[Math.floor(random() * pool.length)];
    const lifetime = orderLifetime(level);
    state.orders.push({
      id: state.nextOrderId,
      dish: dishKey,
      items: DISHES[dishKey].items.map((key) => ({ key, done: false })),
      timeLeft: lifetime,
      lifetime,
      customer: makeCustomer(random),
    });
    state.nextOrderId += 1;
    state.nextOrderAt = state.time + orderInterval(level) * (0.85 + random() * 0.3);
  }

  function failOrder(order) {
    state.orders = state.orders.filter((o) => o.id !== order.id);
    state.failed += 1;
    state.combo = 0;
    state.reputation -= 1;
    if (state.reputation <= 0) {
      state.over = true;
      state.overReason = 'reputation';
      return EVENT_FAIL | EVENT_OVER;
    }
    return EVENT_FAIL;
  }

  function servePlate() {
    const dishKey = dishForPlate(state.plate);
    if (dishKey === null) return 0;
    const order = matchingOrder(state, dishKey);
    if (order === null) return 0;
    state.orders = state.orders.filter((o) => o.id !== order.id);
    const tip = Math.ceil(10 * (order.timeLeft / order.lifetime));
    const comboBonus = state.combo * 2;
    const earned = DISHES[dishKey].coins + tip + comboBonus;
    state.coins += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.plate = [];
    return EVENT_SERVE;
  }

  function dumpPlate() {
    state.plate = [];
    return EVENT_CLEAR;
  }

  /** Do the context-sensitive action at the nearest interactable. Returns event flags. */
  function interact() {
    const target = nearestInteractable(state);
    if (target === null) return 0;
    const chef = state.chef;
    if (target.kind === 'bin') {
      if (chef.carrying !== null) return EVENT_MISTAKE;
      chef.carrying = { key: target.data, state: INGREDIENTS[target.data].prep === null ? 'ready' : 'raw' };
      return EVENT_PICKUP;
    }
    if (target.kind === 'station') {
      const name = target.data;
      const item = state.stations[name];
      if (item !== null && (item.state === 'ready' || item.state === 'burnt')) {
        if (chef.carrying !== null) return EVENT_MISTAKE;
        chef.carrying = { key: item.key, state: item.state };
        state.stations[name] = null;
        return EVENT_PICKUP;
      }
      if (item === null && chef.carrying !== null && chef.carrying.state === 'raw'
        && INGREDIENTS[chef.carrying.key].prep === name) {
        state.stations[name] = { key: chef.carrying.key, progress: 0, state: 'cooking' };
        chef.carrying = null;
        return name === 'chop' ? EVENT_CHOP : EVENT_SIZZLE;
      }
      return 0;
    }
    if (target.kind === 'plate') {
      if (chef.carrying !== null && chef.carrying.state === 'ready') {
        if (state.plate.length >= PLATE_MAX) return EVENT_MISTAKE;
        state.plate.push(chef.carrying.key);
        chef.carrying = null;
        return EVENT_PLACE;
      }
      if (chef.carrying === null && state.plate.length > 0) {
        if (dishForPlate(state.plate) !== null
          && matchingOrder(state, dishForPlate(state.plate)) !== null) {
          return servePlate();
        }
        return dumpPlate();
      }
      return 0;
    }
    if (target.kind === 'trash') {
      if (chef.carrying === null) return 0;
      chef.carrying = null;
      return EVENT_CLEAR;
    }
    return 0;
  }

  /** Where a click point should send the chef, and what to do on arrival. */
  function clickTarget(point) {
    // The serve button on a finished plate: serve at once.
    const dishKey = dishForPlate(state.plate);
    if (dishKey !== null && matchingOrder(state, dishKey) !== null) {
      const serve = { x: PLATE.x + PLATE.w / 2, y: PLATE.y + PLATE.h + 21, w: 120, h: 34 };
      if (point.x >= serve.x - serve.w / 2 && point.x <= serve.x + serve.w / 2
        && point.y >= serve.y - serve.h / 2 && point.y <= serve.y + serve.h / 2) {
        return { x: state.chef.x, y: state.chef.y, arrive: 'serve' };
      }
    }
    let best = null;
    let bestDist = 90;
    function consider(x, y, arrive) {
      const d = Math.hypot(point.x - x, point.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = { x, y, arrive };
      }
    }
    for (const bin of BINS) consider(bin.x, BIN_Y, 'interact');
    for (const [name, station] of Object.entries(STATIONS)) {
      consider(station.x + station.w / 2, station.y + station.h + 6, 'interact');
    }
    consider(PLATE.x + 15, PLATE.y + PLATE.h / 2, 'interact');
    consider(TRASH.x + TRASH.w / 2, TRASH.y + TRASH.h + 8, 'interact');
    if (best !== null) return best;
    // A click on open floor: just walk there.
    return { x: Math.max(WALK.minX, Math.min(WALK.maxX, point.x)),
      y: Math.max(WALK.minY, Math.min(WALK.maxY, point.y)), arrive: null };
  }

  /** One fixed step. `move` is a normalised {x, y} or null; `press` is a one-shot interact. */
  function step(dt, move, press, click) {
    if (state.over) return 0;
    let events = 0;
    state.time += dt;
    state.level = levelFor(state.time);

    if (click !== null && click !== undefined) {
      state.chef.target = clickTarget(click);
    }
    if (move !== null && move !== undefined) {
      state.chef.target = null;
    }

    // Move the chef: keys steer directly, a click target steers toward its point.
    const chef = state.chef;
    let mx = 0;
    let my = 0;
    if (move !== null && move !== undefined) {
      mx = move.x;
      my = move.y;
    } else if (chef.target !== null) {
      const dx = chef.target.x - chef.x;
      const dy = chef.target.y - chef.y;
      const d = Math.hypot(dx, dy);
      if (d <= 12) {
        const arrive = chef.target.arrive;
        chef.target = null;
        if (arrive === 'serve') events |= servePlate();
        else if (arrive === 'interact') events |= interact();
      } else {
        mx = dx / d;
        my = dy / d;
      }
    }
    if (mx !== 0 || my !== 0) {
      chef.x = Math.max(WALK.minX, Math.min(WALK.maxX, chef.x + mx * CHEF.speed * dt));
      chef.y = Math.max(WALK.minY, Math.min(WALK.maxY, chef.y + my * CHEF.speed * dt));
      if (mx !== 0) chef.facing = mx > 0 ? 1 : -1;
    }
    if (press) events |= interact();

    // Cook what is on the stations; food left too long burns.
    for (const [name, item] of Object.entries(state.stations)) {
      if (item === null || item.state !== 'cooking') continue;
      item.progress += dt;
      if (item.progress >= PREP[name].seconds && item.state === 'cooking') {
        item.state = 'ready';
        events |= EVENT_READY;
      }
      if (item.progress >= PREP[name].burnAfter) {
        item.state = 'burnt';
        events |= EVENT_BURN;
      }
    }

    // Orders arrive, tick down, and fail when their timer runs out.
    if (state.time >= state.nextOrderAt && state.orders.length < ORDER.maxActive) spawnOrder();
    for (const order of [...state.orders]) {
      order.timeLeft -= dt;
      if (order.timeLeft <= 0) events |= failOrder(order);
    }
    // Which ingredients of each order are already on the plate (for the checkmarks).
    for (const order of state.orders) {
      const remaining = [...state.plate];
      for (const item of order.items) {
        const index = remaining.indexOf(item.key);
        item.done = index !== -1;
        if (index !== -1) remaining.splice(index, 1);
      }
    }

    if (state.time >= SHIFT_SECONDS) {
      state.over = true;
      state.overReason = 'time';
      events |= EVENT_OVER;
    }
    return events;
  }

  return { state, reset, step, nearestInteractable: () => nearestInteractable(state), dishForPlate };
}
