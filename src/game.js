// High-level game bootstrap tying subsystems together (WIP modular refactor)
import { state } from './core/state.js';
import { HEX_SIZE, COLORS } from './core/constants.js';
import { startLoop, onUpdate, onRender } from './engine/loop.js';
import { updateAnimations } from './systems/animation.js';
import { updateDiamondRain } from './systems/diamondRain.js';
import { initBoard, drawBoard } from './view/board.js';
import { loadMap } from './maps/loader.js';
import { loadAllTextures } from '../textures.js';
import { attachInput } from './input/handlers.js';
import { drawCards, ensurePlayerState, handEmpty, updateHandUI } from './systems/cards.js';
import { classifyTerrain } from './utils/terrain.js';

// Temporary: map loading & texture assignment kept minimal here
function assignTextures(){ /* TODO: move texture rules into dedicated module */ }

function startTurn(){
  state.selectedPieceId = null;
  ensurePlayerState(state.currentPlayer);
  const pdata = state.playerData[state.currentPlayer];
  pdata.hand = []; pdata.selectedCard = null;
  drawCards(state.currentPlayer, 3);
  document.getElementById('endTurnBtn').disabled = false;
  updateHandUI();
}

function endTurn(){
  const pdata = state.playerData[state.currentPlayer];
  if (pdata){ pdata.discard.push(...pdata.hand); pdata.hand=[]; pdata.selectedCard=null; }
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  state.turn++; startTurn();
}

async function init(){
  initBoard();
  attachInput();
  document.getElementById('endTurnBtn').addEventListener('click', endTurn);
  try {
    await loadMap('maps/irregular_islands.json');
  } catch (e) { console.warn('Map load failed, continuing with empty board', e); }
  // Load textures before first draw so board renders with images
  try { await loadAllTextures(); state.texturesReady = true; } catch(e){ console.warn('Texture load issue', e); }
  startTurn();
  onUpdate(dt => { updateAnimations(dt); updateDiamondRain(dt, document.getElementById('board')); });
  onRender(() => drawBoard());
  startLoop();
}

window.addEventListener('DOMContentLoaded', init);
