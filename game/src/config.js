// Every tuning number, colour, dish and layout value in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule depends on the screen.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts this long; serving orders well is what the score is. */
export const SHIFT_SECONDS = 150;

export const CHEF = { radius: 22, speed: 300, interactRadius: 88 };

export const REPUTATION = 3;

/** How long an order lives before it fails, and how the level tightens it. */
export const ORDER = {
  firstAt: 2,
  interval: 13,
  intervalPerLevel: 1.2,
  minInterval: 7,
  lifetime: 52,
  lifetimePerLevel: 3,
  minLifetime: 34,
  maxActive: 3,
};

/** Seconds of play per level; recipes grow longer and timers shorter as levels rise. */
export const LEVEL = { seconds: 45, max: 6 };

/** Prep stations: what each one cooks, how long it takes, and when it burns. */
export const PREP = {
  grill: { seconds: 4, burnAfter: 9 },
  chop: { seconds: 2, burnAfter: Infinity },
  fry: { seconds: 5, burnAfter: 10 },
  boil: { seconds: 5, burnAfter: 10 },
};

/** Ingredients. `prep` names the station that must process it (null = ready to plate as-is). */
export const INGREDIENTS = {
  bun: { name: 'Bun', prep: null, color: '#e8b25c' },
  patty: { name: 'Patty', prep: 'grill', color: '#7a4a2b', cookedName: 'Grilled Patty' },
  lettuce: { name: 'Lettuce', prep: 'chop', color: '#58b368', cookedName: 'Chopped Lettuce' },
  tomato: { name: 'Tomato', prep: 'chop', color: '#e5534b', cookedName: 'Sliced Tomato' },
  cheese: { name: 'Cheese', prep: null, color: '#f2c94c' },
  onion: { name: 'Onion', prep: 'chop', color: '#b388eb', cookedName: 'Diced Onion' },
  fries: { name: 'Fries', prep: 'fry', color: '#f5d76e', cookedName: 'Golden Fries' },
  pasta: { name: 'Pasta', prep: 'boil', color: '#f0d9a0', cookedName: 'Boiled Pasta' },
  sauce: { name: 'Sauce', prep: null, color: '#d94f30' },
  dough: { name: 'Dough', prep: null, color: '#e8d5a3' },
};

/** Dishes. `items` are ingredient keys in plating order; `coins` is the base pay. */
export const DISHES = {
  burger: { name: 'Classic Burger', items: ['bun', 'patty', 'lettuce'], coins: 12, color: '#e8b25c' },
  cheeseburger: { name: 'Cheeseburger', items: ['bun', 'patty', 'cheese', 'tomato'], coins: 16, color: '#f2c94c' },
  salad: { name: 'Garden Salad', items: ['lettuce', 'tomato', 'onion'], coins: 10, color: '#58b368' },
  pasta: { name: 'Pasta Marinara', items: ['pasta', 'sauce'], coins: 11, color: '#d94f30' },
  taco: { name: 'Crunchy Taco', items: ['dough', 'patty', 'cheese', 'sauce'], coins: 17, color: '#e8b25c' },
  fries: { name: 'Fries Basket', items: ['fries', 'sauce'], coins: 9, color: '#f5d76e' },
};

/** Dish pools per level: early levels keep recipes short, later levels add the long ones. */
export const DISH_POOLS = [
  ['burger', 'salad', 'pasta', 'fries'],
  ['burger', 'cheeseburger', 'salad', 'pasta', 'fries'],
  ['burger', 'cheeseburger', 'salad', 'pasta', 'taco', 'fries'],
  ['cheeseburger', 'salad', 'pasta', 'taco', 'fries'],
  ['cheeseburger', 'taco', 'pasta', 'salad'],
  ['cheeseburger', 'taco', 'pasta'],
];

/** Ingredient bins along the bottom counter, left to right. */
export const BINS = [
  { key: 'bun', x: 350, label: 'Bun' },
  { key: 'patty', x: 440, label: 'Patty' },
  { key: 'lettuce', x: 530, label: 'Lettuce' },
  { key: 'tomato', x: 620, label: 'Tomato' },
  { key: 'cheese', x: 710, label: 'Cheese' },
  { key: 'onion', x: 800, label: 'Onion' },
  { key: 'fries', x: 890, label: 'Fries' },
  { key: 'pasta', x: 980, label: 'Pasta' },
  { key: 'sauce', x: 1070, label: 'Sauce' },
  { key: 'dough', x: 1160, label: 'Dough' },
];
export const BIN_Y = 648;

/** Prep stations on the kitchen floor. */
export const STATIONS = {
  grill: { x: 420, y: 250, w: 150, h: 84, label: 'GRILL', color: '#3a3f4a' },
  chop: { x: 640, y: 250, w: 150, h: 84, label: 'CHOP BOARD', color: '#8a6b46' },
  fry: { x: 860, y: 250, w: 150, h: 84, label: 'FRYER', color: '#4a5a7a' },
  boil: { x: 1080, y: 250, w: 150, h: 84, label: 'BOIL POT', color: '#5a4a7a' },
};

/** The plating station: where a dish is assembled and served from. */
export const PLATE = { x: 1080, y: 470, w: 170, h: 110 };

/** The trash can: dumps whatever the chef is carrying, or a burnt item. */
export const TRASH = { x: 1215, y: 470, w: 52, h: 64 };

/** The order board occupies the left of the screen. */
export const BOARD = { x: 16, y: 84, w: 280, h: 460 };

export const PALETTE = {
  backdrop: '#1c1712',
  floor: '#2b2118',
  floorTile: '#332819',
  wall: '#171310',
  hud: '#241c15',
  panel: '#2e251b',
  panelEdge: '#4a3823',
  text: '#f5ead6',
  muted: '#b8a88f',
  gold: '#f2c94c',
  green: '#58b368',
  red: '#e5534b',
  blue: '#4fc3f7',
  cream: '#f7ead0',
  counter: '#6b4a2f',
  counterTop: '#8a6b46',
  steel: '#9aa5b1',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best coins total is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
