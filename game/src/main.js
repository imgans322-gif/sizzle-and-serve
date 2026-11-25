// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_BURN, EVENT_CHOP, EVENT_CLEAR, EVENT_FAIL, EVENT_MISTAKE, EVENT_OVER, EVENT_PICKUP,
  EVENT_PLACE, EVENT_READY, EVENT_SERVE, EVENT_SIZZLE, createWorld,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null, audio.muted);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let muted = false;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and serves.
  function announce(message) {
    status.textContent = message;
  }

  function playEvents(events) {
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_PLACE) audio.place();
    if (events & EVENT_CHOP) audio.chop();
    if (events & EVENT_SIZZLE) audio.sizzle();
    if (events & EVENT_SERVE) {
      audio.ding();
      audio.coin();
    }
    if (events & EVENT_READY) audio.ding();
    if (events & EVENT_BURN) audio.burn();
    if (events & EVENT_FAIL) audio.buzz();
    if (events & EVENT_MISTAKE) audio.buzz();
    if (events & EVENT_CLEAR) audio.place();
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Serve the orders before their timers run out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Shift over. ${world.state.coins} coins, ${world.state.served} orders served. Best ${best}.`);
  }

  function step(actions, first) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, false, null);
      return;
    }
    const move = input.direction();
    if (move !== null) input.clearClick();
    const click = first ? input.takeClick() : null;
    const events = world.step(STEP, move, first && Boolean(actions & ACTION_INTERACT), click);
    playEvents(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_SERVE) announce(`Served! ${world.state.coins} coins.`);
    else if (events & EVENT_FAIL) announce('An order failed. A heart is lost.');
    else if (events & EVENT_BURN) announce('Food burnt! Trash it.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Actions are taken exactly once per frame, then shared with the sub-steps.
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (actions & (ACTION_CONFIRM | ACTION_INTERACT) && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions, first);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const prompt = screen === SCREEN_PLAY ? world.nearestInteractable() : null;
    renderer.draw(world.state, screen, best, prompt, muted);
  }

  // Leaving the tab pauses a running game rather than letting orders fail unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start your shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
