"""Gerenciamento multi-cliente pela linha de comando (só o super admin usa isso — fala direto com o
Supabase com a SUPABASE_SERVICE_ROLE_KEY do .env). Precisa da migration sql/012.

Modelo: cliente (empresa) -> lojas; usuário -> acessos (papel POR LOJA). Exemplos:

  python scripts/gerenciar.py clientes
  python scripts/gerenciar.py cliente-criar "Burger X" --slug burgerx
  python scripts/gerenciar.py lojas [--cliente caju]
  python scripts/gerenciar.py loja-criar caju "Caju Centro" a1136885-5932-... [--plataforma 99food]
  python scripts/gerenciar.py loja-mover <merchant_id> burgerx
  python scripts/gerenciar.py loja-remover <merchant_id>
  python scripts/gerenciar.py usuarios [--cliente caju]
  python scripts/gerenciar.py usuario-criar fulano@x.com "Fulano"          (imprime a senha temporária)
  python scripts/gerenciar.py usuario-senha fulano@x.com                    (nova senha temporária)
  python scripts/gerenciar.py acesso fulano@x.com                           (mostra os acessos)
  python scripts/gerenciar.py acesso-dar fulano@x.com gerente --cliente caju
  python scripts/gerenciar.py acesso-dar fulano@x.com operador --loja <merchant_id> [--loja ...]
  python scripts/gerenciar.py acesso-tirar fulano@x.com --cliente caju | --loja <id> | --tudo
  python scripts/gerenciar.py super-admin voce@x.com [--remover]
"""
import argparse
import re
import secrets
import string
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import os  # noqa: E402

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
CHAVE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
PAPEIS = ("administrador", "gerente", "operador")


class Erro(Exception):
    pass


def _h(extra=None):
    return {"apikey": CHAVE, "Authorization": f"Bearer {CHAVE}", "Content-Type": "application/json", **(extra or {})}


def rest(metodo, tabela, params=None, corpo=None, prefer=None):
    resp = requests.request(
        metodo,
        f"{URL}/rest/v1/{tabela}",
        headers=_h({"Prefer": prefer} if prefer else None),
        params=params,
        json=corpo,
        timeout=15,
    )
    if not resp.ok:
        raise Erro(f"Supabase recusou ({resp.status_code}): {resp.text[:300]}")
    return resp.json() if resp.text else None


def _in(valores):
    return "in.(" + (",".join(f'"{v}"' for v in valores) or '""') + ")"


def _senha():
    alfabeto = string.ascii_letters + string.digits
    return "".join(secrets.choice(alfabeto) for _ in range(14))


def _tabela(linhas, colunas):
    if not linhas:
        print("(nada)")
        return
    larguras = [max(len(c), *(len(str(l.get(c) or "")) for l in linhas)) for c in colunas]
    print("  ".join(c.upper().ljust(w) for c, w in zip(colunas, larguras)))
    for l in linhas:
        print("  ".join(str(l.get(c) or "").ljust(w) for c, w in zip(colunas, larguras)))


# --------------------------------------------------------------------------- busca

def cliente(slug):
    linhas = rest("GET", "clientes", {"select": "*", "slug": f"eq.{slug}"})
    if not linhas:
        raise Erro(f"Cliente '{slug}' não existe. Veja: gerenciar.py clientes")
    return linhas[0]


def loja(merchant_id):
    linhas = rest("GET", "lojas", {"select": "*,cliente:clientes(slug)", "merchant_id": f"eq.{merchant_id}"})
    if not linhas:
        raise Erro(f"Loja '{merchant_id}' não cadastrada. Veja: gerenciar.py lojas")
    return linhas[0]


def lojas_do_cliente(slug):
    return rest("GET", "lojas", {"select": "*", "cliente_id": f"eq.{cliente(slug)['id']}", "order": "criado_em.asc"})


def usuario(email):
    linhas = rest("GET", "perfis", {"select": "*", "email": f"eq.{email.strip().lower()}"})
    if not linhas:
        raise Erro(f"Usuário '{email}' não existe. Crie com: gerenciar.py usuario-criar")
    return linhas[0]


def _lojas_alvo(args):
    if getattr(args, "cliente", None):
        lojas = lojas_do_cliente(args.cliente)
    elif getattr(args, "loja", None):
        lojas = [loja(m) for m in args.loja]
    else:
        raise Erro("Informe --cliente <slug> ou --loja <merchant_id>.")
    if not lojas:
        raise Erro("Nenhuma loja nesse alvo.")
    return lojas


# --------------------------------------------------------------------------- comandos

def cmd_clientes(args):
    clientes = rest("GET", "clientes", {"select": "id,nome,slug,lojas(count)", "order": "criado_em.asc"})
    for c in clientes:
        c["lojas"] = (c.get("lojas") or [{}])[0].get("count", 0)
    _tabela(clientes, ["slug", "nome", "lojas", "id"])


def cmd_cliente_criar(args):
    slug = args.slug or re.sub(r"[^a-z0-9]+", "-", args.nome.lower()).strip("-")
    if not re.fullmatch(r"[a-z0-9-]+", slug):
        raise Erro("Slug inválido: use só letras minúsculas, números e hífen (--slug).")
    rest("POST", "clientes", corpo={"nome": args.nome, "slug": slug, "marca_nome": args.nome}, prefer="return=minimal")
    print(f"Cliente criado: {args.nome} (slug: {slug}). Link do login: <painel>/?cliente={slug}")


def cmd_lojas(args):
    params = {"select": "nome,merchant_id,plataforma,cliente:clientes(slug)", "order": "criado_em.asc"}
    if args.cliente:
        params["cliente_id"] = f"eq.{cliente(args.cliente)['id']}"
    lojas = rest("GET", "lojas", params)
    for l in lojas:
        l["cliente"] = (l.get("cliente") or {}).get("slug")
    _tabela(lojas, ["cliente", "nome", "plataforma", "merchant_id"])


def cmd_loja_criar(args):
    c = cliente(args.cliente)
    rest(
        "POST",
        "lojas",
        corpo={"nome": args.nome, "merchant_id": args.merchant_id, "plataforma": args.plataforma, "cliente_id": c["id"]},
        prefer="return=minimal",
    )
    print(f"Loja '{args.nome}' cadastrada no cliente {c['slug']}. Ninguém além do super admin vê ela ainda:")
    print(f"  gerenciar.py acesso-dar <email> <papel> --loja {args.merchant_id}")


def cmd_loja_mover(args):
    l, c = loja(args.merchant_id), cliente(args.cliente)
    rest("PATCH", "lojas", {"id": f"eq.{l['id']}"}, {"cliente_id": c["id"]})
    print(f"Loja '{l['nome']}' agora é do cliente {c['slug']}. Os acessos antigos continuam — revise com 'usuarios --cliente'.")


def cmd_loja_remover(args):
    l = loja(args.merchant_id)
    rest("DELETE", "lojas", {"id": f"eq.{l['id']}"})
    print(f"Loja '{l['nome']}' removida do painel (e os acessos a ela).")


def cmd_usuarios(args):
    params = {"select": "papel,perfis(email,nome,super_admin),lojas(nome,merchant_id,cliente:clientes(slug))"}
    if args.cliente:
        params["loja_id"] = _in(l["id"] for l in lojas_do_cliente(args.cliente))
    linhas = [
        {
            "email": a["perfis"]["email"],
            "nome": a["perfis"]["nome"],
            "cliente": (a["lojas"].get("cliente") or {}).get("slug"),
            "loja": a["lojas"]["nome"],
            "papel": a["papel"],
        }
        for a in rest("GET", "acessos", params)
    ]
    linhas.sort(key=lambda l: (l["email"], l["cliente"] or "", l["loja"] or ""))
    _tabela(linhas, ["email", "nome", "cliente", "loja", "papel"])
    supers = rest("GET", "perfis", {"select": "email", "super_admin": "is.true"})
    if supers:
        print("\nSuper admins (veem tudo):", ", ".join(s["email"] for s in supers))


def cmd_usuario_criar(args):
    senha = _senha()
    resp = requests.post(
        f"{URL}/auth/v1/admin/users",
        headers=_h(),
        json={"email": args.email.strip().lower(), "password": senha, "email_confirm": True, "user_metadata": {"nome": args.nome}},
        timeout=15,
    )
    if not resp.ok:
        raise Erro(f"Supabase recusou ({resp.status_code}): {resp.text[:300]}")
    rest("PATCH", "perfis", {"id": f"eq.{resp.json()['id']}"}, {"senha_temporaria": True})
    print(f"Usuário criado: {args.email}  senha temporária: {senha}")
    print("Ele ainda não vê nenhuma loja. Dê acesso com: gerenciar.py acesso-dar ...")


def cmd_usuario_senha(args):
    u = usuario(args.email)
    senha = _senha()
    resp = requests.put(f"{URL}/auth/v1/admin/users/{u['id']}", headers=_h(), json={"password": senha, "email_confirm": True}, timeout=15)
    if not resp.ok:
        raise Erro(f"Supabase recusou ({resp.status_code}): {resp.text[:300]}")
    rest("PATCH", "perfis", {"id": f"eq.{u['id']}"}, {"senha_temporaria": True})
    print(f"Nova senha temporária de {u['email']}: {senha}")


def cmd_acesso(args):
    u = usuario(args.email)
    print(f"{u['nome']} <{u['email']}>" + ("  — SUPER ADMIN (vê todas as lojas)" if u.get("super_admin") else ""))
    acessos = rest("GET", "acessos", {"select": "papel,lojas(nome,merchant_id,cliente:clientes(slug))", "usuario_id": f"eq.{u['id']}"})
    _tabela(
        [{"cliente": (a["lojas"].get("cliente") or {}).get("slug"), "loja": a["lojas"]["nome"], "merchant_id": a["lojas"]["merchant_id"], "papel": a["papel"]} for a in acessos],
        ["cliente", "loja", "papel", "merchant_id"],
    )


def cmd_acesso_dar(args):
    u, lojas = usuario(args.email), _lojas_alvo(args)
    rest(
        "POST",
        "acessos",
        corpo=[{"usuario_id": u["id"], "loja_id": l["id"], "papel": args.papel} for l in lojas],
        prefer="resolution=merge-duplicates,return=minimal",
    )
    print(f"{u['email']} agora é {args.papel} em: " + ", ".join(l["nome"] for l in lojas))


def cmd_acesso_tirar(args):
    u = usuario(args.email)
    params = {"usuario_id": f"eq.{u['id']}"}
    if not args.tudo:
        params["loja_id"] = _in(l["id"] for l in _lojas_alvo(args))
    removidos = rest("DELETE", "acessos", params, prefer="return=representation") or []
    print(f"{len(removidos)} acesso(s) removido(s) de {u['email']}.")


def cmd_super_admin(args):
    u = usuario(args.email)
    rest("PATCH", "perfis", {"id": f"eq.{u['id']}"}, {"super_admin": not args.remover})
    print(f"{u['email']}: super admin {'removido' if args.remover else 'ativado'}.")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="comando", required=True)

    sub.add_parser("clientes").set_defaults(f=cmd_clientes)
    s = sub.add_parser("cliente-criar"); s.add_argument("nome"); s.add_argument("--slug"); s.set_defaults(f=cmd_cliente_criar)

    s = sub.add_parser("lojas"); s.add_argument("--cliente"); s.set_defaults(f=cmd_lojas)
    s = sub.add_parser("loja-criar"); s.add_argument("cliente"); s.add_argument("nome"); s.add_argument("merchant_id")
    s.add_argument("--plataforma", choices=("ifood", "99food"), default="ifood"); s.set_defaults(f=cmd_loja_criar)
    s = sub.add_parser("loja-mover"); s.add_argument("merchant_id"); s.add_argument("cliente"); s.set_defaults(f=cmd_loja_mover)
    s = sub.add_parser("loja-remover"); s.add_argument("merchant_id"); s.set_defaults(f=cmd_loja_remover)

    s = sub.add_parser("usuarios"); s.add_argument("--cliente"); s.set_defaults(f=cmd_usuarios)
    s = sub.add_parser("usuario-criar"); s.add_argument("email"); s.add_argument("nome"); s.set_defaults(f=cmd_usuario_criar)
    s = sub.add_parser("usuario-senha"); s.add_argument("email"); s.set_defaults(f=cmd_usuario_senha)

    s = sub.add_parser("acesso"); s.add_argument("email"); s.set_defaults(f=cmd_acesso)
    s = sub.add_parser("acesso-dar"); s.add_argument("email"); s.add_argument("papel", choices=PAPEIS)
    alvo = s.add_mutually_exclusive_group(required=True); alvo.add_argument("--cliente"); alvo.add_argument("--loja", action="append")
    s.set_defaults(f=cmd_acesso_dar)
    s = sub.add_parser("acesso-tirar"); s.add_argument("email")
    alvo = s.add_mutually_exclusive_group(required=True)
    alvo.add_argument("--cliente"); alvo.add_argument("--loja", action="append"); alvo.add_argument("--tudo", action="store_true")
    s.set_defaults(f=cmd_acesso_tirar)

    s = sub.add_parser("super-admin"); s.add_argument("email"); s.add_argument("--remover", action="store_true"); s.set_defaults(f=cmd_super_admin)

    args = p.parse_args()
    if not (URL and CHAVE):
        sys.exit("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no .env.")
    try:
        args.f(args)
    except Erro as exc:
        sys.exit(f"Erro: {exc}")


if __name__ == "__main__":
    main()
