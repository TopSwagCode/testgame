// Central mutable game state object
export const state = {
  board: new Map(),
  pieces: [],
  currentPlayer: 1,
  selectedPieceId: null,
  turn: 1,
  animating: false,
  previewPath: null,
  texturesReady: false,
  hexTextureAssignments: new Map(),
  hexTerrain: new Map(),
  mapName: 'Default',
  boardShift: { q:0, r:0 },
  playerData: {},
  _reachableData: null,
  winner: null,
  camera: { x: 0, y: 0 }, // pixel offsets for panning
};
