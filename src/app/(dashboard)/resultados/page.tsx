'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDraws, Draw } from "@/contexts/DrawsContext";
import { Sale } from "@/contexts/SalesContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// HELPERS
const toDateSafe = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

const getDayRange = (dateStr: string) => {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { start, end };
};

const slugifySchedule = (s: string) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");

const buildPayoutDocId = (drawId: string, date: string, schedule: string, ticketId: string) => {
  const scheduleSlug = slugifySchedule(schedule);
  return `${drawId}_${date}_${scheduleSlug}_${ticketId}`;
};

// TYPES
type WinnerHit = {
  position: "1ero" | "2do" | "3ro";
  number: string;
  rate: number;
  quantity: number;
  amount: number;
};

type Winner = {
  ticketId: string;
  clientName?: string;
  clientPhone?: string;
  hits: WinnerHit[];
  totalWin: number;
};

export default function ResultsPage() {
  const { user } = useAuth();
  const { draws } = useDraws();
  const [date, setDate] = useState("");
  const [draw, setDraw] = useState("");
  const [schedule, setSchedule] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");
  
  const [winners, setWinners] = useState<Winner[]>([]);
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});
  const [isPayLoading, setIsPayLoading] = useState<string | null>(null);

  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);

  const totalPayout = useMemo(() => {
    return (winners || []).reduce((acc, w) => acc + (Number(w.totalWin) || 0), 0);
  }, [winners]);

  useEffect(() => {
    const foundDraw = draws.find((d) => d.id === draw);
    setSelectedDraw(foundDraw || null);
    setSchedule("");
  }, [draw, draws]);

  const loadPaidStatuses = async (drawId: string, date: string, schedule: string) => {
    if (!user?.uid || !drawId || !date || !schedule) return;

    const payoutRef = collection(db, "users", user.uid, "payoutStatus");
    try {
      const qPaid = query(
        payoutRef,
        where("drawId", "==", drawId),
        where("date", "==", date),
        where("schedule", "==", schedule)
      );
      const snap = await getDocs(qPaid);
      const map: Record<string, boolean> = {};
      snap.docs.forEach(d => {
        const data: any = d.data();
        if (data?.ticketId) map[data.ticketId] = !!data.paid;
      });
      setPaidMap(map);
    } catch (err: any) {
      console.warn("Índice de pagos no disponible. Usando fallback.");
      const snap = await getDocs(payoutRef);
      const map: Record<string, boolean> = {};
      snap.docs.forEach(d => {
        const data: any = d.data();
        if (data?.drawId === drawId && data?.date === date && data?.schedule === schedule && data?.ticketId) {
          map[data.ticketId] = !!data.paid;
        }
      });
      setPaidMap(map);
    }
  };

  useEffect(() => {
    if (draw && date && schedule) {
      loadPaidStatuses(draw, date, schedule);
    }
  }, [draw, date, schedule]);


  const markAsPaid = async (winner: Winner, drawId: string, date: string, schedule: string) => {
    if (!user?.uid) return;
  
    const payoutRef = collection(db, "users", user.uid, "payoutStatus");
    const payoutDocId = buildPayoutDocId(drawId, date, schedule, winner.ticketId);
    const payoutDocRef = doc(payoutRef, payoutDocId);
  
    setIsPayLoading(winner.ticketId);
    try {
      await setDoc(
        payoutDocRef,
        {
          drawId,
          date,
          schedule,
          ticketId: winner.ticketId,
          paid: true,
          paidAt: serverTimestamp(),
          totalWin: winner.totalWin,
        },
        { merge: true }
      );
  
      setPaidMap(prev => ({ ...prev, [winner.ticketId]: true }));
    } finally {
      setIsPayLoading(null);
    }
  };

  const handleSaveResults = async () => {
    if (!user || !date || !draw || !schedule || !first || !second || !third || !selectedDraw) {
      alert("Por favor, complete todos los campos.");
      return;
    }

    try {
      const cif = selectedDraw.cif;
      const pad = (v: string, cif: number) => String(Number(v)).padStart(cif, "0");

      const paddedFirst = pad(first, cif);
      const paddedSecond = pad(second, cif);
      const paddedThird = pad(third, cif);

      const resultsCollectionRef = collection(db, "users", user.uid, "results");
      await addDoc(resultsCollectionRef, {
        date,
        drawId: draw,
        schedule,
        first: paddedFirst,
        second: paddedSecond,
        third: paddedThird,
        createdAt: serverTimestamp(),
      });

      const salesCollectionRef = collection(db, "users", user.uid, "sales");
      const { start, end } = getDayRange(date);
      let querySnapshot;

      try {
        const q = query(
          salesCollectionRef,
          where("drawId", "==", draw),
          where("schedules", "array-contains", schedule),
          where("timestamp", ">=", Timestamp.fromDate(start)),
          where("timestamp", "<", Timestamp.fromDate(end))
        );
        querySnapshot = await getDocs(q);
      } catch (err: any) {
        if (String(err?.message).includes("requires an index")) {
          console.warn("Índice de ventas no disponible. Usando fallback.");
          const qFallback = query(salesCollectionRef, where("drawId", "==", draw));
          const snap = await getDocs(qFallback);
          const filteredDocs = snap.docs.filter((docSnap) => {
            const data: any = docSnap.data();
            const sch = Array.isArray(data.schedules) ? data.schedules : [];
            if (!sch.includes(schedule)) return false;
            const dt = toDateSafe(data.timestamp);
            return dt && dt.getTime() >= start.getTime() && dt.getTime() <= end.getTime();
          });
          querySnapshot = { docs: filteredDocs };
        } else {
          throw err;
        }
      }

      const calculatedWinners: Winner[] = [];
      const winnersMap: Map<string, Winner> = new Map();

      querySnapshot.docs.forEach((doc) => {
        const sale = doc.data() as Sale;
        const hits: WinnerHit[] = [];

        sale.numbers.forEach((number) => {
          if (number.number === paddedFirst) {
            hits.push({ position: "1ero", number: number.number, rate: 11, quantity: number.quantity, amount: number.quantity * 11 });
          } else if (number.number === paddedSecond) {
            hits.push({ position: "2do", number: number.number, rate: 3, quantity: number.quantity, amount: number.quantity * 3 });
          } else if (number.number === paddedThird) {
            hits.push({ position: "3ro", number: number.number, rate: 2, quantity: number.quantity, amount: number.quantity * 2 });
          }
        });

        if (hits.length > 0) {
          const totalWin = hits.reduce((acc, h) => acc + h.amount, 0);
          let existingWinner = winnersMap.get(sale.ticketId);

          if(existingWinner) {
            existingWinner.hits.push(...hits);
            existingWinner.totalWin += totalWin;
          } else {
            winnersMap.set(sale.ticketId, {
              ticketId: sale.ticketId,
              clientName: sale.clientName,
              clientPhone: sale.clientPhone,
              hits,
              totalWin,
            });
          }
        }
      });

      setWinners(Array.from(winnersMap.values()));
      await loadPaidStatuses(draw, date, schedule);

      alert("Resultados guardados y ganadores calculados exitosamente.");
    } catch (error) {
      console.error("Error al guardar resultados: ", error);
      alert("Error al guardar resultados.");
    }
  };

  return (
    <div className="container mx-auto p-4 bg-gray-900 text-white">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-green-400">Resultados y Ganadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Select value={draw} onValueChange={setDraw}>
              <SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue placeholder="Sorteo" /></SelectTrigger>
              <SelectContent className="bg-gray-700 text-white">
                {draws.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue placeholder="Horario" /></SelectTrigger>
              <SelectContent className="bg-gray-700 text-white">
                {selectedDraw?.sch.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input placeholder="First" value={first} onChange={(e) => setFirst(e.target.value)} className="bg-gray-700 border-gray-600"/>
            <Input placeholder="Second" value={second} onChange={(e) => setSecond(e.target.value)} className="bg-gray-700 border-gray-600"/>
            <Input placeholder="Third" value={third} onChange={(e) => setThird(e.target.value)} className="bg-gray-700 border-gray-600"/>
          </div>
          <Button onClick={handleSaveResults} className="bg-green-500 hover:bg-green-600">
            Guardar y Calcular Ganadores
          </Button>

          <div className="mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Ganadores</h2>
            {winners.length === 0 ? (
              <p className="text-white/60">No hay ganadores para este sorteo/horario.</p>
            ) : (
              <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/20">
                <table className="w-full text-left">
                  <thead className="border-b border-white/10">
                    <tr className="text-xs text-white/60">
                      <th className="p-3">Ticket</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Número</th>
                      <th className="p-3">Premio</th>
                      <th className="p-3">Cálculo</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-center">Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {winners.map((w) => {
                      const isPaid = !!paidMap[w.ticketId];
                      const firstHit = w.hits[0];
                      const restHits = w.hits.slice(1);

                      return (
                        <React.Fragment key={w.ticketId}>
                          <tr className="text-sm text-white/90 align-top">
                            <td className="p-3 font-semibold">{w.ticketId}</td>
                            <td className="p-3">
                              <div className="font-medium">{w.clientName || "Cliente General"}</div>
                              {w.clientPhone && <div className="text-xs text-white/50">{w.clientPhone}</div>}
                            </td>
                            <td className="p-3 font-mono">{firstHit?.number || "-"}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs border border-white/15 bg-white/5">
                                {firstHit?.position || "-"}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-white/80 font-mono">
                              {firstHit ? `${firstHit.quantity} x $${firstHit.rate} = $${firstHit.amount}` : "-"}
                            </td>
                            <td className="p-3 text-right font-semibold text-green-400">
                              ${Number(w.totalWin || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                disabled={isPaid || isPayLoading === w.ticketId}
                                onClick={() => markAsPaid(w, draw, date, schedule)}
                                className={[
                                  "text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors",
                                  isPaid ? "bg-red-600 cursor-default" : "bg-green-600 hover:bg-green-700",
                                  (isPaid || isPayLoading === w.ticketId) ? "opacity-90" : "",
                                ].join(" ")}
                              >
                                {isPaid ? "PAGADO" : (isPayLoading === w.ticketId ? "PAGANDO..." : "PAGAR")}
                              </button>
                            </td>
                          </tr>
                          {restHits.length > 0 && (
                            <tr className="bg-white/0">
                              <td className="p-3"></td>
                              <td className="p-3 text-xs text-white/50" colSpan={5}>
                                <div className="space-y-1">
                                  {restHits.map((h, idx) => (
                                    <div key={idx} className="flex flex-wrap gap-3">
                                      <span className="font-mono text-white/80">{h.number}</span>
                                      <span className="text-white/70">{h.position}</span>
                                      <span className="font-mono text-white/80">{h.quantity} x ${h.rate} = ${h.amount}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3"></td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex justify-end p-4 border-t border-white/10">
                  <div className="text-right">
                    <div className="text-xs text-white/60">Total Payout (acumulado)</div>
                    <div className="text-2xl font-bold text-green-400">
                      ${totalPayout.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
