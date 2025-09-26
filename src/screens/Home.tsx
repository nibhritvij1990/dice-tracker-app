import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LiquidGlassCard from '../components/LiquidGlassCard';
import desertPng from '../assets/images/desert.png';
import brickPng from '../assets/images/brick.png';
import grainPng from '../assets/images/grain.png';
import lumberPng from '../assets/images/lumber.png';
import orePng from '../assets/images/ore.png';
import sheepPng from '../assets/images/sheep.png';
//import waterPng from '../assets/images/gemini_water.png';
import Iridescence from '../components/Iridescence.tsx';


const Home: React.FC = () => {
  // Device presets removed – full-viewport rendering

  type Terrain = 'forest' | 'pasture' | 'fields' | 'hills' | 'mountains' | 'desert';
  type Tile = { terrain: Terrain; number: number | null };
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [gamesVersion, setGamesVersion] = useState(0);
  type RollSource = 'virtual' | 'manual';
  interface DiceRollEntry { id: string; total: number; dice?: [number, number]; source: RollSource; ts: number }
  interface GameMeta { id: string; name: string; createdAt: number; updatedAt: number }
  interface GameData { rolls: DiceRollEntry[] }
  const storage = {
    getGames(): GameMeta[] { try { return JSON.parse(localStorage.getItem('dice_tracker_games') || '[]') as GameMeta[]; } catch { return []; } },
    saveGames(list: GameMeta[]) { localStorage.setItem('dice_tracker_games', JSON.stringify(list)); },
    getCurrentId(): string | null { return localStorage.getItem('dice_tracker_current_game_id'); },
    setCurrentId(id: string) { localStorage.setItem('dice_tracker_current_game_id', id); },
    dataKey(id: string) { return `dice_tracker_game_${id}`; },
    getData(id: string): GameData { try { return JSON.parse(localStorage.getItem(this.dataKey(id)) || '{"rolls":[]}') as GameData; } catch { return { rolls: [] }; } },
    saveData(id: string, data: GameData) { localStorage.setItem(this.dataKey(id), JSON.stringify(data)); },
    createGame(name: string): GameMeta {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      const meta: GameMeta = { id, name, createdAt: now, updatedAt: now };
      const list = this.getGames();
      list.unshift(meta);
      this.saveGames(list.slice(0, 50));
      this.saveData(id, { rolls: [] });
      this.setCurrentId(id);
      return meta;
    },
    touchGame(id: string) { const list = this.getGames(); const i = list.findIndex(g=>g.id===id); if (i>=0){ list[i].updatedAt = Date.now(); this.saveGames(list);} },
    renameGame(id: string, name: string) { const list = this.getGames(); const i = list.findIndex(g=>g.id===id); if (i>=0){ list[i].name = name; this.saveGames(list);} },
    deleteGame(id: string) {
      const list = this.getGames();
      const nextList = list.filter(g => g.id !== id);
      this.saveGames(nextList);
      localStorage.removeItem(this.dataKey(id));
      const current = this.getCurrentId();
      if (current === id) {
        const fallback = nextList.sort((a,b)=>b.updatedAt-a.updatedAt)[0];
        if (fallback) { this.setCurrentId(fallback.id); } else { const nm = new Date().toLocaleString(); const meta = this.createGame(nm); this.setCurrentId(meta.id); }
      }
    }
  };
  const [gameName, setGameName] = useState<string>('');
  useEffect(() => {
    let id = storage.getCurrentId();
    if (!id) { const name = new Date().toLocaleString(); const meta = storage.createGame(name); id = meta.id; }
    const meta = storage.getGames().find(g=>g.id===id);
    setGameName(meta?.name || new Date().toLocaleString());
  }, []);
  const recentGames = useMemo(() => {
    try { return storage.getGames().sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,10); } catch { return [] as GameMeta[]; }
  }, [gamesVersion]);
  const startNewGame = () => {
    const meta = storage.createGame(new Date().toLocaleString());
    setGameName(meta.name); setGamesVersion(v=>v+1);
    navigate('/tracker');
  };
  const loadGame = (id: string) => {
    storage.setCurrentId(id); setGamesVersion(v=>v+1); navigate('/tracker');
  };
  const rows4 = [3,4,5,4,3];
  const numberOrder4 = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];
  // 5-player specs
  const columns5 = [4,5,6,5,4]; // heights per column (flat-top columns)
  const numberOrder5 = [2,5,4,6,3,9,8,11,11,10,6,3,8,4,8,10,11,12,10,5,4,9,5];
  const spiral5: Array<[number, number]> = [
    [0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[3,4],[2,5],[1,4],[0,3],[0,2],[0,1],[1,1],[2,1],[3,1],[3,2],[3,3],[2,4],[1,3],[1,2],[2,2],[2,3]
  ];

  // 6-player specs
  const columns6 = [3,4,5,6,5,4,3];
  const numberOrder6 = [2,5,4,6,3,9,8,11,11,10,6,3,8,4,8,10,11,12,10,5,4,9,5,9,12,3,2,6];
  const spiral6: Array<[number, number]> = [
    // outer 16
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[6,1],[6,2],[5,3],[4,4],[3,5],[2,4],[1,3],[0,2],[0,1],
    // inner 10
    [1,1],[2,1],[3,1],[4,1],[5,1],[5,2],[4,3],[3,4],[2,3],[1,2],
    // center 4 (corrected)
    [2,2],[3,2],[4,2],[3,3]
  ];

  function mulberry32(a: number) { return function() { let t = a += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle<T>(arr: T[], rand: () => number) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function generateBoard4(seed: number): Tile[][] {
    const rand = mulberry32(seed);
    const bag: Terrain[] = [
      ...Array(4).fill('forest'),
      ...Array(4).fill('pasture'),
      ...Array(4).fill('fields'),
      ...Array(3).fill('hills'),
      ...Array(3).fill('mountains'),
      'desert',
    ];
    shuffle(bag, rand);

    const tiles: Tile[][] = [];
    let idx = 0;
    for (const n of rows4) {
      const row: Tile[] = [];
      for (let i = 0; i < n; i++) row.push({ terrain: bag[idx++], number: null });
      tiles.push(row);
    }

    // Assign numbers using absolute [col,row] spiral with flat-top columns
    const outer: Array<[number, number]> = [
      [0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[3,3],[2,4],[1,3],[0,2],[0,1]
    ];
    const inner: Array<[number, number]> = [
      [1,1],[2,1],[3,1],[3,2],[2,3],[1,2]
    ];
    const center: Array<[number, number]> = [[2,2]];
    const spiralAbs = [...outer, ...inner, ...center];

    // Build columns mapping (top-to-bottom) to mirror render order
    const columns: Array<Array<{ r: number; c: number }>> = Array.from({ length: 5 }, () => []);
    const startIndexByRowMap = [0,1,0,0,2];
    for (let r = 0; r < tiles.length; r++) {
      const row = tiles[r];
      const start = startIndexByRowMap[r] ?? 0;
      for (let c = 0; c < row.length; c++) {
        const x = start + c;
        columns[x].push({ r, c });
      }
    }

    let ni = 0;
    for (const [x, y] of spiralAbs) {
      const pos = columns[x]?.[y];
      if (!pos) continue;
      const tile = tiles[pos.r][pos.c];
      if (tile.terrain !== 'desert') {
        tile.number = numberOrder4[ni++];
        if (ni >= numberOrder4.length) break;
      }
    }
    return tiles;
  }

  function generateBoard5(seed: number): Tile[][] {
    const rand = mulberry32(seed);
    // Resource counts: 4 brick (hills), 5 wheat (fields), 5 sheep (pasture), 5 wood (forest), 4 ore (mountains), 1 desert
    const bag: Terrain[] = [
      ...Array(5).fill('forest'),
      ...Array(5).fill('pasture'),
      ...Array(5).fill('fields'),
      ...Array(4).fill('hills'),
      ...Array(4).fill('mountains'),
      'desert',
    ];
    shuffle(bag, rand);
    // Build columns structure [4,5,6,5,4]
    const cols: Tile[][] = columns5.map(h => Array.from({ length: h }, () => ({ terrain: 'desert' as Terrain, number: null })));
    let bi = 0;
    for (let x = 0; x < cols.length; x++) {
      for (let y = 0; y < cols[x].length; y++) {
        cols[x][y] = { terrain: bag[bi++], number: null };
      }
    }
    // Assign numbers along provided spiral coords
    let ni = 0;
    for (const [x, y] of spiral5) {
      const t = cols[x]?.[y];
      if (!t) continue;
      if (t.terrain !== 'desert') {
        t.number = numberOrder5[ni++];
        if (ni >= numberOrder5.length) break;
      }
    }
    return cols;
  }

  function generateBoard6(seed: number): Tile[][] {
    const rand = mulberry32(seed);
    const bag: Terrain[] = [
      ...Array(6).fill('forest'),
      ...Array(6).fill('pasture'),
      ...Array(6).fill('fields'),
      ...Array(5).fill('hills'),
      ...Array(5).fill('mountains'),
      ...Array(2).fill('desert'),
    ];
    shuffle(bag, rand);
    const cols: Tile[][] = columns6.map(h => Array.from({ length: h }, () => ({ terrain: 'desert' as Terrain, number: null })));
    let bi = 0;
    for (let x = 0; x < cols.length; x++) {
      for (let y = 0; y < cols[x].length; y++) {
        cols[x][y] = { terrain: bag[bi++], number: null };
      }
    }
    let ni = 0;
    for (const [x, y] of spiral6) {
      const t = cols[x]?.[y];
      if (!t) continue;
      if (t.terrain !== 'desert') {
        t.number = numberOrder6[ni++];
        if (ni >= numberOrder6.length) break;
      }
    }
    return cols;
  }

  function assignNumbersToExistingBoard4(existing: Tile[][]): Tile[][] {
    // Deep clone numbers only
    const tiles: Tile[][] = existing.map(row => row.map(t => ({ terrain: t.terrain, number: null as number | null })));
    const startIndexByRowMap = [0,1,0,0,2];
    const outer: Array<[number, number]> = [
      [0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[3,3],[2,4],[1,3],[0,2],[0,1]
    ];
    const inner: Array<[number, number]> = [
      [1,1],[2,1],[3,1],[3,2],[2,3],[1,2]
    ];
    const center: Array<[number, number]> = [[2,2]];
    const spiralAbs = [...outer, ...inner, ...center];

    const columns: Array<Array<{ r: number; c: number }>> = Array.from({ length: 5 }, () => []);
    for (let r = 0; r < tiles.length; r++) {
      const row = tiles[r];
      const start = startIndexByRowMap[r] ?? 0;
      for (let c = 0; c < row.length; c++) {
        const x = start + c;
        columns[x].push({ r, c });
      }
    }

    let ni = 0;
    for (const [x, y] of spiralAbs) {
      const pos = columns[x]?.[y];
      if (!pos) continue;
      const tile = tiles[pos.r][pos.c];
      if (tile.terrain !== 'desert') {
        tile.number = numberOrder4[ni++];
        if (ni >= numberOrder4.length) break;
      }
    }
    return tiles;
  }

  function CatanSetup() {
    const [players, setPlayers] = useState<number>(() => {
      try { const v = localStorage.getItem('catan_players'); return v ? Number(v) : 4; } catch { return 4; }
    });
    // no separate seed state required
    const keyFor = (p: number) => `catan_map_${p}p`;
    const [board, setBoard] = useState<Tile[][] | null>(() => {
      try {
        const raw = localStorage.getItem(keyFor(players));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { seed: number; board: Tile[][] };
        if (parsed && parsed.board && Array.isArray(parsed.board)) {
          const fixed = (players===4 ? assignNumbersToExistingBoard4(parsed.board) : parsed.board);
          // Persist normalized once into the per-player key
          localStorage.setItem(keyFor(players), JSON.stringify({ seed: parsed.seed, board: fixed }));
          return fixed;
        }
        return null;
      } catch { return null; }
    });

    // When player count changes, load that board if present; else empty
    useEffect(() => {
      try {
        const raw = localStorage.getItem(keyFor(players));
        if (!raw) { setBoard(null); return; }
        const parsed = JSON.parse(raw) as { seed: number; board: Tile[][] };
        if (parsed && parsed.board && Array.isArray(parsed.board)) {
          const fixed = (players===4 ? assignNumbersToExistingBoard4(parsed.board) : parsed.board);
          setBoard(fixed);
          // optional normalize write-back
          localStorage.setItem(keyFor(players), JSON.stringify({ seed: parsed.seed, board: fixed }));
        } else {
          setBoard(null);
        }
      } catch {
        setBoard(null);
      }
    }, [players]);

    const onGenerate = () => {
      const newSeed = Date.now();
      const b = (players===6 ? generateBoard6(newSeed) : players===5 ? generateBoard5(newSeed) : generateBoard4(newSeed));
      setBoard(b);
      localStorage.setItem(keyFor(players), JSON.stringify({ seed: newSeed, board: b }));
    };

    return (
      <div className="absolute left-0 right-0 top-[76px] bottom-[84px] flex flex-col gap-5 overflow-auto">
        {/* Top controls */}
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 mx-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="text-sm font-medium">Players</div>
              <div className="inline-flex items-center gap-2">
                {[4,5,6].map(n => (
                  <button key={n} onClick={() => { setPlayers(n); try { localStorage.setItem('catan_players', String(n)); } catch {} }}
                    className={`h-9 w-9 rounded-lg border text-sm border-white/30 bg-gradient-to-br ${players===n ? 'from-[#B6116B] to-[#3B1578]' : 'from-[#2E1371] to-[#21232F]'}`}
                    style={{ boxShadow: (players!==n ? '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' : '-1px -1px 0px 0px rgb(255, 83, 192), 0px -1px 0px 0px rgb(255, 83, 192)') }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div />
          </div>
        </div>

        {/* Board container */}
        <div className="w-full p-4 relative overflow-hidden" style={{ height: (players===5 ? '720px' : '600px') }}>
          <Iridescence color={[100, 200, 255]} className='absolute inset-0' />
          <LiquidGlassCard distortion={0.5} thickness={0.5}
            className="pointer-events-none absolute"
            style={{ zIndex: 0, left: '-2rem', top: '-2rem', width: 'calc(100% + 4rem)', height: 'calc(100% + 4rem)', borderRadius: '0rem' }}
          >
            <div />
          </LiquidGlassCard>
          <div className="absolute z-[1] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ 
            height: (players===6 ? 'calc(100% - 30px)' : 'calc(100% - 120px)'),
            width: 'auto',
            aspectRatio: (players===5 ? '0.78 / 1' : '0.866 / 1'),
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            background: 'rgba(255, 255, 255, 0.2)',
            filter: 'drop-shadow(0 2px 2px rgba(200, 200, 200, 0.5)) blur(2px)'
           }} />
          <div className="absolute z-[2] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <CatanBoard board={board} players={players} />
          </div>
        </div>

        {/* Actions */}
          <button onClick={onGenerate} aria-label="Generate Map"
            className="h-10 mx-5 rounded-lg border border-white/20 bg-gradient-to-br from-[#B6116B] to-[#3B1578] flex items-center justify-center text-sm"
            style={{ boxShadow: '-1px -1px 0px 0px rgb(255, 83, 192), 0px -1px 0px 0px rgb(255, 83, 192)' }}>
            Generate Map
          </button>
      </div>
    );
  }

  function CatanBoard({ board, players }: { board: Tile[][] | null; players: number }) {

    const terrainColor: Record<string, string> = {
      forest: '#1f7a1f',
      pasture: '#68a61c',
      fields: '#d2a842',
      hills: '#b55324',
      mountains: '#7b7f86',
      desert: '#d7c58b',
    };
    const terrainImage: Record<string, string> = {
      forest: lumberPng,
      pasture: sheepPng,
      fields: grainPng,
      hills: brickPng,
      mountains: orePng,
      desert: desertPng,
    };

    if (!board) {
      return (
        <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">
          Click Generate Map to create a random board
        </div>
      );
    }

    // Flat-top (horizontal) resource hexes
    const TILE_W = 82; // px (flat-top hex width)
    const TILE_H = 72; // px (flat-top hex height)
    const MAX_COLS = 5;
    const dx = TILE_W * 0.75; // center-to-center horizontal for flat-top
    const dy = TILE_H * 1.0;  // center-to-center vertical between rows for flat-top

    const maxLen = players===6 ? Math.max(...columns6) : players===5 ? Math.max(...columns5) : 5;
    const containerWidth = (players===6 ? TILE_W + dx * (7 - 1) : TILE_W + dx * (MAX_COLS - 1));
    const containerHeight = TILE_H + dy * (maxLen - 1);

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [containerZoom, setContainerZoom] = useState<number>(1);

    useEffect(() => {
      const el = wrapperRef.current;
      if (!el) return;

      const recalc = () => {
        const w = el.clientWidth || containerWidth;
        const z = Math.min(1, w / containerWidth);
        setContainerZoom((players===6) ? z : z*1.1);
      };

      recalc();

      const ro = new ResizeObserver(recalc);
      ro.observe(el);
      window.addEventListener('resize', recalc);
      window.addEventListener('load', recalc);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', recalc);
        window.removeEventListener('load', recalc);
      };
    }, [board, containerWidth]);

    return (
      <div className="relative w-full h-[420px] sm:h-[520px] md:h-[560px] select-none" id="catan-map-container" ref={wrapperRef}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: containerWidth, height: containerHeight + 45, transform: `scale(${containerZoom})`, transformOrigin: 'center' }}>
          {/* Tile field centered inside the scaled box */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: containerWidth, height: containerHeight }}>
          {(() => {
            const isRow4 = players === 4 && board.length === 5 && board[0]?.length === 3 && board[1]?.length === 4 && board[2]?.length === 5;
            const isCol = players !== 4 || !isRow4;
            if (isCol) {
              // Treat as column-shaped board (works for both 5p and any column data)
              return board.map((col, cAbs) => {
                const left = cAbs * dx;
                const topStart = (maxLen - col.length) * (dy / 2);
                return col.map((tile, i) => {
                  const top = topStart + i * dy;
                  return (
                    <div key={`${cAbs}-${i}`} className="absolute" style={{ left, top, width: TILE_W, height: TILE_H, zIndex: 1 }}>
                      <div className="w-full h-full" style={{ clipPath: 'polygon(0% 50%, 25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%)', backgroundColor: terrainColor[tile.terrain], backgroundImage: `url(${terrainImage[tile.terrain]})`, backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                      {tile.terrain !== 'desert' && tile.number !== null && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className={`flex items-center justify-center rounded-full ${tile.number===6||tile.number===8 ? 'bg-[#B71C1C] text-white' : 'bg-[#f6e6c9] text-black'}`} style={{ width: 28, height: 28, border: '1px solid rgba(0,0,0,0.2)' }}>
                            <span className="text-xs font-semibold">{tile.number}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              });
            }
            // 4p row-shaped: build columns from rows
            const columns: Array<Array<{ r: number; j: number }>> = Array.from({ length: MAX_COLS }, () => []);
            const startIndexByRow = [0, 1, 0, 0, 2];
            for (let r = 0; r < board.length; r++) {
              const row = board[r];
              const rowStartAbs = startIndexByRow[r] ?? 0;
              for (let j = 0; j < row.length; j++) {
                const absC = rowStartAbs + j;
                if (!columns[absC]) continue;
                columns[absC].push({ r, j });
              }
            }
            return columns.map((col, cAbs) => {
              const left = cAbs * dx;
              const topStart = (maxLen - col.length) * (dy / 2);
              return col.map((pos, i) => {
                const top = topStart + i * dy;
                const tile = board[pos.r][pos.j];
                return (
                  <div key={`${pos.r}-${pos.j}`} className="absolute" style={{ left, top, width: TILE_W, height: TILE_H, zIndex: 1 }}>
                    <div className="w-full h-full" style={{ clipPath: 'polygon(0% 50%, 25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%)', backgroundColor: terrainColor[tile.terrain], backgroundImage: `url(${terrainImage[tile.terrain]})`, backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                    {tile.terrain !== 'desert' && tile.number !== null && (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className={`flex items-center justify-center rounded-full ${tile.number===6||tile.number===8 ? 'bg-[#B71C1C] text-white' : 'bg-[#f6e6c9] text-black'}`} style={{ width: 28, height: 28, border: '1px solid rgba(0,0,0,0.2)' }}>
                          <span className="text-xs font-semibold">{tile.number}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            });
          })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-[100dvw] overflow-hidden bg-gradient-to-br from-[#2E1371] to-[#130B2B] text-white relative">
        <div className="absolute w-[300px] h-[300px] left-[-132px] top-[178px]" style={{ background: 'rgba(96, 255, 231, 0.4)', filter: 'blur(100px)' }} />
        <div className="absolute w-[300px] h-[300px] right-[-147px] top-[375px]" style={{ background: 'rgba(255, 83, 192, 0.4)', filter: 'blur(100px)' }} />
        
        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="h-9 flex items-center justify-between gap-2 select-none">
          <button aria-label="Back" className="p-2 relative">
              <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.15)', backgroundBlendMode: 'overlay', backdropFilter: 'blur(20px)', boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }} >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            </button>
            <span className="text-[20px] leading-none font-bold">
              <span className="bg-gradient-to-r from-[#CF9EFF] via-[#A071FF] to-[#CF9EFF] bg-clip-text text-transparent animate-gradient">Dice</span>
              <span className="text-white">&nbsp;Tracker</span>
            </span>
            <button aria-label="Options" className="p-2 relative" onClick={() => setMenuOpen(true)}>
              <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.15)', backgroundBlendMode: 'overlay', backdropFilter: 'blur(20px)', boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }} >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="4" y="6" width="16" height="2" rx="1" />
                <rect x="4" y="11" width="16" height="2" rx="1" />
                <rect x="4" y="16" width="16" height="2" rx="1" />
              </svg>
            </div>
            </button>
          </h1>
        </div>

        {/* Content */}
        <CatanSetup />



        {/* Footer nav (placeholders) */}
     
        <div className="absolute bottom-0 left-0 right-0 h-[64px] z-[1]" style={{ boxSizing: 'border-box' }}>
          <div className="absolute inset-0 z-[1] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)', backgroundBlendMode: 'overlay', boxSizing: 'border-box' }} >
            <div className="absolute w-[200px] h-[231px] left-[-45px] top-[-148px] z-[4]" style={{ background: '#3B1578', filter: 'blur(40px)' }} />
            <div className="absolute w-[200px] h-[231px] left-[50%] translate-x-[-50%] top-[12px] z-[2]" style={{ background: '#5172B3', filter: 'blur(60px)' }} />
            <div className="absolute w-[200px] h-[231px] right-[4px] top-[17px] z-[3]" style={{ background: '#FF53C0', filter: 'blur(60px)' }} />
          </div>




          <div className="h-14 flex items-center justify-around z-[9] relative">
            <button aria-label="Home" className="p-2 relative h-[40px] w-[40px]">
            <LiquidGlassCard className="absolute w-[64px] h-[64px] rounded-full bottom-[28px] left-[-20px] flex items-center justify-center" style={{ borderRadius: '50%'}} >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden >
                <path d="M12 3.2 2.8 11a1 1 0 0 0 .65 1.76H5v7.24c0 .56.45 1 1 1h4.5V15h3V21h4.5c.55 0 1-.44 1-1V12.76h1.55a1 1 0 0 0 .65-1.76L12 3.2Z" />
              </svg>
              </LiquidGlassCard>
            </button>

            {/* Tracker (dice icon) */}
            <Link to="/tracker" aria-label="Tracker" className="p-2 relative h-[40px] w-[40px]">
                <svg className="w-6 h-6 text-white" viewBox="0 0 100 100" aria-hidden>
                  <defs>
                    <mask id="pips-mask-footer-tracker">
                      <rect x="0" y="0" width="100" height="100" fill="white" />
                      <circle cx="25" cy="25" r="9" fill="black" />
                      <circle cx="75" cy="25" r="9" fill="black" />
                      <circle cx="50" cy="50" r="9" fill="black" />
                      <circle cx="25" cy="75" r="9" fill="black" />
                      <circle cx="75" cy="75" r="9" fill="black" />
                    </mask>
                  </defs>
                  <rect x="8" y="8" width="84" height="84" rx="12" fill="currentColor" mask="url(#pips-mask-footer-tracker)" />
                  <rect x="8" y="8" width="84" height="84" rx="12" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                </svg>
            </Link>

            {/* Profile (solid) */}
            <Link to="/profile" aria-label="Profile" className="p-2 relative h-[40px] w-[40px]">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden >
                <path d="M12 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
                <path d="M4 20.5c0-4.142 3.582-7.5 8-7.5s8 3.358 8 7.5V22H4v-1.5Z" />
              </svg>
            </Link>
          </div>


        </div>
        {/* Right Sidebar Drawer */}
        <div className={`fixed inset-0 z-[60] transition-opacity ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)} aria-hidden={!menuOpen} />
        <div className={`fixed right-0 top-0 bottom-0 z-[61] w-[320px] max-w-[85vw] bg-gradient-to-b from-[#1B0F3E] to-[#120A28] border-l border-white/10 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true">
          <div className="h-full flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center gap-3">
              <svg className="w-10 h-10 text-white" viewBox="0 0 100 100" aria-hidden>
                <defs>
                  <mask id="pips-mask-settings-home">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <circle cx="25" cy="25" r="9" fill="black" />
                    <circle cx="75" cy="25" r="9" fill="black" />
                    <circle cx="50" cy="50" r="9" fill="black" />
                    <circle cx="25" cy="75" r="9" fill="black" />
                    <circle cx="75" cy="75" r="9" fill="black" />
                  </mask>
                </defs>
                <rect x="8" y="8" width="84" height="84" rx="12" fill="currentColor" mask="url(#pips-mask-settings-home)" />
                <rect x="8" y="8" width="84" height="84" rx="12" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
              </svg>
              <div className="text-lg font-semibold">Dice <span className="text-white/80">Tracker</span></div>
              <button className="ml-auto p-2" aria-label="Close" onClick={() => setMenuOpen(false)}>
                <svg className="w-5 h-5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm flex-1 flex flex-col min-h-0">
              <div className="text-white/70">Current game</div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white/90 flex-1 truncate">{gameName}</div>
                <button aria-label="Rename game" className="h-9 w-9 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={() => {
                  const name = prompt('Rename current game', gameName || ''); if (name && name.trim()) { setGameName(name.trim()); const id = storage.getCurrentId(); if (id) { storage.renameGame(id, name.trim()); setGamesVersion(v=>v+1);} }
                }}>
                  <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                </button>
              </div>
              <div className="pt-2">
                <button onClick={startNewGame} className="w-full h-10 rounded-md border border-white/15 bg-white/10 hover:bg-white/15 text-white text-sm" style={{ boxShadow: '-1px -1px 0px 0px rgb(255, 83, 192), 0px -1px 0px 0px rgb(255, 83, 192)' }}>New game</button>
              </div>
              <div className="mt-4 flex-1 flex flex-col min-h-0">
                <div className="text-white/70 mb-2">Load game</div>
                <div className="space-y-2 flex-1 overflow-auto pr-1 min-h-0">
                  {recentGames.map(g => (
                    <div key={g.id} className="w-full rounded-md border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 flex items-center gap-2">
                      <button onClick={() => loadGame(g.id)} className="flex-1 text-left">
                        <div className="text-white/90 truncate">{g.name}</div>
                        <div className="text-[10px] text-white/60">{new Date(g.updatedAt).toLocaleString()}</div>
                      </button>
                      <button aria-label="Rename game" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={() => { const name = prompt('Rename game', g.name); if (name && name.trim()) { storage.renameGame(g.id, name.trim()); if (storage.getCurrentId()===g.id) setGameName(name.trim()); setGamesVersion(v=>v+1);} }}>
                        <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                      <button aria-label="Delete game" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={() => { if (confirm('Delete this game permanently?')) { storage.deleteGame(g.id); setGamesVersion(v=>v+1); const cur = storage.getCurrentId(); if (cur) { /* stay here */ } else { const list = storage.getGames().sort((a,b)=>b.updatedAt-a.updatedAt); const next = list[0]; if (next) { storage.setCurrentId(next.id); setGameName(next.name);} else { const meta = storage.createGame(new Date().toLocaleString()); setGameName(meta.name);} } } }}>
                        <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  ))}
                  {recentGames.length === 0 && (<div className="text-xs text-white/60">No saved games yet</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Home;


