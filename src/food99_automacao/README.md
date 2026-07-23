# Cliente 99Food / DiDi Food

Cliente Python da API aberta do **99Food** (marca brasileira do DiDi Food — `openapi.didi-food.com`).
Espelha a estrutura do `ifood_automacao`, pra plugar o 99Food como mais uma fonte de pedidos
no Delivery Integrator, ao lado do iFood.

Referência: [`openapi-didi-food.yaml`](openapi-didi-food.yaml) (swagger oficial fornecido).

## Credenciais (portal do desenvolvedor DiDi)

```
FOOD99_APP_ID=...        # id numérico do app
FOOD99_APP_SECRET=...    # segredo do app
```

## Uso

```python
from food99_automacao import client

# app_shop_id = id da loja no SEU sistema (o mesmo do vínculo)
pedido = client.order_detail("minha-loja-01", 2352921557674426622)
client.confirm_order("minha-loja-01", pedido_id)
client.order_ready("minha-loja-01", pedido_id)
client.cancel_order("minha-loja-01", pedido_id, reason_id=1010, reason="Sem estoque")

cardapio = client.list_items("minha-loja-01")
client.update_item_status("minha-loja-01", "PDV-123", disponivel=False)
```

Vincular uma loja nova (auto-serviço, como o modelo distribuído do iFood):

```python
from food99_automacao import auth
url = auth.get_authorization_url("minha-loja-01")   # manda essa URL pro lojista autorizar
```

## Dois modelos de autenticação

| Tipo | Endpoints | Como autentica |
|---|---|---|
| **Por loja** | pedidos, itens | `auth_token` (obtido por loja; cacheado e renovado sozinho) |
| **Nível-app** | `list_shops` | `app_id` + `timestamp` + `sign` (assinatura) |

## ⚠️ Pendência conhecida: algoritmo do `sign`

O swagger só diz *"signature generated as explained above"* e **não** traz o algoritmo — a
explicação mora na doc externa do DiDi (exige login). `auth.gerar_sign` implementa a
convenção mais comum (MD5 dos parâmetros ordenados + `app_secret`), mas **precisa ser
confirmada** na doc oficial antes de produção. Só afeta `list_shops` — o fluxo principal
(token → pedidos/itens) **não usa assinatura** e funciona sem isso.

## Status de teste

Código escrito e validado por sintaxe. **Não testado ao vivo** ainda — depende de
`FOOD99_APP_ID`/`FOOD99_APP_SECRET` reais e de uma loja vinculada. Assim que tiver as
credenciais, dá pra testar o fluxo de token + `order_detail` na hora.
