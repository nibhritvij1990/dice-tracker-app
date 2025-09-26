import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LiquidGlassCard from '../components/LiquidGlassCard';

const Tracker: React.FC = () => {
  // removed device presets – full-viewport rendering

  type RollSource = 'virtual' | 'manual';
  interface DiceRollEntry {
    id: string;
    total: number; // 2..12
    dice?: [number, number]; // present for virtual rolls
    source: RollSource;
    ts: number; // epoch ms
  }
  interface GameMeta { id: string; name: string; createdAt: number; updatedAt: number }
  interface GameData { rolls: DiceRollEntry[] }

  // Sidebar state
  const [menuOpen, setMenuOpen] = useState(false);
  const [gamesVersion, setGamesVersion] = useState(0);
  // removed toggle; Load list is always visible

  // Game state
  const [gameName, setGameName] = useState<string>('');
  const [currentGameId, setCurrentGameIdState] = useState<string | null>(null);
  const [mode, setMode] = useState<RollSource>('virtual');

  // Helpers for storage
  const storage = {
    getGames(): GameMeta[] {
      try { return JSON.parse(localStorage.getItem('dice_tracker_games') || '[]') as GameMeta[]; } catch { return []; }
    },
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
      this.saveGames(list.slice(0, 50)); // keep reasonable history
      this.saveData(id, { rolls: [] });
      this.setCurrentId(id);
      return meta;
    },
    touchGame(id: string) {
      const list = this.getGames();
      const idx = list.findIndex(g => g.id === id);
      if (idx >= 0) { list[idx].updatedAt = Date.now(); this.saveGames(list); }
    },
    renameGame(id: string, name: string) {
      const list = this.getGames();
      const idx = list.findIndex(g => g.id === id);
      if (idx >= 0) { list[idx].name = name; this.saveGames(list); }
    },
    deleteGame(id: string) {
      const list = this.getGames();
      const nextList = list.filter(g => g.id !== id);
      this.saveGames(nextList);
      localStorage.removeItem(this.dataKey(id));
      const current = this.getCurrentId();
      if (current === id) {
        const fallback = nextList.sort((a,b)=>b.updatedAt-a.updatedAt)[0];
        if (fallback) {
          this.setCurrentId(fallback.id);
        } else {
          const name = new Date().toLocaleString();
          const meta = this.createGame(name);
          this.setCurrentId(meta.id);
        }
      }
    }
  };

  // Initialize current game
  useEffect(() => {
    let id = storage.getCurrentId();
    if (!id) {
      const name = new Date().toLocaleString();
      const meta = storage.createGame(name);
      id = meta.id;
    }
    setCurrentGameIdState(id);
    const games = storage.getGames();
    const meta = games.find(g => g.id === id);
    setGameName(meta?.name || new Date().toLocaleString());
  }, []);

  // After a game is selected/initialized, sweep empty games (except current)
  useEffect(() => {
    if (!currentGameId) return;
    const games = storage.getGames();
    let changed = false;
    for (const g of games) {
      if (g.id === currentGameId) continue;
      const data = storage.getData(g.id);
      if (!data.rolls || data.rolls.length === 0) {
        storage.deleteGame(g.id);
        changed = true;
      }
    }
    if (changed) setGamesVersion(v => v + 1);
  }, [currentGameId]);

  // Rolls state (hydrate from current game)
  const [rolls, setRolls] = useState<DiceRollEntry[]>([]);

  useEffect(() => {
    if (!currentGameId) return;
    const data = storage.getData(currentGameId);
    setRolls(Array.isArray(data.rolls) ? data.rolls : []);
    const last = Array.isArray(data.rolls) && data.rolls.length > 0 ? data.rolls[data.rolls.length - 1] : null;
    if (last) {
      if (last.source === 'virtual' && last.dice) {
        setDieA(last.dice[0]);
        setDieB(last.dice[1]);
        setDicePlaceholder(false);
        setMode('virtual');
      } else {
        setDicePlaceholder(true);
        setMode('manual');
      }
    } else {
      setDicePlaceholder(true);
    }
  }, [currentGameId]);

  // Persist on change
  useEffect(() => {
    if (!currentGameId) return;
    storage.saveData(currentGameId, { rolls });
    storage.touchGame(currentGameId);
  }, [rolls, currentGameId]);

  const startNewGame = () => {
    const name = new Date().toLocaleString();
    const meta = storage.createGame(name);
    setGameName(meta.name);
    setCurrentGameIdState(meta.id);
    setRolls([]);
    // keep sidebar open
    // Reset dice placeholders
    setDieA(1);
    setDieB(1);
    setDicePlaceholder(true);
    setMode('virtual');
    setGamesVersion(v => v + 1);
  };

  const loadGame = (id: string) => {
    localStorage.setItem('dice_tracker_current_game_id', id);
    setCurrentGameIdState(id);
    const games = storage.getGames();
    const meta = games.find(g => g.id === id);
    setGameName(meta?.name || '');
    const data = storage.getData(id);
    setRolls(Array.isArray(data.rolls) ? data.rolls : []);
    // keep sidebar open
    const last = Array.isArray(data.rolls) && data.rolls.length > 0 ? data.rolls[data.rolls.length - 1] : null;
    if (last && last.source === 'virtual' && last.dice) {
      setDieA(last.dice[0]);
      setDieB(last.dice[1]);
      setDicePlaceholder(false);
      setMode('virtual');
    } else {
      setDieA(1);
      setDieB(1);
      setDicePlaceholder(true);
      if (last && last.source === 'manual') setMode('manual');
    }
  };

  // Derived counts
  const counts = useMemo(() => {
    const map: Record<number, number> = {};
    for (let i = 2; i <= 12; i++) map[i] = 0;
    for (const r of rolls) {
      if (r.total >= 2 && r.total <= 12) map[r.total] += 1;
    }
    return map;
  }, [rolls]);

  const maxCount = useMemo(() => Math.max(1, ...Object.values(counts)), [counts]);

  // Virtual dice animation
  const [dieA, setDieA] = useState<number>(1);
  const [dieB, setDieB] = useState<number>(1);
  const [dicePlaceholder, setDicePlaceholder] = useState<boolean>(true);
  const rollingRef = useRef<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const addRoll = (total: number, source: RollSource, dice?: [number, number]) => {
    const entry: DiceRollEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      total,
      dice,
      source,
      ts: Date.now(),
    };
    setRolls(prev => [...prev, entry]);
  };

  const rollVirtual = () => {
    if (isRolling) return;
    setIsRolling(true);
    const start = performance.now();
    const duration = 900;
    const tick = (t: number) => {
      const elapsed = t - start;
      // spin dice quickly
      setDieA(Math.floor(Math.random() * 6) + 1);
      setDieB(Math.floor(Math.random() * 6) + 1);
      if (elapsed < duration) {
        rollingRef.current = requestAnimationFrame(tick);
      } else {
        const a = Math.floor(Math.random() * 6) + 1;
        const b = Math.floor(Math.random() * 6) + 1;
        setDieA(a);
        setDieB(b);
        setIsRolling(false);
        setDicePlaceholder(false);
        addRoll(a + b, 'virtual', [a, b]);
      }
    };
    rollingRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (rollingRef.current) cancelAnimationFrame(rollingRef.current);
  }, []);

  const undoLast = () => {
    setRolls(prev => prev.slice(0, -1));
  };

  const formatTime = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleString();
  };

  // Memoized recent games list (re-render on version bump)
  const recentGames = useMemo(() => {
    try {
      return storage.getGames().sort((a,b)=>b.updatedAt - a.updatedAt).slice(0,10);
    } catch {
      return [] as GameMeta[];
    }
  }, [gamesVersion]);

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
        <div className="absolute left-[1.25rem] right-[1.25rem] top-[76px] bottom-[84px] flex flex-col gap-5 overflow-auto">
          {/* Top: Input section with mode toggle */}
          <div className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Record roll</div>
              <div className="inline-flex items-center bg-white/10 rounded-full p-1">
                <button
                  className={`h-8 px-3 rounded-full text-xs transition-colors ${mode === 'virtual' ? 'bg-white/25 text-white' : 'text-white/70 hover:bg-white/10'}`}
                  onClick={() => setMode('virtual')}
                >
                  Virtual
                </button>
                <button
                  className={`h-8 px-3 rounded-full text-xs transition-colors ${mode === 'manual' ? 'bg-white/25 text-white' : 'text-white/70 hover:bg-white/10'}`}
                  onClick={() => setMode('manual')}
                >
                  Manual
                </button>
              </div>
            </div>

            {mode === 'virtual' ? (
              <div className="mt-4 flex items-center justify-between gap-4">
                {/* Dice visuals */}
                <div className="flex items-center gap-4">
                  {[
                    { v: dieA },
                    { v: dieB },
                  ].map((d, idx) => (
                    <div key={idx} className="w-18 h-18 sm:w-18 sm:h-18 rounded-xl bg-white text-black flex items-center justify-center text-xl sm:text-3xl font-bold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" aria-label={`Die ${idx + 1}: ${dicePlaceholder ? '?' : d.v}`}>
                      {dicePlaceholder ? '?' : d.v}
                    </div>
                  ))}
                </div>
                <button 
                  style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}
                  onClick={rollVirtual}
                  disabled={isRolling}
                  className="h-11 px-5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 disabled:opacity-60 text-sm shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F]"
                >
                  {isRolling ? '...' : 'Roll'}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                    <button
                      key={n}
                      onClick={() => addRoll(n, 'manual')}
                      className="h-14 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 text-md shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F]"
                      style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle: Histogram */}
          <div className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Distribution</div>
            </div>
            <div className="flex items-end gap-2 h-40">
              {Array.from({ length: 11 }, (_, i) => i + 2).map(n => {
                const c = counts[n];
                const h = Math.round((c / maxCount) * 100);
                const inside = h >= 20;
                return (
                  <div key={n} className="flex-1 flex flex-col items-center h-full justify-end">
                    <div className="relative w-full transition-[height] duration-300 ease-out" style={{ height: `${h}%` }}>
                      <div className="absolute inset-0 rounded-t-md bg-gradient-to-t from-white/15 to-white/60" />
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 text-[10px] ${inside ? 'top-1 text-black/80' : '-top-4 text-white/70'}`}
                      >
                        {c}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-white/70" style={{ fontWeight: 'bold', color: 'rgb(255, 83, 192)' }}>{n}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom: History with undo */}
          <div className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm min-h-[200px] flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">History</div>
              <button
                onClick={undoLast}
                disabled={rolls.length === 0}
                className="h-8 px-3 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-xs shadow-2xl bg-gradient-to-br from-[#B6116B] to-[#3B1578]"
                style={{ boxShadow: '-1px -1px 0px 0px rgb(255, 83, 192), 0px -1px 0px 0px rgb(255, 83, 192)' }}
              >
                Undo
              </button>
            </div>

            <div className="flex-1 overflow-auto pr-1">
              {[...rolls].reverse().map((r, idx, arr) => {
                const prev = arr[idx + 1];
                const deltaSec = prev ? Math.max(0, Math.floor((r.ts - prev.ts) / 1000)) : null;
                const deltaLabel = deltaSec == null
                  ? null
                  : deltaSec >= 60
                    ? `${Math.floor(deltaSec / 60)}m ${deltaSec % 60}s`
                    : `${deltaSec}s`;
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center text-base font-semibold">
                        {r.total}
                      </div>
                      <div className="text-xs">
                        <div className="text-white/90">{formatTime(r.ts)}</div>
                        <div className="text-white/60">{r.source === 'virtual' && r.dice ? `(${r.dice[0]}+${r.dice[1]})` : 'manual'}</div>
                      </div>
                    </div>
                    {deltaLabel !== null && (
                      <div className="text-xs text-white/60">{deltaLabel}</div>
                    )}
                  </div>
                );
              })}
              {rolls.length === 0 && (
                <div className="text-xs text-white/60 py-4 text-center">No rolls yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer nav (placeholders) */}
     
        <div className="absolute bottom-0 left-0 right-0 h-[64px] z-[1]" style={{ boxSizing: 'border-box' }}>
          <div className="absolute inset-0 z-[1] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)', backgroundBlendMode: 'overlay', boxSizing: 'border-box' }} >
            <div className="absolute w-[200px] h-[231px] left-[-45px] top-[-148px] z-[4]" style={{ background: '#3B1578', filter: 'blur(40px)' }} />
            <div className="absolute w-[200px] h-[231px] left-[50%] translate-x-[-50%] top-[12px] z-[2]" style={{ background: '#5172B3', filter: 'blur(60px)' }} />
            <div className="absolute w-[200px] h-[231px] right-[4px] top-[17px] z-[3]" style={{ background: '#FF53C0', filter: 'blur(60px)' }} />
          </div>




          <div className="h-14 flex items-center justify-around z-[9] relative">
            {/* Home (solid) */}
            <Link to="/home" aria-label="Home" className="p-2 relative h-[40px] w-[40px]">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden >
                <path d="M12 3.2 2.8 11a1 1 0 0 0 .65 1.76H5v7.24c0 .56.45 1 1 1h4.5V15h3V21h4.5c.55 0 1-.44 1-1V12.76h1.55a1 1 0 0 0 .65-1.76L12 3.2Z" />
              </svg>
            </Link>

            {/* Tracker (dice icon) */}
            <button aria-label="Tracker" className="p-2 relative h-[40px] w-[40px]">
              <LiquidGlassCard className="absolute w-[64px] h-[64px] rounded-full bottom-[28px] left-[-20px] flex items-center justify-center" style={{ borderRadius: '50%'}} >
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
              </LiquidGlassCard>
            </button>

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
                  <mask id="pips-mask-settings-tracker-side">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <circle cx="25" cy="25" r="9" fill="black" />
                    <circle cx="75" cy="25" r="9" fill="black" />
                    <circle cx="50" cy="50" r="9" fill="black" />
                    <circle cx="25" cy="75" r="9" fill="black" />
                    <circle cx="75" cy="75" r="9" fill="black" />
                  </mask>
                </defs>
                <rect x="8" y="8" width="84" height="84" rx="12" fill="currentColor" mask="url(#pips-mask-settings-tracker-side)" />
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
                <button
                  aria-label="Rename game"
                  className="h-9 w-9 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center"
                  onClick={() => {
                    const name = prompt('Rename current game', gameName || '');
                    if (name && name.trim()) {
                      setGameName(name.trim());
                      const id = currentGameId;
                      if (id) { storage.renameGame(id, name.trim()); setGamesVersion(v => v + 1); }
                    }
                  }}
                >
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
                      <button aria-label="Rename game" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={() => {
                        const name = prompt('Rename game', g.name);
                        if (name && name.trim()) { storage.renameGame(g.id, name.trim()); setGameName(prev => (g.id===currentGameId? name.trim(): prev)); setGamesVersion(v => v + 1); }
                      }}>
                        <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                      <button aria-label="Delete game" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={() => {
                        if (confirm('Delete this game permanently?')) { 
                          storage.deleteGame(g.id); 
                          setGamesVersion(v => v + 1);
                          const nextCurrent = storage.getCurrentId();
                          if (nextCurrent) loadGame(nextCurrent); else startNewGame();
                        }
                      }}>
                        <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  ))}
                  {recentGames.length === 0 && (
                    <div className="text-xs text-white/60">No saved games yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Tracker;


