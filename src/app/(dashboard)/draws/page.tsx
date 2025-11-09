'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import Image from "next/legacy/image";
import { useDraws, type Draw } from '@/contexts/DrawsContext';
import { Plus, Edit, Trash2, Image as ImageIcon, X, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';

// --- Componente Modal de Edición ---
interface EditDrawModalProps {
  draw: Draw | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (draw: Draw) => void;
}

function EditDrawModal({ draw, isOpen, onClose, onSave }: EditDrawModalProps) {
    const [name, setName] = useState('');
    const [logo, setLogo] = useState<string | undefined>(undefined);
    const [cifras, setCifras] = useState(2);
    const [costo, setCosto] = useState(0.00);
    const [horarios, setHorarios] = useState<string[]>([]);
    const [newHour, setNewHour] = useState('01');
    const [newMinute, setNewMinute] = useState('00');
    const [newPeriod, setNewPeriod] = useState('PM');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const storage = getStorage(app);
    const { user } = useAuth(); // Obtener el usuario para la ruta

    useEffect(() => {
        if (draw) {
            setName(draw.name);
            setLogo(draw.logo);
            setCifras(draw.cif);
            setCosto(draw.cost);
            setHorarios(draw.sch);
        }
    }, [draw]);

    if (!isOpen || !draw) return null;

    const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.uid) return;
        setIsUploading(true);
        try {
            // CORREGIDO: Usar la ruta 'logos/' que coincide con las reglas de Storage
            const storageRef = ref(storage, `logos/${user.uid}/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            setLogo(downloadURL);
        } catch (error) {
            console.error("Error uploading logo:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddHorario = () => {
      if (horarios.length < 5) {
        const timeString = `${newHour}:${newMinute} ${newPeriod}`;
        if (!horarios.includes(timeString)) {
          setHorarios([...horarios, timeString].sort((a, b) => a.localeCompare(b)));
        }
      }
    };
  
    const handleRemoveHorario = (horarioToRemove: string) => {
      setHorarios(horarios.filter((h) => h !== horarioToRemove));
    };

    const handleSave = () => {
        if (draw) {
            onSave({ ...draw, name, logo, cif: cifras, cost: costo, sch: horarios });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-100/90 border border-black/10 rounded-2xl shadow-lg w-full max-w-2xl max-h-full overflow-y-auto text-gray-900">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Editar Sorteo</h2>
                        <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800"><X className="w-8 h-8" /></button>
                    </div>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-32 h-32 rounded-full bg-black/5 border-2 border-dashed border-black/20 flex items-center justify-center overflow-hidden">
                                {isUploading ? (
                                    <Loader2 className="w-12 h-12 text-black/40 animate-spin" />
                                ) : logo ? (
                                    // CORREGIDO: Usar props de `next/image` modernas
                                    (<Image src={logo} alt="Logo del sorteo" fill style={{ objectFit: 'cover' }} />)
                                ) : (
                                    <ImageIcon className="w-16 h-16 text-black/40"/>
                                )}
                            </div>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoChange} className="hidden" disabled={isUploading} />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-sm text-green-600 hover:text-green-500 font-semibold disabled:opacity-50">
                                {isUploading ? 'Subiendo...' : 'Cambiar Logo'}
                            </button>
                        </div>
                        <div className="flex flex-col"><label htmlFor="edit-draw-name" className="mb-2 font-semibold text-gray-700">Nombre</label><input id="edit-draw-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="bg-white border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                        <div className="flex flex-col"><label className="mb-2 font-semibold text-gray-700">Horarios</label><div className="flex items-center gap-2"><select value={newHour} onChange={e => setNewHour(e.target.value)} className="bg-white border border-gray-300 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 w-auto">{Array.from({length: 12}, (_, i) => i + 1).map(h => <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>)}</select><span className="font-bold">:</span><select value={newMinute} onChange={e => setNewMinute(e.target.value)} className="bg-white border border-gray-300 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 w-auto">{Array.from({length: 12}, (_, i) => i * 5).map(m => <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>)}</select><select value={newPeriod} onChange={e => setNewPeriod(e.target.value)} className="bg-white border border-gray-300 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 w-auto"><option value="AM">AM</option><option value="PM">PM</option></select><button type="button" onClick={handleAddHorario} disabled={horarios.length >= 5} className="flex items-center justify-center p-3 bg-gray-200 hover:bg-gray-300 transition-colors rounded-lg font-semibold disabled:opacity-50 ml-auto"><Plus className="w-6 h-6"/></button></div><div className="flex flex-wrap gap-2 mt-3">{horarios.map(h => (<div key={h} className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"><span>{h}</span><button type="button" onClick={() => handleRemoveHorario(h)}><XCircle className="w-5 h-5 text-red-500 hover:text-red-700"/></button></div>))}</div></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="flex flex-col"><label htmlFor="edit-draw-cifras" className="mb-2 font-semibold text-gray-700">Nº de Cifras</label><select id="edit-draw-cifras" value={cifras} onChange={e => setCifras(Number(e.target.value))} className="bg-white border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select></div><div className="flex flex-col"><label htmlFor="edit-draw-costo" className="mb-2 font-semibold text-gray-700">Costo ($)</label><input id="edit-draw-costo" type="number" value={costo} onChange={(e) => setCosto(parseFloat(e.target.value) || 0)} step="0.01" min="0" className="bg-white border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" /></div></div>
                        <div className="flex gap-4 mt-4"><button onClick={onClose} type="button" className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold">Cancelar</button><button onClick={handleSave} type="button" className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold">Guardar Cambios</button></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Componente Principal de la Página ---
export default function DrawsPage() {
  const { user } = useAuth();
  const { draws, addDraw, updateDraw, deleteDraw, isLoading } = useDraws();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDraw, setEditingDraw] = useState<Draw | null>(null);
  
  const [newDrawName, setNewDrawName] = useState('');
  const [newDrawLogo, setNewDrawLogo] = useState<string | undefined>(undefined);
  const [newDrawCifras, setNewDrawCifras] = useState(2);
  const [newDrawCosto, setNewDrawCosto] = useState(0.00);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [newHour, setNewHour] = useState('01');
  const [newMinute, setNewMinute] = useState('00');
  const [newPeriod, setNewPeriod] = useState('PM');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = getStorage(app);

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;
    setIsUploading(true);
    try {
        // CORREGIDO: Usar la ruta 'logos/' que coincide con las reglas de Storage
        const storageRef = ref(storage, `logos/${user.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        setNewDrawLogo(downloadURL);
    } catch (error) {
        console.error("Error uploading new draw logo:", error);
    } finally {
        setIsUploading(false);
    }
  };

  const handleAddHorario = () => {
    if (horarios.length < 5) {
      const timeString = `${newHour}:${newMinute} ${newPeriod}`;
      if (!horarios.includes(timeString)) {
        setHorarios([...horarios, timeString].sort((a, b) => a.localeCompare(b)));
      }
    }
  };

  const handleRemoveHorario = (horarioToRemove: string) => {
    setHorarios(horarios.filter((h) => h !== horarioToRemove));
  };

  const handleAddDrawSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newDrawName.trim() === '' || horarios.length === 0) {
        alert("El nombre y al menos un horario son obligatorios.");
        return;
    }
    await addDraw({ name: newDrawName, logo: newDrawLogo, cif: newDrawCifras, cost: newDrawCosto, sch: horarios });
    setNewDrawName('');
    setNewDrawLogo(undefined);
    setNewDrawCifras(2);
    setNewDrawCosto(0.00);
    setHorarios([]);
  };

  const handleOpenEditModal = (draw: Draw) => {
    setEditingDraw(draw);
    setIsEditModalOpen(true);
  };

  const handleSaveDraw = async (updatedDraw: Draw) => {
    await updateDraw(updatedDraw);
    setIsEditModalOpen(false);
    setEditingDraw(null);
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="w-16 h-16 text-white animate-spin" />
        </div>
    );
  }

  return (
      <>
          <div className="min-h-screen text-white p-4 sm:p-6 md:p-8">
              <div className="max-w-4xl mx-auto">
                  <h1 className="text-3xl font-bold mb-8 text-center">Gestión de Sorteos</h1>

                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20 mb-10">
                    <form onSubmit={handleAddDrawSubmit} className="flex flex-col gap-6">
                        <h2 className="text-2xl font-bold text-center text-white mb-2">Añadir Nuevo Sorteo</h2>
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-32 h-32 rounded-full bg-white/10 border-2 border-dashed border-white/40 flex items-center justify-center overflow-hidden">
                               {isUploading ? (
                                   <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
                               ) : newDrawLogo ? (
                                    // CORREGIDO: Usar props de `next/image` modernas
                                    (<Image src={newDrawLogo} alt="Logo del nuevo sorteo" fill style={{ objectFit: 'cover' }} />)
                                ) : (
                                    <ImageIcon className="w-16 h-16 text-white/50"/>
                                )}
                            </div>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoChange} className="hidden" disabled={isUploading}/>
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-sm text-green-400 hover:text-green-300 font-semibold disabled:opacity-50">
                                {isUploading ? 'Subiendo...' : 'Subir Logo'}
                            </button>
                        </div>
                        <div className="flex flex-col"><label htmlFor="draw-name" className="mb-2 font-semibold text-white/80">Nombre del Sorteo</label><input id="draw-name" type="text" value={newDrawName} onChange={(e) => setNewDrawName(e.target.value)} placeholder="Ej: Lotería del Jueves" className="bg-white/20 placeholder-white/60 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                        <div className="flex flex-col"><label className="mb-2 font-semibold text-white/80">Horarios (hasta 5)</label><div className="flex items-center gap-2"><select value={newHour} onChange={e => setNewHour(e.target.value)} className="bg-white/20 text-white px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 w-auto">{Array.from({length: 12}, (_, i) => i + 1).map(h => <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>)}</select><span className="font-bold">:</span><select value={newMinute} onChange={e => setNewMinute(e.target.value)} className="bg-white/20 text-white px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 w-auto">{Array.from({length: 12}, (_, i) => i * 5).map(m => <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>)}</select><select value={newPeriod} onChange={e => setNewPeriod(e.target.value)} className="bg-white/20 text-white px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 w-auto"><option value="AM">AM</option><option value="PM">PM</option></select><button type="button" onClick={handleAddHorario} disabled={horarios.length >= 5} className="flex items-center justify-center p-3 bg-gray-500/50 hover:bg-gray-500/70 transition-colors rounded-lg font-semibold disabled:opacity-50 ml-auto"><Plus className="w-6 h-6"/></button></div><div className="flex flex-wrap gap-2 mt-3">{horarios.map(h => (<div key={h} className="flex items-center gap-2 bg-green-500/30 text-green-200 px-3 py-1 rounded-full text-sm"><span>{h}</span><button type="button" onClick={() => handleRemoveHorario(h)}><XCircle className="w-5 h-5 text-red-400 hover:text-red-300"/></button></div>))}</div></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="flex flex-col"><label htmlFor="draw-cifras" className="mb-2 font-semibold text-white/80">Nº de Cifras</label><select id="draw-cifras" value={newDrawCifras} onChange={e => setNewDrawCifras(Number(e.target.value))} className="bg-white/20 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select></div><div className="flex flex-col"><label htmlFor="draw-costo" className="mb-2 font-semibold text-white/80">Costo p/Fracción ($)</label><input id="draw-costo" type="number" value={newDrawCosto} onChange={(e) => setNewDrawCosto(parseFloat(e.target.value) || 0)} step="0.01" min="0" className="bg-white/20 placeholder-white/60 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" /></div></div>
                        <button type="submit" className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 transition-colors px-6 py-4 rounded-lg font-semibold text-lg mt-4"><Plus className="w-6 h-6" /><span>Crear Sorteo</span></button>
                    </form>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
                    <h2 className="text-2xl font-semibold mb-6">Sorteos Activos</h2>
                    <div className="space-y-4">
                        {draws.map((draw) => (
                        <div key={draw.id} className="flex items-center justify-between bg-white/10 p-4 rounded-lg hover:bg-white/20 transition-colors duration-200 gap-4">
                            <div className="flex items-center gap-4 flex-grow">
                                <div className="relative w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {draw.logo ? (
                                        // CORREGIDO: Usar props de `next/image` modernas
                                        (<Image src={draw.logo} alt={draw.name} fill style={{ objectFit: 'cover' }} />)
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-white/50"/>
                                    )}
                                </div>
                                <div className="flex-grow"><span className="font-medium text-lg">{draw.name}</span><div className="flex flex-wrap gap-x-3 text-xs text-white/70"><span>{draw.cif} Cifras</span><span>&bull;</span><span>${draw.cost.toFixed(2)} p/Fracción</span><span>&bull;</span><span className="truncate">{draw.sch.join(', ')}</span></div></div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => handleOpenEditModal(draw)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors"><Edit className="w-6 h-6" /></button>
                                <button onClick={() => deleteDraw(draw.id)} className="p-2 text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-6 h-6" /></button>
                            </div>
                        </div>
                        ))}
                    </div>
                  </div>
              </div>
          </div>
          <EditDrawModal 
              isOpen={isEditModalOpen} 
              onClose={() => setIsEditModalOpen(false)} 
              onSave={handleSaveDraw} 
              draw={editingDraw} 
          />
      </>
  );
}
