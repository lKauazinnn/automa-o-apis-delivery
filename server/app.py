"""API local que serve de ponte entre a interface React e a Merchant/Catalog API do iFood.
Existe pra manter o clientSecret longe do navegador, validar os dados antes de gravar de
verdade, tentar de novo automaticamente quando o iFood devolve rate limit/erro transiente,
e registrar em log/auditoria tudo que é alterado no catálogo real."""
import json
import logging
import os
import random
import random
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
from datetime import datetime, timezone  # noqa: E402

from flask import Flask, g, jsonify, request  # noqa: E402
from flask_cors import CORS  # noqa: E402
from werkzeug.exceptions import HTTPException  # noqa: E402

from ifood_automacao.pedidos import (  # noqa: E402
    CODIGO_EVENTO_LABEL,
    TIPO_IFOOD_PARA_INTERNO,
    acknowledge_events,
    cancel_order,
    confirm_order,
    dispatch_order,
    get_order_details,
    poll_events,
)
from ifood_automacao.client import (  # noqa: E402
    create_category,
    create_combo,
    create_interruption,
    create_option,
    create_option_group,
    delete_category,
    delete_interruption,
    delete_item,
    delete_option,
    delete_option_group,
    edit_category,
    edit_option,
    get_category,
    get_merchant_details,
    get_merchant_status,
    get_opening_hours,
    list_catalogs,
    list_categories,
    list_merchants,
    list_interruptions,
    list_option_groups,
    patch_item_external_code,
    set_opening_hours,
    update_item_price,
    update_item_shifts,
    update_item_status,
    update_option_price,
    update_option_status,
    upload_image,
    upsert_item,
)
from ifood_automacao.rate_limit import com_retry  # noqa: E402

# No Vercel o filesystem da função é efêmero (nada escrito em disco sobrevive entre
# invocações), então lá logamos só em stdout — o próprio Vercel já mostra isso no
# dashboard da função. Local, mantém o arquivo em data/app.log pra inspeção offline.
RODANDO_NO_VERCEL = bool(os.environ.get("VERCEL"))
handlers = [logging.StreamHandler()]
if not RODANDO_NO_VERCEL:
    DATA_DIR = Path(__file__).resolve().parent.parent / "data"
    DATA_DIR.mkdir(exist_ok=True)
    LOG_PATH = DATA_DIR / "app.log"
    handlers.append(RotatingFileHandler(LOG_PATH, maxBytes=2_000_000, backupCount=3, encoding="utf-8"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=handlers,
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


def registrar_auditoria(operador, acao, item_id="", codigo_pdv="", nome="", detalhe="", valor_de="", valor_para=""):
    """Grava uma linha na tabela `auditoria` do Supabase para toda ação que altera o catálogo
    real. É best-effort: se o Supabase estiver fora do ar ou mal configurado, só loga o erro
    e segue — auditoria não pode derrubar a ação de verdade (pausar/criar/etc) que já aconteceu
    no iFood. `valor_de`/`valor_para` alimentam o "antes → depois" da tela de Auditoria (só
    preenchido em alterar_preco/alterar_codigo_pdv, onde o front já sabe o valor anterior)."""
    operador = operador or "desconhecido"
    logger.info("auditoria: operador=%s acao=%s item_id=%s %s", operador, acao, item_id, detalhe)

    if not SUPABASE_CONFIGURADO:
        logger.warning("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados — auditoria não gravada.")
        return

    # Loja atual, pra a auditoria poder ser filtrada por loja no dashboard (best-effort).
    try:
        loja_atual = request.args.get("loja") or MERCHANT_ID_PADRAO
    except Exception:
        loja_atual = MERCHANT_ID_PADRAO

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
                "valor_de": valor_de,
                "valor_para": valor_para,
                "merchant_id": loja_atual,
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
    detalhe_log = "os logs da função no dashboard do Vercel" if RODANDO_NO_VERCEL else "data/app.log"
    return jsonify({"erro": f"Erro interno inesperado. Veja {detalhe_log} para detalhes."}), 500


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
    # select=* pra trazer `plataforma` quando a migration 007 já rodou, sem quebrar antes dela.
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/lojas",
        headers=_supabase_headers(),
        params={"select": "*", "order": "criado_em.asc"},
        timeout=10,
    )
    resp.raise_for_status()
    # Garante o campo plataforma no retorno (default ifood) mesmo antes da migration.
    lojas = [{**loja, "plataforma": loja.get("plataforma") or "ifood"} for loja in resp.json()]
    return jsonify(lojas)


@app.get("/api/lojas-verificacao-ifood")
@requer_login
def verificar_lojas_ifood():
    """Cruza o painel com o GET /merchants do iFood: devolve os merchant_ids que o iFood
    reconhece como vinculados às credenciais atuais. Serve só pra exibir o selo "verificada no
    iFood" — NÃO bloqueia a listagem: se a API do iFood cair/negar, volta disponivel=False e o
    front simplesmente não mostra o selo."""
    try:
        merchants = com_retry(list_merchants)
        ids = {
            str(m.get("id") or m.get("merchantId") or m.get("uuid") or "").strip()
            for m in (merchants or [])
            if isinstance(m, dict)
        }
        return jsonify({"disponivel": True, "merchant_ids": sorted(i for i in ids if i)})
    except Exception as exc:
        logger.warning("Não consegui verificar lojas no iFood (GET /merchants): %s", exc)
        return jsonify({"disponivel": False, "merchant_ids": []})


@app.post("/api/lojas")
@requer_papel("administrador")
def criar_loja():
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    merchant_id = str(dados.get("merchant_id", "")).strip()
    plataforma = (str(dados.get("plataforma", "ifood")).strip().lower() or "ifood")
    if plataforma not in ("ifood", "99food"):
        raise ValueError("plataforma deve ser 'ifood' ou '99food'.")
    if not nome or not merchant_id:
        # merchant_id = merchant UUID (iFood) OU app_shop_id (99Food)
        raise ValueError("Informe o nome e o identificador da loja.")

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/lojas",
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        json={"nome": nome, "merchant_id": merchant_id, "plataforma": plataforma},
        timeout=10,
    )
    resp.raise_for_status()
    registrar_auditoria(g.usuario["nome"], "criar_loja", detalhe=f"{nome} ({merchant_id}) [{plataforma}]")
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


@app.get("/api/loja/detalhes")
@requer_login
def get_loja_detalhes():
    """Detalhes completos da loja atual no iFood: razão social, endereço, tipo, status e
    canais de venda configurados."""
    merchant_id = _merchant_id()
    return jsonify(com_retry(get_merchant_details, merchant_id))


@app.get("/api/loja/disponibilidade")
@requer_login
def get_loja_disponibilidade():
    """Se a loja está apta a receber pedido agora (por operação/canal de venda), e se não,
    por quê — vem direto do endpoint de status do iFood."""
    merchant_id = _merchant_id()
    return jsonify(com_retry(get_merchant_status, merchant_id))


@app.post("/api/imagens")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def enviar_imagem():
    """Recebe a imagem em base64 (data URL) do front e devolve o imagePath do iFood, para
    usar ao criar/editar um item ou uma opção de complemento."""
    dados = request.get_json(silent=True) or {}
    imagem = str(dados.get("imagem", "")).strip()
    if not imagem.startswith("data:image/"):
        raise ValueError("Envie a imagem como data URL (ex: data:image/png;base64,....)")

    merchant_id = _merchant_id()
    caminho = com_retry(upload_image, merchant_id, imagem)
    return jsonify({"imagem_path": caminho}), 201


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
                    "productId": item.get("productId"),
                    "categoria": cat["name"],
                    "categoryId": cat["id"],
                    "nome": item.get("name"),
                    "codigo_pdv": item.get("externalCode"),
                    "preco": item.get("price", {}).get("value"),
                    "status": item.get("status"),
                    "foto": item.get("imagePath"),
                }
            )
    nomes_categorias = sorted({c["name"] for c in categorias})
    logger.info(
        "catálogo carregado do iFood: merchant=%s catalog=%s categorias=%d itens=%d",
        merchant_id, catalog_id, len(categorias), len(itens),
    )
    return jsonify({"itens": itens, "categorias": nomes_categorias})


@app.get("/api/horario-funcionamento")
@requer_login
def get_horario_funcionamento():
    merchant_id = _merchant_id()
    return jsonify(com_retry(get_opening_hours, merchant_id))


@app.put("/api/horario-funcionamento")
@requer_papel("administrador", "gerente")
def definir_horario_funcionamento():
    """Substitui a semana inteira de horário de funcionamento da loja de uma vez."""
    dados = request.get_json(silent=True) or {}
    turnos = dados.get("turnos") or []
    dias_validos = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"}

    if not isinstance(turnos, list) or not turnos:
        raise ValueError("Informe ao menos um turno")
    for turno in turnos:
        if turno.get("dayOfWeek") not in dias_validos:
            raise ValueError("dayOfWeek deve ser um dia da semana em inglês maiúsculo (ex: MONDAY)")
        if not turno.get("start"):
            raise ValueError("Cada turno precisa de start (HH:MM:SS)")
        if not isinstance(turno.get("duration"), int) or turno["duration"] <= 0:
            raise ValueError("Cada turno precisa de duration em minutos (inteiro positivo)")

    merchant_id = _merchant_id()
    resultado = com_retry(set_opening_hours, merchant_id, turnos)
    registrar_auditoria(g.usuario["nome"], "definir_horario_funcionamento", detalhe=f"{len(turnos)} turno(s)")
    return jsonify(resultado)


@app.post("/api/interrupcoes")
@requer_papel("administrador", "gerente")
def criar_interrupcao():
    """Fecha a loja temporariamente (ex: sem entregador disponível, cozinha travada)."""
    dados = request.get_json(silent=True) or {}
    descricao = str(dados.get("descricao", "")).strip()
    inicio = str(dados.get("inicio", "")).strip()
    fim = str(dados.get("fim", "")).strip()
    if not descricao or not inicio or not fim:
        raise ValueError("descricao, inicio e fim são obrigatórios (inicio/fim em ISO 8601)")

    merchant_id = _merchant_id()
    resultado = com_retry(create_interruption, merchant_id, descricao, inicio, fim)
    registrar_auditoria(g.usuario["nome"], "criar_interrupcao", detalhe=f"{descricao} ({inicio} - {fim})")
    return jsonify(resultado), 201


@app.delete("/api/interrupcoes/<interrupcao_id>")
@requer_papel("administrador", "gerente")
def excluir_interrupcao(interrupcao_id):
    merchant_id = _merchant_id()
    com_retry(delete_interruption, merchant_id, interrupcao_id)
    registrar_auditoria(g.usuario["nome"], "excluir_interrupcao", item_id=interrupcao_id)
    return jsonify({"ok": True})


@app.get("/api/interrupcoes")
@requer_login
def get_interrupcoes():
    merchant_id = _merchant_id()
    return jsonify(com_retry(list_interruptions, merchant_id))


@app.get("/api/grupos-opcao")
@requer_login
def get_grupos_opcao():
    merchant_id = _merchant_id()
    return jsonify(com_retry(list_option_groups, merchant_id))


@app.post("/api/grupos-opcao")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def criar_grupo_opcao():
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    if not nome:
        raise ValueError("nome é obrigatório")
    merchant_id = _merchant_id()
    resultado = com_retry(create_option_group, merchant_id, nome)
    registrar_auditoria(g.usuario["nome"], "criar_grupo_opcao", item_id=resultado.get("id", ""), nome=nome)
    return jsonify(resultado), 201


@app.delete("/api/grupos-opcao/<grupo_id>")
@requer_papel("administrador")
def excluir_grupo_opcao(grupo_id):
    merchant_id = _merchant_id()
    com_retry(delete_option_group, merchant_id, grupo_id)
    registrar_auditoria(g.usuario["nome"], "excluir_grupo_opcao", item_id=grupo_id)
    return jsonify({"ok": True})


@app.post("/api/grupos-opcao/<grupo_id>/opcoes")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def criar_opcao(grupo_id):
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    if not nome:
        raise ValueError("nome é obrigatório")
    try:
        preco = float(str(dados.get("preco", "0")).replace(",", "."))
    except ValueError:
        return jsonify({"erro": "Preço inválido"}), 400
    codigo_pdv = str(dados.get("codigo_pdv", "")).strip()
    imagem_path = str(dados.get("imagem_path", "")).strip() or None

    merchant_id = _merchant_id()
    resultado = com_retry(create_option, merchant_id, grupo_id, nome, preco, codigo_pdv, image_path=imagem_path)
    registrar_auditoria(g.usuario["nome"], "criar_opcao", item_id=resultado.get("productId", ""), nome=nome, detalhe=f"grupo {grupo_id}")
    return jsonify(resultado), 201


@app.patch("/api/grupos-opcao/<grupo_id>/opcoes/<option_id>/status")
@requer_login
def alterar_status_opcao(grupo_id, option_id):
    """Pausa/despausa uma opção (complemento) sem excluí-la. `option_id` aqui é o `id` da
    opção devolvido por `criar_opcao` — não o `productId` (esse é usado só pra excluir)."""
    dados = request.get_json(silent=True) or {}
    status = dados.get("status")
    nome = str(dados.get("nome", "")).strip()
    if status not in ("AVAILABLE", "UNAVAILABLE"):
        raise ValueError("status deve ser AVAILABLE ou UNAVAILABLE")

    merchant_id = _merchant_id()
    com_retry(update_option_status, merchant_id, option_id, status)
    registrar_auditoria(
        g.usuario["nome"],
        "pausar_opcao" if status == "UNAVAILABLE" else "despausar_opcao",
        item_id=option_id,
        nome=nome,
        detalhe=f"grupo {grupo_id}",
    )
    return jsonify({"optionId": option_id, "status": status})


@app.patch("/api/grupos-opcao/opcoes/<product_id>")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def editar_opcao(product_id):
    """Edita nome, foto e/ou preço de uma opção (complemento) já existente. `product_id` é o
    `productId` devolvido por `criar_opcao` (mesmo id usado pra excluir). Diferente de item,
    aqui são dois endpoints do iFood por baixo (`edit_option` pra nome/foto, `update_option_price`
    pro preço) — chamamos os dois quando os dois campos vêm juntos, igual o front sempre manda."""
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    imagem_path = str(dados.get("imagem_path", "")).strip()
    nome_anterior = str(dados.get("nome_anterior", "")).strip()
    operador = g.usuario["nome"]

    if not nome:
        raise ValueError("nome é obrigatório")
    if not imagem_path:
        raise ValueError("imagem_path é obrigatório — reenvie o path atual da opção se a foto não mudou.")

    merchant_id = _merchant_id()
    resultado = com_retry(edit_option, merchant_id, product_id, nome, imagem_path)

    preco_bruto = dados.get("preco")
    if preco_bruto not in (None, ""):
        try:
            preco = float(str(preco_bruto).replace(",", "."))
        except ValueError:
            raise ValueError("Preço inválido")
        if preco <= 0:
            raise ValueError("Preço deve ser maior que zero")
        com_retry(update_option_price, merchant_id, product_id, preco)
        resultado["preco"] = preco

    registrar_auditoria(
        operador,
        "editar_opcao",
        item_id=product_id,
        nome=nome,
        detalhe=f"antes: {nome_anterior or '—'}",
    )
    return jsonify(resultado)


@app.delete("/api/grupos-opcao/<grupo_id>/opcoes/<option_product_id>")
@requer_papel("administrador")
def excluir_opcao(grupo_id, option_product_id):
    merchant_id = _merchant_id()
    com_retry(delete_option, merchant_id, grupo_id, option_product_id)
    registrar_auditoria(g.usuario["nome"], "excluir_opcao", item_id=option_product_id, detalhe=f"grupo {grupo_id}")
    return jsonify({"ok": True})


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
    imagem_path = str(dados.get("imagem_path", "")).strip() or None

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
        image_path=imagem_path,
    )
    registrar_auditoria(operador, "criar_item", item_id=item_id, codigo_pdv=codigo_pdv, nome=nome, detalhe=f"preço R$ {preco:.2f}")
    return jsonify(resultado), 201


@app.patch("/api/itens/<item_id>")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def editar_item(item_id):
    """Edita nome/preço/código PDV/foto de um item já existente. O PUT do iFood substitui o
    item inteiro (não é um PATCH de verdade), então o front precisa mandar de volta
    product_id/category_id/status que já tem na linha da tabela do catálogo — senão a gente
    recria o item com dados incompletos."""
    dados = request.get_json(silent=True) or {}
    operador = g.usuario["nome"]

    obrigatorios = ["product_id", "category_id", "nome", "preco", "codigo_pdv", "status"]
    faltando = [c for c in obrigatorios if str(dados.get(c, "")).strip() == ""]
    if faltando:
        return jsonify({"erro": "Campos obrigatórios não preenchidos", "campos": faltando}), 400

    try:
        preco = float(str(dados["preco"]).replace(",", "."))
    except ValueError:
        return jsonify({"erro": "Preço inválido"}), 400
    if preco <= 0:
        return jsonify({"erro": "Preço deve ser maior que zero"}), 400
    if dados["status"] not in ("AVAILABLE", "UNAVAILABLE"):
        raise ValueError("status deve ser AVAILABLE ou UNAVAILABLE")

    merchant_id = _merchant_id()
    nome = str(dados["nome"]).strip()
    codigo_pdv = str(dados["codigo_pdv"]).strip()
    imagem_path = str(dados.get("imagem_path", "")).strip() or None

    resultado = com_retry(
        upsert_item,
        merchant_id=merchant_id,
        item_id=item_id,
        product_id=str(dados["product_id"]),
        category_id=str(dados["category_id"]),
        name=nome,
        price=preco,
        external_code=codigo_pdv,
        available=dados["status"] == "AVAILABLE",
        image_path=imagem_path,
    )
    registrar_auditoria(operador, "editar_item", item_id=item_id, codigo_pdv=codigo_pdv, nome=nome, detalhe=f"preço R$ {preco:.2f}")
    return jsonify(resultado)


@app.get("/api/categorias")
@requer_login
def get_categorias():
    merchant_id = _merchant_id()
    catalog_id = _catalog_id(merchant_id)
    categorias = com_retry(list_categories, merchant_id, catalog_id)
    return jsonify(
        [{"id": c["id"], "nome": c["name"], "status": c.get("status"), "sequencia": c.get("sequence", 0)} for c in categorias]
    )


@app.get("/api/categorias/<categoria_id>")
@requer_login
def get_categoria(categoria_id):
    merchant_id = _merchant_id()
    catalog_id = _catalog_id(merchant_id)
    return jsonify(com_retry(get_category, merchant_id, catalog_id, categoria_id))


@app.post("/api/categorias")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def criar_categoria_dedicada():
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    if not nome:
        raise ValueError("nome é obrigatório")

    merchant_id = _merchant_id()
    catalog_id = _catalog_id(merchant_id)
    resultado = com_retry(create_category, merchant_id, catalog_id, name=nome)
    registrar_auditoria(g.usuario["nome"], "criar_categoria", item_id=resultado.get("categoryId") or resultado.get("id", ""), nome=nome)
    return jsonify(resultado), 201


@app.patch("/api/categorias/<categoria_id>")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def editar_categoria(categoria_id):
    """Edita nome/status/sequência de uma categoria (ex: pausar a categoria inteira,
    o que pausa em cascata todos os itens dela no iFood)."""
    dados = request.get_json(silent=True) or {}
    operador = g.usuario["nome"]

    campos = {}
    if "nome" in dados and str(dados["nome"]).strip():
        campos["name"] = str(dados["nome"]).strip()
    if "status" in dados:
        if dados["status"] not in ("AVAILABLE", "PAUSED"):
            raise ValueError("status da categoria deve ser AVAILABLE ou PAUSED")
        campos["status"] = dados["status"]
    if "sequencia" in dados:
        campos["sequence"] = int(dados["sequencia"])
    if not campos:
        raise ValueError("Informe ao menos um campo pra editar (nome, status ou sequencia)")

    merchant_id = _merchant_id()
    catalog_id = _catalog_id(merchant_id)
    resultado = com_retry(edit_category, merchant_id, catalog_id, categoria_id, **campos)
    registrar_auditoria(operador, "editar_categoria", item_id=categoria_id, detalhe=str(campos))
    return jsonify(resultado)


@app.delete("/api/categorias/<categoria_id>")
@requer_papel("administrador")
def excluir_categoria(categoria_id):
    merchant_id = _merchant_id()
    com_retry(delete_category, merchant_id, categoria_id)
    registrar_auditoria(g.usuario["nome"], "excluir_categoria", item_id=categoria_id)
    return jsonify({"ok": True})


@app.post("/api/itens/combo")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def criar_combo():
    """Cria um item do tipo COMBO_V2 compondo grupos de opção que já existem no catálogo
    (descubra os ids em GET /api/grupos-opcao). Formato do payload de combo inferido a
    partir de doc pública do iFood, não confirmado 1:1 contra o Request body oficial —
    testar contra o sandbox antes de confiar em produção."""
    dados = request.get_json(silent=True) or {}
    operador = g.usuario["nome"]

    faltando = [c for c in ("nome", "categoria", "preco", "codigo_pdv", "grupos_opcao") if not dados.get(c)]
    if faltando:
        return jsonify({"erro": "Campos obrigatórios não preenchidos", "campos": faltando}), 400

    grupos = dados["grupos_opcao"]
    if not isinstance(grupos, list) or not grupos:
        raise ValueError("Informe ao menos um grupo em grupos_opcao")
    if sum(1 for grupo in grupos if grupo.get("principal")) != 1:
        raise ValueError("Exatamente um item de grupos_opcao precisa ter principal=true")

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
        create_combo,
        merchant_id=merchant_id,
        item_id=item_id,
        product_id=str(uuid.uuid4()),
        category_id=category_id,
        name=nome,
        price=preco,
        external_code=codigo_pdv,
        grupos_opcao=grupos,
    )
    registrar_auditoria(operador, "criar_combo", item_id=item_id, codigo_pdv=codigo_pdv, nome=nome, detalhe=f"preço R$ {preco:.2f}")
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
    preco_anterior = str(dados.get("preco_anterior", "")).strip()
    operador = g.usuario["nome"]
    try:
        preco = float(str(dados.get("preco", "")).replace(",", "."))
    except ValueError:
        raise ValueError("Preço inválido")
    if preco <= 0:
        raise ValueError("Preço deve ser maior que zero")

    merchant_id = _merchant_id()
    com_retry(update_item_price, merchant_id, item_id, preco)
    registrar_auditoria(
        operador,
        "alterar_preco",
        item_id=item_id,
        nome=nome,
        detalhe=f"novo preço: R$ {preco:.2f}",
        valor_de=preco_anterior,
        valor_para=f"R$ {preco:.2f}".replace(".", ","),
    )
    return jsonify({"itemId": item_id, "preco": preco})


@app.patch("/api/itens/<item_id>/codigo-pdv")
@requer_login
def alterar_codigo_pdv(item_id):
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    codigo_anterior = str(dados.get("codigo_anterior", "")).strip()
    operador = g.usuario["nome"]
    codigo_pdv = str(dados.get("codigo_pdv", "")).strip()
    if not codigo_pdv:
        raise ValueError("Código PDV não pode ficar vazio")

    merchant_id = _merchant_id()
    com_retry(patch_item_external_code, merchant_id, item_id, codigo_pdv)
    registrar_auditoria(
        operador,
        "alterar_codigo_pdv",
        item_id=item_id,
        nome=nome,
        codigo_pdv=codigo_pdv,
        valor_de=codigo_anterior,
        valor_para=codigo_pdv,
    )
    return jsonify({"itemId": item_id, "codigo_pdv": codigo_pdv})


@app.patch("/api/itens/<item_id>/turnos")
@requer_login
def alterar_turnos(item_id):
    """Define em quais dias/horários um item fica disponível (ex: um prato que só vende
    no almoço). Pausado (`status=UNAVAILABLE`) sempre tem prioridade sobre o turno."""
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    turnos = dados.get("turnos") or []
    operador = g.usuario["nome"]

    if not isinstance(turnos, list) or not turnos:
        raise ValueError("Informe ao menos um turno")
    dias = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    for turno in turnos:
        if not turno.get("startTime") or not turno.get("endTime"):
            raise ValueError("Cada turno precisa de startTime e endTime (formato HH:MM)")
        if not any(turno.get(dia) for dia in dias):
            raise ValueError("Cada turno precisa marcar ao menos um dia da semana")

    merchant_id = _merchant_id()
    com_retry(update_item_shifts, merchant_id, item_id, turnos)
    registrar_auditoria(operador, "definir_turnos_item", item_id=item_id, nome=nome, detalhe=f"{len(turnos)} turno(s)")
    return jsonify({"itemId": item_id, "turnos": turnos})


@app.delete("/api/itens/<item_id>")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def excluir_item(item_id):
    dados = request.get_json(silent=True) or {}
    category_id = str(dados.get("categoryId", "")).strip()
    product_id = str(dados.get("productId", "")).strip()
    nome = str(dados.get("nome", "")).strip()
    if not category_id or not product_id:
        raise ValueError("categoryId e productId são obrigatórios pra excluir um item")

    merchant_id = _merchant_id()
    com_retry(delete_item, merchant_id, category_id, product_id)
    registrar_auditoria(g.usuario["nome"], "excluir_item", item_id=item_id, nome=nome)
    return jsonify({"ok": True})


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

    # Filtra por loja (o front manda ?loja=<merchant_id>), pra o dashboard não misturar
    # o histórico de lojas/plataformas diferentes. Sem loja, traz tudo.
    loja = request.args.get("loja")
    params = {"select": "*", "order": "criado_em.desc", "limit": limite}
    if loja:
        params["merchant_id"] = f"eq.{loja}"

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/auditoria",
            headers=_supabase_headers(),
            params=params,
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
            "valor_de": row.get("valor_de"),
            "valor_para": row.get("valor_para"),
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


def _agora_iso():
    return datetime.now(timezone.utc).isoformat()


ACAO_POR_STATUS_PEDIDO = {
    "CONFIRMADO": confirm_order,
    "DESPACHADO": dispatch_order,
}
STATUS_VALIDOS_PEDIDO = ("NOVO", "CONFIRMADO", "DESPACHADO", "CONCLUIDO", "CANCELADO")
STATUS_POR_CODIGO_EVENTO = {
    "CONFIRMED": "CONFIRMADO",
    "DISPATCHED": "DESPACHADO",
    "CONCLUDED": "CONCLUIDO",
    "CANCELLED": "CANCELADO",
}


def _preco_item(item):
    preco = item.get("unitPrice", item.get("price"))
    return preco.get("value") if isinstance(preco, dict) else preco


def _atualizar_status_pedido(pedido_id, ifood_order_id, novo_status, operador):
    """Order/Events API: implementado a partir da doc pública, ainda não disparado contra um
    pedido real do sandbox (mesmo nível de confiança 🟡 documentado em HOMOLOGACAO.md pras
    demais capacidades novas). CONCLUIDO não chama o iFood: pedidos de entrega são concluídos
    pelo próprio iFood (chega um evento CONCLUDED); aqui só refletimos o status local."""
    # Pedidos do 99Food (ifood_order_id "99-...") NÃO falam com a Order API do iFood — o 99
    # tem outro fluxo (webhook). Só o iFood empurra a ação pra API dele.
    eh_99 = str(ifood_order_id or "").startswith("99-")
    if not eh_99:
        if novo_status == "CANCELADO":
            com_retry(cancel_order, ifood_order_id)
        elif novo_status in ACAO_POR_STATUS_PEDIDO:
            com_retry(ACAO_POR_STATUS_PEDIDO[novo_status], ifood_order_id)

    # Acrescenta na linha do tempo (detalhes_brutos.timeline) — precisa reler pra não perder o resto.
    atual = requests.get(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers=_supabase_headers(),
        params={"select": "detalhes_brutos", "id": f"eq.{pedido_id}"},
        timeout=10,
    )
    db = (atual.json()[0].get("detalhes_brutos") if atual.ok and atual.json() else None) or {}
    if not isinstance(db, dict):
        db = {}
    timeline = list(db.get("timeline") or [])
    timeline.append({"status": novo_status, "em": _agora_iso()})
    db["timeline"] = timeline

    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        params={"id": f"eq.{pedido_id}"},
        json={"status": novo_status, "atualizado_em": _agora_iso(), "detalhes_brutos": db},
        timeout=10,
    )
    resp.raise_for_status()
    registrar_auditoria(operador, "alterar_status_pedido", item_id=pedido_id, detalhe=f"novo status: {novo_status}{' (99Food)' if eh_99 else ''}")
    return resp.json()[0]


def _criar_pedido_local(merchant_id, order_id) -> bool:
    """Busca os detalhes completos do pedido na Order API e materializa localmente em
    `pedidos`/`itens_pedido` — idempotente (não duplica se `ifood_order_id` já existir)."""
    resp_existente = requests.get(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers=_supabase_headers(),
        params={"select": "id", "ifood_order_id": f"eq.{order_id}"},
        timeout=10,
    )
    resp_existente.raise_for_status()
    if resp_existente.json():
        return False

    detalhes = com_retry(get_order_details, order_id)
    tipo = TIPO_IFOOD_PARA_INTERNO.get(detalhes.get("orderType"), "ENTREGA")
    # O iFood manda total.orderAmount como número direto (ex: 27.0); alguns esquemas antigos
    # usavam {value: X}. Trata os dois.
    _order_amount = (detalhes.get("total") or {}).get("orderAmount")
    total = _order_amount.get("value") if isinstance(_order_amount, dict) else _order_amount
    metodos = ((detalhes.get("payments") or {}).get("methods")) or []
    pagamento = ", ".join(m.get("method", "") for m in metodos if m.get("method")) or None

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        json={
            "ifood_order_id": order_id,
            "merchant_id": merchant_id,
            "status": "NOVO",
            "tipo": tipo,
            "pagamento": pagamento,
            "cliente": detalhes.get("customer"),
            "total": total,
            "detalhes_brutos": detalhes,
        },
        timeout=10,
    )
    resp.raise_for_status()
    pedido_criado = resp.json()[0]

    itens = [
        {
            "pedido_id": pedido_criado["id"],
            "nome": item.get("name"),
            "quantidade": item.get("quantity", 1),
            "preco": _preco_item(item),
            "observacao": item.get("observations"),
            "complementos": item.get("options"),
        }
        for item in detalhes.get("items", [])
    ]
    if itens:
        resp_itens = requests.post(f"{SUPABASE_URL}/rest/v1/itens_pedido", headers=_supabase_headers(), json=itens, timeout=10)
        resp_itens.raise_for_status()
    return True


def _registrar_e_materializar_evento(merchant_id, evento, origem, ack_enviado=False):
    """Processa UM evento de pedido do iFood — vindo do polling OU do webhook. Monta a linha de
    log, materializa pedido novo (PLACED) ou atualiza o status de um existente. Devolve
    (linha_de_log, entrou_pedido_novo)."""
    # O iFood manda o código curto em `code` ("PLC") e o completo em `fullCode` ("PLACED").
    # Nossas regras (PLACED/CONFIRMED/...) batem com o fullCode, então ele vem primeiro.
    codigo = evento.get("fullCode") or evento.get("code") or "DESCONHECIDO"
    order_id = evento.get("orderId")
    linha = {
        "merchant_id": merchant_id,
        "pedido_ifood_id": order_id,
        "tipo": CODIGO_EVENTO_LABEL.get(codigo, codigo),
        "origem": origem,
        "tratado": True,
        "ack_enviado": ack_enviado,
        "payload": evento,
    }
    novo = False
    if codigo == "PLACED" and order_id:
        novo = _criar_pedido_local(merchant_id, order_id)
    elif order_id and codigo in STATUS_POR_CODIGO_EVENTO:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/pedidos",
            headers=_supabase_headers(),
            params={"ifood_order_id": f"eq.{order_id}"},
            json={"status": STATUS_POR_CODIGO_EVENTO[codigo], "atualizado_em": _agora_iso()},
            timeout=10,
        )
    return linha, novo


def _processar_eventos_da_loja(merchant_id) -> int:
    """Um ciclo de polling pra uma loja: busca eventos pendentes, materializa/atualiza pelos
    MESMOS helpers do webhook, grava o log em `eventos_ifood` e confirma (ack) no iFood.
    Devolve quantos pedidos novos entraram."""
    eventos = com_retry(poll_events, merchant_id)
    if not eventos:
        return 0

    novos_pedidos = 0
    ids_para_confirmar = []
    linhas_evento = []
    for evento in eventos:
        ids_para_confirmar.append(evento["id"])
        linha, novo = _registrar_e_materializar_evento(merchant_id, evento, "Consulta automática")
        linhas_evento.append(linha)
        if novo:
            novos_pedidos += 1

    if linhas_evento:
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/eventos_ifood", headers=_supabase_headers(), json=linhas_evento, timeout=10)
        resp.raise_for_status()

    com_retry(acknowledge_events, ids_para_confirmar)
    return novos_pedidos


@app.get("/api/pedidos")
@requer_login
def get_pedidos():
    merchant_id = _merchant_id()
    status = request.args.get("status")
    busca = (request.args.get("busca") or "").strip()
    params = {"select": "*", "merchant_id": f"eq.{merchant_id}", "order": "recebido_em.desc", "limit": 200}
    if status:
        params["status"] = f"eq.{status}"
    if busca:
        params["ifood_order_id"] = f"ilike.*{busca}*"

    resp = requests.get(f"{SUPABASE_URL}/rest/v1/pedidos", headers=_supabase_headers(), params=params, timeout=10)
    resp.raise_for_status()
    return jsonify(resp.json())


@app.get("/api/pedidos/<pedido_id>")
@requer_login
def get_pedido_detalhe(pedido_id):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers=_supabase_headers(),
        params={"select": "*", "id": f"eq.{pedido_id}"},
        timeout=10,
    )
    resp.raise_for_status()
    pedidos = resp.json()
    if not pedidos:
        return jsonify({"erro": "Pedido não encontrado."}), 404
    pedido = pedidos[0]

    resp_itens = requests.get(
        f"{SUPABASE_URL}/rest/v1/itens_pedido",
        headers=_supabase_headers(),
        params={"select": "*", "pedido_id": f"eq.{pedido_id}"},
        timeout=10,
    )
    resp_itens.raise_for_status()
    pedido["itens"] = resp_itens.json()

    resp_eventos = requests.get(
        f"{SUPABASE_URL}/rest/v1/eventos_ifood",
        headers=_supabase_headers(),
        params={"select": "*", "pedido_ifood_id": f"eq.{pedido['ifood_order_id']}", "order": "recebido_em.asc"},
        timeout=10,
    )
    resp_eventos.raise_for_status()
    pedido["linha_do_tempo"] = resp_eventos.json()

    # Normaliza os itens RESPEITANDO a API de cada plataforma (sem misturar): cada uma guarda
    # o pedido no seu formato nativo em `detalhes_brutos`; a reconciliação pro shape que o KDS
    # espera ({nome, quantidade, preco, complementos:[{nome,grupo,preco}], obs}) acontece só aqui,
    # na leitura.
    db = pedido.get("detalhes_brutos") or {}
    eh_99 = str(pedido.get("ifood_order_id") or "").startswith("99-")
    if isinstance(db, dict):
        if eh_99:
            # 99Food: itens em detalhes_brutos.itens (nome/qtd/obs/complementos).
            if not pedido["itens"] and db.get("itens"):
                pedido["itens"] = [
                    {
                        "id": i,
                        "quantidade": it.get("qtd", 1),
                        "nome": it.get("nome"),
                        "preco": it.get("preco"),
                        "complementos": it.get("complementos") or [],
                        "obs": it.get("obs") or "",
                    }
                    for i, it in enumerate(db["itens"])
                ]
        elif db.get("items"):
            # iFood: shape cru da Order API em detalhes_brutos.items (name/quantity/options).
            # É a fonte autoritativa — a tabela `itens_pedido` guarda os `options` crus e o preço
            # UNITÁRIO, que exibem errado no modal (complementos sem nome, total baixo). Por isso
            # normaliza a partir do bruto, não das colunas da tabela.
            def _num(v):
                return v.get("value") if isinstance(v, dict) else v
            pedido["itens"] = [
                {
                    "id": i,
                    "quantidade": it.get("quantity", 1),
                    "nome": it.get("name"),
                    "preco": _num(it.get("totalPrice") if it.get("totalPrice") is not None
                                  else (it.get("price") if it.get("price") is not None else it.get("unitPrice"))),
                    "complementos": [
                        {"nome": o.get("name"), "preco": _num(o.get("price")), "grupo": o.get("groupName") or ""}
                        for o in (it.get("options") or [])
                    ],
                    "obs": it.get("observations") or "",
                }
                for i, it in enumerate(db["items"])
            ]
        if not pedido["linha_do_tempo"] and db.get("timeline"):
            rot = {
                "NOVO": "Novo pedido recebido", "CONFIRMADO": "Pedido confirmado",
                "DESPACHADO": "Saiu para entrega / despachado", "CONCLUIDO": "Pedido concluído",
                "CANCELADO": "Pedido cancelado",
            }
            pedido["linha_do_tempo"] = [
                {"id": i, "tipo": rot.get(t.get("status"), t.get("status")), "recebido_em": t.get("em")}
                for i, t in enumerate(db["timeline"])
            ]
    return jsonify(pedido)


@app.post("/api/pedidos/<pedido_id>/status")
@requer_login
def alterar_status_pedido(pedido_id):
    dados = request.get_json(silent=True) or {}
    novo_status = str(dados.get("status", "")).strip().upper()
    if novo_status not in STATUS_VALIDOS_PEDIDO:
        raise ValueError("status inválido.")

    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers=_supabase_headers(),
        params={"select": "id,ifood_order_id", "id": f"eq.{pedido_id}"},
        timeout=10,
    )
    resp.raise_for_status()
    pedidos = resp.json()
    if not pedidos:
        return jsonify({"erro": "Pedido não encontrado."}), 404

    atualizado = _atualizar_status_pedido(pedido_id, pedidos[0]["ifood_order_id"], novo_status, g.usuario["nome"])
    return jsonify(atualizado)


@app.post("/api/pedidos/<pedido_id>/ocultar")
@requer_login
def ocultar_pedido_kds(pedido_id):
    """"Limpar" no KDS: some do quadro sem apagar o pedido (continua em Pedidos/Auditoria)."""
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        params={"id": f"eq.{pedido_id}"},
        json={"oculto_kds": True, "atualizado_em": _agora_iso()},
        timeout=10,
    )
    resp.raise_for_status()
    resultado = resp.json()
    if not resultado:
        return jsonify({"erro": "Pedido não encontrado."}), 404
    return jsonify(resultado[0])


@app.post("/api/pedidos/buscar")
@requer_login
def buscar_pedidos():
    """Consulta agora os eventos pendentes no iFood (Events API) pra loja informada. Chamado
    manualmente ("Atualizar do iFood") e automaticamente a cada ~15s pelas telas de Pedidos/KDS
    enquanto abertas. Não existe worker/cron nesse projeto (deploy é uma função serverless da
    Vercel, sem processo contínuo) — o polling só roda enquanto alguém está com a tela aberta,
    o que já cobre o uso real (a tela fica ligada na cozinha/balcão)."""
    merchant_id = _merchant_id()
    novos_pedidos = _processar_eventos_da_loja(merchant_id)
    return jsonify({"novosPedidos": novos_pedidos})


@app.get("/api/eventos")
@requer_login
def get_eventos():
    merchant_id = _merchant_id()
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/eventos_ifood",
        headers=_supabase_headers(),
        params={"select": "*", "merchant_id": f"eq.{merchant_id}", "order": "recebido_em.desc", "limit": 200},
        timeout=10,
    )
    resp.raise_for_status()
    return jsonify(resp.json())


# ---- Webhook 99Food (DiDi) ----
# O 99Food não tem polling: ele faz POST aqui a cada evento (pedido novo, cancelamento,
# status de upload de cardápio). Rota PÚBLICA (sem @requer_login) — o 99 chama de fora.
# Registra o payload cru pra inspeção/automação e responde errno:0 (a confirmação que o
# 99 espera). Cadastre a URL pública desta rota no campo "Endereço do webhook" do portal.
EVENTOS_99_LOG = None if RODANDO_NO_VERCEL else (DATA_DIR / "eventos_99food.jsonl")


@app.get("/webhook/99food")
def webhook_99food_check():
    """Verificação/health que o portal do 99 pode fazer ao cadastrar o webhook."""
    return jsonify({"errno": 0, "errmsg": "ok"})


@app.post("/webhook/99food")
def webhook_99food():
    payload = request.get_json(silent=True)
    if payload is None:
        payload = request.get_data(as_text=True)
    logger.info("99Food webhook recebido: %s", payload)
    if EVENTOS_99_LOG is not None:
        try:
            with open(EVENTOS_99_LOG, "a", encoding="utf-8") as f:
                f.write(
                    json.dumps(
                        {"recebido_em": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "payload": payload},
                        ensure_ascii=False,
                    )
                    + "\n"
                )
        except Exception as exc:  # nunca deixa o log derrubar a resposta ao 99
            logger.warning("Falha ao gravar evento 99Food: %s", exc)
    # Materializa o pedido no KDS a partir do evento (best-effort — nunca derruba o 200 pro 99).
    try:
        _processar_evento_99(payload)
    except Exception as exc:
        logger.warning("Falha ao processar evento 99Food: %s", exc)
    return jsonify({"errno": 0, "errmsg": "ok"})


# O iFood também pode entregar eventos de PEDIDO por WEBHOOK (push) em vez de polling. Esta rota
# pública recebe o POST do iFood e materializa no KDS pelo MESMO pipeline do polling. No modo
# webhook o próprio 200 desta resposta É a confirmação (não se chama events/acknowledgment).
# Cadastre a URL pública desta rota no webhook da aplicação (Portal do Desenvolvedor iFood).
@app.get("/webhook/ifood")
def webhook_ifood_check():
    """Health check que o portal do iFood pode bater ao cadastrar/validar o webhook."""
    return jsonify({"status": "ok"})


@app.post("/webhook/ifood")
def webhook_ifood():
    payload = request.get_json(silent=True)
    logger.info("iFood webhook recebido: %s", payload)
    # O iFood pode mandar um evento único (dict), uma lista, ou {"events": [...]}.
    if isinstance(payload, list):
        eventos = payload
    elif isinstance(payload, dict):
        eventos = payload.get("events") if isinstance(payload.get("events"), list) else [payload]
    else:
        eventos = []

    linhas = []
    for evento in eventos:
        if not isinstance(evento, dict):
            continue
        merchant_id = evento.get("merchantId") or evento.get("merchant_id") or MERCHANT_ID_PADRAO
        try:
            linha, _ = _registrar_e_materializar_evento(merchant_id, evento, "Webhook iFood", ack_enviado=True)
        except Exception as exc:  # nunca vira 5xx: o iFood desativa o webhook se falhar em série
            logger.warning("Falha ao processar evento iFood: %s", exc)
            codigo = evento.get("fullCode") or evento.get("code") or "ERRO"
            linha = {
                "merchant_id": merchant_id,
                "pedido_ifood_id": evento.get("orderId"),
                "tipo": CODIGO_EVENTO_LABEL.get(codigo, codigo),
                "origem": "Webhook iFood",
                "tratado": False,
                "ack_enviado": True,
                "payload": evento,
            }
        linhas.append(linha)

    if linhas:
        try:
            requests.post(f"{SUPABASE_URL}/rest/v1/eventos_ifood", headers=_supabase_headers(), json=linhas, timeout=10)
        except Exception as exc:
            logger.warning("Falha ao gravar eventos iFood: %s", exc)

    # 200 sempre — no modo webhook o 2xx é o ack; erro interno não pode virar 5xx.
    return jsonify({"status": "ok", "processados": len(linhas)})


# 99 order_status -> status do KDS (aceita código numérico ou texto).
STATUS_99_KDS = {
    # códigos numéricos reais do 99 (evento orderNew traz status=100 = novo)
    "100": "NOVO", "200": "CONFIRMADO", "300": "CONFIRMADO", "400": "DESPACHADO",
    "500": "DESPACHADO", "600": "DESPACHADO", "700": "CONCLUIDO", "800": "CANCELADO",
    "900": "CANCELADO", "1000": "CANCELADO",
    # atalhos numéricos da simulação + textos
    "1": "NOVO", "2": "CONFIRMADO", "3": "DESPACHADO", "4": "CONCLUIDO", "5": "CANCELADO",
    "new": "NOVO", "placed": "NOVO", "confirmed": "CONFIRMADO", "preparing": "CONFIRMADO",
    "ready": "DESPACHADO", "dispatched": "DESPACHADO", "shipping": "DESPACHADO",
    "completed": "CONCLUIDO", "finished": "CONCLUIDO", "concluded": "CONCLUIDO",
    "cancelled": "CANCELADO", "canceled": "CANCELADO",
}
# delivery_type do 99: 1 = entrega; 2/3 = retirada. + textos da simulação.
TIPO_99_KDS = {
    "1": "ENTREGA", "2": "RETIRADA", "3": "RETIRADA",
    "delivery": "ENTREGA", "pickup": "RETIRADA", "takeout": "RETIRADA", "self_pickup": "RETIRADA",
}
PAGAMENTO_99 = {"1": "Online (99)", "2": "Dinheiro", "0": "99Food", "None": "99Food"}


def _nome_cliente_99(addr, data):
    if isinstance(addr, dict):
        nome = addr.get("name") or (f"{addr.get('first_name', '')} {addr.get('last_name', '')}").strip()
        if nome:
            return nome
    ui = data.get("user_info")
    if isinstance(ui, dict) and ui.get("name"):
        return ui["name"]
    return data.get("customer_name") or "Cliente 99"


def _centavos(v):
    """O 99 manda todo preço em centavos (ex: 300 = R$3,00) → converte pra reais."""
    return round((v or 0) / 100.0, 2) if isinstance(v, (int, float)) else float(v or 0)


def _mapear_pedido_99(app_shop_id, data):
    """Converte o payload de pedido do 99 numa linha da tabela `pedidos`.
    Aceita o formato REAL (evento orderNew: data.order_info.*) e o achatado (simulação)."""
    oi = data.get("order_info") if isinstance(data.get("order_info"), dict) else data
    order_id = str(oi.get("order_id") or data.get("order_id") or data.get("id") or "").strip()
    if not order_id:
        return None
    st = oi.get("status", data.get("order_status", data.get("status")))
    status = STATUS_99_KDS.get(str(st).lower(), "NOVO")
    dt = oi.get("delivery_type", data.get("order_type", data.get("type")))
    tipo = TIPO_99_KDS.get(str(dt).lower(), "RETIRADA" if str(dt) in ("2", "3") else "ENTREGA")
    price = oi.get("price") if isinstance(oi.get("price"), dict) else {}
    bruto = (price.get("real_pay_price") or price.get("real_price") or price.get("order_price")
             or data.get("total_amount") or data.get("total") or 0)
    itens_src = oi.get("order_items") or data.get("items") or []
    itens = []
    for it in itens_src:
        # complementos/adicionais do item (o 99 manda em sub_item_list)
        subs = it.get("sub_item_list") or it.get("complements") or it.get("complementos") or []
        complementos = [
            {
                "nome": s.get("name") or s.get("nome"),
                "preco": _centavos(s.get("total_price") or s.get("price") or s.get("preco") or 0),
                "grupo": s.get("content_name") or s.get("grupo") or "",
            }
            for s in subs
            if (s.get("name") or s.get("nome"))
        ]
        itens.append(
            {
                "nome": it.get("name") or it.get("item_name"),
                "qtd": it.get("amount") or it.get("count") or 1,
                "preco": _centavos(it.get("total_price") or it.get("price") or 0),
                "obs": it.get("remark") or it.get("obs") or "",
                "complementos": complementos,
            }
        )
    oid = order_id if order_id.startswith("99-") else f"99-{order_id}"
    return {
        "ifood_order_id": oid,
        "merchant_id": app_shop_id,
        "status": status,
        "tipo": tipo,
        "pagamento": PAGAMENTO_99.get(str(oi.get("pay_type", data.get("pay_type"))), "99Food"),
        "cliente": {"name": _nome_cliente_99(oi.get("receive_address"), data)},
        "total": _centavos(bruto),
        "oculto_kds": False,
        "detalhes_brutos": {
            "origem": "99Food (webhook)",
            "status_99": st,
            "itens": itens,
            "timeline": [{"status": status, "em": time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())}],
        },
    }


def _upsert_pedido_99(pedido):
    """Insere (pedido novo) ou atualiza o status (pedido existente) na tabela `pedidos`."""
    if not SUPABASE_CONFIGURADO:
        return
    oid = pedido["ifood_order_id"]
    agora = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())
    achar = requests.get(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers=_supabase_headers(),
        params={"select": "id", "ifood_order_id": f"eq.{oid}"},
        timeout=10,
    )
    if achar.ok and achar.json():
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/pedidos",
            headers=_supabase_headers(),
            params={"ifood_order_id": f"eq.{oid}"},
            json={
                "status": pedido["status"],
                "tipo": pedido["tipo"],
                "pagamento": pedido["pagamento"],
                "cliente": pedido["cliente"],
                "total": pedido["total"],
                "detalhes_brutos": pedido["detalhes_brutos"],
                "atualizado_em": agora,
            },
            timeout=10,
        )
    else:
        requests.post(f"{SUPABASE_URL}/rest/v1/pedidos", headers=_supabase_headers(), json=pedido, timeout=10)


def _processar_evento_99(evento):
    """Se o evento do webhook for de PEDIDO, materializa/atualiza no KDS. Ignora os demais
    (shopStatus, shopBindStatus, etc.)."""
    if not isinstance(evento, dict):
        return
    tipo_evt = str(evento.get("type", "")).lower()
    data = evento.get("data") or {}
    if not isinstance(data, dict):
        return
    app_shop_id = str(evento.get("app_shop_id") or data.get("app_shop_id") or "").strip()
    order_id = data.get("order_id") or data.get("id") or evento.get("order_id")
    if "order" not in tipo_evt and not order_id:
        return  # não é evento de pedido

    # Webhook real costuma trazer só o id → busca o detalhe via API. Se já veio inline
    # (simulação/teste), usa direto.
    tem_inline = any(k in data for k in ("total_amount", "total", "user_info", "cliente", "order_status", "order_info"))
    if order_id and not tem_inline and food99 and app_shop_id:
        try:
            det = food99.order_detail(app_shop_id, order_id)
            if isinstance(det, dict):
                data = {**data, **det}
        except Exception as exc:
            logger.warning("order_detail 99 falhou (%s) — sem dados pra materializar", exc)
            return

    pedido = _mapear_pedido_99(app_shop_id, data)
    if pedido:
        _upsert_pedido_99(pedido)
        logger.info("pedido 99 materializado no KDS: %s (%s)", pedido["ifood_order_id"], pedido["status"])


# ---- 99Food (multi-plataforma) ----
# Endpoints dedicados pro 99Food que devolvem o catálogo no MESMO formato do iFood
# (/api/catalogo), pra a tela reaproveitar. O front chama estes quando a loja é 99food.
# `loja` = app_shop_id do 99. Não tocam nos endpoints iFood.
try:
    from food99_automacao import client as food99  # noqa: E402
except Exception:  # pragma: no cover
    food99 = None

FOOD99_CONFIGURADO = bool(os.environ.get("FOOD99_APP_ID") and os.environ.get("FOOD99_APP_SECRET"))


@app.get("/api/99food/catalogo")
@requer_login
def catalogo_99food():
    app_shop_id = str(request.args.get("loja", "")).strip()
    if not app_shop_id:
        raise ValueError("Informe a loja (app_shop_id do 99Food).")
    if not (food99 and FOOD99_CONFIGURADO):
        return jsonify({"erro": "99Food não configurado no servidor (FOOD99_APP_ID/SECRET)."}), 503
    try:
        m = food99.list_items(app_shop_id)
    except Exception as exc:
        return jsonify({"erro": f"99Food: {exc}"}), 502

    cat_por_item, catid_por_item, nomes_cat = {}, {}, []
    for c in m.get("categories", []):
        nomes_cat.append(c.get("category_name"))
        for iid in c.get("app_item_ids", []):
            cat_por_item[iid] = c.get("category_name")
            catid_por_item[iid] = c.get("app_category_id")

    itens = []
    for it in m.get("items", []):
        iid = it.get("app_item_id")
        itens.append(
            {
                "itemId": iid,
                "productId": iid,
                "categoria": cat_por_item.get(iid, "Sem categoria"),
                "categoryId": catid_por_item.get(iid, ""),
                "nome": it.get("item_name"),
                "codigo_pdv": it.get("app_external_id") or "",
                "preco": (it.get("price") or 0) / 100.0,  # 99 manda o preço em centavos
                "status": "AVAILABLE" if it.get("status") == 1 else "UNAVAILABLE",
                "foto": it.get("head_img") or None,
            }
        )
    return jsonify({"itens": itens, "categorias": sorted(set(filter(None, nomes_cat)))})


@app.patch("/api/99food/itens/<item_id>/status")
@requer_login
def alterar_status_99food(item_id):
    dados = request.get_json(silent=True) or {}
    status = dados.get("status")
    nome = str(dados.get("nome", "")).strip()
    app_shop_id = str(request.args.get("loja", "") or dados.get("loja", "")).strip()
    if status not in ("AVAILABLE", "UNAVAILABLE"):
        raise ValueError("status deve ser AVAILABLE ou UNAVAILABLE")
    if not app_shop_id:
        raise ValueError("Informe a loja (app_shop_id do 99Food).")
    if not (food99 and FOOD99_CONFIGURADO):
        return jsonify({"erro": "99Food não configurado no servidor."}), 503
    try:
        food99.update_item_status(app_shop_id, item_id, disponivel=(status == "AVAILABLE"))
    except Exception as exc:
        return jsonify({"erro": f"99Food: {exc}"}), 502
    registrar_auditoria(
        g.usuario["nome"],
        "pausar" if status == "UNAVAILABLE" else "despausar",
        item_id=item_id,
        nome=nome,
        detalhe="99Food",
    )
    return jsonify({"itemId": item_id, "status": status})


@app.patch("/api/99food/itens/<item_id>/preco")
@requer_login
def alterar_preco_99food(item_id):
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome", "")).strip()
    preco_anterior = str(dados.get("preco_anterior", "")).strip()
    app_shop_id = str(request.args.get("loja", "") or dados.get("loja", "")).strip()
    try:
        preco = float(str(dados.get("preco", "")).replace(",", "."))
    except ValueError:
        raise ValueError("Preço inválido")
    if preco <= 0:
        raise ValueError("Preço deve ser maior que zero")
    if not app_shop_id:
        raise ValueError("Informe a loja (app_shop_id do 99Food).")
    if not (food99 and FOOD99_CONFIGURADO):
        return jsonify({"erro": "99Food não configurado no servidor."}), 503
    try:
        food99.update_item_price(app_shop_id, item_id, preco)
    except Exception as exc:
        return jsonify({"erro": f"99Food: {exc}"}), 502
    registrar_auditoria(
        g.usuario["nome"],
        "alterar_preco",
        item_id=item_id,
        nome=nome,
        detalhe="99Food",
        valor_de=preco_anterior,
        valor_para=f"{preco:.2f}",
    )
    return jsonify({"itemId": item_id, "preco": preco})


@app.patch("/api/99food/itens/<item_id>")
@requer_login
def editar_item_99food(item_id):
    """Edição combinada (nome/descrição/preço/PDV) num ÚNICO updateItem v3 — evita várias
    leituras do cardápio (importante por causa do rate-limit do 99)."""
    dados = request.get_json(silent=True) or {}
    app_shop_id = str(request.args.get("loja", "") or dados.get("loja", "")).strip()
    if not app_shop_id:
        raise ValueError("Informe a loja (app_shop_id do 99Food).")
    campos = {}
    if dados.get("nome"):
        campos["item_name"] = str(dados["nome"]).strip()[:50]
    if "descricao" in dados:
        campos["short_desc"] = str(dados.get("descricao") or "").strip()[:300]
    if dados.get("codigo_pdv") is not None:
        campos["app_external_id"] = str(dados.get("codigo_pdv") or "").strip()
    if dados.get("preco") not in (None, ""):
        try:
            preco = float(str(dados["preco"]).replace(",", "."))
        except ValueError:
            raise ValueError("Preço inválido")
        if preco <= 0:
            raise ValueError("Preço deve ser maior que zero")
        campos["price"] = int(round(preco * 100))
    if not campos:
        raise ValueError("Nada para atualizar.")
    if not (food99 and FOOD99_CONFIGURADO):
        return jsonify({"erro": "99Food não configurado no servidor."}), 503
    try:
        food99.update_item_campos(app_shop_id, item_id, **campos)
    except Exception as exc:
        return jsonify({"erro": f"99Food: {exc}"}), 502
    registrar_auditoria(g.usuario["nome"], "editar_item", item_id=item_id, nome=campos.get("item_name", ""), detalhe="99Food")
    return jsonify({"itemId": item_id, "ok": True})


@app.patch("/api/99food/itens/<item_id>/codigo-pdv")
@requer_login
def alterar_codigo_pdv_99food(item_id):
    dados = request.get_json(silent=True) or {}
    codigo = str(dados.get("codigo_pdv", "")).strip()
    nome = str(dados.get("nome", "")).strip()
    app_shop_id = str(request.args.get("loja", "") or dados.get("loja", "")).strip()
    if not app_shop_id:
        raise ValueError("Informe a loja (app_shop_id do 99Food).")
    if not (food99 and FOOD99_CONFIGURADO):
        return jsonify({"erro": "99Food não configurado no servidor."}), 503
    try:
        food99.update_item_campos(app_shop_id, item_id, app_external_id=codigo)
    except Exception as exc:
        return jsonify({"erro": f"99Food: {exc}"}), 502
    registrar_auditoria(g.usuario["nome"], "alterar_codigo_pdv", item_id=item_id, nome=nome, detalhe="99Food", valor_para=codigo)
    return jsonify({"itemId": item_id, "codigo_pdv": codigo})


@app.patch("/api/99food/itens/<item_id>/nome-descricao")
@requer_login
def alterar_nome_descricao_99food(item_id):
    dados = request.get_json(silent=True) or {}
    app_shop_id = str(request.args.get("loja", "") or dados.get("loja", "")).strip()
    campos = {}
    if dados.get("nome"):
        campos["item_name"] = str(dados["nome"]).strip()[:50]
    if "descricao" in dados:
        campos["short_desc"] = str(dados.get("descricao") or "").strip()[:300]
    if not app_shop_id:
        raise ValueError("Informe a loja (app_shop_id do 99Food).")
    if not campos:
        raise ValueError("Nada para atualizar (envie nome e/ou descricao).")
    if not (food99 and FOOD99_CONFIGURADO):
        return jsonify({"erro": "99Food não configurado no servidor."}), 503
    try:
        food99.update_item_campos(app_shop_id, item_id, **campos)
    except Exception as exc:
        return jsonify({"erro": f"99Food: {exc}"}), 502
    registrar_auditoria(
        g.usuario["nome"],
        "editar_item",
        item_id=item_id,
        nome=campos.get("item_name") or str(dados.get("nome", "")).strip(),
        detalhe="99Food",
    )
    return jsonify({"itemId": item_id, **campos})


@app.post("/api/99food/itens")
@requer_papel(*PAPEIS_QUE_PODEM_CRIAR_ITEM)
def criar_item_99food():
    """Cria um item novo no cardápio do 99 (reconstrói o menu + upload v3). Não-destrutivo."""
    dados = request.get_json(silent=True) or {}
    app_shop_id = str(request.args.get("loja", "") or dados.get("loja", "")).strip()
    nome = str(dados.get("nome", "")).strip()
    categoria_id = str(dados.get("categoria_id", "") or dados.get("categoryId", "")).strip()
    pdv = str(dados.get("codigo_pdv", "")).strip()
    descricao = str(dados.get("descricao", "")).strip()
    item_id = str(dados.get("item_id", "")).strip() or None
    try:
        preco = float(str(dados.get("preco", "")).replace(",", "."))
    except ValueError:
        raise ValueError("Preço inválido")
    if not app_shop_id or not nome or not categoria_id or preco <= 0:
        raise ValueError("Informe loja, nome, categoria e preço (> 0).")
    if not (food99 and FOOD99_CONFIGURADO):
        return jsonify({"erro": "99Food não configurado no servidor."}), 503
    try:
        res = food99.criar_item(
            app_shop_id,
            categoria_id=categoria_id,
            nome=nome,
            preco_reais=preco,
            item_id=item_id,
            descricao=descricao,
            pdv=pdv,
        )
    except Exception as exc:
        return jsonify({"erro": f"99Food: {exc}"}), 502
    task = res.get("task") or {}
    if task.get("status") == 2:
        return jsonify({"erro": f"Upload do cardápio falhou: {task.get('message')}"}), 502
    registrar_auditoria(
        g.usuario["nome"], "criar_item", item_id=res["item_id"], nome=nome, detalhe="99Food", valor_para=f"R$ {preco:.2f}"
    )
    return jsonify({"itemId": res["item_id"], "task": task}), 201


# Pool de itens/clientes pra gerar pedido de teste realista no KDS (formato real do 99).
_ITENS_TESTE_99 = [
    ("pizza_margherita_especial_v3", "Pizza Margherita Especial", 4500),
    ("pizza_calabresa_v3", "Pizza Calabresa", 4700),
    ("pizza_atum_v3", "Pizza Atum", 4200),
    ("item_chopp_brahma", "Chopp Caneca Brahma 300ml", 1200),
    ("item_parmegiana", "Parmegiana 570g", 4380),
    ("item_carpaccio", "Carpaccio Peixe Branco 5un", 4000),
    ("item_petit_gateau", "Petit Gateau - 01un", 2200),
    ("item_caipirinha", "Caipirinha de Gin", 2295),
    ("item_red_bull", "Red Bull", 1200),
    ("item_agua", "Água sem Gás 500ml", 600),
]
_CLIENTES_TESTE = ["Ana Lima", "Bruno Alves", "Carla Dias", "Diego Rocha", "Elaine Nunes", "Felipe Souza", "Gabriela Melo", "Hugo Costa"]


@app.post("/api/99food/pedido-teste")
@requer_login
def criar_pedido_teste_99():
    """Gera um pedido de teste no formato REAL do 99 (evento orderNew) e o materializa no KDS
    pelo MESMO código do webhook — pra testar em tempo real direto pela interface."""
    dados = request.get_json(silent=True) or {}
    app_shop_id = str(request.args.get("loja", "") or dados.get("loja", "")).strip()
    if not app_shop_id:
        raise ValueError("Informe a loja (app_shop_id do 99Food).")

    order_id = f"TESTE{int(time.time() * 1000) % 100000000}"

    escolhidos = dados.get("items") or []
    if escolhidos:
        # itens escolhidos na tela (preço vem em REAIS -> converte pra centavos)
        order_items = [
            {
                "app_item_id": str(it.get("item_id") or it.get("itemId") or ""),
                "name": it.get("nome") or it.get("name") or "Item",
                "amount": int(it.get("qtd") or 1),
                "total_price": int(round(float(it.get("preco") or 0) * 100)),
                "sub_item_list": [],
            }
            for it in escolhidos
        ]
    else:
        # nenhum item escolhido -> pega itens REAIS do catálogo da loja (preço já em centavos)
        order_items = []
        if food99 and FOOD99_CONFIGURADO:
            try:
                reais = (food99.list_items(app_shop_id) or {}).get("items", [])
                if reais:
                    amostra = random.sample(reais, k=min(len(reais), random.randint(1, 3)))
                    order_items = [
                        {
                            "app_item_id": it.get("app_item_id"),
                            "name": it.get("item_name"),
                            "amount": random.randint(1, 2),
                            "total_price": it.get("price") or 0,
                            "sub_item_list": [],
                        }
                        for it in amostra
                    ]
            except Exception as exc:
                logger.warning("Não consegui puxar catálogo do 99 pro pedido teste: %s", exc)
        if not order_items:  # fallback se catálogo indisponível
            escolhidos_pool = random.sample(_ITENS_TESTE_99, k=random.randint(1, 3))
            order_items = [
                {"app_item_id": i[0], "name": i[1], "amount": random.randint(1, 2), "total_price": i[2], "sub_item_list": []}
                for i in escolhidos_pool
            ]
    total = sum(it["total_price"] * it["amount"] for it in order_items)
    evento = {
        "app_id": int(app_shop_id) if app_shop_id.isdigit() else app_shop_id,
        "app_shop_id": app_shop_id,
        "type": "orderNew",
        "timestamp": int(time.time()),
        "data": {
            "order_id": order_id,
            "order_info": {
                "order_id": order_id,
                "status": 100,
                "delivery_type": random.choice([1, 2]),
                "pay_type": random.choice([1, 2]),
                "price": {"order_price": total, "real_price": total, "real_pay_price": total, "refund_price": 0},
                "receive_address": {"name": random.choice(_CLIENTES_TESTE)},
                "order_items": order_items,
                "is_test": 1,
            },
        },
    }
    _processar_evento_99(evento)  # mesmo caminho de um pedido real do 99
    registrar_auditoria(g.usuario["nome"], "pedido_teste", item_id=order_id, detalhe="99Food (teste manual)")
    return jsonify({"ok": True, "order_id": f"99-{order_id}", "total": round(total / 100.0, 2)}), 201


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    logger.info("Servidor iniciando (debug=%s)", debug)
    # host 0.0.0.0: acessível por outros dispositivos na mesma rede local (não só localhost).
    app.run(host="0.0.0.0", port=5000, debug=debug)
