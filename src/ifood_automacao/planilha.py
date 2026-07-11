"""Leitura da planilha de itens/PDV."""
from pathlib import Path

import pandas as pd

DEFAULT_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "material.xlsx"

COLUNAS = {
    "Status": "status",
    "Rede/Loja": "loja",
    "Descriçāo": "descricao",
    "Código": "codigo_pdv",
    "Grupo": "grupo",
    "Modificado": "modificado",
}


def carregar_itens(path: Path = DEFAULT_PATH) -> pd.DataFrame:
    df = pd.read_excel(path)
    df = df.rename(columns=COLUNAS)
    df["codigo_pdv"] = df["codigo_pdv"].astype(str)
    df["ativo"] = df["status"].str.strip().str.lower() == "ativo"
    return df
