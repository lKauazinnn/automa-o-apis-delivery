"""API local que serve de ponte entre a interface React e a Merchant/Catalog API do iFood.
Existe pra manter o clientSecret longe do navegador, validar os dados antes de gravar de
verdade, tentar de novo automaticamente quando o iFood devolve rate limit/erro transiente,
e registrar em log/auditoria tudo que é alterado no catálogo real."""
import logging
import os
import secrets
import string
import sys
import time
from functools import wraps
from logging.handlers import RotatingFileHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

import requests  # noqa: E402
import uuid  # noqa: E402
from flask import Flask, g, jsonify, request  # noqa: E402
from flask_cors import CORS  # noqa: E402
from werkzeug.exceptions import HTTPException  # noqa: E402

from ifood_automacao.client import (  # noqa: E402
    create_category,
    list_catalogs,
    list_categories,
    patch_item_external_code,
    update_item_price,
    update_item_status,
    upsert_item,
)
from ifood_automacao.rate_limit import com_retry  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
LOG_PATH = DATA_DIR / "app.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        RotatingFileHandler(LOG_PATH, maxBytes=2_000_000, backupCount=3, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("ifood_app")

app = Flask(__name__)
# VIEWER_ORIGIN aceita uma ou mais origens separadas por vírgula (ex: localhost + IP da
# rede local), pra dar pra acessar o painel de outro dispositivo na mesma rede.
VIEWER_ORIGINS = [
    origem.strip() for origem in os.environ.get("VIEWER_ORIGIN", "http://localhost:5173").split(",") if origem.strip()
]
CORS(app, origins=VIEWER_ORIGINS)

MERCHANT_ID_PADRAO = os.environ["IFOOD_MERCHANT_ID"]
PAUSA_ENTRE_CHAMADAS = 0.15  # segundos, para não estourar rate limit em operações em massa

CAMPOS_OBRIGATORIOS = ["nome", "categoria", "codigo_pdv", "preco"]
PAPEIS_QUE_PODEM_CRIAR_ITEM = ("administrador", "gerente")
PAPEIS_VALIDOS = {"administrador", "gerente", "operador"}

# Auditoria e login ficam no Supabase (tabelas criadas por sql/001_* e sql/002_*), via REST
# direto com `requests` — sem depender do pacote supabase-py. Se não estiver configurado,
# a auditoria vira no-op (loga um aviso) e o login fica indisponível, em vez de derrubar o
# resto da API.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_CONFIGURADO = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


class ErroAutenticacao(Exception):
    """Falha de login/permissão — sessão ausente/expirada (401) ou papel sem acesso (403)."""

    def __init__(self, mensagem, status=401):
        super().__init__(mensagem)
        self.status = status


def usuario_atual():
    """Valida a sessão (header Authorization: Bearer <token>, emitido pelo Supabase Auth no
    login do front) direto com o Supabase, e busca o papel real na tabela `perfis`. Não confia
    em nada que o cliente autodeclara: token inválido/expirado vira 401, usuário sem perfil
    cadastrado vira 403."""
    if not SUPABASE_CONFIGURADO:
        raise ErroAutenticacao("Login indisponível: Supabase não configurado no servidor.", 500)

    auth_header = request.headers.get("Authorization", "")
    token = auth_header[len("Bearer ") :].strip() if auth_header.startswith("Bearer ") else ""
    if not token:
        raise ErroAutenticacao("Faça login para continuar.", 401)

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {token}"},
            timeout=10,
        )
    except requests.exceptions.RequestException as exc:
        raise ErroAutenticacao(f"Não consegui validar o login com o Supabase: {exc}", 502) from exc
    if resp.status_code != 200:
        raise ErroAutenticacao("Sessão inválida ou expirada. Faça login de novo.", 401)
    usuario_auth = resp.json()

    try:
        resp_perfil = requests.get(
            f"{SUPABASE_URL}/rest/v1/perfis",
            headers=_supabase_headers(),
            params={"select": "id,email,nome,papel,senha_temporaria", "id": f"eq.{usuario_auth.get('id')}"},
            timeout=10,
        )
        resp_perfil.raise_for_status()
        perfis = resp_perfil.json()
    except requests.exceptions.RequestException as exc:
        raise ErroAutenticacao(f"Não consegui buscar o perfil do usuário: {exc}", 502) from exc

    if not perfis:
        raise ErroAutenticacao("Login válido, mas sem perfil cadastrado. Fale com um administrador.", 403)
    return perfis[0]


def requer_login(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        g.usuario = usuario_atual()
        return func(*args, **kwargs)

    return wrapper


def requer_papel(*papeis_permitidos):
    def decorador(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            g.usuario = usuario_atual()
            if g.usuario["papel"] not in papeis_permitidos:
                raise ErroAutenticacao("Você não tem permissão pra fazer isso.", 403)
            return func(*args, **kwargs)

        return wrapper

    return decorador


def _merchant_id() -> str:
    """Loja alvo da requisição: vem de ?loja=<id> na query string, ou a padrão do .env."""
    return request.args.get("loja") or MERCHANT_ID_PADRAO


def _catalog_id(merchant_id):
    catalogos = com_retry(list_catalogs, merchant_id)
    if not catalogos:
        raise ValueError(f"A loja {merchant_id} não tem nenhum catálogo configurado no iFood.")
    return catalogos[0]["catalogId"]


def _categoria_id(nome_categoria, categorias_existentes, merchant_id, catalog_id):
    for cat in categorias_existentes:
        if cat["name"].strip().lower() == nome_categoria.strip().lower():
            return cat["id"]
    nova = com_retry(create_category, merchant_id, catalog_id, name=nome_categoria.strip())
    return nova.get("categoryId") or nova["id"]


def registrar_auditoria(operador, acao, item_id="", codigo_pdv="", nome="", detalhe=""):
    """Grava uma linha na tabela `auditoria` do Supabase para toda ação que altera o catálogo
    real. É best-effort: se o Supabase estiver fora do ar ou mal configurado, só loga o erro
    e segue — auditoria não pode derrubar a ação de verdade (pausar/criar/etc) que já aconteceu
    no iFood."""
    operador = operador or "desconhecido"
    logger.info("auditoria: operador=%s acao=%s item_id=%s %s", operador, acao, item_id, detalhe)

    if not SUPABASE_CONFIGURADO:
        logger.warning("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados — auditoria não gravada.")
        return

    try:
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/auditoria",
            headers=_supabase_headers(),
            json={
                "operador": operador,
                "acao": acao,
                "item_id": item_id,
                "codigo_pdv": codigo_pdv,
                "nome": nome,
                "detalhe": detalhe,
            },
            timeout=10,
        )
        resp.raise_for_status()
    except requests.exceptions.RequestException as exc:
        logger.error("Falha ao gravar auditoria no Supabase: %s", exc)


@app.errorhandler(Exception)
def tratar_erro(exc):
    """Converte qualquer falha (login, rede, API do iFood/Supabase, validação) numa resposta
    JSON legível, em vez de deixar subir um 500 cru com stack trace pro navegador."""
    if isinstance(exc, HTTPException):
        return exc

    if isinstance(exc, ErroAutenticacao):
        logger.warning("Falha de autenticação/permissão (%s): %s", exc.status, exc)
        return jsonify({"erro": str(exc)}), exc.status

    if isinstance(exc, requests.exceptions.HTTPError):
        status = exc.response.status_code if exc.response is not None else 502
        detalhe = exc.response.text if exc.response is not None else str(exc)
        logger.error("Erro numa API remota (%s): %s", status, detalhe)
        status_resposta = status if 400 <= status < 500 else 502
        return jsonify({"erro": "A operação foi recusada pelo serviço remoto (iFood ou Supabase).", "detalhe": detalhe}), status_resposta

    if isinstance(exc, requests.exceptions.RequestException):
        logger.error("Falha de rede ao falar com uma API remota: %s", exc)
        return jsonify({"erro": "Não consegui falar com o iFood/Supabase (rede ou timeout)."}), 502

    if isinstance(exc, ValueError):
        logger.warning("Requisição inválida: %s", exc)
        return jsonify({"erro": str(exc)}), 400

    logger.exception("Erro inesperado")
    return jsonify({"erro": "Erro interno inesperado. Veja data/app.log para detalhes."}), 500


@app.get("/api/saude")
def saude():
    return jsonify({"status": "ok"})


@app.get("/api/eu")
@requer_login
def eu():
    """Devolve quem é o usuário logado (id, email, nome, papel) — o front usa isso depois do
    login pra saber o nome/papel de verdade, sem precisar falar direto com a tabela perfis."""
    return jsonify(g.usuario)


@app.get("/api/lojas")
@requer_login
def get_lojas():
    """Lojas cadastradas em `public.lojas` no Supabase (não é mais list_merchants() do iFood
    ao vivo — assim dá pra cadastrar uma loja nova sem depender do que a API do iFood já
    reconhece pras credenciais atuais)."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/lojas",
        headers=_supabase_headers(),
        params={"select": "id,nome,merchant_id", "order": "criado_em.asc"},
        timeout=10,
    )
    resp.raise_for_status()
    return jsonify(resp.json())


@app.post("/api/lojas")
@requer_papel("administrador")
def criar_loja():
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    merchant_id = str(dados.get("merchant_id", "")).strip()
    if not nome or not merchant_id:
        raise ValueError("Informe nome e merchant_id da loja.")

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/lojas",
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        json={"nome": nome, "merchant_id": merchant_id},
        timeout=10,
    )
    resp.raise_for_status()
    registrar_auditoria(g.usuario["nome"], "criar_loja", detalhe=f"{nome} ({merchant_id})")
    return jsonify(resp.json()[0]), 201


@app.delete("/api/lojas/<loja_id>")
@requer_papel("administrador")
def remover_loja(loja_id):
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    resp = requests.delete(
        f"{SUPABASE_URL}/rest/v1/lojas",
        headers=_supabase_headers(),
        params={"id": f"eq.{loja_id}"},
        timeout=10,
    )
    resp.raise_for_status()
    registrar_auditoria(g.usuario["nome"], "remover_loja", item_id=loja_id, nome=nome)
    return jsonify({"ok": True})


@app.get("/api/catalogo")
@requer_login
def get_catalogo():
    merchant_id = _merchant_id()
    catalog_id = _catalog_id(merchant_id)
    categorias = com_retry(list_categories, merchant_id, catalog_id, include_items=True)
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
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def criar_item():
    """Cria um item novo. Só administrador/gerente pode — e agora isso é checado de verdade
    contra o papel cadastrado no Supabase (não é mais autodeclarado pelo front)."""
    dados = request.get_json(silent=True) or {}
    operador = g.usuario["nome"]

    faltando = [c for c in CAMPOS_OBRIGATORIOS if not str(dados.get(c, "")).strip()]
    if faltando:
        return jsonify({"erro": "Campos obrigatórios não preenchidos", "campos": faltando}), 400

    try:
        preco = float(str(dados["preco"]).replace(",", "."))
    except ValueError:
        return jsonify({"erro": "Preço inválido"}), 400
    if preco <= 0:
        return jsonify({"erro": "Preço deve ser maior que zero"}), 400

    merchant_id = _merchant_id()
    catalog_id = _catalog_id(merchant_id)
    categorias_existentes = com_retry(list_categories, merchant_id, catalog_id)
    category_id = _categoria_id(dados["categoria"], categorias_existentes, merchant_id, catalog_id)

    item_id = str(uuid.uuid4())
    nome = dados["nome"].strip()
    codigo_pdv = str(dados["codigo_pdv"]).strip()

    resultado = com_retry(
        upsert_item,
        merchant_id=merchant_id,
        item_id=item_id,
        product_id=str(uuid.uuid4()),
        category_id=category_id,
        name=nome,
        price=preco,
        external_code=codigo_pdv,
        available=True,
    )
    registrar_auditoria(operador, "criar_item", item_id=item_id, codigo_pdv=codigo_pdv, nome=nome, detalhe=f"preço R$ {preco:.2f}")
    return jsonify(resultado), 201


@app.patch("/api/itens/<item_id>/status")
@requer_login
def alterar_status(item_id):
    dados = request.get_json(silent=True) or {}
    status = dados.get("status")
    nome = str(dados.get("nome", "")).strip()
    operador = g.usuario["nome"]
    if status not in ("AVAILABLE", "UNAVAILABLE"):
        raise ValueError("status deve ser AVAILABLE ou UNAVAILABLE")

    merchant_id = _merchant_id()
    com_retry(update_item_status, merchant_id, item_id, status)
    registrar_auditoria(operador, "pausar" if status == "UNAVAILABLE" else "despausar", item_id=item_id, nome=nome)
    return jsonify({"itemId": item_id, "status": status})


@app.patch("/api/itens/<item_id>/preco")
@requer_login
def alterar_preco(item_id):
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    operador = g.usuario["nome"]
    try:
        preco = float(str(dados.get("preco", "")).replace(",", "."))
    except ValueError:
        raise ValueError("Preço inválido")
    if preco <= 0:
        raise ValueError("Preço deve ser maior que zero")

    merchant_id = _merchant_id()
    com_retry(update_item_price, merchant_id, item_id, preco)
    registrar_auditoria(operador, "alterar_preco", item_id=item_id, nome=nome, detalhe=f"novo preço: R$ {preco:.2f}")
    return jsonify({"itemId": item_id, "preco": preco})


@app.patch("/api/itens/<item_id>/codigo-pdv")
@requer_login
def alterar_codigo_pdv(item_id):
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    operador = g.usuario["nome"]
    codigo_pdv = str(dados.get("codigo_pdv", "")).strip()
    if not codigo_pdv:
        raise ValueError("Código PDV não pode ficar vazio")

    merchant_id = _merchant_id()
    com_retry(patch_item_external_code, merchant_id, item_id, codigo_pdv)
    registrar_auditoria(operador, "alterar_codigo_pdv", item_id=item_id, nome=nome, codigo_pdv=codigo_pdv)
    return jsonify({"itemId": item_id, "codigo_pdv": codigo_pdv})


@app.post("/api/itens/pausar-em-massa")
@requer_login
def pausar_em_massa():
    """Pausa ou despausa vários itens de uma vez, item por item (a API do iFood não tem
    endpoint de status em lote), respeitando uma pausa entre chamadas por causa do rate limit.
    Uma falha em um item não interrompe os outros."""
    dados = request.get_json(silent=True) or {}
    alvos = dados.get("alvos") or []
    status = dados.get("status")
    operador = g.usuario["nome"]

    if status not in ("AVAILABLE", "UNAVAILABLE"):
        raise ValueError("status deve ser AVAILABLE ou UNAVAILABLE")
    if not isinstance(alvos, list) or not alvos:
        raise ValueError("Informe ao menos um item em alvos")

    merchant_id = _merchant_id()
    acao = "pausar_em_massa" if status == "UNAVAILABLE" else "despausar_em_massa"
    resultados = []
    for i, alvo in enumerate(alvos):
        item_id = str(alvo.get("item_id", "")).strip()
        nome = str(alvo.get("nome", "")).strip()
        if not item_id:
            continue
        try:
            com_retry(update_item_status, merchant_id, item_id, status)
            registrar_auditoria(operador, acao, item_id=item_id, nome=nome)
            resultados.append({"itemId": item_id, "ok": True})
        except Exception as exc:  # segue processando o resto mesmo se um item falhar
            logger.error("Falha em %s para o item %s: %s", acao, item_id, exc)
            registrar_auditoria(operador, f"{acao}_erro", item_id=item_id, nome=nome, detalhe=str(exc))
            resultados.append({"itemId": item_id, "ok": False, "erro": str(exc)})
        if i < len(alvos) - 1:
            time.sleep(PAUSA_ENTRE_CHAMADAS)

    ok = sum(1 for r in resultados if r["ok"])
    return jsonify({"total": len(resultados), "ok": ok, "erro": len(resultados) - ok, "resultados": resultados})


@app.get("/api/auditoria")
@requer_login
def get_auditoria():
    limite = min(int(request.args.get("limite", 50)), 500)
    if not SUPABASE_CONFIGURADO:
        return jsonify([])

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/auditoria",
            headers=_supabase_headers(),
            params={"select": "*", "order": "criado_em.desc", "limit": limite},
            timeout=10,
        )
        resp.raise_for_status()
    except requests.exceptions.RequestException as exc:
        logger.error("Falha ao consultar auditoria no Supabase: %s", exc)
        return jsonify([])

    linhas = [
        {
            "timestamp": row.get("criado_em"),
            "operador": row.get("operador"),
            "acao": row.get("acao"),
            "item_id": row.get("item_id"),
            "codigo_pdv": row.get("codigo_pdv"),
            "nome": row.get("nome"),
            "detalhe": row.get("detalhe"),
        }
        for row in resp.json()
    ]
    return jsonify(linhas)


@app.get("/api/usuarios")
@requer_papel("administrador")
def listar_usuarios():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/perfis",
        headers=_supabase_headers(),
        params={"select": "id,email,nome,papel,criado_em", "order": "criado_em.asc"},
        timeout=10,
    )
    resp.raise_for_status()
    return jsonify(resp.json())


def _gerar_senha_aleatoria():
    alfabeto = string.ascii_letters + string.digits
    return "".join(secrets.choice(alfabeto) for _ in range(14))


def _marcar_senha_temporaria(usuario_id, valor):
    """Liga/desliga a flag que força troca de senha no próximo login. Chamado com True sempre
    que um administrador define a senha de alguém (criação ou reset); o próprio usuário desliga
    (False) ao trocar a senha dele mesmo, via POST /api/eu/senha-trocada."""
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/perfis",
        headers=_supabase_headers(),
        params={"id": f"eq.{usuario_id}"},
        json={"senha_temporaria": valor},
        timeout=10,
    )
    resp.raise_for_status()


@app.post("/api/usuarios/convidar")
@requer_papel("administrador")
def convidar_usuario():
    """Cria a conta do usuário direto pela Admin API do Supabase, já com senha definida, e
    devolve essa senha pro administrador repassar por fora (WhatsApp, presencial, etc).

    Antes isso mandava um e-mail de convite (Supabase `/auth/v1/invite`) com um link mágico —
    só que esse link depende do e-mail chegar E de ninguém "clicar" nele antes da pessoa
    (scanner de segurança de e-mail corporativo costuma pré-visitar links e queima o token de
    um só uso). Criar a conta com senha já definida não depende de e-mail nenhum — sempre
    funciona, e o administrador já sabe a senha na hora, sem precisar torcer pro e-mail chegar.
    O perfil (nome + papel) é criado sozinho pelo trigger no banco (sql/002_*)."""
    dados = request.get_json(silent=True) or {}
    email = str(dados.get("email", "")).strip().lower()
    nome = str(dados.get("nome", "")).strip()
    papel = str(dados.get("papel", "")).strip().lower()

    if not email or not nome:
        raise ValueError("Informe nome e e-mail.")
    if papel not in PAPEIS_VALIDOS:
        raise ValueError("Papel inválido.")

    senha_nova = _gerar_senha_aleatoria()
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=_supabase_headers(),
        json={
            "email": email,
            "password": senha_nova,
            "email_confirm": True,
            "user_metadata": {"nome": nome, "papel": papel},
        },
        timeout=15,
    )
    resp.raise_for_status()
    novo_id = resp.json().get("id")
    if novo_id:
        _marcar_senha_temporaria(novo_id, True)
    registrar_auditoria(g.usuario["nome"], "convidar_usuario", nome=nome, detalhe=f"{email} como {papel}")
    return jsonify({"email": email, "nome": nome, "senha": senha_nova}), 201


@app.post("/api/usuarios/<usuario_id>/resetar-senha")
@requer_papel("administrador")
def resetar_senha_usuario(usuario_id):
    """Define uma senha nova pra alguém direto pela Admin API do Supabase e devolve ela pro
    administrador repassar por fora (WhatsApp, presencial, etc). Se o corpo do pedido trouxer
    uma `senha` específica, usa ela (validada com pelo menos 6 caracteres); senão gera uma
    aleatória — mesma ideia do `convidar_usuario` acima, mas pra quem já tem conta."""
    dados = request.get_json(silent=True) or {}
    senha_escolhida = str(dados.get("senha", "")).strip()
    nome = str(dados.get("nome", "")).strip()
    if senha_escolhida and len(senha_escolhida) < 6:
        raise ValueError("A senha precisa ter pelo menos 6 caracteres.")
    senha_nova = senha_escolhida or _gerar_senha_aleatoria()

    resp = requests.put(
        f"{SUPABASE_URL}/auth/v1/admin/users/{usuario_id}",
        headers=_supabase_headers(),
        json={"password": senha_nova, "email_confirm": True},
        timeout=15,
    )
    resp.raise_for_status()
    _marcar_senha_temporaria(usuario_id, True)
    registrar_auditoria(g.usuario["nome"], "resetar_senha_usuario", item_id=usuario_id, nome=nome)
    return jsonify({"id": usuario_id, "senha": senha_nova})


@app.post("/api/eu/senha-trocada")
@requer_login
def senha_trocada():
    """Chamado pelo front logo depois que o próprio usuário troca a senha (direto no Supabase,
    com o token dele) — desliga a flag que força a troca no próximo login."""
    _marcar_senha_temporaria(g.usuario["id"], False)
    return jsonify({"ok": True})


@app.patch("/api/usuarios/<usuario_id>/papel")
@requer_papel("administrador")
def alterar_papel_usuario(usuario_id):
    dados = request.get_json(silent=True) or {}
    papel = str(dados.get("papel", "")).strip().lower()
    nome = str(dados.get("nome", "")).strip()
    if papel not in PAPEIS_VALIDOS:
        raise ValueError("Papel inválido.")

    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/perfis",
        headers=_supabase_headers(),
        params={"id": f"eq.{usuario_id}"},
        json={"papel": papel},
        timeout=10,
    )
    resp.raise_for_status()
    registrar_auditoria(
        g.usuario["nome"], "alterar_papel_usuario", item_id=usuario_id, nome=nome, detalhe=f"novo papel: {papel}"
    )
    return jsonify({"id": usuario_id, "papel": papel})


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    logger.info("Servidor iniciando (debug=%s)", debug)
    # host 0.0.0.0: acessível por outros dispositivos na mesma rede local (não só localhost).
    app.run(host="0.0.0.0", port=5000, debug=debug)
