'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  collection,
  doc,
  addDoc,
  getDocs,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteAllResultsForUser } from './actions';

// TYPES & HELPERS
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

type WinnerHit = { position: "1ero" | "2do" | "3ro"; number: string; rate: number; quantity: number; amount: number; };
type Winner = { ticketId: string; clientName?: string; clientPhone?: string; hits: WinnerHit[]; totalWin: number; };
type SavedResult = { id: string; drawId: string; date: string; schedule: string; first: string; second: string; third: string; createdAt?: any; };

// --- REFACTORED COMPONENTS ---

const CreateResultForm = ({ user, draws, onResultSaved }) => {
    const [date, setDate] = useState("");
    const [draw, setDraw] = useState("");
    const [schedule, setSchedule] = useState("");
    const [first, setFirst] = useState("");
    const [second, setSecond] = useState("");
    const [third, setThird] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const selectedDraw = useMemo(() => draws.find(d => d.id === draw) || null, [draw, draws]);

    const handleSave = async () => {
        if (!user || !date || !draw || !schedule || !first || !second || !third || !selectedDraw) return toast.error("Por favor, complete todos los campos.");
        setIsSaving(true);
        try {
            const cif = selectedDraw.cif;
            const firstN = padToCif(first, cif), secondN = padToCif(second, cif), thirdN = padToCif(third, cif);
            if (!firstN || !secondN || !thirdN) { toast.error("Complete los números ganadores."); return; }
            if (firstN === secondN || firstN === thirdN || secondN === thirdN) {
                if (!confirm("Hay números repetidos. ¿Confirmas que es correcto?")) return;
            }
            const newResult = { date, drawId: draw, schedule, first: firstN, second: secondN, third: thirdN, createdAt: serverTimestamp() };
            const docRef = await addDoc(collection(db, "users", user.uid, "results"), newResult);
            toast.success("Resultado guardado.");
            onResultSaved({ id: docRef.id, ...newResult });
            setDate(""); setDraw(""); setSchedule(""); setFirst(""); setSecond(""); setThird("");
        } catch (e) { console.error(e); toast.error("Error al guardar."); } finally { setIsSaving(false); }
    };

    return (
        <Card className="bg-gray-800 border-gray-700"><CardHeader><CardTitle className="text-green-400">Registrar Nuevo Resultado</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-gray-700 border-gray-600 text-white"/>
                <Select value={draw} onValueChange={setDraw}><SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue placeholder="Sorteo" /></SelectTrigger><SelectContent className="bg-gray-700 text-white">{draws.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                <Select value={schedule} onValueChange={setSchedule} disabled={!selectedDraw}><SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue placeholder="Horario" /></SelectTrigger><SelectContent className="bg-gray-700 text-white">{selectedDraw?.sch.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input placeholder="1ero" value={first} onChange={e => setFirst(e.target.value)} className="bg-gray-700 border-gray-600"/>
                <Input placeholder="2do" value={second} onChange={e => setSecond(e.target.value)} className="bg-gray-700 border-gray-600"/>
                <Input placeholder="3ro" value={third} onChange={e => setThird(e.target.value)} className="bg-gray-700 border-gray-600"/>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full bg-green-500 hover:bg-green-600">{isSaving ? 'Guardando...' : 'Guardar Resultado'}</Button>
        </CardContent></Card>
    );
};

const WinnersDisplay = ({ winners, totalPayout, isLoading, markAsPaid, isPayLoading, paidMap, selectedResult }) => {
    if (isLoading) return <div className="text-center p-8"><p>Calculando ganadores...</p></div>;
    if (!selectedResult) return <div className="text-center p-8 text-white/60">Selecciona un resultado para ver los ganadores.</div>;
    if (winners.length === 0) return <div className="text-center p-8 text-white/60">No se encontraron ganadores para este resultado.</div>;

    return (
        <div className="mt-6"><h2 className="text-xl font-bold text-white mb-4">Ganadores del Sorteo</h2><div className="overflow-x-auto border border-white/10 rounded-xl bg-black/20">
            <table className="w-full text-left"><thead className="border-b border-white/10"><tr className="text-xs text-white/60">
                <th className="p-3">Ticket</th><th className="p-3">Cliente</th><th className="p-3">Número</th><th className="p-3">Premio</th>
                <th className="p-3">Cálculo</th><th className="p-3 text-right">Total</th><th className="p-3 text-center">Pago</th>
            </tr></thead><tbody className="divide-y divide-white/10">{winners.map(w => {
                const payoutKey = buildPayoutDocId(selectedResult.drawId, selectedResult.date, selectedResult.schedule, w.ticketId);
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
                            <td className="p-3 text-center"><button type="button" disabled={isPaid || isPayLoading === w.ticketId} onClick={() => markAsPaid(w, selectedResult)} className={`text-white text-xs py-2 px-3 rounded-lg ${isPaid ? 'bg-red-600' : 'bg-green-600 hover:bg-green-700'} ${isPayLoading === w.ticketId && 'opacity-50'}`}>{isPaid ? 'PAGADO' : (isPayLoading === w.ticketId ? '...' : 'PAGAR')}</button></td>
                        </tr>
                        {w.hits.length > 1 && (<tr><td/><td colSpan={5} className="p-3 text-xs"><div className="space-y-1">{w.hits.slice(1).map((h, i) => <div key={i} className="flex gap-3"><span className="font-mono text-white/80">{h.number}</span><span className="text-white/70">{h.position}</span><span className="font-mono text-white/80">{h.quantity}x${h.rate}=${h.amount}</span></div>)}</div></td><td/></tr>)}
                    </React.Fragment>
                );
            })}</tbody></table>
            <div className="flex justify-end p-4 border-t border-white/10"><div className="text-right"><div className="text-xs text-white/60">Total Payout</div><div className="text-2xl font-bold text-green-400">${totalPayout.toFixed(2)}</div></div></div>
        </div></div>
    );
};

const EditResultModal = ({ isOpen, onOpenChange, result, user, draws, onResultUpdated }) => {
    const [editFirst, setEditFirst] = useState("");
    const [editSecond, setEditSecond] = useState("");
    const [editThird, setEditThird] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (result) {
            setEditFirst(result.first || '');
            setEditSecond(result.second || '');
            setEditThird(result.third || '');
        }
    }, [result]);

    const handleSave = async () => {
        if (!user?.uid || !result) return;
        const selectedDraw = draws.find(d => d.id === result.drawId);
        if (!selectedDraw) return;

        const cif = selectedDraw.cif;
        const firstN = padToCif(editFirst, cif), secondN = padToCif(editSecond, cif), thirdN = padToCif(editThird, cif);
        if (!firstN || !secondN || !thirdN) return toast.error("Completa los números ganadores.");

        setIsSaving(true);
        try {
            const updatedFields = { first: firstN, second: secondN, third: thirdN, updatedAt: serverTimestamp() };
            const resultDocRef = doc(db, "users", user.uid, "results", result.id);
            await updateDoc(resultDocRef, updatedFields);
            toast.success("Resultado actualizado.");
            onResultUpdated({ ...result, ...updatedFields });
            onOpenChange(false);
        } catch (e) { console.error(e); toast.error("Error al actualizar."); } finally { setIsSaving(false); }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader><DialogTitle>Editar Resultado</DialogTitle><DialogDescription>{result?.date} - {result?.schedule}</DialogDescription></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    <Input placeholder="1ero" value={editFirst} onChange={e => setEditFirst(e.target.value)} className="bg-gray-700 border-gray-600"/>
                    <Input placeholder="2do" value={editSecond} onChange={e => setEditSecond(e.target.value)} className="bg-gray-700 border-gray-600"/>
                    <Input placeholder="3ro" value={editThird} onChange={e => setEditThird(e.target.value)} className="bg-gray-700 border-gray-600"/>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="w-full bg-green-500 hover:bg-green-600">{isSaving ? 'Guardando...' : 'Guardar Cambios'}</Button>
            </DialogContent>
        </Dialog>
    );
};

// --- MAIN PAGE COMPONENT ---

export default function ResultsPage() {
  const { user } = useAuth();
  const { draws } = useDraws();
  
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [selectedResult, setSelectedResult] = useState<SavedResult | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});
  const [isPayLoading, setIsPayLoading] = useState<string | null>(null);
  
  const [editingResult, setEditingResult] = useState<SavedResult | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [isDeletingAll, startTransition] = useTransition();
  const [isDialogAllOpen, setIsDialogAllOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const totalPayout = useMemo(() => (winners || []).reduce((acc, w) => acc + (Number(w.totalWin) || 0), 0), [winners]);

  const loadSavedResults = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingSaved(true);
    try {
        const resultsRef = collection(db, "users", user.uid, "results");
        const q = query(resultsRef, orderBy("createdAt", "desc"), limit(100));
        const snap = await getDocs(q);
        setSavedResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedResult)));
    } catch (e) { console.error(e); toast.error("No se pudieron cargar los resultados."); } finally { setLoadingSaved(false); }
  }, [user?.uid]);

  useEffect(() => { loadSavedResults(); }, [loadSavedResults]);

  const calculateAndSetWinners = useCallback(async (result: SavedResult | null) => {
    if (!user || !result) { setWinners([]); return; }
    const selectedDraw = draws.find(d => d.id === result.drawId);
    if (!selectedDraw) return;
    setIsCalculating(true);
    setWinners([]);
    try {
        const cif = selectedDraw.cif;
        const salesRef = collection(db, "users", user.uid, "sales");
        const { start, end } = getDayRange(result.date);
        let qSnapshot;
        try {
            const q = query(salesRef, where("drawId", "==", result.drawId), where("schedules", "array-contains", result.schedule), where("timestamp", ">=", start), where("timestamp", "<", end));
            qSnapshot = await getDocs(q);
        } catch (err) {
            console.warn("Fallback: ", err);
            const fallbackSnap = await getDocs(query(salesRef, where("drawId", "==", result.drawId)));
            qSnapshot = { docs: fallbackSnap.docs.filter(doc => {
                const data = doc.data() as Sale;
                const saleDate = toDateSafe(data.timestamp);
                return saleDate && saleDate >= start && saleDate <= end && data.schedules.includes(result.schedule);
            })};
        }
        const winnersMap = new Map<string, Winner>();
        const { first, second, third } = result;
        qSnapshot.docs.forEach(doc => {
            const sale = doc.data() as Sale;
            const hits: WinnerHit[] = [];
            (sale.numbers || []).forEach(n => {
                const num = padToCif(n.number, cif);
                if ((Number(n.quantity) || 0) <= 0) return;
                if (num === first) hits.push({ position: "1ero", number: num, rate: 11, quantity: n.quantity, amount: n.quantity * 11 });
                if (num === second) hits.push({ position: "2do", number: num, rate: 3, quantity: n.quantity, amount: n.quantity * 3 });
                if (num === third) hits.push({ position: "3ro", number: num, rate: 2, quantity: n.quantity, amount: n.quantity * 2 });
            });
            if (hits.length > 0) {
                const totalWin = hits.reduce((acc, h) => acc + h.amount, 0);
                const existing = winnersMap.get(sale.ticketId);
                if (existing) { existing.hits.push(...hits); existing.totalWin += totalWin; } 
                else { winnersMap.set(sale.ticketId, { ticketId: sale.ticketId, clientName: sale.clientName, clientPhone: sale.clientPhone, hits, totalWin }); }
            }
        });
        setWinners(Array.from(winnersMap.values()));
        await loadPaidStatuses(result);
    } catch (e) { console.error(e); toast.error("Error al calcular ganadores."); } finally { setIsCalculating(false); }
  }, [user, draws]);

  const loadPaidStatuses = async (result: SavedResult) => {
        if (!user) return;
        const payoutRef = collection(db, "users", user.uid, "payoutStatus");
        try {
            const q = query(payoutRef, where("drawId", "==", result.drawId), where("date", "==", result.date), where("schedule", "==", result.schedule));
            const snap = await getDocs(q);
            const newPaidMap = {};
            snap.forEach(doc => { newPaidMap[doc.id] = doc.data().paid; });
            setPaidMap(newPaidMap);
        } catch (e) { console.warn("Error loading paid statuses: ", e); }
    };

  const markAsPaid = async (winner: Winner, result: SavedResult) => {
        if (!user) return;
        const payoutDocId = buildPayoutDocId(result.drawId, result.date, result.schedule, winner.ticketId);
        setIsPayLoading(winner.ticketId);
        try {
            const payoutRef = doc(db, "users", user.uid, "payoutStatus", payoutDocId);
            await setDoc(payoutRef, { ...result, ticketId: winner.ticketId, paid: true, paidAt: serverTimestamp(), totalWin: winner.totalWin }, { merge: true });
            setPaidMap(prev => ({ ...prev, [payoutDocId]: true }));
            toast.success(`Ticket ${winner.ticketId} pagado.`);
        } catch (e) { toast.error("Error al marcar pago."); } finally { setIsPayLoading(null); }
    };

  const handleSelectSavedResult = (result: SavedResult) => { setSelectedResult(result); calculateAndSetWinners(result); };
  const handleResultSaved = (newResult: SavedResult) => { setSavedResults(prev => [newResult, ...prev]); handleSelectSavedResult(newResult); };
  const handleOpenEditModal = (result: SavedResult) => { setEditingResult(result); setIsEditModalOpen(true); };

  const handleResultUpdated = (updatedResult: SavedResult) => {
    setSavedResults(prev => prev.map(r => r.id === updatedResult.id ? updatedResult : r));
    if (selectedResult?.id === updatedResult.id) {
        const newSelected = { ...selectedResult, ...updatedResult };
        setSelectedResult(newSelected);
        calculateAndSetWinners(newSelected);
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!user || !confirm("¿Seguro que quieres borrar este resultado?")) return;
    setDeletingId(resultId);
    try {
        await deleteDoc(doc(db, "users", user.uid, "results", resultId));
        toast.success("Resultado eliminado.");
        setSavedResults(prev => prev.filter(r => r.id !== resultId));
        if (selectedResult?.id === resultId) {
            setSelectedResult(null);
            setWinners([]);
        }
    } catch (e) { console.error(e); toast.error("Error al eliminar."); } finally { setDeletingId(null); }
  };

  const handleDeleteAllResults = () => {
    if (!user) return;
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteAllResultsForUser(user.uid);
        setSavedResults([]); setSelectedResult(null); setWinners([]);
        toast.success("Todos los resultados han sido eliminados.");
        setIsDialogAllOpen(false);
      } catch (e) { console.error(e); setDeleteError("No se pudieron eliminar los resultados."); }
    });
  };

  return (
    <div className="container mx-auto p-4 bg-gray-900 text-white">
      <Toaster position="bottom-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <CreateResultForm user={user} draws={draws} onResultSaved={handleResultSaved} />
      
      <div className="mt-8 border border-white/10 rounded-2xl bg-black/20">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div><h3 className="text-lg font-semibold text-white">Resultados Guardados</h3><p className="text-sm text-white/60">Toca un resultado para calcular ganadores.</p></div>
            <button type="button" onClick={loadSavedResults} className="bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold py-2 px-3 rounded-lg" disabled={loadingSaved}>{loadingSaved ? "CARGANDO..." : "ACTUALIZAR"}</button>
        </div>
        <div className="p-4">
            {loadingSaved ? <p>Cargando resultados...</p> :
            <div className="space-y-2">{savedResults.map(r => (
                <div key={r.id} className={`w-full p-3 rounded-xl border transition-colors flex items-start justify-between gap-3 ${selectedResult?.id === r.id ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    <button type="button" onClick={() => handleSelectSavedResult(r)} className="flex-1 text-left"><div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm text-white/90 font-semibold">{r.date} — {r.schedule}</div>
                        <div className="text-xs text-white/60 font-mono">1ero: {r.first} · 2do: {r.second} · 3ro: {r.third}</div>
                    </div></button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleOpenEditModal(r)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md"><span className="sr-only">Editar</span><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteResult(r.id)} disabled={deletingId === r.id} className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-md"><span className="sr-only">Borrar</span><TrashIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}</div>}
        </div>
      </div>

      <WinnersDisplay winners={winners} totalPayout={totalPayout} isLoading={isCalculating} markAsPaid={markAsPaid} isPayLoading={isPayLoading} paidMap={paidMap} selectedResult={selectedResult} />

      <Card className="mt-8 border-red-500/30 bg-red-500/10">
        <CardHeader><CardTitle className="text-red-400">Zona de Peligro</CardTitle><CardDescription className="text-red-400/80">Esta acción es irreversible.</CardDescription></CardHeader>
        <CardContent>
            <Dialog open={isDialogAllOpen} onOpenChange={setIsDialogAllOpen}>
                <DialogTrigger asChild><Button variant="destructive" className="w-full md:w-auto"><TrashIcon className="w-4 h-4 mr-2"/> Restablecer Resultados</Button></DialogTrigger>
                <DialogContent className="bg-gray-800 border-gray-700 text-white">
                    <DialogHeader><DialogTitle className="text-red-400">¿Estás absolutamente seguro?</DialogTitle><DialogDescription>Se borrarán **todos** los resultados. Para confirmar, escribe **BORRAR**.</DialogDescription></DialogHeader>
                    <div className="py-4 space-y-4">
                        <Input placeholder="Escribe BORRAR" value={confirmationInput} onChange={e => setConfirmationInput(e.target.value)} className="bg-gray-700 border-gray-600 text-white"/>
                        <Button variant="destructive" className="w-full" onClick={handleDeleteAllResults} disabled={confirmationInput !== 'BORRAR' || isDeletingAll}>{isDeletingAll ? 'Borrando...' : 'Entiendo, borrar todo'}</Button>
                        {deleteError && <p className="text-sm text-red-400 text-center">{deleteError}</p>}
                    </div>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>

      <EditResultModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} result={editingResult} user={user} draws={draws} onResultUpdated={handleResultUpdated} />
    </div>
  );
}
