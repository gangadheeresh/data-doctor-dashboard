import React, { useEffect, useRef } from 'react';
import { Database, LineChart, BarChart2, FileSpreadsheet, PieChart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const AnimatedBackground = () => {
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // 1. Mouse movement tracking for parallax CSS variables
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const x = e.clientX - window.innerWidth / 2;
        const y = e.clientY - window.innerHeight / 2;
        
        containerRef.current.style.setProperty('--mouse-x', `${x}`);
        containerRef.current.style.setProperty('--mouse-y', `${y}`);
        containerRef.current.style.setProperty('--cursor-x', `${e.clientX}px`);
        containerRef.current.style.setProperty('--cursor-y', `${e.clientY}px`);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    // 2. HTML5 Canvas Interactive Constellation Animation
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles = [];
    const mouse = { x: 0, y: 0, active: false };

    // Dynamic configuration
    const getConnectionDistance = () => Math.min(100, Math.max(70, window.innerWidth / 15));
    const getMouseRadius = () => Math.min(160, Math.max(120, window.innerWidth / 10));
    const getParticleCount = () => {
      const area = window.innerWidth * window.innerHeight;
      // Density control: approx 1 particle per 18000 square pixels
      return Math.min(90, Math.max(30, Math.floor(area / 18000)));
    };

    // Color palette corresponding to the "Data Doctor" dashboard theme
    const themeColors = theme === 'light' ? [
      'rgba(0, 243, 255, ',  // Neon Cyan
      'rgba(255, 0, 127, ',  // Neon Hot Pink
      'rgba(57, 255, 20, ',  // Neon Lime Green
      'rgba(249, 200, 14, ',  // Neon Yellow/Gold
    ] : theme === 'midnight' ? [
      'rgba(37, 99, 235, ',  // Royal Blue
      'rgba(0, 243, 255, ',  // Cyan
      'rgba(244, 63, 94, ',  // Rose/Pink
      'rgba(255, 255, 255, ', // White
    ] : [
      'rgba(99, 102, 241, ',  // Indigo
      'rgba(168, 85, 247, ', // Purple
      'rgba(236, 72, 153, ', // Pink
      'rgba(56, 189, 248, ',  // Sky/Cyan
    ];

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = 1 + Math.random() * 2;
        // Moderate speeds for a smooth, relaxing drift
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.colorPrefix = themeColors[Math.floor(Math.random() * themeColors.length)];
        this.baseAlpha = 0.15 + Math.random() * 0.35;
        this.alpha = this.baseAlpha;
        this.pulseSpeed = 0.005 + Math.random() * 0.01;
        this.pulseTime = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Soft bounce boundary handling
        if (this.x < 0) {
          this.x = 0;
          this.vx *= -1;
        } else if (this.x > width) {
          this.x = width;
          this.vx *= -1;
        }

        if (this.y < 0) {
          this.y = 0;
          this.vy *= -1;
        } else if (this.y > height) {
          this.y = height;
          this.vy *= -1;
        }

        // Subtly pulse alpha for organic floating feel
        this.pulseTime += this.pulseSpeed;
        this.alpha = this.baseAlpha + Math.sin(this.pulseTime) * 0.1;

        // Interaction with mouse cursor (gravity attractor)
        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.hypot(dx, dy);
          const mouseRadius = getMouseRadius();

          if (dist < mouseRadius) {
            const force = (mouseRadius - dist) / mouseRadius;
            // Draw lines to mouse when close
            const lineAlpha = force * 0.18;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `${this.colorPrefix}${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Pull particle gently towards mouse
            this.x += (dx / dist) * force * 0.35;
            this.y += (dy / dist) * force * 0.35;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${this.colorPrefix}${this.alpha})`;
        ctx.fill();

        // High opacity center core - dynamic based on theme
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = (theme === 'dark' || theme === 'light') 
          ? `rgba(255, 255, 255, ${this.alpha * 1.8})` 
          : `rgba(15, 23, 42, ${this.alpha * 1.5})`;
        ctx.fill();
      }
    }

    const init = () => {
      const count = getParticleCount();
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      
      // Scale canvas backbuffer for crispness on retina screens
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Re-init particles to fit the new boundaries nicely
      init();
    };

    // Event listeners for tracking interactive state
    const handleCanvasMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleCanvasMouseLeave = () => {
      mouse.active = false;
    };

    // Wire up events
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleCanvasMouseMove);
    document.addEventListener('mouseleave', handleCanvasMouseLeave);

    // Initial setup
    resize();

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connections first so they appear behind the core nodes
      const connDistance = getConnectionDistance();
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < connDistance) {
            // Line opacity fades as distance increases
            const alpha = (1 - dist / connDistance) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Subtle gradient transition or blended line color
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`; // Violet blending line
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // 2. Update and draw nodes
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Clean up all resources and events
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      document.removeEventListener('mouseleave', handleCanvasMouseLeave);
    };
  }, [theme]);

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-950' : theme === 'light' ? 'bg-black' : 'bg-transparent'
      }`}
      style={{
        '--mouse-x': '0',
        '--mouse-y': '0',
        '--cursor-x': '50%',
        '--cursor-y': '50%'
      }}
    >
      {/* 1. HTML5 Particle Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block opacity-[0.85]" 
      />

      {/* 2. Interactive Cursor Glow Follower */}
      <div 
        className={`absolute w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-300 ease-out ${
          (theme === 'midnight' || theme === 'light') ? 'bg-transparent' : 'bg-indigo-500/5'
        }`}
        style={{
          left: 'var(--cursor-x)',
          top: 'var(--cursor-y)',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* 3. Technical Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_60%,transparent_100%)] opacity-[0.9]"></div>

      {/* 4. Parallax Giant Gradient Blobs */}
      {/* Blob 1 - Indigo */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] transition-transform duration-500 ease-out pointer-events-none"
        style={{
          transform: 'translate(calc(var(--mouse-x) * -0.06px), calc(var(--mouse-y) * -0.06px))'
        }}
      >
        <div className={`w-full h-full rounded-full blur-[130px] animate-float-slow-1 transition-all duration-300 ${
          (theme === 'midnight' || theme === 'light') ? 'bg-transparent' : 'bg-indigo-500/10'
        }`} />
      </div>

      {/* Blob 2 - Purple */}
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[48vw] h-[48vw] transition-transform duration-500 ease-out pointer-events-none"
        style={{
          transform: 'translate(calc(var(--mouse-x) * -0.04px), calc(var(--mouse-y) * -0.04px))'
        }}
      >
        <div className={`w-full h-full rounded-full blur-[130px] animate-float-slow-2 transition-all duration-300 ${
          (theme === 'midnight' || theme === 'light') ? 'bg-transparent' : 'bg-purple-500/10'
        }`} />
      </div>

      {/* 5. Interactive Floating Data Symbols (Nested to avoid transform property overrides) */}
      {/* Database Icon */}
      <div 
        className="absolute top-[18%] left-[10%] transition-transform duration-300 ease-out"
        style={{
          transform: 'translate(calc(var(--mouse-x) * 0.09px), calc(var(--mouse-y) * 0.09px))'
        }}
      >
        <div className="animate-float-slow-1 opacity-20 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-glass-light text-indigo-400">
          <Database className="h-6 w-6" />
        </div>
      </div>

      {/* Line Chart Icon */}
      <div 
        className="absolute bottom-[22%] left-[14%] transition-transform duration-300 ease-out"
        style={{
          transform: 'translate(calc(var(--mouse-x) * 0.07px), calc(var(--mouse-y) * 0.07px))'
        }}
      >
        <div className="animate-float-slow-2 opacity-15 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-glass-light text-purple-400">
          <LineChart className="h-8 w-8" />
        </div>
      </div>

      {/* Bar Chart Icon */}
      <div 
        className="absolute top-[28%] right-[12%] transition-transform duration-300 ease-out"
        style={{
          transform: 'translate(calc(var(--mouse-x) * 0.08px), calc(var(--mouse-y) * 0.08px))'
        }}
      >
        <div className="animate-float-slow-3 opacity-20 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-glass-light text-pink-400">
          <BarChart2 className="h-7 w-7" />
        </div>
      </div>

      {/* Excel Data Sheet Icon */}
      <div 
        className="absolute bottom-[18%] right-[17%] transition-transform duration-300 ease-out"
        style={{
          transform: 'translate(calc(var(--mouse-x) * 0.13px), calc(var(--mouse-y) * 0.13px))'
        }}
      >
        <div className="animate-float-slow-1 opacity-20 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-glass-light text-emerald-400">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
      </div>

      {/* Pie Chart Icon */}
      <div 
        className="absolute top-[42%] left-[6%] transition-transform duration-300 ease-out"
        style={{
          transform: 'translate(calc(var(--mouse-x) * 0.06px), calc(var(--mouse-y) * 0.06px))'
        }}
      >
        <div className="animate-float-slow-3 opacity-15 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-glass-light text-amber-400">
          <PieChart className="h-5 w-5" />
        </div>
      </div>

      {/* 6. Abstract Connecting Nodes Parallax Grid */}
      <div 
        className="absolute top-[48%] left-[27%] transition-transform duration-700 ease-out"
        style={{
          transform: 'translate(calc(var(--mouse-x) * -0.03px), calc(var(--mouse-y) * -0.03px))'
        }}
      >
        <div className="animate-pulse-glow opacity-[0.05] text-slate-400">
          <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5">
            <circle cx="20" cy="80" r="6" fill="currentColor"/>
            <circle cx="90" cy="30" r="6" fill="currentColor"/>
            <circle cx="90" cy="120" r="6" fill="currentColor"/>
            <circle cx="170" cy="80" r="6" fill="currentColor"/>
            <line x1="26" y1="76" x2="84" y2="34"/>
            <line x1="26" y1="84" x2="84" y2="116"/>
            <line x1="96" y1="34" x2="164" y2="76"/>
            <line x1="96" y1="116" x2="164" y2="84"/>
            <line x1="90" y1="36" x2="90" y2="114"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AnimatedBackground;
