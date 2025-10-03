import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import '../index2.css';
import { Link, useNavigate } from 'react-router-dom';
import LiquidGlassCard from '../components/LiquidGlassCard';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../auth/AuthProvider';
import { createOrUpdateAppDataJson, readAppDataJson, exportAllLocalStorage, importAllToLocalStorage } from '../drive/driveClient';
import { exportLocalToFile, importLocalFromFile } from '../drive/localExport';
import { useSync } from '../drive/SyncProvider';

const Profile2: React.FC = () => {
  const { isAuthenticated, user, signIn, signOut, getAccessToken } = useAuth();
  const { lastBackupAt, autoBackupEnabled, setAutoBackupEnabled } = useSync();
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOverflow, setSidebarOverflow] = useState<boolean>(false);
  const [authExpanded, setAuthExpanded] = useState<boolean>(false);
  const lastZoomRef = useRef<number | null>(null);
  const zoomRafRef = useRef<number | null>(null);

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
  // device presets removed – full-viewport rendering
  // removed unused impactAnchor and measurement refs
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
  const currentGameId = useMemo(() => storage.getCurrentId(), [gamesVersion]);
  const currentRolls = useMemo(() => {
    const id = storage.getCurrentId();
    if (!id) return [] as DiceRollEntry[];
    return storage.getData(id).rolls || [];
  }, [gamesVersion]);

  // Preferences
  const [prefStartInLastPlayers, setPrefStartInLastPlayers] = useState<boolean>(() => {
    try { return localStorage.getItem('pref_start_last_players') === '1'; } catch { return true; }
  });
  const [prefNoAdjacent68, setPrefNoAdjacent68] = useState<boolean>(() => {
    try { return localStorage.getItem('pref_no_adjacent_6_8') === '1'; } catch { return false; }
  });
  const [prefColorblindPips, setPrefColorblindPips] = useState<boolean>(() => {
    try { return localStorage.getItem('pref_colorblind_pips') === '1'; } catch { return false; }
  });
  const [prefReduceMotion, setPrefReduceMotion] = useState<boolean>(() => {
    try { return localStorage.getItem('pref_reduce_motion') === '1'; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem('pref_start_last_players', prefStartInLastPlayers ? '1' : '0'); } catch {} }, [prefStartInLastPlayers]);
  useEffect(() => { try { localStorage.setItem('pref_no_adjacent_6_8', prefNoAdjacent68 ? '1' : '0'); } catch {} }, [prefNoAdjacent68]);
  useEffect(() => { try { localStorage.setItem('pref_colorblind_pips', prefColorblindPips ? '1' : '0'); } catch {} }, [prefColorblindPips]);
  useEffect(() => { try { localStorage.setItem('pref_reduce_motion', prefReduceMotion ? '1' : '0'); } catch {} }, [prefReduceMotion]);
  

  // Quick actions
  const exportCurrentAsJSON = () => {
    if (!currentGameId) return;
    const data = storage.getData(currentGameId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dice-tracker-${currentGameId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportCurrentAsCSV = () => {
    if (!currentGameId) return;
    const data = storage.getData(currentGameId).rolls || [];
    const rows = [['id','timestamp','total','source','dieA','dieB']].concat(
      data.map(r => [r.id, new Date(r.ts).toISOString(), String(r.total), r.source, String(r.dice?.[0] ?? ''), String(r.dice?.[1] ?? '')])
    );
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dice-tracker-${currentGameId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const clearCurrentGame = () => {
    if (!currentGameId) return;
    if (!confirm('Clear all rolls in the current game?')) return;
    storage.saveData(currentGameId, { rolls: [] });
    setGamesVersion(v=>v+1);
  };
  const clearAllGames = () => {
    if (!confirm('Delete all saved games and rolls?')) return;
    const games = storage.getGames();
    games.forEach(g => localStorage.removeItem(storage.dataKey(g.id)));
    localStorage.removeItem('dice_tracker_games');
    localStorage.removeItem('dice_tracker_current_game_id');
    // create a fresh one
    const meta = storage.createGame(new Date().toLocaleString());
    setGameName(meta.name);
    setGamesVersion(v=>v+1);
  };

  // Simple stats
  const totalRolls = currentRolls.length;
  const mostFreq = useMemo(() => {
    const cnt: Record<number, number> = {};
    for (let i=2;i<=12;i++) cnt[i]=0;
    currentRolls.forEach(r => { if (r.total>=2 && r.total<=12) cnt[r.total]++; });
    let best = 2; let bestC = 0;
    for (let i=2;i<=12;i++) if (cnt[i] > bestC) { bestC = cnt[i]; best = i; }
    return bestC>0 ? `${best} (${bestC} rolls)` : '—';
  }, [currentRolls]);
  const elapsed = useMemo(() => {
    if (currentRolls.length < 2) return '—';
    const ms = currentRolls[currentRolls.length-1].ts - currentRolls[0].ts;
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / (24*3600));
    const hours = Math.floor((totalSeconds % (24*3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, [currentRolls]);
  const startNewGame = () => {
    const meta = storage.createGame(new Date().toLocaleString());
    setGameName(meta.name); setGamesVersion(v=>v+1);
    navigate('/tracker');
  };
  const loadGame = (id: string) => { storage.setCurrentId(id); setGamesVersion(v=>v+1); navigate('/tracker'); };
 
  // Responsive desktop check (width > height)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => { try { return window.innerWidth > window.innerHeight } catch { return false } });
  useEffect(() => {
    const onResize = () => { try { setIsDesktop(window.innerWidth > window.innerHeight) } catch {} };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, []);

  // Apply zoom to the main content box (desktop) similar to Home5, but avoid feedback loops
  useEffect(() => {
    const targetId = 'profile-main-content-box';
    const applyZoomNow = () => {
      try {
        const el = document.getElementById(targetId) as HTMLDivElement | null;
        if (!el) return;
        const clientH = el.clientHeight;
        const scrollH = el.scrollHeight;
        if (scrollH <= 0) return;
        let z = (clientH - 132) / scrollH;
        // Clamp and stabilize
        z = Math.max(0.1, Math.min(1, z));
        z = Math.round(z * 1000) / 1000; // limit precision to reduce oscillation
        const prev = lastZoomRef.current;
        if (prev !== null && Math.abs(prev - z) < 0.01) return; // ignore tiny changes
        lastZoomRef.current = z;
        (el.style as any).zoom = String(z);
      } catch {}
    };
    const schedule = () => {
      if (zoomRafRef.current != null) return;
      try {
        zoomRafRef.current = requestAnimationFrame(() => {
          zoomRafRef.current = null;
          applyZoomNow();
        });
      } catch {
        applyZoomNow();
      }
    };

    if (!isDesktop) {
      // Reset zoom when leaving desktop to avoid odd states
      try {
        const el = document.getElementById(targetId) as HTMLDivElement | null;
        if (el) (el.style as any).zoom = '';
      } catch {}
      return;
    }

    // Initial
    schedule();
    // Events
    const onResize = () => schedule();
    const onLoad = () => schedule();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('load', onLoad);
      try {
        if (zoomRafRef.current != null) cancelAnimationFrame(zoomRafRef.current);
      } catch {}
      zoomRafRef.current = null;
    };
  }, [isDesktop]);

  // Measure sidebar overflow (desktop only) to decide whether to collapse auth controls
  useLayoutEffect(() => {
    if (!isDesktop) { setSidebarOverflow(false); setAuthExpanded(true); return; }
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

  if (isDesktop) {
    return (
      <div className="app-safe overflow-hidden bg-gradient-to-br from-[#2E1371] to-[#130B2B] text-white relative" style={{ minHeight: '100dvh' }}>
        <div className="relative w-full h-full flex">
          {/* Sidebar */}
          <aside ref={sidebarRef} className="sticky top-0 h-screen overflow-y-auto shrink-0 w-[240px] px-4 py-6 flex flex-col justify-between z-[10] relative">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 100 100" aria-hidden>
                    <defs>
                      <mask id="pips-mask-sidebar-profile">
                        <rect x="0" y="0" width="100" height="100" fill="white" />
                        <circle cx="25" cy="25" r="9" fill="black" />
                        <circle cx="75" cy="25" r="9" fill="black" />
                        <circle cx="50" cy="50" r="9" fill="black" />
                        <circle cx="25" cy="75" r="9" fill="black" />
                        <circle cx="75" cy="75" r="9" fill="black" />
                      </mask>
                    </defs>
                    <rect x="8" y="8" width="84" height="84" rx="12" fill="currentColor" mask="url(#pips-mask-sidebar-profile)" />
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
              <nav className="flex flex-col gap-2 text-sm mt-2" id="main-nav">
                <Link to="/home" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-white hover:bg-white/20">Map Generator</Link>
                <Link to="/tracker" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-white hover:bg-white/20">Dice Tracker</Link>
                <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#f9fafb] text-[#2E1371]">Profile</Link>
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
                </div>
              ) : (
                <GoogleSignInButton onClick={signIn} variant="full" className="w-full" aria-label="Sign in with Google" />
              )}
              {/* Popup submenu for overflow */}
              {isAuthenticated && sidebarOverflow && authExpanded && (
                <>
                  {/* Full-screen overlay to close on outside click */}
                  <div className="fixed inset-0 z-[90]" onClick={() => setAuthExpanded(false)} aria-hidden />
                  {/* Popup container */}
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
          </aside>

          {/* Main analytics body */}
          <main className="flex-1 p-0 m-2 overflow-hidden min-h-0 relative" style={{ borderRadius: '16px', backgroundColor: 'rgb(249 250 251 / var(--tw-bg-opacity, 1))', zIndex: 1, height: 'calc(100svh - 1rem)' }}>
            <div className="w-full h-full rounded-[16px] overflow-y-auto" id="profile-main-content-box">
              <header className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                    <p className="mt-2 text-gray-500">Overview and analytics of your Dice Tracker usage.</p>
                  </div>
                </div>
              </header>
              <div className="px-6 pb-6" style={{ height: 'calc(100% - 114px)' }}>
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Total Games', value: storage.getGames().length },
                    { label: 'Total Rolls', value: currentRolls.length },
                    { label: 'Most Frequent', value: mostFreq },
                    { label: 'Elapsed', value: elapsed },
                  ].map((kpi, idx) => (
                    <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="text-xs text-gray-500">{kpi.label}</div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">{kpi.value}</div>
                    </div>
                  ))}
                </div>

                {/* Charts + panels grid: 3 rows */}
                <div className="grid grid-cols-3 grid-rows-3 gap-4 h-[calc(100%-8rem)]">
                  {/* Current game status */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-4" style={{ gridColumn: '1 / 3', gridRow: '1 / 2' }}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 5a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v3H3V5Zm0 6h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z"/></svg>
                          Current game
                        </div>
                        <div className="mt-1 text-xl font-semibold text-gray-900 truncate">{gameName}</div>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M9 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z"/><path d="M3 12h3m12 0h3M12 3v3m0 12v3"/></svg>
                            <div className="text-sm text-gray-700"><span className="font-semibold text-gray-900">{totalRolls}</span><br />rolls</div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2 2 7l10 5 10-5-10-5Zm0 7L2 4v13a2 2 0 0 0 1.1 1.79L12 23l8.9-4.21A2 2 0 0 0 22 17V4l-10 5Z"/></svg>
                            <div className="text-sm text-gray-700">Most:<br /> <span className="font-semibold text-gray-900">{mostFreq}</span></div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            <div className="text-sm text-gray-700">Elapsed:<br /> <span className="font-semibold text-gray-900">{elapsed}</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={()=>{ window.location.hash = '#/tracker'; }} className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-900">Continue</button>
                        <button onClick={startNewGame} className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-900">New Game

                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Distribution (row 2, spans 2 cols) */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-4" style={{ gridColumn: '1 / 3', gridRow: '2 / 3' }}>
                    <div className="text-sm font-medium text-gray-900 mb-2 flex items-center justify-between">
                      <span>Roll distribution (2–12)</span>
                      <span className="text-xs text-gray-600 flex items-center gap-2"><span>Total rolls</span><span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-900">{currentRolls.length}</span></span>
                    </div>
                    <div className="flex items-end gap-2" style={{ height: 'calc(100% - 1.5rem)' }}>
                      {Array.from({ length: 11 }, (_, i) => i + 2).map(n => {
                        const c = currentRolls.filter(r=>r.total===n).length;
                        const max = Math.max(1, ...Array.from({ length: 11 }, (_, i) => i + 2).map(m => currentRolls.filter(r=>r.total===m).length));
                        const h = Math.round((c / max) * 100);
                        const inside = h >= 25;
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
                  </section>

                  {/* Recent games (2 rows tall) */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-4" style={{ gridColumn: '3 / 4', gridRow: '1 / 3' }}>
                    <div className="text-sm font-medium text-gray-900 mb-2">Recent games</div>
                    <div className="space-y-2 overflow-auto" style={{ maxHeight: 'calc(100% - 1.5rem)' }}>
                      {recentGames.map(g => (
                        <div key={g.id} className="rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-2 flex items-center gap-2">
                          <div className="flex-1 truncate">
                            <div className="text-gray-900 truncate">{g.name}</div>
                            <div className="text-[10px] text-gray-600">{new Date(g.updatedAt).toLocaleString()}</div>
                          </div>
                          <button onClick={()=>loadGame(g.id)} className="h-8 px-3 rounded-md border border-gray-300 bg-white text-xs text-gray-900">Load</button>
                        </div>
                      ))}
                      {recentGames.length===0 && (<div className="text-xs text-gray-500">No saved games yet</div>)}
                    </div>
                  </section>

                  {/* Quick actions (row 3, col 1) */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-4" style={{ gridColumn: '1 / 2', gridRow: '3 / 4' }}>
                    <div className="text-sm font-medium text-gray-900 mb-2">Quick actions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={exportCurrentAsCSV} className="h-10 rounded-lg border border-gray-300 bg-white text-xs text-gray-900 flex items-center justify-center gap-2"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg><span>Export CSV</span></button>
                      <button onClick={exportCurrentAsJSON} className="h-10 rounded-lg border border-gray-300 bg-white text-xs text-gray-900 flex items-center justify-center gap-2"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg><span>Export JSON</span></button>
                      <button onClick={clearCurrentGame} className="h-10 rounded-lg border border-gray-300 bg-white text-xs text-gray-900 flex items-center justify-center gap-2"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"/><path d="M10 11v6M14 11v6"/></svg><span>Clear current</span></button>
                      <button onClick={clearAllGames} className="h-10 rounded-lg border border-gray-300 bg-white text-xs text-gray-900 flex items-center justify-center gap-2"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"/><path d="M10 11v6M14 11v6"/></svg><span>Clear all</span></button>
                    </div>
                  </section>

                  {/* Presets (row 3, col 2) */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-4" style={{ gridColumn: '2 / 3', gridRow: '3 / 4' }}>
                    <div className="text-sm font-medium text-gray-900 mb-2">Presets</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[4,5,6].map(p => (
                        (() => {
                          let isSaved = false;
                          try { isSaved = !!localStorage.getItem(`catan_map_${p}p`); } catch {}
                          return (
                            <div key={p} className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-900">{p} Players</div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isSaved ? 'bg-green-100 border-green-200 text-green-800' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>{isSaved ? 'Saved' : 'Not created'}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <button onClick={()=>{ try { localStorage.setItem('catan_players', String(p)); } catch {} window.location.hash = '#/home'; }} className="h-8 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-900">{isSaved ? 'Load' : 'Create'}</button>
                                <button onClick={()=>{ try { localStorage.removeItem(`catan_map_${p}p`); } catch {} }} className="h-8 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-900">Reset</button>
                              </div>
                            </div>
                          );
                        })()
                      ))}
                    </div>
                  </section>

                  {/* Preferences (bottom-right) */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-4" style={{ gridColumn: '3 / 4', gridRow: '3 / 4' }}>
                    <div className="text-sm font-medium text-gray-900 mb-2">Preferences</div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={()=>setPrefStartInLastPlayers(!prefStartInLastPlayers)} className={`flex items-center gap-3 rounded-xl border p-4 ${prefStartInLastPlayers ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${prefStartInLastPlayers ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-400 bg-white text-transparent'}`}>✓</span>
                        <span className="text-sm text-gray-900">Start in last selected players</span>
                      </button>
                      <button onClick={()=>setPrefNoAdjacent68(!prefNoAdjacent68)} className={`flex items-center gap-3 rounded-xl border p-4 ${prefNoAdjacent68 ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${prefNoAdjacent68 ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-400 bg-white text-transparent'}`}>✓</span>
                        <span className="text-sm text-gray-900">Enforce no adjacent 6/8</span>
                      </button>
                      <button onClick={()=>setPrefColorblindPips(!prefColorblindPips)} className={`flex items-center gap-3 rounded-xl border p-4 ${prefColorblindPips ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${prefColorblindPips ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-400 bg-white text-transparent'}`}>✓</span>
                        <span className="text-sm text-gray-900">Colorblind-friendly pips</span>
                      </button>
                      <button onClick={()=>setPrefReduceMotion(!prefReduceMotion)} className={`flex items-center gap-3 rounded-xl border p-4 ${prefReduceMotion ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${prefReduceMotion ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-400 bg-white text-transparent'}`}>✓</span>
                        <span className="text-sm text-gray-900">Reduce motion</span>
                      </button>
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

        {/* Scrollable content area */}
        <div className="absolute left-0 right-0 scroll-y" style={{ top: 'calc(76px + var(--safe-top))', bottom: 'calc(64px + var(--safe-bottom))' }}>
        {/* Current game hero */}
        <div className="px-5 mt-3">
          <LiquidGlassCard className="w-full rounded-2xl p-4" style={{ borderRadius: '1rem' }}>
            <div className="w-full flex items-center justify-between">
              <div>
                <div className="text-sm text-white/70">Current game</div>
                <div className="text-lg font-semibold">{gameName}</div>
                <div className="mt-2 flex gap-4 text-xs text-white/70">
                  <div><span className="text-white/90">{totalRolls}</span><br />rolls</div>
                  <div>Most freq:<br /><span className="text-white/90">{mostFreq}</span></div>
                  <div>Elapsed:<br /><span className="text-white/90">{elapsed}</span></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>navigate('/tracker')} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-sm">Continue</button>
                <button onClick={startNewGame} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-sm">New</button>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Quick actions */}
        <div className="px-5 mt-3 grid grid-cols-2 gap-3">
          <button onClick={exportCurrentAsCSV} className="h-12 rounded-xl text-sm font-medium shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F] text-white" style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}>Export CSV</button>
          <button onClick={exportCurrentAsJSON} className="h-12 rounded-xl text-sm font-medium shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F] text-white" style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}>Export JSON</button>
          <button onClick={clearCurrentGame} className="h-12 rounded-xl text-sm font-medium shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F] text-white" style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}>Clear Current</button>
          <button onClick={clearAllGames} className="h-12 rounded-xl text-sm font-medium shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F] text-white" style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}>Clear All</button>
        </div>

        {/* Summary cards */}
        <div className="px-5 mt-6 grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl text-sm font-medium shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F] text-white" style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}>
            <div className="text-xs text-white/80">Current session</div>
            <div className="mt-2 text-xl font-semibold">{totalRolls} rolls</div>
            <div className="text-xs text-white/70">Most frequent: {mostFreq}</div>
            <div className="text-xs text-white/70">Elapsed: {elapsed}</div>
          </div>
          <div className="p-4 rounded-xl text-sm font-medium shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F] text-white" style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}>
            <div className="text-xs text-white/80">Distribution (2–12)</div>
            <div className="mt-2 flex items-end gap-1 h-16">
              {(() => {
                const counts: number[] = Array.from({ length: 11 }, (_, i) => currentRolls.filter(r => r.total === (i+2)).length);
                const max = Math.max(1, ...counts);
                const BAR_PX_TOTAL = 50; // h-16
                return counts.map((c, idx) => {
                  const barPx = Math.max(2, Math.round((c / max) * BAR_PX_TOTAL));
                  const n = idx + 2;
                  return (
                    <div key={n} className="flex-1 flex flex-col items-center justify-end">
                      <div className="relative w-full" style={{ height: `${BAR_PX_TOTAL}px` }}>
                        <div className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-white/20 to-white/60" style={{ height: `${barPx}px` }} />
                      </div>
                      <div className="text-[10px] text-white/70 mt-1">{n}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Map presets */}
        <div className="px-5 mt-6 grid grid-cols-3 gap-3">
          {[4,5,6].map(p => {
            const key = `catan_map_${p}p`;
            let saved = false;
            try { const raw = localStorage.getItem(key); saved = !!raw; } catch {}
            return (
              <div key={p} className="p-4 rounded-xl text-sm font-medium shadow-2xl bg-gradient-to-br from-[#2E1371] to-[#21232F] text-white" style={{ boxShadow: '-1px -1px 0px 0px rgb(7, 251, 211), 0px -1px 0px 0px rgb(7, 251, 211)' }}>
                <div className="text-xs text-white/80">Preset</div>
                <div className="mt-1 text-base font-semibold">{p} players</div>
                <div className="text-xs text-white/70 mt-1">{saved ? 'Saved' : 'None'}</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={()=>{ try { localStorage.setItem('catan_players', String(p)); } catch {} navigate('/home'); }} className="h-8 px-3 rounded-md border border-white/15 bg-white/10 text-xs">Open</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preferences */}
        <div className="px-5 mt-6 grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs text-white/80 bg-white/5 border border-white/10 rounded-xl p-3"><input type="checkbox" checked={prefStartInLastPlayers} onChange={e=>setPrefStartInLastPlayers(e.target.checked)} /> Start in last selected players</label>
          <label className="flex items-center gap-2 text-xs text-white/80 bg-white/5 border border-white/10 rounded-xl p-3"><input type="checkbox" checked={prefNoAdjacent68} onChange={e=>setPrefNoAdjacent68(e.target.checked)} /> Enforce no adjacent 6/8</label>
          <label className="flex items-center gap-2 text-xs text-white/80 bg-white/5 border border-white/10 rounded-xl p-3"><input type="checkbox" checked={prefColorblindPips} onChange={e=>setPrefColorblindPips(e.target.checked)} /> Colorblind-friendly pips</label>
          <label className="flex items-center gap-2 text-xs text-white/80 bg-white/5 border border-white/10 rounded-xl p-3"><input type="checkbox" checked={prefReduceMotion} onChange={e=>setPrefReduceMotion(e.target.checked)} /> Reduce motion</label>
          
        </div>

        <div className="px-5 mt-4 space-y-3">
          <div className="w-full">
          <Link to="/tracker" aria-label="Tracker" className="flex items-center justify-center w-full h-14 rounded-xl text-base font-medium shadow-2xl bg-gradient-to-br from-[#B6116B] to-[#3B1578] text-white relative"
              style={{ boxShadow: '-1px -1px 0px 0px rgb(255, 83, 192), 0px -1px 0px 0px rgb(255, 83, 192)' }}>
                Start Tracking
              </Link>
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
            <Link to="/tracker" aria-label="Tracker" className="p-2 relative h-[40px] w-[40px]">
              <svg className="w-6 h-6 text-white" viewBox="0 0 100 100" aria-hidden>
                <defs>
                  <mask id="pips-mask-footer">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <circle cx="25" cy="25" r="9" fill="black" />
                    <circle cx="75" cy="25" r="9" fill="black" />
                    <circle cx="50" cy="50" r="9" fill="black" />
                    <circle cx="25" cy="75" r="9" fill="black" />
                    <circle cx="75" cy="75" r="9" fill="black" />
                  </mask>
                </defs>
                <rect x="8" y="8" width="84" height="84" rx="12" fill="currentColor" mask="url(#pips-mask-footer)" />
                <rect x="8" y="8" width="84" height="84" rx="12" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
              </svg>
            </Link>

            {/* Profile (solid) */}
            <button aria-label="Profile" className="p-2 relative h-[40px] w-[40px]">
              <LiquidGlassCard className="absolute w-[64px] h-[64px] rounded-full bottom-[28px] left-[-20px] flex items-center justify-center" style={{ borderRadius: '50%'}} >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden >
                <path d="M12 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
                <path d="M4 20.5c0-4.142 3.582-7.5 8-7.5s8 3.358 8 7.5V22H4v-1.5Z" />
              </svg>
            </LiquidGlassCard>
            </button>
          </div>


        </div>
        {/* Right Sidebar Drawer */}
        <div className={`${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} absolute inset-0 z-[60] transition-opacity`} onClick={() => setMenuOpen(false)} aria-hidden={!menuOpen} />
        <div className={`absolute right-0 top-0 bottom-0 z-[61] w-[320px] max-w-[85vw] bg-gradient-to-b from-[#1B0F3E] to-[#120A28] border-l border-white/10 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true">
          <div className="h-full flex flex-col" style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}>
            <div className="p-5 border-b border-white/10 flex items-center gap-3">
              <svg className="w-10 h-10 text-white" viewBox="0 0 100 100" aria-hidden>
                <defs>
                  <mask id="pips-mask-settings-profile">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <circle cx="25" cy="25" r="9" fill="black" />
                    <circle cx="75" cy="25" r="9" fill="black" />
                    <circle cx="50" cy="50" r="9" fill="black" />
                    <circle cx="25" cy="75" r="9" fill="black" />
                    <circle cx="75" cy="75" r="9" fill="black" />
                  </mask>
                </defs>
                <rect x="8" y="8" width="84" height="84" rx="12" fill="currentColor" mask="url(#pips-mask-settings-profile)" />
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
                      <button aria-label="Rename game" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={() => { const name = prompt('Rename game', g.name); if (name && name.trim()) { storage.renameGame(g.id, name.trim()); if (storage.getCurrentId()===g.id) setGameName(name.trim()); setGamesVersion(v=>v+1);} }}>
                        <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                      <button aria-label="Delete game" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={() => { if (confirm('Delete this game permanently?')) { storage.deleteGame(g.id); setGamesVersion(v=>v+1); const cur = storage.getCurrentId(); if (cur) { /* stay */ } else { const list = storage.getGames().sort((a,b)=>b.updatedAt-a.updatedAt); const next = list[0]; if (next) { storage.setCurrentId(next.id); setGameName(next.name);} else { const meta = storage.createGame(new Date().toLocaleString()); setGameName(meta.name);} } } }}>
                        <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  ))}
                  {recentGames.length === 0 && (<div className="text-xs text-white/60">No saved games yet</div>)}
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
                  <div className="flex flex-col"><span>Last backup:</span><span>{lastBackupAt ? new Date(lastBackupAt).toLocaleString() : '—'}</span></div>
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

export default Profile2;