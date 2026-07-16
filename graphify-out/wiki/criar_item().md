# criar_item()

> God node · 9 connections · [C:\Users\Gustavo\Desktop\automação ifood\server\app.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/server/app.py#L476)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as criar_item()
    participant P1 as com_retry()
    participant P2 as _catalog_id()
    participant P3 as criar_combo()
    participant P4 as editar_categoria()
    participant P5 as get_catalogo()
    participant P6 as criar_categoria_dedicada()
    participant P7 as get_categorias()
    participant P8 as get_categoria()
    participant P9 as main()
    participant P10 as list_catalogs()
    participant P11 as list_categories()
    participant P12 as carregar_ja_processados()
    participant P13 as registrar()
    participant P14 as carregar_itens()
    participant P15 as pausar_em_massa()
    participant P16 as _categoria_id()
    participant P17 as alterar_status()
    participant P18 as alterar_preco()
    participant P19 as alterar_codigo_pdv()
    participant P20 as definir_horario_funcionamento()
    participant P21 as criar_interrupcao()
    participant P22 as alterar_turnos()
    participant P23 as excluir_interrupcao()
    participant P24 as criar_grupo_opcao()
    participant P25 as excluir_grupo_opcao()
    participant P26 as criar_opcao()
    participant P27 as excluir_opcao()
    participant P28 as excluir_categoria()
    participant P29 as excluir_item()
    participant P30 as get_horario_funcionamento()
    participant P31 as get_interrupcoes()
    participant P32 as get_grupos_opcao()
    participant P33 as _merchant_id()
    participant P34 as registrar_auditoria()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P0: calls
    P0-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P2->>+ P5: calls
    P5-->>- P2: return
    P2->>+ P6: calls
    P6-->>- P2: return
    P2->>+ P7: calls
    P7-->>- P2: return
    P2->>+ P8: calls
    P8-->>- P2: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P9: calls
    P9-->>- P1: return
    P9->>+ P1: calls
    P1-->>- P9: return
    P9->>+ P10: calls
    P10-->>- P9: return
    P9->>+ P11: calls
    P11-->>- P9: return
    P9->>+ P12: calls
    P12-->>- P9: return
    P9->>+ P13: calls
    P13-->>- P9: return
    P9->>+ P14: calls
    P14-->>- P9: return
    P1->>+ P15: calls
    P15-->>- P1: return
    P1->>+ P3: calls
    P3-->>- P1: return
    P1->>+ P4: calls
    P4-->>- P1: return
    P1->>+ P16: calls
    P16-->>- P1: return
    P1->>+ P5: calls
    P5-->>- P1: return
    P1->>+ P17: calls
    P17-->>- P1: return
    P1->>+ P18: calls
    P18-->>- P1: return
    P1->>+ P19: calls
    P19-->>- P1: return
    P1->>+ P20: calls
    P20-->>- P1: return
    P1->>+ P21: calls
    P21-->>- P1: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P1->>+ P22: calls
    P22-->>- P1: return
    P1->>+ P23: calls
    P23-->>- P1: return
    P1->>+ P24: calls
    P24-->>- P1: return
    P1->>+ P25: calls
    P25-->>- P1: return
    P1->>+ P26: calls
    P26-->>- P1: return
    P1->>+ P27: calls
    P27-->>- P1: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P1->>+ P28: calls
    P28-->>- P1: return
    P1->>+ P29: calls
    P29-->>- P1: return
    P1->>+ P30: calls
    P30-->>- P1: return
    P1->>+ P31: calls
    P31-->>- P1: return
    P1->>+ P32: calls
    P32-->>- P1: return
    P0->>+ P33: calls
    P33-->>- P0: return
    P0->>+ P34: calls
    P34-->>- P0: return
    P0->>+ P2: calls
    P2-->>- P0: return
    P0->>+ P16: calls
    P16-->>- P0: return
```

## Connections by Relation

### calls
- [[com_retry()]] `INFERRED`
- [[_merchant_id()]] `EXTRACTED`
- [[registrar_auditoria()]] `EXTRACTED`
- [[_catalog_id()]] `EXTRACTED`
- [[_categoria_id()]] `EXTRACTED`

### contains
- [[app.py]] `EXTRACTED`
- [[app.py]] `EXTRACTED`

### rationale_for
- [[Cria um item novo. Só administrador/gerente pode — e agora isso é checado de ver]] `EXTRACTED`
- [[Cria um item novo. Só administrador/gerente pode — e agora isso é checado de ver]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*