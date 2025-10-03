import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Suspense, lazy } from 'react';
const LaserFlow = lazy(() => import('../components/LaserFlow'));
import LiquidGlassCard from '../components/LiquidGlassCard';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../auth/AuthProvider';

const Start: React.FC = () => {
  // device presets removed – full-viewport rendering
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [impactAnchor, setImpactAnchor] = useState<{ x: number; y: number } | null>(null);
  const { isAuthenticated, signIn } = useAuth();
  const [isWide, setIsWide] = useState<boolean>(() => {
    try {
      return (window.innerWidth > window.innerHeight) || window.matchMedia('(min-width: 100vh)').matches;
    } catch { return false }
  });

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const target = targetRef.current;
    if (!wrapper || !target) return;

    let raf = 0;
    const recalc = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
      const wr = wrapper.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const xCss = tr.left + tr.width / 2 - wr.left;
      const yCss = tr.top - wr.top; // top edge of target box
      let x = Math.round(xCss * dpr);
      let y = Math.round(yCss * dpr);
      const maxX = Math.round(wr.width * dpr);
      const maxY = Math.round(wr.height * dpr);
      if (x < 0) x = 0; else if (x > maxX) x = maxX;
      if (y < 0) y = 0; else if (y > maxY) y = maxY;
      setImpactAnchor({ x, y });
      });
    };

    const ro = new ResizeObserver(recalc);
    ro.observe(wrapper);
    ro.observe(target);
    window.addEventListener('scroll', recalc, { passive: true });
    window.addEventListener('resize', recalc);
    recalc();
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', recalc);
      window.removeEventListener('resize', recalc);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useLayoutEffect(() => {
    const mql = typeof window !== 'undefined' ? window.matchMedia('(min-width: 100vh)') : null;
    const onResize = () => {
      try {
        setIsWide((window.innerWidth > window.innerHeight) || (mql ? mql.matches : false));
      } catch {}
    };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    mql?.addEventListener?.('change', onResize as EventListener);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      mql?.removeEventListener?.('change', onResize as EventListener);
    };
  }, []);

  return (
    <div className="app-safe relative">
        {/* Fixed background to cover viewport during scroll to avoid white gaps */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#2E1371] to-[#130B2B]" id="start" />
        <div className="absolute inset-0" ref={wrapperRef}>
          {/* Laser background */}
          <div className="absolute inset-0">
            {impactAnchor && (
            <Suspense fallback={null}>
            <LaserFlow 
              color="#CF9EFF"
              horizontalBeamOffset={0.0}
              verticalBeamOffset={0.0}
              verticalSizing={16}
              horizontalSizing={isWide ? 1 : 2.5}
              flowSpeed={0.5}
              flowStrength={1}
              decay={2}
              falloffStart={10}
              fogFallSpeed={1}
              fogIntensity={0.5}
              fogScale={0.3}
              wispSpeed={20.0}
              wispIntensity={51.0}
              wispDensity={4}
              mouseTiltStrength={0.01}
              mouseSmoothTime={0.0}
              baseFlatten={1}
              impactAnchorPx={impactAnchor}
              coreThicknessPx={100}
              coreHeightPx={window.innerHeight}
            />
            </Suspense>
            )}
          </div>


          {/* Target square around 45% height */}
          <div ref={targetRef} className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-[240px] aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-3" style={{ borderColor: '#CF9EFF' }}>
            {/* Dice SVG: white face with transparent pips (cutouts) */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-[10px] z-[2]" style={{borderTop: '2px solid #CF9EFF', borderRadius: '12px' }} />
              <div className="absolute inset-[10px] z-[2] overflow-hidden" style={{borderRadius: '12px' }}>
              <div className="absolute top-[-20px] left-[-10px] right-[-10px] z-[2] h-[48px] overflow-hidden" style={{background: 'radial-gradient(circle, #CF9EFF, transparent)', borderRadius: '50%', filter: 'blur(16px)' }} />
              </div>
              
            <svg viewBox="0 0 100 100" className="w-32 h-32 box-shadow-lg" style={{ filter: 'drop-shadow(0 0 0 #000) inset 0 -4px 8px #cf9effaa' }}>
              <defs>
                <mask id="pips-mask">
                  <rect x="0" y="0" width="100" height="100" fill="white" />
                  {/* Five pips */}
                  <circle cx="25" cy="25" r="7" fill="black" />
                  <circle cx="75" cy="25" r="7" fill="black" />
                  <circle cx="50" cy="50" r="7" fill="black" />
                  <circle cx="25" cy="75" r="7" fill="black" />
                  <circle cx="75" cy="75" r="7" fill="black" />
                </mask>
                <clipPath id="dice-clip">
                  <rect x="8" y="8" width="84" height="84" rx="10" />
                </clipPath>
                <linearGradient id="dice-top-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#CF9EFF" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#CF9EFF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#CF9EFF" stopOpacity="0" />
                </linearGradient>
                <filter id="dice-glow-blur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" />
                </filter>
              </defs>
              <rect x="8" y="8" width="84" height="84" rx="10" fill="white" mask="url(#pips-mask)" />
              <rect x="8" y="8" width="84" height="84" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              {/* Inner glow along the top edge (inside dice) */}
              <rect
                x="8"
                y="8"
                width="84"
                height="24"
                rx="10"
                fill="url(#dice-top-glow)"
                clipPath="url(#dice-clip)"
                mask="url(#pips-mask)"
                filter="url(#dice-glow-blur)"
                opacity="0.9"
                style={{ mixBlendMode: 'screen' as any }}
              />
            </svg>
            </div>

            {/* Title */}
            <div className="text-center leading-none select-none">
              <span className="text-3xl font-bold bg-gradient-to-r from-[#CF9EFF] via-[#A071FF] to-[#CF9EFF] bg-clip-text text-transparent animate-gradient">Dice</span>
              <span className="text-3xl font-bold text-white">&nbsp;Tracker</span>
            </div>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 w-[240px] h-[64px]" style={{ top: 'calc(44% + 152px)' }}>
            <LiquidGlassCard distortion={0.75} thickness={1} className="w-full h-full animate-[rainbow_6s_linear_infinite]" style={{ borderRadius: '8rem', background: 'conic-gradient(from var(--angle), #CF9EFF, #A071FF, #CF9EFF, transparent, transparent, transparent, transparent)' }}>
              <Link to="/home" className="w-full h-full py-4 px-8 flex items-center justify-center no-underline" style={{ borderRadius: '8rem', fontWeight: 'bold' }}>Get Started</Link>
            </LiquidGlassCard>
          </div>
          {isAuthenticated ? (
            <div
              className="w-[64px] h-[64px] rounded-full absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
              style={{
                top: 'calc(44% + 152px + 100px)',
                background: '#f2f2f2',
                color: '#1f1f1f'
              }}
              aria-hidden
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          ) : (
            <GoogleSignInButton onClick={signIn} className="w-[64px] h-[64px] rounded-full absolute left-1/2 -translate-x-1/2" style={{ top: 'calc(44% + 152px + 100px)' }} />
          )}
        </div>
    </div>
  );
};

export default Start;


