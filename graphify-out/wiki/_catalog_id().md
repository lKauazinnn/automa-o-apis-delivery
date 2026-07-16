# _catalog_id()

> God node · 10 connections · [C:\Users\Gustavo\Desktop\automação ifood\server\app.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/server/app.py#L183)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as _catalog_id()
    participant P1 as com_retry()
    participant P2 as criar_item()
    participant P3 as _merchant_id()
    participant P4 as registrar_auditoria()
    participant P5 as _categoria_id()
    participant P6 as main()
    participant P7 as list_catalogs()
    participant P8 as list_categories()
    participant P9 as carregar_ja_processados()
    participant P10 as registrar()
    participant P11 as carregar_itens()
    participant P12 as pausar_em_massa()
    participant P13 as criar_combo()
    participant P14 as editar_categoria()
    participant P15 as get_catalogo()
    participant P16 as alterar_status()
    participant P17 as alterar_preco()
    participant P18 as alterar_codigo_pdv()
    participant P19 as definir_horario_funcionamento()
    participant P20 as criar_interrupcao()
    participant P21 as criar_categoria_dedicada()
    participant P22 as alterar_turnos()
    participant P23 as excluir_interrupcao()
    participant P24 as criar_grupo_opcao()
    participant P25 as excluir_grupo_opcao()
    participant P26 as criar_opcao()
    participant P27 as excluir_opcao()
    participant P28 as get_categorias()
    participant P29 as get_categoria()
    participant P30 as excluir_categoria()
    participant P31 as excluir_item()
    participant P32 as get_horario_funcionamento()
    participant P33 as get_interrupcoes()
    participant P34 as get_grupos_opcao()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P2->>+ P0: calls
    P0-->>- P2: return
    P2->>+ P5: calls
    P5-->>- P2: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P6->>+ P1: calls
    P1-->>- P6: return
    P6->>+ P7: calls
    P7-->>- P6: return
    P6->>+ P8: calls
    P8-->>- P6: return
    P6->>+ P9: calls
    P9-->>- P6: return
    P6->>+ P10: calls
    P10-->>- P6: return
    P6->>+ P11: calls
    P11-->>- P6: return
    P1->>+ P12: calls
    P12-->>- P1: return
    P1->>+ P13: calls
    P13-->>- P1: return
    P1->>+ P14: calls
    P14-->>- P1: return
    P1->>+ P5: calls
    P5-->>- P1: return
    P1->>+ P15: calls
    P15-->>- P1: return
    P1->>+ P16: calls
    P16-->>- P1: return
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
    P1->>+ P33: calls
    P33-->>- P1: return
    P1->>+ P34: calls
    P34-->>- P1: return
    P0->>+ P2: calls
    P2-->>- P0: return
    P0->>+ P13: calls
    P13-->>- P0: return
    P0->>+ P14: calls
    P14-->>- P0: return
    P0->>+ P15: calls
    P15-->>- P0: return
    P0->>+ P21: calls
    P21-->>- P0: return
    P0->>+ P28: calls
    P28-->>- P0: return
    P0->>+ P29: calls
    P29-->>- P0: return
```

## Connections by Relation

### calls
- [[com_retry()]] `INFERRED`
- [[criar_item()]] `EXTRACTED`
- [[criar_combo()]] `EXTRACTED`
- [[editar_categoria()]] `EXTRACTED`
- [[get_catalogo()]] `EXTRACTED`
- [[criar_categoria_dedicada()]] `EXTRACTED`
- [[get_categorias()]] `EXTRACTED`
- [[get_categoria()]] `EXTRACTED`

### contains
- [[app.py]] `EXTRACTED`
- [[app.py]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*