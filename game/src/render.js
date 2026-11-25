// All canvas drawing: the kitchen, the order board, the chef, the HUD and the screens. The
// renderer only paints `state` — it never changes it — so a screenshot is a faithful frame of
// the game. Animations (steam, pulses) read `state.time`, so staged shots are deterministic.
import {
  BINS, BIN_Y, BOARD, CHEF, DISHES, FIELD, INGREDIENTS, PALETTE, PLATE, SHIFT_SECONDS,
  STATIONS, TRASH,
} from './config.js';
import { dishForPlate } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '600') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${'system-ui, -apple-system, "Segoe UI", sans-serif'}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** Draw one ingredient as a small vector icon. `state` is raw | ready | burnt. */
export function drawIngredient(ctx, key, x, y, size, itemState = 'ready') {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (itemState === 'burnt') {
    ctx.fillStyle = '#1c1712';
    circle(ctx, 0, 0, s * 0.9);
    ctx.fill();
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 2;
    circle(ctx, 0, 0, s * 0.9);
    ctx.stroke();
    ctx.fillStyle = '#8a7a6a';
    circle(ctx, -s * 0.3, -s * 0.2, s * 0.16);
    ctx.fill();
    circle(ctx, s * 0.3, s * 0.25, s * 0.14);
    ctx.fill();
    ctx.restore();
    return;
  }
  switch (key) {
    case 'bun': {
      ctx.fillStyle = '#e8b25c';
      ctx.beginPath();
      ctx.arc(0, s * 0.15, s * 0.9, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d99a3d';
      ctx.fillRect(-s * 0.9, s * 0.1, s * 1.8, s * 0.28);
      ctx.fillStyle = '#fff3d6';
      circle(ctx, -s * 0.4, -s * 0.45, s * 0.09);
      ctx.fill();
      circle(ctx, s * 0.35, -s * 0.55, s * 0.09);
      ctx.fill();
      circle(ctx, 0, -s * 0.2, s * 0.09);
      ctx.fill();
      break;
    }
    case 'patty': {
      ctx.fillStyle = itemState === 'raw' ? '#b06a5a' : '#6b3d22';
      roundRect(ctx, -s * 0.95, -s * 0.42, s * 1.9, s * 0.84, s * 0.3);
      ctx.fill();
      if (itemState === 'ready') {
        ctx.strokeStyle = '#4a2a16';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.moveTo(-s * 0.6 + i * s * 0.5, -s * 0.3);
          ctx.lineTo(-s * 0.4 + i * s * 0.5, s * 0.3);
          ctx.stroke();
        }
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#58b368';
      for (const [dx, dy, r] of [[-0.45, 0.1, 0.5], [0.45, 0.1, 0.5], [0, -0.35, 0.55]]) {
        circle(ctx, dx * s, dy * s, r * s);
        ctx.fill();
      }
      ctx.strokeStyle = '#3d8a4a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.7);
      ctx.lineTo(0, s * 0.5);
      ctx.stroke();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#e5534b';
      circle(ctx, 0, s * 0.1, s * 0.85);
      ctx.fill();
      ctx.fillStyle = '#58b368';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(-s * 0.35, -s * 0.95);
      ctx.lineTo(0, -s * 0.7);
      ctx.lineTo(s * 0.35, -s * 0.95);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, s * 0.6);
      ctx.lineTo(s * 0.9, s * 0.6);
      ctx.lineTo(0, -s * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d9a92e';
      circle(ctx, -s * 0.25, s * 0.25, s * 0.14);
      ctx.fill();
      circle(ctx, s * 0.3, s * 0.05, s * 0.11);
      ctx.fill();
      break;
    }
    case 'onion': {
      ctx.strokeStyle = '#b388eb';
      ctx.lineWidth = s * 0.22;
      for (const r of [0.85, 0.6, 0.35]) {
        circle(ctx, 0, 0, r * s);
        ctx.stroke();
      }
      ctx.fillStyle = '#e8d5f5';
      circle(ctx, 0, 0, s * 0.14);
      ctx.fill();
      break;
    }
    case 'fries': {
      ctx.fillStyle = '#f5d76e';
      for (let i = -1; i <= 1; i += 1) {
        ctx.fillRect(i * s * 0.42 - s * 0.14, -s * 0.9, s * 0.28, s * 1.1);
      }
      ctx.fillStyle = '#d94f30';
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, -s * 0.1);
      ctx.lineTo(s * 0.85, -s * 0.1);
      ctx.lineTo(s * 0.6, s * 0.85);
      ctx.lineTo(-s * 0.6, s * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      circle(ctx, 0, s * 0.35, s * 0.16);
      ctx.fill();
      break;
    }
    case 'pasta': {
      ctx.strokeStyle = '#f0d9a0';
      ctx.lineWidth = s * 0.2;
      for (const r of [0.8, 0.55, 0.3]) {
        ctx.beginPath();
        ctx.arc(0, 0, r * s, 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
      }
      ctx.fillStyle = '#d94f30';
      circle(ctx, s * 0.4, -s * 0.4, s * 0.18);
      ctx.fill();
      break;
    }
    case 'sauce': {
      ctx.fillStyle = '#d94f30';
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.2);
      ctx.quadraticCurveTo(0, -s * 1.1, s * 0.55, -s * 0.2);
      ctx.lineTo(s * 0.4, s * 0.6);
      ctx.quadraticCurveTo(0, s * 0.95, -s * 0.4, s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      circle(ctx, -s * 0.2, -s * 0.35, s * 0.12);
      ctx.fill();
      break;
    }
    case 'dough': {
      ctx.fillStyle = '#e8d5a3';
      circle(ctx, 0, 0, s * 0.9);
      ctx.fill();
      ctx.strokeStyle = '#c9ae72';
      ctx.lineWidth = 2;
      circle(ctx, 0, 0, s * 0.65);
      ctx.stroke();
      ctx.fillStyle = '#fff8e6';
      circle(ctx, -s * 0.3, -s * 0.3, s * 0.14);
      ctx.fill();
      circle(ctx, s * 0.35, s * 0.25, s * 0.12);
      ctx.fill();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/** A little customer face: skin, hair, shirt and a smile. */
function drawCustomer(ctx, customer, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = customer.shirt;
  roundRect(ctx, -r, r * 0.35, r * 2, r * 1.1, r * 0.4);
  ctx.fill();
  ctx.fillStyle = customer.skin;
  circle(ctx, 0, 0, r);
  ctx.fill();
  ctx.fillStyle = customer.hair;
  ctx.beginPath();
  ctx.arc(0, -r * 0.15, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1c1712';
  circle(ctx, -r * 0.35, -r * 0.05, r * 0.09);
  ctx.fill();
  circle(ctx, r * 0.35, -r * 0.05, r * 0.09);
  ctx.fill();
  ctx.strokeStyle = '#1c1712';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Checkerboard tiles, warm and subtle.
  ctx.fillStyle = PALETTE.floorTile;
  const tile = 64;
  for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
    for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
      if ((tx + ty) % 2 === 0) ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }
  // Wall band along the top, behind the HUD.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, FIELD.width, 64);
  ctx.fillStyle = '#241c15';
  ctx.fillRect(0, 64, FIELD.width, 6);
}

function drawBoard(ctx, state) {
  const { x, y, w, h } = BOARD;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
  text(ctx, 'ORDER BOARD', x + w / 2, y + 22, 17, PALETTE.gold, 'center', '800');
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(x + 14, y + 38, w - 28, 2);
  const slotH = 128;
  for (let i = 0; i < 3; i += 1) {
    const sy = y + 50 + i * (slotH + 8);
    const order = state.orders[i];
    ctx.fillStyle = order === undefined ? 'rgba(0,0,0,0.18)' : '#3a2c1c';
    roundRect(ctx, x + 10, sy, w - 20, slotH, 10);
    ctx.fill();
    if (order === undefined) {
      text(ctx, 'waiting for orders…', x + w / 2, sy + slotH / 2, 14, PALETTE.muted, 'center');
      continue;
    }
    const dish = DISHES[order.dish];
    drawCustomer(ctx, order.customer, x + 34, sy + 30, 20);
    text(ctx, dish.name, x + 64, sy + 20, 16, PALETTE.text, 'left', '700');
    // Ingredient chips with checkmarks as they land on the plate.
    let chipX = x + 64;
    for (const item of order.items) {
      const ing = INGREDIENTS[item.key];
      ctx.fillStyle = item.done ? '#2e5238' : '#241c15';
      roundRect(ctx, chipX, sy + 38, 62, 52, 8);
      ctx.fill();
      ctx.strokeStyle = item.done ? PALETTE.green : '#4a3823';
      ctx.lineWidth = 1.5;
      roundRect(ctx, chipX, sy + 38, 62, 52, 8);
      ctx.stroke();
      drawIngredient(ctx, item.key, chipX + 31, sy + 58, 26, 'ready');
      text(ctx, ing.name, chipX + 31, sy + 82, 9, item.done ? PALETTE.green : PALETTE.muted, 'center');
      if (item.done) {
        ctx.strokeStyle = PALETTE.green;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(chipX + 44, sy + 44);
        ctx.lineTo(chipX + 50, sy + 51);
        ctx.lineTo(chipX + 60, sy + 40);
        ctx.stroke();
      }
      chipX += 68;
    }
    // Countdown bar: green to red as the order's time runs out.
    const frac = Math.max(0, order.timeLeft / order.lifetime);
    const barW = w - 20;
    ctx.fillStyle = '#241c15';
    roundRect(ctx, x + 10, sy + slotH - 18, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? PALETTE.gold : PALETTE.red;
    roundRect(ctx, x + 10, sy + slotH - 18, barW * frac, 10, 5);
    ctx.fill();
    text(ctx, `${Math.ceil(order.timeLeft)}s`, x + w - 16, sy + slotH - 30, 12, frac > 0.25 ? PALETTE.text : PALETTE.red, 'right', '700');
  }
  text(ctx, 'Serve the dish before its timer runs out!', x + w / 2, y + h - 12, 12, PALETTE.muted, 'center');
}

function drawStation(ctx, state, name, station) {
  const { x, y, w, h } = station;
  const item = state.stations[name];
  ctx.fillStyle = '#1c1712';
  roundRect(ctx, x + 4, y + 8, w, h, 12);
  ctx.fill();
  ctx.fillStyle = station.color;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  text(ctx, station.label, x + w / 2, y + 16, 13, '#e8dcc8', 'center', '800');
  const cx = x + w / 2;
  const cy = y + 48;
  if (item === null) {
    text(ctx, name === 'chop' ? 'place food to chop' : 'empty', cx, cy, 12, PALETTE.muted, 'center');
    return;
  }
  drawIngredient(ctx, item.key, cx, cy, 44, item.state);
  if (item.state === 'cooking') {
    const frac = Math.min(1, item.progress / 4);
    ctx.fillStyle = '#241c15';
    roundRect(ctx, x + 12, y + h - 14, w - 24, 8, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, x + 12, y + h - 14, (w - 24) * frac, 8, 4);
    ctx.fill();
    // Steam wisps while cooking.
    const t = state.time;
    ctx.strokeStyle = 'rgba(245,234,214,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const phase = (t * 0.9 + i * 0.7) % 1;
      ctx.beginPath();
      ctx.moveTo(cx - 24 + i * 24, y + 6 - phase * 14);
      ctx.quadraticCurveTo(cx - 20 + i * 24, y - 2 - phase * 14, cx - 24 + i * 24, y - 8 - phase * 14);
      ctx.stroke();
    }
  } else if (item.state === 'ready') {
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 5);
    ctx.strokeStyle = `rgba(88,179,104,${pulse})`;
    ctx.lineWidth = 3;
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 10);
    ctx.stroke();
    text(ctx, 'READY!', cx, y + h - 26, 13, PALETTE.green, 'center', '800');
  } else if (item.state === 'burnt') {
    text(ctx, 'BURNT!', cx, y + h - 26, 13, PALETTE.red, 'center', '800');
  }
}

function drawCounter(ctx, state) {
  // The long counter along the bottom holds every ingredient bin.
  ctx.fillStyle = PALETTE.counter;
  roundRect(ctx, 312, BIN_Y - 52, FIELD.width - 312 - 12, 96, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.counterTop;
  roundRect(ctx, 312, BIN_Y - 52, FIELD.width - 312 - 12, 14, 7);
  ctx.fill();
  text(ctx, 'INGREDIENTS', 330, BIN_Y - 34, 13, '#e8dcc8', 'left', '800');
  for (const bin of BINS) {
    const ing = INGREDIENTS[bin.key];
    ctx.fillStyle = '#3a2c1c';
    roundRect(ctx, bin.x - 36, BIN_Y - 30, 72, 62, 10);
    ctx.fill();
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bin.x - 36, BIN_Y - 30, 72, 62, 10);
    ctx.stroke();
    drawIngredient(ctx, bin.key, bin.x, BIN_Y - 8, 34, 'ready');
    text(ctx, bin.label, bin.x, BIN_Y + 22, 11, PALETTE.text, 'center');
  }
}

function drawPlate(ctx, state) {
  const { x, y, w, h } = PLATE;
  const dishKey = dishForPlate(state.plate);
  const serving = dishKey !== null && state.orders.some((o) => o.dish === dishKey);
  ctx.fillStyle = '#1c1712';
  roundRect(ctx, x + 4, y + 8, w, h, 12);
  ctx.fill();
  ctx.fillStyle = '#3a2c1c';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = serving ? PALETTE.green : '#5a4a3a';
  ctx.lineWidth = serving ? 3 : 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  text(ctx, 'PLATING', x + w / 2, y + 16, 13, '#e8dcc8', 'center', '800');
  // The plate itself, with the dish stacked on it layer by layer.
  const px = x + w / 2;
  const py = y + 62;
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.ellipse(px, py, 58, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9b48a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(px, py, 58, 20, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (state.plate.length === 0) {
    text(ctx, 'plate is empty', px, py, 12, PALETTE.muted, 'center');
  } else {
    state.plate.forEach((key, i) => {
      drawIngredient(ctx, key, px + (i % 2 === 0 ? -14 : 14), py - 6 - i * 7, 30, 'ready');
    });
  }
  if (dishKey !== null) {
    text(ctx, DISHES[dishKey].name, px, y + h - 12, 12, serving ? PALETTE.green : PALETTE.gold, 'center', '700');
  }
  if (serving) {
    // The serve button pulses so it cannot be missed.
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 6);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.green;
    roundRect(ctx, px - 60, y + h + 4, 120, 34, 10);
    ctx.fill();
    ctx.restore();
    text(ctx, 'SERVE!', px, y + h + 21, 16, '#12351c', 'center', '800');
  } else if (state.plate.length > 0) {
    text(ctx, 'E: dump plate', px, y + h + 27, 12, PALETTE.muted, 'center');
  }
  // Trash can.
  ctx.fillStyle = '#5a6068';
  roundRect(ctx, TRASH.x, TRASH.y, TRASH.w, TRASH.h, 8);
  ctx.fill();
  ctx.fillStyle = '#7a828c';
  roundRect(ctx, TRASH.x - 4, TRASH.y - 6, TRASH.w + 8, 10, 5);
  ctx.fill();
  text(ctx, 'TRASH', TRASH.x + TRASH.w / 2, TRASH.y + TRASH.h / 2, 10, '#e8e8e8', 'center', '800');
}

function drawChef(ctx, state) {
  const chef = state.chef;
  ctx.save();
  ctx.translate(chef.x, chef.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 20, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: white apron over a shirt.
  ctx.fillStyle = '#f7f7f7';
  roundRect(ctx, -16, -6, 32, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(-16, 8, 32, 6);
  // Head and toque.
  ctx.fillStyle = '#f2c9a0';
  circle(ctx, 0, -16, 13);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -26, 13, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-13, -30, 26, 8);
  // Eyes look the way the chef faces.
  ctx.fillStyle = '#1c1712';
  circle(ctx, chef.facing * 4 - 4, -16, 2);
  ctx.fill();
  circle(ctx, chef.facing * 4 + 4, -16, 2);
  ctx.fill();
  // Whatever the chef carries, held high above the hat.
  if (chef.carrying !== null) {
    drawIngredient(ctx, chef.carrying.key, 0, -52, 34, chef.carrying.state);
    if (chef.carrying.state === 'burnt') {
      text(ctx, 'burnt!', 0, -72, 11, PALETTE.red, 'center', '700');
    }
  }
  ctx.restore();
}

function drawHud(ctx, state, muted) {
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, FIELD.width, 64);
  text(ctx, 'SIZZLE & SERVE', 20, 32, 24, PALETTE.gold, 'left', '800');
  // Shift timer.
  const remain = Math.max(0, SHIFT_SECONDS - state.time);
  const mm = Math.floor(remain / 60);
  const ss = Math.floor(remain % 60).toString().padStart(2, '0');
  text(ctx, `${mm}:${ss}`, 330, 24, 22, remain < 20 ? PALETTE.red : PALETTE.text, 'left', '800');
  text(ctx, 'SHIFT', 330, 48, 10, PALETTE.muted, 'left');
  ctx.fillStyle = '#241c15';
  roundRect(ctx, 400, 42, 120, 8, 4);
  ctx.fill();
  ctx.fillStyle = remain < 20 ? PALETTE.red : PALETTE.gold;
  roundRect(ctx, 400, 42, 120 * (remain / SHIFT_SECONDS), 8, 4);
  ctx.fill();
  // Coins, served, combo.
  text(ctx, `Coins ${state.coins}`, 560, 32, 22, PALETTE.gold, 'left', '800');
  text(ctx, `served ${state.served}`, 700, 32, 16, PALETTE.text, 'left');
  if (state.combo >= 2) {
    text(ctx, `COMBO x${state.combo}`, 820, 32, 18, '#ff8a65', 'left', '800');
  }
  // Reputation hearts.
  for (let i = 0; i < 3; i += 1) {
    text(ctx, i < state.reputation ? '♥' : '♡', 940 + i * 28, 32, 22, PALETTE.red, 'left');
  }
  text(ctx, `LV ${state.level}`, 1050, 32, 18, PALETTE.blue, 'left', '800');
  text(ctx, muted ? 'M: muted' : 'M: sound', 1150, 32, 13, PALETTE.muted, 'left');
}

function drawPrompt(ctx, prompt) {
  if (prompt === null || prompt === undefined) {
    text(ctx, 'Move with WASD / arrows — click a bin or station to walk there. E interacts.', FIELD.width / 2, 706, 13, PALETTE.muted, 'center');
    return;
  }
  text(ctx, `[E] ${prompt.label}  ·  or click it`, FIELD.width / 2, 706, 14, PALETTE.gold, 'center', '700');
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(12,9,6,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function drawTitle(ctx, best) {
  overlay(ctx);
  text(ctx, 'SIZZLE & SERVE', FIELD.width / 2, 150, 64, PALETTE.gold, 'center', '800');
  text(ctx, 'A cozy kitchen rush — cook, plate, and serve before the orders run out!', FIELD.width / 2, 205, 20, PALETTE.text, 'center');
  // A little kitchen scene: five ingredients on a dark panel, clear of the stations behind.
  ctx.fillStyle = 'rgba(20,14,9,0.85)';
  roundRect(ctx, FIELD.width / 2 - 220, 245, 440, 80, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, FIELD.width / 2 - 220, 245, 440, 80, 12);
  ctx.stroke();
  drawIngredient(ctx, 'bun', FIELD.width / 2 - 160, 285, 54, 'ready');
  drawIngredient(ctx, 'patty', FIELD.width / 2 - 80, 285, 54, 'ready');
  drawIngredient(ctx, 'lettuce', FIELD.width / 2, 285, 54, 'ready');
  drawIngredient(ctx, 'tomato', FIELD.width / 2 + 80, 285, 54, 'ready');
  drawIngredient(ctx, 'cheese', FIELD.width / 2 + 160, 285, 54, 'ready');
  const lines = [
    'HOW TO PLAY',
    'Move: WASD / arrow keys, or click anywhere to walk there',
    'Grab ingredients from the counter — chop, grill, fry or boil them',
    'Add the finished food to the plate, then SERVE the matching order',
    'Serve fast for tips. A failed order costs a heart — lose all 3 and the shift ends.',
    'Burnt food goes in the trash. P pauses, M mutes.',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, FIELD.width / 2, 350 + i * 30, i === 0 ? 18 : 16, i === 0 ? PALETTE.gold : PALETTE.text, 'center', i === 0 ? '800' : '400');
  });
  const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 350);
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'Press SPACE or click to start your shift', FIELD.width / 2, 580, 22, PALETTE.green, 'center', '800');
  ctx.restore();
  if (best > 0) text(ctx, `Best shift: ${best} coins`, FIELD.width / 2, 620, 16, PALETTE.muted, 'center');
}

function drawPaused(ctx) {
  overlay(ctx);
  text(ctx, 'PAUSED', FIELD.width / 2, 330, 48, PALETTE.text, 'center', '800');
  text(ctx, 'Press P or Space to keep cooking', FIELD.width / 2, 390, 18, PALETTE.muted, 'center');
}

function drawOver(ctx, state, best) {
  overlay(ctx);
  text(ctx, state.overReason === 'reputation' ? 'THE KITCHEN CLOSED EARLY!' : 'SHIFT OVER!', FIELD.width / 2, 150, 48, PALETTE.gold, 'center', '800');
  text(ctx, state.overReason === 'reputation'
    ? 'Too many failed orders — the customers walked out.'
    : 'The dinner rush is done. Here is how the shift went:', FIELD.width / 2, 200, 18, PALETTE.text, 'center');
  const rows = [
    ['Coins earned', `${state.coins}`],
    ['Orders served', `${state.served}`],
    ['Orders failed', `${state.failed}`],
    ['Best combo', `x${state.bestCombo}`],
    ['Best shift ever', `${best} coins`],
  ];
  rows.forEach(([label, value], i) => {
    text(ctx, label, FIELD.width / 2 - 120, 280 + i * 44, 20, PALETTE.muted, 'left');
    text(ctx, value, FIELD.width / 2 + 120, 280 + i * 44, 20, PALETTE.text, 'right', '800');
  });
  const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 350);
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'Press SPACE or click to cook another shift', FIELD.width / 2, 560, 22, PALETTE.green, 'center', '800');
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function draw(state, screen, best, prompt, muted) {
    const scale = canvas.width / FIELD.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawFloor(ctx);
    drawBoard(ctx, state);
    for (const [name, station] of Object.entries(STATIONS)) drawStation(ctx, state, name, station);
    drawCounter(ctx, state);
    drawPlate(ctx, state);
    drawChef(ctx, state);
    drawHud(ctx, state, muted);
    if (screen === SCREEN_PLAY) drawPrompt(ctx, prompt);
    if (screen === SCREEN_TITLE) drawTitle(ctx, best);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_OVER) drawOver(ctx, state, best);
  }

  return { draw };
}
