import React from 'react';
import { useTheme } from '../context/ThemeContext';

const GlassCard = ({ children, className = '', onClick = null }) => {
  const { theme } = useTheme();
  
  const glassClass = (theme === 'dark' || theme === 'light')
    ? 'glass-card text-slate-100'
    : theme === 'midnight'
      ? 'glass-card text-blue-950 font-semibold'
      : 'glass-card-light text-indigo-950';

  return (
    <div 
      className={`p-6 border ${glassClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default GlassCard;
