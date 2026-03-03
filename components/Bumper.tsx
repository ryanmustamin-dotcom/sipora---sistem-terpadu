import React, { useEffect, useState } from 'react';

interface BumperProps {
  onFinish: () => void;
}

export const Bumper: React.FC<BumperProps> = ({ onFinish }) => {
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    // Sequence timing
    const fadeOutTimer = setTimeout(() => {
      setAnimateOut(true);
    }, 4500); // Start fade out at 4.5s

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 5500); // Finish total animation at 5.5s

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[100] bg-[#0F2854] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-1000 ${animateOut ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Audio SFX - High Tech Logo Sound */}
      <audio autoPlay>
        <source src="https://cdn.pixabay.com/audio/2022/03/15/audio_73d843da54.mp3" type="audio/mpeg" />
      </audio>

      <div className="scene relative w-48 h-48">
        <div className="coin w-full h-full absolute transform-style-3d animate-spin-3d">
          {/* Edge/Thickness Simulation (Multiple layers to create thickness) */}
          {[...Array(8)].map((_, i) => (
             <div 
                key={i}
                className="face absolute w-full h-full border-[3px] border-[#4988C4]/40 rounded-full transform bg-[#0F2854]"
                style={{ transform: `translateZ(${i * 1.5 - 6}px)` }}
             ></div>
          ))}

          {/* Front Face */}
          <div className="face absolute w-full h-full bg-gradient-to-br from-[#1C4D8D] to-[#0F2854] border-4 border-[#BDE8F5] rounded-full flex items-center justify-center text-white font-bold text-5xl transform translate-z-4 shadow-[0_0_30px_#4988C4] backface-hidden">
            SOP
          </div>
          {/* Back Face */}
          <div className="face absolute w-full h-full bg-gradient-to-bl from-[#1C4D8D] to-[#0F2854] border-4 border-[#BDE8F5] rounded-full flex items-center justify-center text-white font-bold text-5xl transform rotate-y-180 translate-z-4 shadow-[0_0_30px_#4988C4] backface-hidden">
            SOP
          </div>
        </div>
      </div>

      <div className="mt-16 text-center z-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-[0.2em] md:tracking-[0.4em] animate-slide-up opacity-0 fill-mode-forwards">
          SIPORA
        </h1>
        <div className="w-48 h-1 bg-[#BDE8F5] mx-auto mt-4 rounded-full animate-width-expand"></div>
        <p className="mt-3 text-[#BDE8F5] text-sm md:text-base tracking-widest animate-fade-in delay-1000 opacity-0 fill-mode-forwards italic">
          Mudah Membuat Prosedur Terpadu
        </p>
      </div>

      <style>{`
        .scene {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .translate-z-4 {
          transform: translateZ(6px);
        }
        .rotate-y-180 {
          transform: rotateY(180deg) translateZ(6px);
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        @keyframes spin-3d {
          0% { transform: rotateY(0deg) scale3d(0, 0, 0); opacity: 0; }
          15% { transform: rotateY(180deg) scale3d(1.1, 1.1, 1.1); opacity: 1; }
          25% { transform: rotateY(360deg) scale3d(1, 1, 1); }
          100% { transform: rotateY(1080deg) scale3d(1, 1, 1); }
        }

        .animate-spin-3d {
          animation: spin-3d 5s ease-out forwards;
        }

        @keyframes slide-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 1s ease-out 1.5s forwards;
        }

        @keyframes width-expand {
          0% { width: 0; opacity: 0; }
          100% { width: 8rem; opacity: 1; }
        }
        .animate-width-expand {
          animation: width-expand 1s ease-out 2s forwards;
        }

        @keyframes fade-in {
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out 2.5s forwards;
        }
        .fill-mode-forwards {
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};