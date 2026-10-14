"""Lista as lojas (merchants) vinculadas às credenciais do .env."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from ifood_automacao.client import list_merchants  # noqa: E402

if __name__ == "__main__":
    merchants = list_merchants()
    print(json.dumps(merchants, indent=2, ensure_ascii=False))
