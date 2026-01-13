import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Este componente se mostrará automáticamente gracias a Suspense en page.tsx
// mientras los datos de los sorteos se cargan en el servidor.
export default function ResultsLoading() {
  return (
    <div className="container mx-auto p-4 bg-gray-900 text-white">
      {/* Skeleton para el formulario de creación */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader><CardTitle><Skeleton className="h-7 w-64 bg-gray-700" /></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full bg-gray-700" />
            <Skeleton className="h-10 w-full bg-gray-700" />
            <Skeleton className="h-10 w-full bg-gray-700" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full bg-gray-700" />
            <Skeleton className="h-10 w-full bg-gray-700" />
            <Skeleton className="h-10 w-full bg-gray-700" />
          </div>
          <Skeleton className="h-10 w-full bg-gray-700" />
        </CardContent>
      </Card>

      {/* Skeleton para la lista de resultados guardados */}
      <div className="mt-8 border border-white/10 rounded-2xl bg-black/20">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
                <Skeleton className="h-6 w-48 mb-2 bg-gray-700" />
                <Skeleton className="h-4 w-72 bg-gray-700" />
            </div>
            <Skeleton className="h-9 w-28 bg-gray-700" />
        </div>
        <div className="p-4 space-y-2">
            <Skeleton className="h-16 w-full bg-gray-700/50" />
            <Skeleton className="h-16 w-full bg-gray-700/50" />
            <Skeleton className="h-16 w-full bg-gray-700/50" />
        </div>
      </div>
    </div>
  );
}
