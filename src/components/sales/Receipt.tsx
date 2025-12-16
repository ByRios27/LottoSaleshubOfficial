'use client';

import { ShareIcon, XMarkIcon } from '@heroicons/react/24/solid';
import QRCode from 'react-qr-code';
import Image from "next/image";
import React, { useRef, useState } from 'react';
import { Sale } from '@/contexts/SalesContext';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface ReceiptProps {
  sale: Sale | null;
  drawName: string;
  onClose: () => void;
  businessName?: string;
  logoUrl?: string;
}

const DefaultLogo = () => (
  <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-inner">
    <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <rect x="4" y="11" width="3" height="5" rx="1"></rect>
      <rect x="8.5" y="7" width="3" height="9" rx="1"></rect>
      <rect x="13" y="3" width="3" height="13" rx="1"></rect>
    </svg>
  </div>
);

const buildWatermarkData = (sale: Sale) => {
  const id = (sale.ticketId || 'S/ID').toUpperCase();
  const total = `$${Number(sale.totalCost || 0).toFixed(2)}`;
  const nums = (sale.numbers || [])
    .map(n => `${String(n.number).padStart(2, '0')}x${n.quantity}`)
    .join(' ');
  const macroBase = `${id} • TOTAL ${total} • ORIGINAL`;
  const microBase = `${id} • ${total} • ${nums} • ${id} • ORIGINAL • `;
  return { macroBase, microBase, id, total, nums };
};

const simpleSeedFromString = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const SecurityLayers = ({
  macroText,
  microText,
  seed,
  numbersCount,
}: {
  macroText: string;
  microText: string;
  seed: number;
  numbersCount: number;
}) => {
  const macroFontSize = numbersCount > 10 ? 30 : numbersCount > 6 ? 34 : 38;
  const macroLineGap = Math.round(macroFontSize * 1.15);
  const macroOpacity = 0.06;
  const macroRows = 26;

  const microFontSize = clamp(7, 6, 8);
  const microOpacity = 0.12;
  const microRowGap = 14;
  const microRows = 60;

  const noiseSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="matrix" values="
          1 0 0 0 0
          0 1 0 0 0
          0 0 1 0 0
          0 0 0 0.35 0"/>
      </filter>
      <rect width="220" height="220" filter="url(#n)" opacity="0.35"/>
    </svg>
  `);

  const makeMacroLayer = (rotation: number, opacity: number) => (
    <div
      className="absolute"
      style={{
        inset: "-50%",
        width: "200%",
        height: "200%",
        opacity,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {Array.from({ length: macroRows }).map((_, i) => {
        const shift = ((seed + i * 97) % 260) - 130;
        return (
          <div
            key={`macro-${rotation}-${i}`}
            className="font-black text-gray-400 tracking-widest whitespace-nowrap"
            style={{
              fontSize: `${macroFontSize}px`,
              lineHeight: `${macroFontSize + 6}px`,
              position: "absolute",
              left: "0px",
              top: `${i * macroLineGap}px`,
              transform: `translateX(${shift}px)`,
            }}
          >
            {macroText}
          </div>
        );
      })}
    </div>
  );

  const makeMicroLayer = (rotation: number, opacity: number) => (
    <div
      className="absolute"
      style={{
        inset: "-60%",
        width: "220%",
        height: "220%",
        opacity,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {Array.from({ length: microRows }).map((_, i) => {
        const shift = ((seed + i * 131) % 180) - 90;
        const o = i % 2 === 0 ? 1 : 0.82;
        const size = i % 3 === 0 ? microFontSize + 0.4 : microFontSize;
        const track = i % 4 === 0 ? "0.22em" : "0.18em";
        return (
          <div
            key={`micro-${rotation}-${i}`}
            className="font-semibold text-gray-500 whitespace-nowrap"
            style={{
              fontSize: `${size}px`,
              letterSpacing: track,
              position: "absolute",
              left: "0px",
              top: `${i * microRowGap}px`,
              transform: `translateX(${shift}px)`,
              textTransform: "uppercase",
              opacity: o,
            }}
          >
            {microText.repeat(6)}
          </div>
        );
      })}
    </div>
  );

  const guillocheSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="520" height="520" viewBox="0 0 520 520">
      <defs>
        <pattern id="g" width="52" height="52" patternUnits="userSpaceOnUse">
          <path d="M0,26 C13,10 39,42 52,26" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
          <path d="M0,13 C13,-3 39,29 52,13" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
          <path d="M0,39 C13,23 39,55 52,39" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="520" height="520" fill="url(#g)"/>
    </svg>
  `);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {makeMacroLayer(-30, macroOpacity)}
      {makeMacroLayer(30, macroOpacity * 0.65)}

      {makeMicroLayer(-18, microOpacity)}
      {makeMicroLayer(18, microOpacity * 0.8)}

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,${guillocheSvg}")`,
          backgroundRepeat: "repeat",
          opacity: 0.10,
          mixBlendMode: "multiply",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,${noiseSvg}")`,
          backgroundRepeat: "repeat",
          opacity: 0.18,
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
};

const NumbersSecurityBand = ({ seed }: { seed: number }) => {
  const phase = seed % 360;
  const rot = ((seed % 7) - 3) * 2;

  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="260" height="160" viewBox="0 0 260 160">
      <defs>
        <pattern id="wave" width="26" height="26" patternUnits="userSpaceOnUse">
          <path
            d="M0 ${13 + Math.sin(phase) * 2}
               C6 ${3 + Math.sin(phase + 40) * 2},
                 20 ${23 + Math.sin(phase + 80) * 2},
                 26 ${13 + Math.sin(phase + 120) * 2}"
            fill="none"
            stroke="rgba(0,0,0,0.12)"
            stroke-width="1"
          />
          <path
            d="M0 ${6 + Math.sin(phase + 180) * 2}
               C6 ${-6 + Math.sin(phase + 220) * 2},
                 20 ${16 + Math.sin(phase + 260) * 2},
                 26 ${6 + Math.sin(phase + 300) * 2}"
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            stroke-width="1"
          />
        </pattern>
      </defs>
      <rect width="260" height="160" fill="url(#wave)" />
    </svg>
  `);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundRepeat: 'repeat',
        opacity: 0.38,
        mixBlendMode: 'multiply',
        transform: `rotate(${rot}deg)`,
      }}
    />
  );
};

const Receipt: React.FC<ReceiptProps> = ({ sale, drawName, onClose, businessName, logoUrl }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  if (!sale) return null;

  const displayTimestamp =
    typeof sale.timestamp === 'string'
      ? sale.timestamp
      : sale.timestamp.toDate().toISOString();

  const handleShare = async () => {
    if (!receiptRef.current) {
      toast.error("No se puede generar el recibo, intente de nuevo.");
      return;
    }
    setIsSharing(true);
    const toastId = toast.loading("Generando imagen...");

    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `ticket-${sale.ticketId}.png`, { type: blob.type });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Comprobante de Venta - ${sale.ticketId}`,
          text: `Recibo para el sorteo ${drawName}.`,
        });
        toast.success("¡Compartido con éxito!", { id: toastId });
      } else {
        const link = document.createElement('a');
        link.download = `ticket-${sale.ticketId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("¡Imagen descargada!", { id: toastId });
      }
    } catch (err) {
      console.error("Error al generar o compartir la imagen:", err);
      toast.error("Hubo un error al generar la imagen.", { id: toastId });
    } finally {
      setIsSharing(false);
    }
  };

  const secureNumberStyle: React.CSSProperties = {
    color: '#0b1220',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textShadow:
      '0.6px 0.6px 0 rgba(0,0,0,0.35), -0.6px -0.6px 0 rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.35)',
  };

  const { macroBase, microBase, id, total, nums } = buildWatermarkData(sale);
  const seed = simpleSeedFromString(`${id}|${total}|${nums}`);
  const numbersCount = (sale.numbers || []).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-[60]">
      <div className="absolute top-4 right-4">
        <button
          onClick={onClose}
          disabled={isSharing}
          className="p-2 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white transition-colors disabled:opacity-50"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="absolute top-4 left-4">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="p-2 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <ShareIcon className="w-6 h-6" />
        </button>
      </div>

      <div
        ref={receiptRef}
        className="bg-white w-full max-w-[300px] font-sans text-black p-1 border-2 border-dashed border-gray-400 relative overflow-hidden"
      >
        <SecurityLayers
          macroText={macroBase}
          microText={microBase}
          seed={seed}
          numbersCount={numbersCount}
        />

        <div className="relative z-10">
          <div className="p-4">
            <div className="text-center mb-4">
              <div className="flex justify-center items-center gap-3 mb-1">
                {logoUrl && logoUrl !== 'default' ? (
                  <Image
                    src={logoUrl}
                    alt="Logo del Negocio"
                    width={36}
                    height={36}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <DefaultLogo />
                )}
                <h2 className="text-xl font-semibold">{businessName || 'Lotto Hub'}</h2>
              </div>
              <p className="text-sm text-gray-500">Comprobante de Venta</p>
            </div>

            <div className="my-4 border-t border-b border-dashed border-gray-300 py-3 text-xs space-y-1.5 text-gray-800">
              <p><strong>Ticket ID:</strong> <span className="font-mono ml-1">{sale.ticketId}</span></p>
              <p><strong>Fecha:</strong> <span className="font-mono ml-1">{new Date(displayTimestamp).toLocaleString()}</span></p>
              <p><strong>Vendedor:</strong> <span className="font-mono ml-1">{sale.sellerId || 'N/A'}</span></p>
              <p><strong>Cliente:</strong> <span className="ml-1">{sale.clientName || 'N/A'}</span></p>
              {sale.clientPhone && (
                <p><strong>Teléfono:</strong> <span className="font-mono ml-1">{sale.clientPhone}</span></p>
              )}
              <div>
                <p><strong>Sorteos:</strong></p>
                <div className="pl-3 text-gray-700 font-mono">
                  {sale.schedules.map(s => (
                    <p key={s}>{drawName} ({s})</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-xs font-mono relative rounded-sm overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.035))',
                }}
              />
              <NumbersSecurityBand seed={seed} />

              <div className="relative px-1 py-1">
                <div className="flex justify-between font-sans font-semibold text-black border-b border-gray-300 pb-1 mb-2">
                  <span>Número</span><span>Fracc.</span><span>Monto</span>
                </div>

                {sale.numbers.map((n, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                    style={{
                      borderBottom: index === sale.numbers.length - 1
                        ? 'none'
                        : '1px dashed rgba(0,0,0,0.28)',
                      paddingBottom: '2px',
                      marginBottom: '2px',
                    }}
                  >
                    <span style={secureNumberStyle}>
                      {String(n.number).padStart(2, '0')}
                    </span>
                    <span className="text-gray-900">x{n.quantity}</span>
                    <span className="text-gray-900">
                      ${(n.quantity * sale.costPerFraction).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-dashed border-gray-300">
              <div className="flex justify-end items-baseline text-lg font-bold font-mono">
                <span className="text-sm font-sans mr-2">TOTAL:</span>
                <span>${sale.totalCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <div className="p-1 bg-white border border-gray-200 rounded-md shadow-sm">
                <QRCode
                  value={sale.ticketId || 'LottoSalesHub-Test'}
                  size={80}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            </div>

            <div className="text-center text-[11px] mt-3 text-gray-500 leading-snug">
              <p className="font-medium">¡Gracias por su compra!</p>
              <p>Conserve este comprobante.</p>
              <p className="mt-1 text-gray-600 font-semibold">
                Ticket alterado es invalidado por completo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
