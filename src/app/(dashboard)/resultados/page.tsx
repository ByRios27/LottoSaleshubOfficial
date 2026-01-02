'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDraws, Draw } from "@/contexts/DrawsContext";
import { Sale } from "@/contexts/SalesContext";
import toast, { Toaster } from 'react-hot-toast';

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
    .replace(/[^\w-]/g, "");

const buildPayoutDocId = (drawId: string, date: string, schedule: string, ticketId: string) => {
  const scheduleSlug = slugifySchedule(schedule);
  return `${drawId}_${date}_${scheduleSlug}_${ticketId}`;
};

const padToCif = (v: string, cif: number) => {
  const n = String(Number(v));
  if (n === "NaN") return "";
  return n.padStart(cif, "0");
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

type SavedResult = {
  id: string;
  drawId: string;
  date: string;
  schedule: string;
  first: string;
  second: string;
  third: string;
  createdAt?: any;
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
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);

  // Edit/Delete States
  const [editingResult, setEditingResult] = useState<SavedResult | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editSecond, setEditSecond] = useState("");
  const [editThird, setEditThird] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<string | null>(null);

  const totalPayout = useMemo(() => {
    return (winners || []).reduce((acc, w) => acc + (Number(w.totalWin) || 0), 0);
  }, [winners]);

  useEffect(() => {
    const foundDraw = draws.find((d) => d.id === draw);
    setSelectedDraw(foundDraw || null);
    if (draw) {
      loadSavedResults(draw);
    }
    setSchedule("");
  }, [draw, draws]);

  const loadPaidStatuses = async (drawId: string, dateStr: string, scheduleStr: string) => {
    if (!user?.uid || !drawId || !dateStr || !scheduleStr) return;
    const payoutRef = collection(db, "users", user.uid, "payoutStatus");
    try {
      const qPaid = query(payoutRef, where("drawId", "==", drawId), where("date", "==", dateStr), where("schedule", "==", scheduleStr));
      const snap = await getDocs(qPaid);
      const map: Record<string, boolean> = {};
      snap.docs.forEach(d => {
        const data: any = d.data();
        if (data?.ticketId) map[buildPayoutDocId(drawId, dateStr, scheduleStr, data.ticketId)] = !!data.paid;
      });
      setPaidMap(map);
    } catch (err) {
      console.warn("Fallback: cargando todos los estados de pago.")
      const snap = await getDocs(payoutRef);
      const map: Record<string, boolean> = {};
      snap.docs.forEach(d => {
        const data: any = d.data();
        if (data?.drawId === drawId && data?.date === dateStr && data?.schedule === scheduleStr && data?.ticketId) {
          map[buildPayoutDocId(drawId, dateStr, scheduleStr, data.ticketId)] = !!data.paid;
        }
      });
      setPaidMap(map);
    }
  };

  const loadSavedResults = async (drawId?: string) => {
    if (!user?.uid) return;
    setLoadingSaved(true);
    const resultsRef = collection(db, "users", user.uid, "results");
    try {
      let snap;
      const baseQuery = drawId ? query(resultsRef, where("drawId", "==", drawId)) : resultsRef;
      snap = await getDocs(query(baseQuery, orderBy("createdAt", "desc"), limit(50)));
      
      const all: SavedResult[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedResult));
      setSavedResults(all);
    } catch(e) {
        console.warn("Error loading results, likely missing index. Falling back.");
        const fallbackSnap = await getDocs(collection(db, "users", user.uid, "results"));
        let all = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as SavedResult));
        if(drawId) all = all.filter(r => r.drawId === drawId);
        all.sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setSavedResults(all.slice(0, 50));
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => { loadSavedResults(); }, []);

  const markAsPaid = async (winner: Winner, drawId: string, date: string, schedule: string) => {
    if (!user?.uid) return;
    const payoutDocId = buildPayoutDocId(drawId, date, schedule, winner.ticketId);
    const payoutRef = doc(db, "users", user.uid, "payoutStatus", payoutDocId);
    setIsPayLoading(winner.ticketId);
    try {
      await setDoc(payoutRef, { drawId, date, schedule, ticketId: winner.ticketId, paid: true, paidAt: serverTimestamp(), totalWin: winner.totalWin }, { merge: true });
      setPaidMap(prev => ({ ...prev, [payoutDocId]: true }));
    } finally {
      setIsPayLoading(null);
    }
  };

  const calculateAndSetWinners = async (params: { drawId: string; date: string; schedule: string; first: string; second: string; third: string; }) => {
    const { drawId, date, schedule, first, second, third } = params;
    if (!user || !selectedDraw) return;
    const cif = selectedDraw.cif;
    const salesCollectionRef = collection(db, "users", user.uid, "sales");
    const { start, end } = getDayRange(date);
    let querySnapshot;
    try {
      const q = query(salesCollectionRef, where("drawId", "==", drawId), where("schedules", "array-contains", schedule), where("timestamp", ">=", start), where("timestamp", "<", end));
      querySnapshot = await getDocs(q);
    } catch (err: any) {
      console.warn("Índice de ventas no disponible. Usando fallback.");
      const qFallback = query(salesCollectionRef, where("drawId", "==", drawId));
      const snap = await getDocs(qFallback);
      querySnapshot = { docs: snap.docs.filter(docSnap => {
        const data = docSnap.data();
        return (data.schedules || []).includes(schedule) && toDateSafe(data.timestamp)?.getTime() >= start.getTime() && toDateSafe(data.timestamp)?.getTime() <= end.getTime();
      }) };
    }
    const winnersMap: Map<string, Winner> = new Map();
    const pf = padToCif(first,cif), ps = padToCif(second,cif), pt = padToCif(third,cif);
    querySnapshot.docs.forEach((doc) => {
      const sale = doc.data() as Sale;
      const hits: WinnerHit[] = [];
      sale.numbers.forEach(n => {
        if (n.number === pf) hits.push({ position: "1ero", number: n.number, rate: 11, quantity: n.quantity, amount: n.quantity * 11 });
        else if (n.number === ps) hits.push({ position: "2do", number: n.number, rate: 3, quantity: n.quantity, amount: n.quantity * 3 });
        else if (n.number === pt) hits.push({ position: "3ro", number: n.number, rate: 2, quantity: n.quantity, amount: n.quantity * 2 });
      });
      if (hits.length > 0) {
        const totalWin = hits.reduce((acc, h) => acc + h.amount, 0);
        let existing = winnersMap.get(sale.ticketId);
        if (existing) { existing.hits.push(...hits); existing.totalWin += totalWin; } 
        else { winnersMap.set(sale.ticketId, { ticketId: sale.ticketId, clientName: sale.clientName, clientPhone: sale.clientPhone, hits, totalWin }); }
      }
    });
    setWinners(Array.from(winnersMap.values()));
    await loadPaidStatuses(drawId, date, schedule);
  }

  const handleSaveResults = async () => {
    if (!user || !date || !draw || !schedule || !first || !second || !third || !selectedDraw) return toast.error("Por favor, complete todos los campos.");
    try {
      const cif = selectedDraw.cif;
      await addDoc(collection(db, "users", user.uid, "results"), { date, drawId: draw, schedule, first: padToCif(first,cif), second: padToCif(second,cif), third: padToCif(third,cif), createdAt: serverTimestamp() });
      await calculateAndSetWinners({ drawId: draw, date, schedule, first, second, third });
      await loadSavedResults(draw);
      toast.success("Resultados guardados y ganadores calculados.");
    } catch (error) { console.error("Error: ", error); toast.error("Error al guardar."); }
  };

  const handleSelectSavedResult = async (r: SavedResult) => {
    setDraw(r.drawId); setDate(r.date); setSchedule(r.schedule); setFirst(r.first); setSecond(r.second); setThird(r.third);
    setWinners([]); setPaidMap({});
    await calculateAndSetWinners({ ...r });
  };

  const openEditResult = (r: SavedResult) => { setEditingResult(r); setEditFirst(r.first); setEditSecond(r.second); setEditThird(r.third); setIsEditOpen(true); };

  const saveEditedResult = async () => {
    if (!user?.uid || !editingResult) return;
    const selectedDrawObj = draws.find(d => d.id === editingResult.drawId);
    const cif = selectedDrawObj?.cif || 2;
    const firstN = padToCif(editFirst, cif), secondN = padToCif(editSecond, cif), thirdN = padToCif(editThird, cif);
    if (!firstN || !secondN || !thirdN) return toast.error("Completa 1ero, 2do y 3ro.");
    if (firstN === secondN || firstN === thirdN || secondN === thirdN) return toast.error("Los resultados no pueden repetirse.");
    setIsEditSaving(true);
    try {
      const resultDocRef = doc(db, "users", user.uid, "results", editingResult.id);
      await updateDoc(resultDocRef, { first: firstN, second: secondN, third: thirdN, updatedAt: serverTimestamp() });
      toast.success("Resultado actualizado.");
      await loadSavedResults(draw);
      if (editingResult.id === savedResults.find(r => r.date === date && r.schedule === schedule)?.id) {
        setFirst(firstN); setSecond(secondN); setThird(thirdN);
        await calculateAndSetWinners({ drawId: draw, date, schedule, first: firstN, second: secondN, third: thirdN });
      }
      setIsEditOpen(false); setEditingResult(null);
    } finally { setIsEditSaving(false); }
  };

  const deleteResult = async (r: SavedResult) => {
    if (!user?.uid) return;
    setIsDeleteLoading(r.id);
    try {
      await deleteDoc(doc(db, "users", user.uid, "results", r.id));
      toast.success("Resultado eliminado.");
      await loadSavedResults(draw);
      if (r.id === savedResults.find(res => res.date === date && res.schedule === schedule)?.id) {
        setFirst(""); setSecond(""); setThird(""); setWinners([]); setPaidMap({});
      }
    } finally { setIsDeleteLoading(null); }
  };

  return (
    <div className="container mx-auto p-4 bg-gray-900 text-white">
      <Toaster position="bottom-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader><CardTitle className="text-green-400">Resultados y Ganadores</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-gray-700 border-gray-600 text-white"/>
            <Select value={draw} onValueChange={setDraw}><SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue placeholder="Sorteo" /></SelectTrigger><SelectContent className="bg-gray-700 text-white">{draws.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent></Select>
            <Select value={schedule} onValueChange={setSchedule}><SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue placeholder="Horario" /></SelectTrigger><SelectContent className="bg-gray-700 text-white">{selectedDraw?.sch.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input placeholder="First" value={first} onChange={(e) => setFirst(e.target.value)} className="bg-gray-700 border-gray-600"/>
            <Input placeholder="Second" value={second} onChange={(e) => setSecond(e.target.value)} className="bg-gray-700 border-gray-600"/>
            <Input placeholder="Third" value={third} onChange={(e) => setThird(e.target.value)} className="bg-gray-700 border-gray-600"/>
          </div>
          <Button onClick={handleSaveResults} className="bg-green-500 hover:bg-green-600">Guardar y Calcular Ganadores</Button>

          <div className="mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Ganadores</h2>
            {winners.length > 0 && (
              <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/20">
                <table className="w-full text-left">
                  <thead className="border-b border-white/10"><tr className="text-xs text-white/60">
                    <th className="p-3">Ticket</th><th className="p-3">Cliente</th><th className="p-3">Número</th><th className="p-3">Premio</th>
                    <th className="p-3">Cálculo</th><th className="p-3 text-right">Total</th><th className="p-3 text-center">Pago</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/10">{winners.map(w => {
                      const payoutKey = buildPayoutDocId(draw, date, schedule, w.ticketId);
                      const isPaid = !!paidMap[payoutKey];
                      return (
                        <React.Fragment key={w.ticketId}>
                          <tr>
                            <td className="p-3 font-semibold">{w.ticketId}</td>
                            <td className="p-3">{w.clientName || '-'}{w.clientPhone && <div className="text-xs text-white/50">{w.clientPhone}</div>}</td>
                            <td className="p-3 font-mono">{w.hits[0]?.number || '-'}</td>
                            <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs border border-white/15 bg-white/5">{w.hits[0]?.position || '-'}</span></td>
                            <td className="p-3 text-xs font-mono">{w.hits[0] ? `${w.hits[0].quantity}x$${w.hits[0].rate}=$${w.hits[0].amount}` : '-'}</td>
                            <td className="p-3 text-right font-semibold text-green-400">${Number(w.totalWin || 0).toFixed(2)}</td>
                            <td className="p-3 text-center"><button type="button" disabled={isPaid || isPayLoading === w.ticketId} onClick={() => markAsPaid(w, draw, date, schedule)} className={`text-white text-xs py-2 px-3 rounded-lg ${isPaid ? 'bg-red-600' : 'bg-green-600 hover:bg-green-700'} ${isPayLoading === w.ticketId && 'opacity-50'}`}>{isPaid ? 'PAGADO' : (isPayLoading === w.ticketId ? '...' : 'PAGAR')}</button></td>
                          </tr>
                          {w.hits.length > 1 && (<tr><td/><td colSpan={5} className="p-3 text-xs"><div className="space-y-1">{w.hits.slice(1).map((h, i) => <div key={i} className="flex gap-3"><span className="font-mono text-white/80">{h.number}</span><span className="text-white/70">{h.position}</span><span className="font-mono text-white/80">{h.quantity}x${h.rate}=${h.amount}</span></div>)}</div></td><td/></tr>)}
                        </React.Fragment>
                      );
                  })}</tbody>
                </table>
                <div className="flex justify-end p-4 border-t border-white/10"><div className="text-right"><div className="text-xs text-white/60">Total Payout</div><div className="text-2xl font-bold text-green-400">${totalPayout.toFixed(2)}</div></div></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 border border-white/10 rounded-2xl bg-black/20">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div><h3 className="text-lg font-semibold text-white">Resultados guardados</h3><p className="text-sm text-white/60">Toca un resultado para cargarlo y ver ganadores.</p></div>
          <button type="button" onClick={() => loadSavedResults(draw)} className="bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold py-2 px-3 rounded-lg" disabled={loadingSaved}>{loadingSaved ? "CARGANDO..." : "ACTUALIZAR"}</button>
        </div>
        <div className="p-4"><div className="space-y-2">{savedResults.map(r => (
          <div key={r.id} className="w-full p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-start justify-between gap-3">
            <button type="button" onClick={() => handleSelectSavedResult(r)} className="flex-1 text-left"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm text-white/90 font-semibold">{r.date} — {r.schedule}</div><div className="text-xs text-white/60 font-mono">1ero {r.first} · 2do {r.second} · 3ro {r.third}</div></div></button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => openEditResult(r)} className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white" title="Editar">Editar</button>
              <button type="button" onClick={() => deleteResult(r)} disabled={isDeleteLoading === r.id} className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors border-red-500/30 text-red-300 hover:bg-red-500/15 ${isDeleteLoading === r.id && 'opacity-60 cursor-not-allowed'}`} title="Borrar">{isDeleteLoading === r.id ? "Borrando..." : "Borrar"}</button>
            </div>
          </div>
        ))}</div></div>
      </div>

      {isEditOpen && editingResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 shadow-lg">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div><div className="text-white font-semibold">Editar resultado</div><div className="text-xs text-white/60">{editingResult.date} — {editingResult.schedule}</div></div>
              <button type="button" onClick={() => { setIsEditOpen(false); setEditingResult(null); }} className="p-2 rounded-full hover:bg-white/10 text-white">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-white/70 mb-1">1ero</label><input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-green-500"/></div>
                <div><label className="block text-xs text-white/70 mb-1">2do</label><input value={editSecond} onChange={(e) => setEditSecond(e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-green-500"/></div>
                <div><label className="block text-xs text-white/70 mb-1">3ro</label><input value={editThird} onChange={(e) => setEditThird(e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-green-500"/></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setIsEditOpen(false); setEditingResult(null); }} className="bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="button" onClick={saveEditedResult} disabled={isEditSaving} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed">{isEditSaving ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
