import React from 'react';
import { SymbolType } from '../types';

interface SymbolProps {
  type: SymbolType;
  className?: string;
}

export const SymbolIcon: React.FC<SymbolProps> = ({ type, className = "w-16 h-12" }) => {
  const strokeColor = "#1C4D8D";
  const strokeWidth = 2;
  const fillColor = "#ffffff";

  switch (type) {
    case SymbolType.TERMINATOR:
      // Capsule shape
      return (
        <svg viewBox="0 0 100 50" className={className}>
          <rect x="2" y="2" width="96" height="46" rx="23" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
    case SymbolType.DECISION:
      // Diamond
      return (
        <svg viewBox="0 0 100 50" className={className}>
          <polygon points="50,2 98,25 50,48 2,25" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    case SymbolType.DOCUMENT:
      // Rectangle with wavy bottom
      return (
        <svg viewBox="0 0 100 50" className={className}>
          <path d="M2,2 L98,2 L98,38 Q75,54 50,38 T2,38 Z" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    case SymbolType.PROCESS:
    default:
      // Rectangle
      return (
        <svg viewBox="0 0 100 50" className={className}>
          <rect x="2" y="2" width="96" height="46" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
  }
};