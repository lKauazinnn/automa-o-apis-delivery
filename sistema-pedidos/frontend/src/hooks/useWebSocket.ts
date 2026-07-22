import { useEffect, useRef, useState } from 'react'

/** Conecta ao WebSocket e chama onMessage a cada push. Reconecta sozinho se cair. */
export function useWebSocket(url: string, onMessage: (data: unknown) => void) {
  const cb = useRef(onMessage)
  cb.current = onMessage
  const [conectado, setConectado] = useState(false)

  useEffect(() => {
    let ws: WebSocket | null = null
    let vivo = true
    let retry: ReturnType<typeof setTimeout>

    function conectar() {
      ws = new WebSocket(url)
      ws.onopen = () => setConectado(true)
      ws.onmessage = (e) => {
        try {
          cb.current(JSON.parse(e.data))
        } catch {
          /* ignora mensagens não-JSON */
        }
      }
      ws.onclose = () => {
        setConectado(false)
        if (vivo) retry = setTimeout(conectar, 2000)
      }
      ws.onerror = () => ws?.close()
    }
    conectar()

    return () => {
      vivo = false
      clearTimeout(retry)
      ws?.close()
    }
  }, [url])

  return { conectado }
}
