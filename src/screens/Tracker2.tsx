import React, { useEffect, useMemo, useRef, useState, Suspense, lazy, useLayoutEffect } from 'react';
import '../index2.css';
import { Link } from 'react-router-dom';
const LiquidGlassCard = lazy(() => import('../components/LiquidGlassCard'));
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../auth/AuthProvider';
import { createOrUpdateAppDataJson, readAppDataJson, exportAllLocalStorage, importAllToLocalStorage } from '../drive/driveClient';
import { exportLocalToFile, importLocalFromFile } from '../drive/localExport';
import { useSync } from '../drive/SyncProvider';

const Tracker2: React.FC = () => {
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

  // Auth
  const { isAuthenticated, user, signIn, signOut, getAccessToken } = useAuth();
  const { lastBackupAt, autoBackupEnabled, setAutoBackupEnabled } = useSync();
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOverflow, setSidebarOverflow] = useState<boolean>(false);
  const [authExpanded, setAuthExpanded] = useState<boolean>(false);

  function formatBackup(ts: number) {
    try {
      const d = new Date(ts);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (h === 0) h = 12;
      const hh = String(h).padStart(2, '0');
      return `${dd}/${mm}/${yy} ${hh}:${m} ${ampm}`;
    } catch { return '—'; }
  }

  // Responsive mode: desktop when width > height (min-width >= 100vh)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    try { return window.innerWidth > window.innerHeight } catch { return false }
  });
  useEffect(() => {
    const onResize = () => { try { setIsDesktop(window.innerWidth > window.innerHeight) } catch {} };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, []);

  // Measure sidebar overflow (desktop only) to decide whether to collapse auth controls
  useLayoutEffect(() => {
    if (!isDesktop) { setSidebarOverflow(false); setAuthExpanded(false); return; }
    const el = sidebarRef.current;
    if (!el) return;
    const measure = () => {
      const overflow = el.scrollHeight > el.clientHeight + 1;
      setSidebarOverflow(overflow);
      if (!overflow) setAuthExpanded(false);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('orientationchange', measure); };
  }, [isDesktop]);

  async function handleBackup() {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const snapshot = exportAllLocalStorage();
      await createOrUpdateAppDataJson(token, 'app_data.json', { snapshot, ts: Date.now() });
      alert('Backup complete to Drive AppData.');
    } catch (e) {
      alert('Backup failed.');
    }
  }

  async function handleRestore() {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const data = await readAppDataJson<{ snapshot: Record<string,string> }>(token, 'app_data.json');
      if (data?.snapshot) {
        importAllToLocalStorage(data.snapshot);
        alert('Restore complete. Restarting screen…');
        window.location.reload();
      } else {
        alert('No backup found.');
      }
    } catch (e) {
      alert('Restore failed.');
    }
  }

  function handleExportFile() {
    exportLocalToFile()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      await importLocalFromFile(f)
      alert('Imported backup. Restarting screen…')
      window.location.reload()
    } catch {
      alert('Import failed: invalid file')
    } finally {
      e.currentTarget.value = ''
    }
  }

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
  const [pulseKey, setPulseKey] = useState(0);
  const [targetValues, setTargetValues] = useState<{a: number; b: number} | null>(null);
  const [cssKey] = useState(0);
  const [spinPhase, setSpinPhase] = useState<'idle'|'rolling'>('idle');
  const [spinTurns, setSpinTurns] = useState<{ ax: number; ay: number; bx: number; by: number }>({ ax: 0, ay: 0, bx: 0, by: 0 });
  const [transformStep, setTransformStep] = useState<'idle'|'prep'|'go'>('idle');
  const [rollSeq, setRollSeq] = useState(0);

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
    // choose final results now; CSS will animate directly to them with extra spins
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 6) + 1;
    setTargetValues({ a, b });
    // random extra full rotations on each axis so animation smoothly decelerates to the correct face
    const ax = 2 + Math.floor(Math.random() * 2); // 2..3
    const ay = 1 + Math.floor(Math.random() * 2); // 1..2
    const bx = 2 + Math.floor(Math.random() * 2);
    const by = 1 + Math.floor(Math.random() * 2);
    setSpinTurns({ ax, ay, bx, by });
    // two-phase transform to trigger CSS transition: prep -> go
    setSpinPhase('rolling');
    setTransformStep('prep');
    setRollSeq(s => s + 1);
    setTimeout(() => {
      setDieA(a); setDieB(b);
      setIsRolling(false);
      setDicePlaceholder(false);
      addRoll(a + b, 'virtual', [a, b]);
      if (a === b) {
        try { (window as any).confetti?.({ particleCount: 60, spread: 60, origin: { y: 0.35 }, scalar: 0.8 }); } catch {}
        setPulseKey((k: number) => k + 1);
      }
      setSpinPhase('idle');
      setTransformStep('idle');
    }, 1000);
  };

  // Advance from prep to go on next frame to ensure transform change is animated
  useEffect(() => {
    if (transformStep === 'prep') {
      const id = requestAnimationFrame(() => setTransformStep('go'));
      return () => cancelAnimationFrame(id);
    }
  }, [transformStep, rollSeq]);

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

  if (isDesktop) {
    return (
      <div className="app-safe overflow-hidden bg-gradient-to-br from-[#2E1371] to-[#130B2B] text-white relative" style={{ minHeight: '100dvh' }}>
        <div className="relative w-full h-full flex">
          {/* Sidebar */}
          <aside ref={sidebarRef} className="sticky top-0 h-screen overflow-y-auto shrink-0 w-[240px] px-4 py-6 flex flex-col justify-between z-[10] relative">
            <div>
              {/* Brand */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 100 100" aria-hidden>
                    <defs>
                      <mask id="pips-mask-sidebar-logo">
                        <rect x="0" y="0" width="100" height="100" fill="white" />
                        <circle cx="25" cy="25" r="9" fill="black" />
                        <circle cx="75" cy="25" r="9" fill="black" />
                        <circle cx="50" cy="50" r="9" fill="black" />
                        <circle cx="25" cy="75" r="9" fill="black" />
                        <circle cx="75" cy="75" r="9" fill="black" />
                      </mask>
                    </defs>
                    <rect x="8" y="8" width="84" height="84" rx="12" fill="currentColor" mask="url(#pips-mask-sidebar-logo)" />
                    <rect x="8" y="8" width="84" height="84" rx="12" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-white text-2xl font-bold leading-tight">
                    <span className="bg-gradient-to-r from-[#CF9EFF] via-[#A071FF] to-[#CF9EFF] bg-clip-text text-transparent animate-gradient">Dice</span><span className="text-white">&nbsp;Tracker</span>
                  </h1>
                </div>
              </div>
              <hr className="my-4 border-white/10" />
              {/* Nav */}
              <nav className="flex flex-col gap-2 text-sm mt-2" id="main-nav">
                <Link to="/home" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-white hover:bg-white/20">Map Generator</Link>
                <Link to="/tracker" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#f9fafb] text-[#2E1371]">Dice Tracker</Link>
                <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-white hover:bg-white/20">Profile</Link>
              </nav>
            </div>
            <div>
              <hr className="my-4 border-white/10" />
              {isAuthenticated ? (
                <div className="text-white">
                  <div className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10">
                    <img src={user?.imageUrl || ''} alt="avatar" className="w-10 h-10 rounded-full bg-white/20" loading="eager" decoding="async" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate max-w-[18ch]">{user?.name || ''}</p>
                      <p className="text-xs text-white/70 truncate max-w-[22ch]">{user?.email || ''}</p>
                    </div>
                    {sidebarOverflow && (
                      <button aria-label="Toggle controls" onClick={() => setAuthExpanded(v=>!v)} className="ml-auto p-2 rounded-md hover:bg-white/10">
                        <svg className={`w-4 h-4 text-white transition-transform ${authExpanded ? '' : '-rotate-90'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                    )}
                  </div>
                  {/* Inline controls when no overflow */}
                  {!sidebarOverflow && (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button onClick={handleBackup} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Backup</button>
                        <button onClick={handleRestore} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Restore</button>
                        <button onClick={handleExportFile} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs col-span-1">Export</button>
                        <label className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs flex items-center justify-center cursor-pointer col-span-1">
                          Import
                          <input type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                        </label>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-white/80">
                        <div className="flex flex-col"><span>Last backup:</span><span>{lastBackupAt ? formatBackup(lastBackupAt) : '—'}</span></div>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={autoBackupEnabled} onChange={e=>setAutoBackupEnabled(e.target.checked)} />
                          Auto backup
                        </label>
                      </div>
                      <div className="mt-3">
                        <button onClick={signOut} className="w-full h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Sign out</button>
                      </div>
                    </>
                  )}
                  {/* Popup submenu when overflow and expanded */}
                  {sidebarOverflow && authExpanded && (
                    <>
                      <div className="fixed inset-0 z-[90]" onClick={() => setAuthExpanded(false)} aria-hidden />
                      <div className="absolute left-2 right-2 bottom-4 z-[100] rounded-xl border border-white/10 bg-[#120A28]/95 backdrop-blur p-3 shadow-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-white/70">User actions</div>
                          <button aria-label="Close" onClick={() => setAuthExpanded(false)} className="p-1 rounded-md hover:bg-white/10">
                            <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={handleBackup} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Backup</button>
                          <button onClick={handleRestore} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Restore</button>
                          <button onClick={handleExportFile} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Export</button>
                          <label className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs flex items-center justify-center cursor-pointer">
                            Import
                            <input type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                          </label>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-white/80">
                          <div className="flex flex-col"><span>Last backup:</span><span>{lastBackupAt ? formatBackup(lastBackupAt) : '—'}</span></div>
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={autoBackupEnabled} onChange={e=>setAutoBackupEnabled(e.target.checked)} />
                            Auto backup
                          </label>
                        </div>
                        <div className="mt-3">
                          <button onClick={signOut} className="w-full h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Sign out</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <GoogleSignInButton onClick={signIn} variant="full" className="w-full" aria-label="Sign in with Google" />
              )}
            </div>
          </aside>

          {/* Main body (white panel) */}
          <main className="flex-1 p-0 m-2 overflow-hidden h-full w-full relative" style={{ borderRadius: '16px', backgroundColor: 'rgb(249 250 251 / var(--tw-bg-opacity, 1))', zIndex: 1, height: 'calc(100svh - 1rem)' }}>
            <div className="w-full h-full rounded-[16px] overflow-hidden">
              <header className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dice Tracker</h1>
                    <p className="mt-2 text-gray-500">Record rolls, view distribution, and browse history.</p>
                  </div>
                </div>
              </header>
              <div className="px-6 pb-6" style={{ height: 'calc(100% - 114px)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr max(25%,350px)', gridTemplateRows: '1fr 1fr', gap: '16px', height: '100%' }}>
                  {/* Dice roll (manual and virtual) - col1 x row1 */}
                  <section style={{ gridColumn: '1 / 2', gridRow: '1 / 2' }} className="rounded-2xl border border-gray-200 bg-white h-full overflow-auto">
                    <div className="p-4 h-full flex flex-col">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">Record roll</div>
                        <div className="inline-flex items-center rounded-full p-1 bg-gray-100">
                          <button className={`h-8 px-3 rounded-full text-xs transition-colors ${mode === 'virtual' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:bg-white/50'}`} onClick={() => setMode('virtual')}>Virtual</button>
                          <button className={`h-8 px-3 rounded-full text-xs transition-colors ${mode === 'manual' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:bg-white/50'}`} onClick={() => setMode('manual')}>Manual</button>
                        </div>
                      </div>
                      {mode === 'virtual' ? (
                        <div className="mt-4 relative flex-1">
                          {/* Centered dice overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex items-center gap-[10%] -translate-x-1/4">
                              {([0,1] as const).map((i) => {
                              const v = i===0 ? dieA : dieB;
                              const colorClass = i===0 ? 'die-red' : 'die-yellow';
                              const t = targetValues;
                              const baseRot = (val: number): { rx: number; ry: number } => {
                                switch(val){
                                  case 1: return { rx: -90, ry: 0 };
                                  case 2: return { rx: 0, ry: 180 };
                                  case 3: return { rx: 0, ry: -90 };
                                  case 4: return { rx: 0, ry: 90 };
                                  case 5: return { rx: 0, ry: 0 };
                                  case 6: return { rx: 90, ry: 0 };
                                  default: return { rx: 0, ry: 0 };
                                }
                              };
                              const currentVal = v;
                              const targetVal = t ? (i===0 ? t.a : t.b) : v;
                              const cur = baseRot(currentVal);
                              const tar = baseRot(targetVal);
                              const spins = spinPhase==='rolling' ? (i===0 ? { sx: spinTurns.ax, sy: spinTurns.ay } : { sx: spinTurns.bx, sy: spinTurns.by }) : { sx: 0, sy: 0 };
                              const transform = transformStep==='prep' ? `rotateX(${cur.rx}deg) rotateY(${cur.ry}deg)` : `rotateX(${tar.rx + spins.sx*360}deg) rotateY(${tar.ry + spins.sy*360}deg)`;
                              return (
                                <div key={`${i}-${cssKey}`} className="dice-scene cursor-pointer z-[10]" onClick={rollVirtual} role="button" aria-label="Roll dice" style={{ ['--size' as any]: 'min(15vh, 15vw, 200px)' }}>
                                  <div className="dice-wrapper">
                                    <div className={`dice ${colorClass} ${spinPhase==='rolling' ? 'rolling' : ''}`} style={{ transform }}>
                                      <div className="absolute inset-0 rounded-[8px]" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04) inset, 0 0 0 0.5px rgba(0,0,0,0.05)' }} />
                                      <div className="face" style={{ transform: 'rotateX(90deg) translateZ(var(--half))' }}>
                                        <div className="face-surface" />
                                        <div className="edge-strip top" />
                                        <div className="edge-strip bottom" />
                                        <div className="edge-strip left" />
                                        <div className="edge-strip right" />
                                        <div className="pip" style={{ left: '50%', top: '50%' }} />
                                      </div>
                                      <div className="face" style={{ transform: 'rotateX(-90deg) translateZ(var(--half))' }}>
                                        <div className="face-surface" />
                                        <div className="edge-strip top" />
                                        <div className="edge-strip bottom" />
                                        <div className="edge-strip left" />
                                        <div className="edge-strip right" />
                                        {[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                                      </div>
                                      <div className="face" style={{ transform: 'rotateY(90deg) translateZ(var(--half))' }}>
                                        <div className="face-surface" />
                                        <div className="edge-strip top" />
                                        <div className="edge-strip bottom" />
                                        <div className="edge-strip left" />
                                        <div className="edge-strip right" />
                                        {[[-1,-1],[0,0],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                                      </div>
                                      <div className="face" style={{ transform: 'rotateY(-90deg) translateZ(var(--half))' }}>
                                        <div className="face-surface" />
                                        <div className="edge-strip top" />
                                        <div className="edge-strip bottom" />
                                        <div className="edge-strip left" />
                                        <div className="edge-strip right" />
                                        {[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                                      </div>
                                      <div className="face" style={{ transform: 'translateZ(var(--half))' }}>
                                        <div className="face-surface" />
                                        <div className="edge-strip top" />
                                        <div className="edge-strip bottom" />
                                        <div className="edge-strip left" />
                                        <div className="edge-strip right" />
                                        {[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                                      </div>
                                      <div className="face" style={{ transform: 'rotateY(180deg) translateZ(var(--half))' }}>
                                        <div className="face-surface" />
                                        <div className="edge-strip top" />
                                        <div className="edge-strip bottom" />
                                        <div className="edge-strip left" />
                                        <div className="edge-strip right" />
                                        {[[-1,-1],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                                      </div>
                                      {isRolling && (<div className="dice-shimmer" />)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          </div>
                          {/* Keep Roll button accessible within the section */}
                          <div className="absolute top-1/2 -translate-y-1/2 right-4">
                            <button 
                              onClick={rollVirtual}
                              disabled={isRolling}
                              className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-sm text-white"
                            >
                              {isRolling ? '...' : 'Roll'}
                            </button>
                          </div>
                          <div aria-live="polite" className="sr-only">
                            {isRolling ? 'Rolling virtual dice…' : `Rolled ${dieA} and ${dieB}; total ${dieA + dieB}.`}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <div className="grid grid-cols-6 gap-2">
                            {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                              <button
                                key={n}
                                onClick={() => addRoll(n, 'manual')}
                                className="rounded-xl border text-md font-semibold transition-all
                                  bg-gradient-to-b from-[#2e1371cc] to-[#2e1371ff] text-gray-100 border-gray-200
                                  hover:from-[#130B2Bcc] hover:to-[#130B2Bff] hover:shadow-md hover:translate-y-[-1px]
                                  active:translate-y-[0px] active:shadow-sm"
                                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.06)', aspectRatio: '1 / 0.75' }}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Histogram - col1 x row2 */}
                  <section style={{ gridColumn: '1 / 2', gridRow: '2 / 3' }} className="rounded-2xl border border-gray-200 bg-white h-full overflow-auto">
                    <div className="p-4 h-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">Distribution</div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <span>Total rolls</span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-900">{rolls.length}</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-2" style={{ height: 'calc(100% - 16px)' }}>
                        {Array.from({ length: 11 }, (_, i) => i + 2).map(n => {
                          const c = counts[n];
                          const h = Math.round((c / maxCount) * 100);
                          const inside = h >= 20;
                          return (
                            <div key={n} className="flex-1 flex flex-col items-center h-full justify-end">
                              <div className="relative w-full transition-[height] duration-300 ease-out" style={{ height: `${h}%` }}>
                                <div className="absolute inset-0 rounded-t-md bg-gradient-to-t from-purple-200 to-purple-400" />
                                <div className={`absolute left-1/2 -translate-x-1/2 text-[10px] ${inside ? 'top-1 text-black/80' : '-top-4 text-gray-700'}`}>{c}</div>
                              </div>
                              <div className="mt-1 text-[10px] text-gray-700 font-bold">{n}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* History - col2 spans rows */}
                   <section style={{ gridColumn: '2 / 3', gridRow: '1 / 3' }} className="rounded-2xl border border-gray-200 bg-white h-full overflow-hidden flex flex-col">
                     <div className="p-4 flex items-center justify-between">
                       <div className="text-sm font-medium text-gray-900 flex items-center gap-2"><span>History</span><span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-900 text-xs">{rolls.length}</span></div>
                       <button onClick={undoLast} disabled={rolls.length === 0} className="h-8 px-3 rounded-lg border border-gray-300 bg-purple-200 hover:bg-purple-400 disabled:opacity-50 text-xs text-black">Undo</button>
                     </div>
                     <div className="flex-1 overflow-auto px-4 pb-4">
                       {[...rolls].reverse().map((r, idx, arr) => {
                         const prev = arr[idx + 1];
                         const deltaSec = prev ? Math.max(0, Math.floor((r.ts - prev.ts) / 1000)) : null;
                         const deltaLabel = deltaSec == null ? null : deltaSec >= 60 ? `${Math.floor(deltaSec / 60)}m ${deltaSec % 60}s` : `${deltaSec}s`;
                         return (
                           <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                             <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center text-base font-semibold">{r.total}</div>
                               <div className="text-xs text-gray-700">
                                 <div className="text-gray-800">{new Date(r.ts).toLocaleString()}</div>
                                 <div className="text-gray-500">{r.source === 'virtual' && r.dice ? `(${r.dice[0]}+${r.dice[1]})` : 'manual'}</div>
                               </div>
                             </div>
                             {deltaLabel !== null && (
                               <div className="text-xs text-gray-500">{deltaLabel}</div>
                             )}
                           </div>
                         );
                       })}
                       {rolls.length === 0 && (
                         <div className="text-xs text-gray-500 py-4 text-center">No rolls yet</div>
                       )}
                     </div>
                   </section>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-safe overflow-hidden bg-gradient-to-br from-[#2E1371] to-[#130B2B] text-white relative">
        <div className="absolute w-[300px] h-[300px] left-[-132px] top-[178px] z-[0]" style={{ background: 'rgba(96, 255, 231, 0.4)', filter: 'blur(100px)' }} />
        <div className="absolute w-[300px] h-[300px] right-[-147px] top-[375px] z-[0]" style={{ background: 'rgba(255, 83, 192, 0.4)', filter: 'blur(100px)' }} />
        
        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="h-9 flex items-center justify-between gap-2 select-none">
          <button aria-label="Back" className="p-2 relative opacity-0">
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
        <div className="absolute left-[1.25rem] right-[1.25rem] flex flex-col gap-5 scroll-y" style={{ top: 'calc(76px + var(--safe-top))', bottom: 'calc(84px + var(--safe-bottom))' }}>
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
                {/* CSS 3D dice visuals */}
                <div className="flex items-center gap-5 relative">
                  {([0,1] as const).map((i) => {
                    const v = i===0 ? dieA : dieB;
                    const colorClass = i===0 ? 'die-red' : 'die-yellow';
                    const t = targetValues;
                    // Map face value to CSS rotations (face up): 1=(0,0), 2=(0,90), 3=(0,-90), 4=(0,180), 5=(90,0), 6=(-90,0)
                    const baseRot = (val: number): { rx: number; ry: number } => {
                      // Base rotations in degrees for top face
                      // +Z = 5, -Z = 2, +Y = 1, -Y = 6, +X = 3, -X = 4
                      switch(val){
                        case 1: return { rx: -90, ry: 0 }; // +Y up
                        case 2: return { rx: 0, ry: 180 }; // -Z up
                        case 3: return { rx: 0, ry: -90 }; // +X up
                        case 4: return { rx: 0, ry: 90 };  // -X up
                        case 5: return { rx: 0, ry: 0 };   // +Z up
                        case 6: return { rx: 90, ry: 0 };  // -Y up
                        default: return { rx: 0, ry: 0 };
                      }
                    };
                    // Determine base/current and target transforms
                    const currentVal = v; // current visible face before roll
                    const targetVal = t ? (i===0 ? t.a : t.b) : v;
                    const cur = baseRot(currentVal);
                    const tar = baseRot(targetVal);
                    const spins = spinPhase==='rolling' ? (i===0 ? { sx: spinTurns.ax, sy: spinTurns.ay } : { sx: spinTurns.bx, sy: spinTurns.by }) : { sx: 0, sy: 0 };
                    const transform = transformStep==='prep'
                      ? `rotateX(${cur.rx}deg) rotateY(${cur.ry}deg)`
                      : `rotateX(${tar.rx + spins.sx*360}deg) rotateY(${tar.ry + spins.sy*360}deg)`;
                    return (
                      <div key={`${i}-${cssKey}`} className="dice-scene" style={{ ['--size' as any]: '72px' }}>
                        <div className="dice-wrapper">
                          <div className={`dice ${colorClass} ${spinPhase==='rolling' ? 'rolling' : ''}`} style={{ transform }}>
                            {/* hairline edges to avoid gaps */}
                            <div className="absolute inset-0 rounded-[8px]" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04) inset, 0 0 0 0.5px rgba(0,0,0,0.05)' }} />
                            {/* +Y face (1) */}
                            <div className="face" style={{ transform: 'rotateX(90deg) translateZ(37px)' }}>
                              <div className="face-surface" />
                              <div className="edge-strip top" />
                              <div className="edge-strip bottom" />
                              <div className="edge-strip left" />
                              <div className="edge-strip right" />
                              <div className="pip" style={{ left: '50%', top: '50%' }} />
                            </div>
                            {/* -Y face (6) */}
                            <div className="face" style={{ transform: 'rotateX(-90deg) translateZ(37px)' }}>
                              <div className="face-surface" />
                              <div className="edge-strip top" />
                              <div className="edge-strip bottom" />
                              <div className="edge-strip left" />
                              <div className="edge-strip right" />
                              {[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                            </div>
                            {/* +X face (3) */}
                            <div className="face" style={{ transform: 'rotateY(90deg) translateZ(37px)' }}>
                              <div className="face-surface" />
                              <div className="edge-strip top" />
                              <div className="edge-strip bottom" />
                              <div className="edge-strip left" />
                              <div className="edge-strip right" />
                              {[[-1,-1],[0,0],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                            </div>
                            {/* -X face (4) */}
                            <div className="face" style={{ transform: 'rotateY(-90deg) translateZ(37px)' }}>
                              <div className="face-surface" />
                              <div className="edge-strip top" />
                              <div className="edge-strip bottom" />
                              <div className="edge-strip left" />
                              <div className="edge-strip right" />
                              {[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                            </div>
                            {/* +Z face (5) */}
                            <div className="face" style={{ transform: 'translateZ(37px)' }}>
                              <div className="face-surface" />
                              <div className="edge-strip top" />
                              <div className="edge-strip bottom" />
                              <div className="edge-strip left" />
                              <div className="edge-strip right" />
                              {[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                            </div>
                            {/* -Z face (2) */}
                            <div className="face" style={{ transform: 'rotateY(180deg) translateZ(37px)' }}>
                              <div className="face-surface" />
                              <div className="edge-strip top" />
                              <div className="edge-strip bottom" />
                              <div className="edge-strip left" />
                              <div className="edge-strip right" />
                              {[[-1,-1],[1,1]].map(([x,y],k)=>(<div key={k} className="pip" style={{ left:`${50 + x*25}%`, top:`${50 + y*25}%` }} />))}
                            </div>
                            {isRolling && (<div className="dice-shimmer" />)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button 
                  style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}
                  onClick={rollVirtual}
                  disabled={isRolling}
                  className="h-11 px-5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 disabled:opacity-60 text-sm shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F]"
                >
                  {isRolling ? '...' : 'Roll'}
                </button>
                {/* Pulse ring on doubles */}
                <div key={pulseKey} className="pointer-events-none absolute inset-0 flex items-center justify-start" />
                {/* Aria announcements */}
                <div aria-live="polite" className="sr-only">
                  {isRolling ? 'Rolling virtual dice…' : `Rolled ${dieA} and ${dieB}; total ${dieA + dieB}.`}
                </div>
                {/* Placeholder overlay when no prior virtual roll */}
                {dicePlaceholder && (
                  <div className="sr-only">Waiting for first roll…</div>
                )}
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
              <div className="text-xs flex items-center gap-2">
                <span>Total rolls</span>
                <span className="px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-white/90 text-[11px]">{rolls.length}</span>
              </div>
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
              <div className="text-sm font-medium flex items-center gap-2">History <span className="px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-white/90 text-[11px]">{rolls.length}</span></div>
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
     
        <div className="absolute bottom-0 left-0 right-0 z-[1]" style={{ boxSizing: 'border-box', height: 'calc(64px + var(--safe-bottom))' }}>
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
              <Suspense fallback={null}>
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
              </Suspense>
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
        <div className={`absolute inset-0 z-[60] transition-opacity ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)} aria-hidden={!menuOpen} />
        <div className={`absolute right-0 top-0 bottom-0 z-[61] w-[320px] max-w-[85vw] bg-gradient-to-b from-[#1B0F3E] to-[#120A28] border-l border-white/10 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true">
          <div className="h-full flex flex-col" style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}>
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
                <button onClick={startNewGame} className="w-full h-10 rounded-md border border-white/15 bg-gradient-to-br from-[#B6116B] to-[#3B1578] text-white text-sm" style={{ boxShadow: '-1px -1px 0px 0px rgb(255, 83, 192), 0px -1px 0px 0px rgb(255, 83, 192)' }}>New game</button>
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
            <div className="p-5 border-t border-white/10" style={{ paddingBottom: 'max(var(--safe-bottom), 1.25rem)' }}>
            {isAuthenticated ? (
              <div className="w-full flex flex-col gap-3">
                <div className="w-full flex items-center gap-3">
                  <img src={user?.imageUrl || ''} alt="avatar" className="w-9 h-9 rounded-full bg-white/20" loading="eager" decoding="async" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{user?.name}</div>
                    <div className="text-xs text-white/70 truncate">{user?.email}</div>
                  </div>
                  <button onClick={signOut} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Sign out</button>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                  <button onClick={handleBackup} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Backup</button>
                  <button onClick={handleRestore} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Restore</button>
                </div>
                <div className="w-full flex items-center justify-between text-xs text-white/80">
                <div className="flex flex-col"><span>Last backup:</span><span>{lastBackupAt ? formatBackup(lastBackupAt) : '—'}</span></div>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={autoBackupEnabled} onChange={e=>setAutoBackupEnabled(e.target.checked)} />
                    Auto backup
                  </label>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                  <button onClick={handleExportFile} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Export file</button>
                  <label className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-xs flex items-center justify-center cursor-pointer">
                    Import file
                    <input type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
                <GoogleSignInButton onClick={signIn} variant="full" className="w-full" aria-label="Sign in with Google" />
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default Tracker2;


