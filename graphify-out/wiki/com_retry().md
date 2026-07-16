# com_retry()

> God node · 29 connections · [C:\Users\Gustavo\Desktop\automação ifood\src\ifood_automacao\rate_limit.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/src/ifood_automacao/rate_limit.py#L7)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as com_retry()
    participant P1 as _catalog_id()
    participant P2 as criar_item()
    participant P3 as _merchant_id()
    participant P4 as registrar_auditoria()
    participant P5 as _categoria_id()
    participant P6 as criar_combo()
    participant P7 as editar_categoria()
    participant P8 as get_catalogo()
    participant P9 as criar_categoria_dedicada()
    participant P10 as get_categorias()
    participant P11 as get_categoria()
    participant P12 as main()
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
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P0: calls
    P0-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P5: calls
    P5-->>- P2: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P6->>+ P0: calls
    P0-->>- P6: return
    P6->>+ P3: calls
    P3-->>- P6: return
    P6->>+ P4: calls
    P4-->>- P6: return
    P6->>+ P1: calls
    P1-->>- P6: return
    P6->>+ P5: calls
    P5-->>- P6: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P1->>+ P9: calls
    P9-->>- P1: return
    P1->>+ P10: calls
    P10-->>- P1: return
    P1->>+ P11: calls
    P11-->>- P1: return
    P0->>+ P2: calls
    P2-->>- P0: return
    P0->>+ P12: calls
    P12-->>- P0: return
    P0->>+ P13: calls
    P13-->>- P0: return
    P0->>+ P6: calls
    P6-->>- P0: return
    P0->>+ P7: calls
    P7-->>- P0: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P0->>+ P8: calls
    P8-->>- P0: return
    P0->>+ P14: calls
    P14-->>- P0: return
    P0->>+ P15: calls
    P15-->>- P0: return
    P0->>+ P16: calls
    P16-->>- P0: return
    P0->>+ P17: calls
    P17-->>- P0: return
    P0->>+ P18: calls
    P18-->>- P0: return
    P0->>+ P9: calls
    P9-->>- P0: return
    P0->>+ P19: calls
    P19-->>- P0: return
    P0->>+ P20: calls
    P20-->>- P0: return
    P0->>+ P21: calls
    P21-->>- P0: return
    P0->>+ P22: calls
    P22-->>- P0: return
    P0->>+ P23: calls
    P23-->>- P0: return
    P0->>+ P24: calls
    P24-->>- P0: return
    P0->>+ P10: calls
    P10-->>- P0: return
    P0->>+ P11: calls
    P11-->>- P0: return
    P0->>+ P25: calls
    P25-->>- P0: return
    P0->>+ P26: calls
    P26-->>- P0: return
    P0->>+ P27: calls
    P27-->>- P0: return
    P0->>+ P28: calls
    P28-->>- P0: return
    P0->>+ P29: calls
    P29-->>- P0: return
```

## Connections by Relation

### calls
- [[_catalog_id()]] `INFERRED`
- [[criar_item()]] `INFERRED`
- [[main()]] `INFERRED`
- [[pausar_em_massa()]] `INFERRED`
- [[criar_combo()]] `INFERRED`
- [[editar_categoria()]] `INFERRED`
- [[_categoria_id()]] `INFERRED`
- [[get_catalogo()]] `INFERRED`
- [[alterar_status()]] `INFERRED`
- [[alterar_preco()]] `INFERRED`
- [[alterar_codigo_pdv()]] `INFERRED`
- [[definir_horario_funcionamento()]] `INFERRED`
- [[criar_interrupcao()]] `INFERRED`
- [[criar_categoria_dedicada()]] `INFERRED`
- [[alterar_turnos()]] `INFERRED`
- [[excluir_interrupcao()]] `INFERRED`
- [[criar_grupo_opcao()]] `INFERRED`
- [[excluir_grupo_opcao()]] `INFERRED`
- [[criar_opcao()]] `INFERRED`
- [[excluir_opcao()]] `INFERRED`

### contains
- [[rate_limit.py]] `EXTRACTED`
- [[rate_limit.py]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*