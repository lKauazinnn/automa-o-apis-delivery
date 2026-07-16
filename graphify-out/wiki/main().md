# main()

> God node · 8 connections · [C:\Users\Gustavo\Desktop\automação ifood\scripts\carga_massa.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/scripts/carga_massa.py#L51)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as main()
    participant P1 as com_retry()
    participant P2 as _catalog_id()
    participant P3 as criar_item()
    participant P4 as criar_combo()
    participant P5 as editar_categoria()
    participant P6 as get_catalogo()
    participant P7 as criar_categoria_dedicada()
    participant P8 as get_categorias()
    participant P9 as get_categoria()
    participant P10 as _merchant_id()
    participant P11 as registrar_auditoria()
    participant P12 as _categoria_id()
    participant P13 as pausar_em_massa()
    participant P14 as alterar_status()
    participant P15 as alterar_preco()
    participant P16 as alterar_codigo_pdv()
    participant P17 as definir_horario_funcionamento()
    participant P18 as criar_interrupcao()
    participant P19 as alterar_turnos()
    participant P20 as excluir_interrupcao()
    participant P21 as criar_grupo_opcao()
    participant P22 as excluir_grupo_opcao()
    participant P23 as criar_opcao()
    participant P24 as excluir_opcao()
    participant P25 as excluir_categoria()
    participant P26 as excluir_item()
    participant P27 as get_horario_funcionamento()
    participant P28 as get_interrupcoes()
    participant P29 as get_grupos_opcao()
    participant P30 as list_catalogs()
    participant P31 as list_categories()
    participant P32 as carregar_ja_processados()
    participant P33 as registrar()
    participant P34 as carregar_itens()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
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
    P2->>+ P9: calls
    P9-->>- P2: return
    P1->>+ P3: calls
    P3-->>- P1: return
    P3->>+ P1: calls
    P1-->>- P3: return
    P3->>+ P10: calls
    P10-->>- P3: return
    P3->>+ P11: calls
    P11-->>- P3: return
    P3->>+ P2: calls
    P2-->>- P3: return
    P3->>+ P12: calls
    P12-->>- P3: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P13: calls
    P13-->>- P1: return
    P1->>+ P4: calls
    P4-->>- P1: return
    P1->>+ P5: calls
    P5-->>- P1: return
    P1->>+ P12: calls
    P12-->>- P1: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P1->>+ P14: calls
    P14-->>- P1: return
    P1->>+ P15: calls
    P15-->>- P1: return
    P1->>+ P16: calls
    P16-->>- P1: return
    P1->>+ P17: calls
    P17-->>- P1: return
    P1->>+ P18: calls
    P18-->>- P1: return
    P1->>+ P7: calls
    P7-->>- P1: return
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
    P1->>+ P8: calls
    P8-->>- P1: return
    P1->>+ P9: calls
    P9-->>- P1: return
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
    P0->>+ P30: calls
    P30-->>- P0: return
    P0->>+ P31: calls
    P31-->>- P0: return
    P0->>+ P32: calls
    P32-->>- P0: return
    P0->>+ P33: calls
    P33-->>- P0: return
    P0->>+ P34: calls
    P34-->>- P0: return
```

## Connections by Relation

### calls
- [[com_retry()]] `INFERRED`
- [[list_catalogs()]] `INFERRED`
- [[list_categories()]] `INFERRED`
- [[carregar_ja_processados()]] `EXTRACTED`
- [[registrar()]] `EXTRACTED`
- [[carregar_itens()]] `INFERRED`

### contains
- [[carga_massa.py]] `EXTRACTED`
- [[carga_massa.py]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*