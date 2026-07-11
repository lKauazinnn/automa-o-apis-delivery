"""API local que serve de ponte entre a interface React e a Merchant/Catalog API do iFood.
Existe pra manter o clientSecret longe do navegador e validar os dados antes de gravar de verdade."""
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS

from ifood_automacao.client import (
    create_category,
    list_catalogs,
    list_categories,
    update_item_status,
    upsert_item,
)

app = Flask(__name__)
CORS(app)

MERCHANT_ID = os.environ["IFOOD_MERCHANT_ID"]

CAMPOS_OBRIGATORIOS = ["nome", "categoria", "codigo_pdv", "preco"]


def _catalog_id():
    return list_catalogs(MERCHANT_ID)[0]["catalogId"]


def _categoria_id(nome_categoria, categorias_existentes, catalog_id):
    for cat in categorias_existentes:
        if cat["name"].strip().lower() == nome_categoria.strip().lower():
            return cat["id"]
    nova = create_category(MERCHANT_ID, catalog_id, name=nome_categoria.strip())
    return nova.get("categoryId") or nova["id"]


@app.get("/api/catalogo")
def get_catalogo():
    catalog_id = _catalog_id()
    categorias = list_categories(MERCHANT_ID, catalog_id, include_items=True)
    itens = []
    for cat in categorias:
        for item in cat.get("items", []):
            itens.append(
                {
                    "itemId": item["id"],
                    "categoria": cat["name"],
                    "categoryId": cat["id"],
                    "nome": item.get("name"),
                    "codigo_pdv": item.get("externalCode"),
                    "preco": item.get("price", {}).get("value"),
                    "status": item.get("status"),
                }
            )
    nomes_categorias = sorted({c["name"] for c in categorias})
    return jsonify({"itens": itens, "categorias": nomes_categorias})


@app.post("/api/itens")
def criar_item():
    dados = request.get_json(silent=True) or {}

    faltando = [c for c in CAMPOS_OBRIGATORIOS if not str(dados.get(c, "")).strip()]
    if faltando:
        return jsonify({"erro": "Campos obrigatórios não preenchidos", "campos": faltando}), 400

    try:
        preco = float(str(dados["preco"]).replace(",", "."))
    except ValueError:
        return jsonify({"erro": "Preço inválido"}), 400
    if preco <= 0:
        return jsonify({"erro": "Preço deve ser maior que zero"}), 400

    catalog_id = _catalog_id()
    categorias_existentes = list_categories(MERCHANT_ID, catalog_id)
    category_id = _categoria_id(dados["categoria"], categorias_existentes, catalog_id)

    resultado = upsert_item(
        merchant_id=MERCHANT_ID,
        item_id=str(uuid.uuid4()),
        product_id=str(uuid.uuid4()),
        category_id=category_id,
        name=dados["nome"].strip(),
        price=preco,
        external_code=str(dados["codigo_pdv"]).strip(),
        available=True,
    )
    return jsonify(resultado), 201


@app.patch("/api/itens/<item_id>/status")
def alterar_status(item_id):
    dados = request.get_json(silent=True) or {}
    status = dados.get("status")
    if status not in ("AVAILABLE", "UNAVAILABLE"):
        return jsonify({"erro": "status deve ser AVAILABLE ou UNAVAILABLE"}), 400

    update_item_status(MERCHANT_ID, item_id, status)
    return jsonify({"itemId": item_id, "status": status})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
