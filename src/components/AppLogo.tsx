"use client";
import React from "react";

/**
 * Logo fijo de la app (no depende del usuario).
 * Diseño simple: 3 "balotas" y el nombre LOTTO HUB
 * Colores suaves, sin imágenes externas.
 */
export default function AppLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Ícono (SVG inline) */}
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
            <feOffset dy="1" result="off"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="off"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Fondo suave */}
        <rect x="0" y="0" width="64" height="64" rx="16" fill="url(#lg)" filter="url(#soft)"/>

        {/* 3 balotas */}
        <g transform="translate(8,10)">
          <circle cx="16" cy="22" r="8.5" fill="white" opacity="0.95"/>
          <circle cx="32" cy="18" r="7.5" fill="white" opacity="0.9"/>
          <circle cx="28" cy="32" r="9" fill="white" opacity="0.92"/>
          {/* números sutiles */}
          <text x="16" y="25.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#10b981">7</text>
          <text x="32" y="21.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#10b981">3</text>
          <text x="28" y="35.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#10b981">9</text>
        </g>
      </svg>

      {/* Nombre de la app */}
      <div className="text-center">
        <div className="text-2xl font-extrabold tracking-tight leading-none">LOTTO HUB</div>
        <div className="text-xs text-gray-500 -mt-0.5">ventas de chances</div>
      </div>
    </div>
  );
}