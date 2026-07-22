# -*- coding: utf-8 -*-
"""
Hook do Claude Code (PostToolUse em Edit|Write|MultiEdit).

Lê o JSON do evento no stdin, e SE a edição foi num arquivo de código real
(.py/.jsx/.js/.ts/.html) fora das pastas geradas, atualiza o grafo e regenera
o vault do Obsidian. Assim o "cérebro" acompanha o código em tempo real.

É defensivo: qualquer erro sai com código 0 pra nunca travar a edição do usuário.
"""
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
EXT_CODIGO = {".py", ".jsx", ".js", ".ts", ".tsx", ".html", ".py2", ".mjs", ".cjs"}
# não regenera quando a edição foi na própria saída (evita trabalho à toa)
IGNORAR = ("cerebro-sistema", "graphify-out", ".claude", "node_modules", ".venv")


def main():
    # Pausa manual: se existe .cerebro-pause na raiz, não faz nada. Útil durante builds
    # grandes (dezenas de arquivos) pra não rodar graphify a cada save. Regenere no fim.
    if (RAIZ / ".cerebro-pause").exists():
        return 0

    try:
        evento = json.load(sys.stdin)
    except Exception:
        return 0

    caminho = (evento.get("tool_input") or {}).get("file_path", "")
    if not caminho:
        return 0

    p = Path(caminho)
    if p.suffix.lower() not in EXT_CODIGO:
        return 0
    partes = set(p.parts)
    if partes & set(IGNORAR):
        return 0

    try:
        # 1) atualiza o grafo (AST-only, sem custo de API)
        subprocess.run(
            ["graphify", "update", "."],
            cwd=str(RAIZ), capture_output=True, timeout=120, shell=(sys.platform == "win32"),
        )
        # 2) regenera o vault do Obsidian a partir do grafo
        subprocess.run(
            [sys.executable, str(RAIZ / "scripts" / "gerar_cerebro.py")],
            cwd=str(RAIZ), capture_output=True, timeout=60,
        )
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
