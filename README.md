# Sizzle & Serve — a cozy kitchen rush

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/imgans322-gif/sizzle-and-serve/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/imgans322-gif/sizzle-and-serve/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

An entry for [make.fun's best-cooking-game-20261125-0137 bounty](https://make.fun/bounty/best-cooking-game-20261125-0137): the best cooking game — a cozy kitchen rush.

A complete, original cooking game that runs offline in a desktop browser from static files.
You are the chef of a small bistro: orders land on the board, you grab ingredients from the
counter, chop, grill, fry and boil them, assemble each dish on the plate, and serve it before
its timer runs out. Serve fast for tips, chain serves for combos — fail an order and you lose
a heart. Lose all three hearts, or run out the 150-second shift, and the dinner rush is over.

## How to play

- **Move** — WASD / arrow keys, or click anywhere to walk there
- **Interact** — E or Space (or click a bin, station, plate or the trash can)
- **Pause** — P or Esc · **Mute** — M · **Start / restart** — Space or click

## The kitchen

- **Order board** (left): up to 3 orders, each with its dish, the ingredients it needs
  (checked off as they land on the plate) and a countdown bar.
- **Prep stations**: Grill (patties), Chopping board (lettuce, tomato, onion), Fryer (fries),
  Boil pot (pasta). Food left on a station too long burns — trash it.
- **Ingredient counter** (bottom): bun, patty, lettuce, tomato, cheese, onion, fries, pasta,
  sauce, dough.
- **Plating station**: assemble the dish here. When the plate matches an order, the green
  SERVE button lights up — serve it for coins plus a time tip and a combo bonus.

## Dishes

Classic Burger, Cheeseburger, Garden Salad, Pasta Marinara, Crunchy Taco, Fries Basket.
Orders get faster and recipes longer as the shift's level rises.

## Tech

Plain ES modules, no libraries, no network requests. Sound is synthesised with WebAudio.
The game is deterministic for a given `?seed=N`, and `?shot=start|play|serve|end` stages the
four screenshot scenes with a built-in autopilot that plays the real rules.

Serve locally with `node serve.ts` and open http://localhost:8080.
