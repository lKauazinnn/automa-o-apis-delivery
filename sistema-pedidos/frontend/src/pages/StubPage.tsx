import { Construction } from 'lucide-react'

export function StubPage({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-bold text-zinc-100">{titulo}</h1>
      {descricao && <p className="text-sm text-zinc-500">{descricao}</p>}
      <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-16 text-center">
        <Construction size={28} className="text-zinc-600" />
        <p className="text-sm text-zinc-500">Este módulo entra em uma fase posterior do build.</p>
      </div>
    </div>
  )
}
