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
    if novo_status == "CANCELADO":
        com_retry(cancel_order, ifood_order_id)
    elif novo_status in ACAO_POR_STATUS_PEDIDO:
        com_retry(ACAO_POR_STATUS_PEDIDO[novo_status], ifood_order_id)

    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/pedidos",
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        params={"id": f"eq.{pedido_id}"},
        json={"status": novo_status, "atualizado_em": _agora_iso()},
        timeout=10,
    )
    resp.raise_for_status()
    registrar_auditoria(operador, "alterar_status_pedido", item_id=pedido_id, detalhe=f"novo status: {novo_status}")
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
    total = ((detalhes.get("total") or {}).get("orderAmount") or {}).get("value")
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


def _processar_eventos_da_loja(merchant_id) -> int:
    """Um ciclo de polling pra uma loja: busca eventos pendentes, materializa pedido novo
    (PLACED), atualiza status de pedidos existentes, grava o log em `eventos_ifood` e confirma
    o recebimento no iFood. Devolve quantos pedidos novos entraram."""
    eventos = com_retry(poll_events, merchant_id)
    if not eventos:
        return 0

    novos_pedidos = 0
    ids_para_confirmar = []
    linhas_evento = []

    for evento in eventos:
        codigo = evento.get("code") or evento.get("fullCode") or "DESCONHECIDO"
        order_id = evento.get("orderId")
        ids_para_confirmar.append(evento["id"])
        linhas_evento.append(
            {
                "merchant_id": merchant_id,
                "pedido_ifood_id": order_id,
                "tipo": CODIGO_EVENTO_LABEL.get(codigo, codigo),
                "origem": "Consulta automática",
                "tratado": True,
                "ack_enviado": False,
                "payload": evento,
            }
        )

        if codigo == "PLACED" and order_id:
            if _criar_pedido_local(merchant_id, order_id):
                novos_pedidos += 1
        elif order_id and codigo in STATUS_POR_CODIGO_EVENTO:
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/pedidos",
                headers=_supabase_headers(),
                params={"ifood_order_id": f"eq.{order_id}"},
                json={"status": STATUS_POR_CODIGO_EVENTO[codigo], "atualizado_em": _agora_iso()},
                timeout=10,
            )

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


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    logger.info("Servidor iniciando (debug=%s)", debug)
    # host 0.0.0.0: acessível por outros dispositivos na mesma rede local (não só localhost).
    app.run(host="0.0.0.0", port=5000, debug=debug)
