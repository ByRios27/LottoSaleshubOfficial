'use client';
import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { app } from "@/lib/firebase";
import { ArrowRightIcon, AtSymbolIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";

// Componente del Logo con un estilo más prominente y moderno
const AppLogo = () => (
    <div className="flex items-center justify-center p-4 bg-green-500/20 rounded-full w-24 h-24 mb-6 border-2 border-green-500 shadow-lg">
        <svg className="w-12 h-12 text-green-400" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M43,59 C51.836556,59 59,51.836556 59,43 C59,34.163444 51.836556,27 43,27 C34.163444,27 27,34.163444 27,43 C27,51.836556 34.163444,59 43,59 Z M43,51 C47.418278,51 51,47.418278 51,43 C51,38.581722 47.418278,35 43,35 C38.581722,35 35,38.581722 35,43 C35,47.418278 38.581722,51 43,51 Z" />
                <path fillRule="evenodd" clipRule="evenodd" d="M21,59 C29.836556,59 37,51.836556 37,43 C37,34.163444 29.836556,27 21,27 C12.163444,27 5,34.163444 5,43 C5,51.836556 12.163444,59 21,59 Z M21,51 C25.418278,51 29,47.418278 29,43 C29,38.581722 25.418278,35 21,35 C16.581722,35 13,38.581722 13,43 C13,47.418278 16.581722,51 21,51 Z" />
                <path fillRule="evenodd" clipRule="evenodd" d="M32,38 C40.836556,38 48,30.836556 48,22 C48,13.163444 40.836556,6 32,6 C23.163444,6 16,13.163444 16,22 C16,30.836556 23.163444,38 32,38 Z M32,30 C36.418278,30 40,26.418278 40,22 C40,17.581722 36.418278,14 32,14 C27.581722,14 24,17.581722 24,22 C24,26.418278 27.581722,30 32,30 Z" />
            </g>
        </svg>
    </div>
);

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            const auth = getAuth(app);
            await signInWithEmailAndPassword(auth, email, pass);
            router.push("/");
        } catch (e: any) {
            setErr("Acceso denegado. Verifica tus credenciales.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white overflow-hidden">
            {/* Textura de ruido de fondo */}
            <div className="absolute inset-0 bg-repeat bg-center" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
            
            <div className="relative z-10 w-full max-w-md px-6 sm:px-8">
                <div className="flex flex-col items-center mb-8">
                    <AppLogo />
                    <h1 className="text-4xl font-bold text-white tracking-tight">LottoSalesHub</h1>
                    <p className="text-lg text-gray-400 mt-2">Inicia sesión para gestionar tus ventas</p>
                </div>

                <form
                    onSubmit={onSubmit}
                    className="space-y-6 bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm"
                >
                    {/* Campo de Correo Electrónico con Flexbox */}
                    <div className="flex items-center w-full bg-white/5 border border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-green-500/50 transition-all duration-300">
                        <AtSymbolIcon className="h-5 w-5 text-gray-400 ml-4 mr-4 flex-shrink-0" />
                        <input
                            type="email"
                            autoComplete="email"
                            placeholder="Correo Electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-transparent py-3 pr-4 text-white outline-none placeholder-gray-500"
                            required
                        />
                    </div>

                    {/* Campo de Contraseña con Flexbox */}
                    <div className="relative flex items-center w-full bg-white/5 border border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-green-500/50 transition-all duration-300">
                        <LockClosedIcon className="h-5 w-5 text-gray-400 ml-4 mr-4 flex-shrink-0" />
                        <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="Contraseña"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            className="w-full bg-transparent py-3 pr-16 text-white outline-none placeholder-gray-500"
                            required
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-white cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                                <EyeIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    {err && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg">{err}</p>}

                    {/* Botón de Envío */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full group relative flex items-center justify-center rounded-xl px-4 py-3 bg-green-600 text-white font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 disabled:bg-gray-500 transition-all duration-300 transform hover:scale-105"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <span>Entrar</span>
                                <ArrowRightIcon className="w-5 h-5 ml-2 transform transition-transform duration-300 group-hover:translate-x-1" />
                            </>
                        )}
                    </button>

                    <p className="text-xs text-center text-gray-500 pt-4">
                        Acceso exclusivo para personal autorizado.
                    </p>
                </form>
            </div>
        </main>
    );
}
