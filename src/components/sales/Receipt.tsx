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
    <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="11" width="3" height="5" rx="1"></rect><rect x="8.5" y="7" width="3" height="9" rx="1"></rect><rect x="13" y="3" width="3" height="13" rx="1"></rect></svg>
  </div>
);

/** Construye strings reales (micro y macro) desde los datos del recibo. */
const buildWatermarkData = (sale: Sale) => {
  const id = (sale.ticketId || 'S/ID').toUpperCase();
  const total = `$${Number(sale.totalCost || 0).toFixed(2)}`;

  const nums = (sale.numbers || [])
    .map(n => `${String(n.number).padStart(2, '0')}x${n.quantity}`)
    .join(' ');

  const microBase = `${id} • ${nums || 'S/N'} • TOTAL ${total} • ORIGINAL • `;
  // --- CORRECCIÓN: Añadidas las comillas invertidas (backticks) --- 
  const macroBase = `${id} • TOTAL ${total} • ORIGINAL`;

  return { microBase, macroBase, id, total, nums };
};

/** Calcula un "hash visual" simple (no cripto) para variar offsets. */
const simpleSeedFromString = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

/** Marca de agua: micro texto zig-zag + macro texto grande en múltiples líneas diagonales */
const WatermarkBackground = ({
  microText,
  macroText,
  seed,
  numbersCount,
}: {
  microText: string;
  macroText: string;
  seed: number;
  numbersCount: number;
}) => {
  const microRows = 22;
  const macroLines = 6;
  const macroFontSize = numbersCount > 10 ? 34 : numbersCount > 6 ? 38 : 42;
  
  const microOpacity = 0.08;
  const macroOpacity = 0.10;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* MICRO TEXTO (zig-zag real) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: microOpacity,
          transform: 'rotate(-24deg) scale(1.45)',
        }}
      >
        {Array.from({ length: microRows }).map((_, i) => {
          const base = (seed % 80) + i * 17;
          const dir = i % 2 === 0 ? -1 : 1;
          const offsetX = dir * (base % 180);
          const marginTop = 6;
          return (
            <div
              key={i}
              className="whitespace-nowrap font-mono text-gray-700"
              style={{
                fontSize: '10px',
                lineHeight: '12px',
                transform: `translateX(${offsetX}px)`,
                marginTop: `${marginTop}px`,
              }}
            >
              {microText.repeat(14)}
            </div>
          );
        })}
      </div>

      {/* MACRO TEXTO 1 (rotación -30deg) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          opacity: macroOpacity,
          transform: 'rotate(-30deg)',
        }}
      >
        {Array.from({ length: macroLines }).map((_, i) => {
          const shift = ((seed + i * 97) % 220) - 110;
          const tilt = i % 2 === 0 ? 'rotate(0.6deg)' : 'rotate(-0.6deg)';
          return (
            <div
              key={i}
              className="font-black text-gray-400 tracking-widest"
              style={{
                fontSize: `${macroFontSize}px`,
                lineHeight: `${macroFontSize + 6}px`,
                marginTop: `${i * 52}px`,
                transform: `translateX(${shift}px) ${tilt}`,
                whiteSpace: 'nowrap',
              }}
            >
              {macroText}
            </div>
          );
        })}
      </div>

      {/* MACRO TEXTO 2 CRUZADO (rotación +30deg) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          opacity: macroOpacity * 0.7,
          transform: 'rotate(30deg)',
        }}
      >
        {Array.from({ length: macroLines }).map((_, i) => {
          const shift = ((seed + i * 97) % 220) - 110;
          const tilt = i % 2 === 0 ? 'rotate(0.6deg)' : 'rotate(-0.6deg)';
          return (
            <div
              key={i}
              className="font-black text-gray-400 tracking-widest"
              style={{
                fontSize: `${macroFontSize}px`,
                lineHeight: `${macroFontSize + 6}px`,
                marginTop: `${i * 52}px`,
                transform: `translateX(${shift}px) ${tilt}`,
                whiteSpace: 'nowrap',
              }}
            >
              {macroText}
            </div>
          );
        })}
      </div>

    </div>
  );
};

const Receipt: React.FC<ReceiptProps> = ({ sale, drawName, onClose, businessName, logoUrl }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  if (!sale) return null;

  const displayTimestamp = typeof sale.timestamp === 'string' 
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
            await navigator.share({ files: [file], title: `Comprobante de Venta - ${sale.ticketId}`, text: `Recibo para el sorteo ${drawName}.` });
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

  return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-[60]">
          <div className="absolute top-4 right-4">
              <button onClick={onClose} disabled={isSharing} className="p-2 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white transition-colors disabled:opacity-50">
                  <XMarkIcon className="w-6 h-6" />
              </button>
          </div>
          <div className="absolute top-4 left-4">
             <button onClick={handleShare} disabled={isSharing} className="p-2 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50">
                 <ShareIcon className="w-6 h-6" />
             </button>
         </div>
          
          <div
            ref={receiptRef}
            className="bg-white w-full max-w-[300px] font-sans text-black p-1 border-2 border-dashed border-gray-400 relative overflow-hidden"
          >
            {(() => {
              const { microBase, macroBase, id, total, nums } = buildWatermarkData(sale);
              const seed = simpleSeedFromString(`${id}|${total}|${nums}`);
              return (
                <WatermarkBackground
                  microText={microBase}
                  macroText={macroBase}
                  seed={seed}
                  numbersCount={(sale.numbers || []).length}
                />
              );
            })()}

            <div className="relative z-10">
              <div className="p-4">
                  <div className="text-center mb-4">
                      <div className="flex justify-center items-center gap-3 mb-1">
                          {logoUrl && logoUrl !== 'default' ? (
                              <Image src={logoUrl} alt="Logo del Negocio" width={36} height={36} className="rounded-full" unoptimized />
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
                       {sale.clientPhone && <p><strong>Teléfono:</strong> <span className="font-mono ml-1">{sale.clientPhone}</span></p>}
                      <div>
                          <p><strong>Sorteos:</strong></p>
                          <div className="pl-3 text-gray-700 font-mono">
                              {sale.schedules.map(s => <p key={s}>{drawName} ({s})</p>)}
                          </div>
                      </div>
                  </div>
                  <div className="text-xs font-mono">
                      <div className="flex justify-between font-sans font-semibold text-black border-b border-gray-300 pb-1 mb-2">
                          <span>Número</span><span>Fracc.</span><span>Monto</span>
                      </div>
                      {sale.numbers.map((n, index) => (
                      <div key={index} className="flex justify-between text-gray-800">
                          <span>{n.number}</span><span>x{n.quantity}</span><span>${(n.quantity * sale.costPerFraction).toFixed(2)}</span>
                      </div>
                      ))}
                  </div>
                  <div className="mt-4 pt-2 border-t border-dashed border-gray-300">
                      <div className="flex justify-end items-baseline text-lg font-bold font-mono"><span className="text-sm font-sans mr-2">TOTAL:</span><span>${sale.totalCost.toFixed(2)}</span></div>
                  </div>
                  <div className="mt-4 flex justify-center">
                      <div className="p-1 bg-white border border-gray-200 rounded-md shadow-sm">
                          <QRCode value={sale.ticketId || 'LottoSalesHub-Test'} size={80} bgColor="#FFFFFF" fgColor="#000000"/>
                      </div>
                  </div>
                  <div className="text-center text-xs mt-3 text-gray-500"><p>¡Gracias por su compra!</p><p>Conserve este comprobante.</p></div>
              </div>
            </div>
          </div>
      </div>
  );
};

export default Receipt;
