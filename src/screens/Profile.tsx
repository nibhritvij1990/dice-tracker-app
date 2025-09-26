import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LiquidGlassCard from '../components/LiquidGlassCard';

const Profile: React.FC = () => {
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
    return bestC>0 ? `${best} (${bestC})` : '—';
  }, [currentRolls]);
  const elapsed = useMemo(() => {
    if (currentRolls.length < 2) return '—';
    const ms = currentRolls[currentRolls.length-1].ts - currentRolls[0].ts;
    const m = Math.floor(ms/60000); const s = Math.floor((ms%60000)/1000);
    return m>0 ? `${m}m ${s}s` : `${s}s`;
  }, [currentRolls]);
  const startNewGame = () => {
    const meta = storage.createGame(new Date().toLocaleString());
    setGameName(meta.name); setGamesVersion(v=>v+1);
    navigate('/tracker');
  };
  const loadGame = (id: string) => { storage.setCurrentId(id); setGamesVersion(v=>v+1); navigate('/tracker'); };
 
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

        {/* Current game hero */}
        <div className="px-5 mt-3">
          <LiquidGlassCard className="w-full rounded-2xl p-4" style={{ borderRadius: '1rem' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/70">Current game</div>
                <div className="text-lg font-semibold">{gameName}</div>
                <div className="mt-2 flex gap-4 text-xs text-white/70">
                  <div><span className="text-white/90">{totalRolls}</span> rolls</div>
                  <div>Most freq: <span className="text-white/90">{mostFreq}</span></div>
                  <div>Elapsed: <span className="text-white/90">{elapsed}</span></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>navigate('/tracker')} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-sm">Continue</button>
                <button onClick={startNewGame} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-sm">New</button>
                <button onClick={()=>setMenuOpen(true)} className="h-9 px-3 rounded-md border border-white/15 bg-white/10 text-sm">Load</button>
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
                const BAR_PX_TOTAL = 64; // h-16
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
        <div className={`fixed inset-0 z-[60] transition-opacity ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)} aria-hidden={!menuOpen} />
        <div className={`fixed right-0 top-0 bottom-0 z-[61] w-[320px] max-w-[85vw] bg-gradient-to-b from-[#1B0F3E] to-[#120A28] border-l border-white/10 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true">
          <div className="h-full flex flex-col">
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
                      <button aria-label="Delete game" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={() => { if (confirm('Delete this game permanently?')) { storage.deleteGame(g.id); setGamesVersion(v=>v+1); const cur = storage.getCurrentId(); if (cur) { /* stay */ } else { const list = storage.getGames().sort((a,b)=>b.updatedAt-a.updatedAt); const next = list[0]; if (next) { storage.setCurrentId(next.id); setGameName(next.name);} else { const meta = storage.createGame(new Date().toLocaleString()); setGameName(meta.name);} } } }}>
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

export default Profile;