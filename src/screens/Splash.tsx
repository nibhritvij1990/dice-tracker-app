import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LiquidGlassCard from '../components/LiquidGlassCard';
import Iridescence from '../components/Iridescence.tsx';
import DecryptedText from '../components/DecryptedText.tsx';
import '../index2.css';

const Splash: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // removed unused impactAnchor logic
  const navigate = useNavigate();
  useEffect(() => {
    const id = setTimeout(() => navigate('/start'), 5000);
    return () => clearTimeout(id);
  }, [navigate]);

  return (
    <div className="app-safe overflow-hidden text-white relative overflow-hidden">
      <div className="absolute inset-0" ref={wrapperRef}>
        <Iridescence color={[100, 200, 255]} className="absolute inset-0" />
        <LiquidGlassCard distortion={0.8} thickness={1} className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] flex flex-col justify-center items-center text-white'>
          <div className='absolute inset-0 flex flex-col gap-3 items-center justify-center'>
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
            <DecryptedText text="Dice Tracker" animateOn="view" revealDirection='start' sequential={true} speed={200} className='text-white text-3xl font-bold' />
            </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
};

export default Splash;


