import { state } from '../core/state.js';
import { HEX_SIZE, COLORS } from '../core/constants.js';
import { key, axialDistance } from '../core/hex.js';
import { terrainOfHex } from '../utils/terrain.js';
import { computeReachable } from '../systems/movement.js';
import { drawPiece } from '../systems/animation.js';
import { drawDiamondRain } from '../systems/diamondRain.js';

let canvas, ctx;
export function initBoard(){
  canvas = document.getElementById('board');
  ctx = canvas.getContext('2d');
}
export function getCanvas(){ return canvas; }
export function getContext(){ return ctx; }

export function axialToPixel(q,r){
  const cq = q - (state.boardShift?.q || 0);
  const cr = r - (state.boardShift?.r || 0);
  const cx = canvas.width / 2; const cy = canvas.height / 2;
  const x = HEX_SIZE * Math.sqrt(3) * (cq + cr / 2) + cx + state.camera.x;
  const y = HEX_SIZE * 1.5 * cr + cy + state.camera.y;
  return { x,y };
}

export function pixelToAxial(x,y){
  const cx = canvas.width/2; const cy = canvas.height/2;
  // Inverse of axialToPixel: remove center and camera translation
  const px = x - cx - state.camera.x; const py = y - cy - state.camera.y;
  const qLocal = (Math.sqrt(3)/3 * px - 1/3 * py)/HEX_SIZE;
  const rLocal = (2/3 * py)/HEX_SIZE;
  return { q: qLocal + (state.boardShift?.q || 0), r: rLocal + (state.boardShift?.r || 0) };
}

export function drawBoard(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (const h of state.board.values()) drawHex(h.q,h.r);
  if (state.selectedPieceId != null){
    const piece = state.pieces.find(p => p.id === state.selectedPieceId);
    if (piece){
      const reachable = computeReachable(piece);
      const occ = new Set(state.pieces.map(p=>key(p.pos))); occ.delete(key(piece.pos));
      for (const d of [{q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1}]){
        const nxt = { q: piece.pos.q + d.q, r: piece.pos.r + d.r};
        const k = key(nxt); if (!state.board.has(k) || occ.has(k)) continue;
        if (!reachable.find(r => r.q===nxt.q && r.r===nxt.r)){
          const terrain = terrainOfHex(nxt.q,nxt.r);
          let color = 'rgba(255,0,0,0.35)'; if (terrain==='mountain') color='rgba(160,160,160,0.4)';
          drawHex(nxt.q,nxt.r,{ stroke:'rgba(255,0,0,0.6)', lineWidth:1.5, overlay:{ color, alpha:0.28 }});
        }
      }
      let rd = state._reachableData;
      for (const c of reachable){
  let alpha=0.25; if (rd && rd.map){ const entry = rd.map.get(key(c)); if (entry){ const len = entry.path.length -1; alpha = 0.18 + Math.min(1, len/5)*0.32; } }
        drawHex(c.q,c.r,{ stroke: COLORS.highlight, lineWidth:2, overlay:{ color: COLORS.highlight, alpha } });
      }
    }
  }
  if (state.previewPath && state.previewPath.length>1){ drawPreviewPath(state.previewPath); }
  for (const p of state.pieces) drawPiece(ctx,p,COLORS,HEX_SIZE);
  // Celebration particles (if winner)
  drawDiamondRain(ctx);
  drawHUD();
  if (state.winner){ drawWinOverlay(state.winner); }
}

function drawHUD(){
  ctx.font='14px system-ui'; ctx.fillStyle='#ccc'; ctx.textAlign='left';
  ctx.fillText(`Turn ${state.turn} - Player ${state.currentPlayer}`,12,20);
  ctx.fillText(`${state.mapName}`,12,38);
  const pdata = state.playerData[state.currentPlayer];
  if (pdata){
    const cardStr = pdata.hand.map(c=>`${c.terrain[0].toUpperCase()}${c.range}`).join(' ') || 'None';
    ctx.fillText(`Cards: ${cardStr}`,12,56);
    if (!hasAnyMoves()) { ctx.fillStyle='#fca5a5'; ctx.fillText('No moves available',12,74); ctx.fillStyle='#ccc'; }
  }
}

function drawWinOverlay(player){
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = '48px system-ui';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(`Player ${player} Wins!`, canvas.width/2, canvas.height/2);
  ctx.font='20px system-ui';
  ctx.fillText('Refresh or reset to play again', canvas.width/2, canvas.height/2 + 50);
  ctx.restore();
}

function drawPreviewPath(path){
  ctx.save(); ctx.lineWidth=6; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.beginPath();
  for (let i=0;i<path.length;i++){ const {x,y} = axialToPixel(path[i].q,path[i].r); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
  ctx.stroke();
  ctx.lineWidth=3; const grad = ctx.createLinearGradient(0,0,canvas.width,canvas.height); grad.addColorStop(0,'#ffe08a'); grad.addColorStop(1,'#ffb347');
  ctx.strokeStyle=grad; ctx.beginPath();
  for (let i=0;i<path.length;i++){ const {x,y} = axialToPixel(path[i].q,path[i].r); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
  ctx.stroke();
  for (let i=1;i<path.length;i++){ const {x,y}=axialToPixel(path[i].q,path[i].r); ctx.beginPath(); ctx.fillStyle='#ffd166'; ctx.arc(x,y,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#553300'; ctx.font='10px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(i),x,y+0.5);} 
  ctx.restore();
}

function drawHex(q,r, opts={}){
  const { x,y } = axialToPixel(q,r);
  const corners=[]; for (let i=0;i<6;i++){ const angle = Math.PI/180*(60*i - 30); const cx = x + HEX_SIZE*Math.cos(angle); const cy = y + HEX_SIZE*Math.sin(angle); corners.push({x:cx,y:cy}); }
  ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y); for (let i=1;i<6;i++) ctx.lineTo(corners[i].x,corners[i].y); ctx.closePath();
  if (state.texturesReady){
    const texName = state.hexTextureAssignments.get(key({q,r}));
    let img = null;
    if (window.TextureRegistry && window.TextureRegistry.images){ img = texName && window.TextureRegistry.images.get(texName); }
    if (img){ ctx.save(); ctx.clip(); const size = HEX_SIZE*2; ctx.drawImage(img,x-HEX_SIZE,y-HEX_SIZE,size,size); ctx.restore(); }
    else { ctx.fillStyle = opts.fill || COLORS.boardFill; ctx.fill(); }
  } else { ctx.fillStyle = opts.fill || COLORS.boardFill; ctx.fill(); }
  // Diamond special highlight overlay ring
  const terr = state.hexTerrain.get(key({q,r}));
  if (terr === 'diamond'){
    ctx.save();
    ctx.lineWidth = 4; ctx.strokeStyle = '#00e5ff';
    ctx.stroke();
    ctx.globalAlpha = 0.22; ctx.fillStyle='#00e5ff';
    ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y); for (let i=1;i<6;i++) ctx.lineTo(corners[i].x,corners[i].y); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
  }
  if (opts.stroke !== false){ ctx.strokeStyle = opts.stroke || COLORS.gridLine; ctx.lineWidth = opts.lineWidth || 1.2; ctx.stroke(); }
  if (opts.overlay){ ctx.fillStyle = opts.overlay.color; ctx.globalAlpha = opts.overlay.alpha ?? 0.35; ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y); for (let i=1;i<6;i++) ctx.lineTo(corners[i].x,corners[i].y); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
}

export function hasAnyMoves(){
  for (const p of state.pieces){ if (p.player !== state.currentPlayer) continue; if (computeReachable(p).length) return true; }
  return false;
}
