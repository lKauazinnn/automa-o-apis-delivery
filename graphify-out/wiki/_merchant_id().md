# _merchant_id()

> God node · 28 connections · [C:\Users\Gustavo\Desktop\automação ifood\server\app.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/server/app.py#L178)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as _merchant_id()
    participant P1 as criar_item()
    participant P2 as com_retry()
    participant P3 as _catalog_id()
    participant P4 as main()
    participant P5 as pausar_em_massa()
    participant P6 as criar_combo()
    participant P7 as editar_categoria()
    participant P8 as _categoria_id()
    participant P9 as get_catalogo()
    participant P10 as alterar_status()
    participant P11 as alterar_preco()
    participant P12 as alterar_codigo_pdv()
    participant P13 as definir_horario_funcionamento()
    participant P14 as criar_interrupcao()
    participant P15 as criar_categoria_dedicada()
    participant P16 as alterar_turnos()
    participant P17 as excluir_interrupcao()
    participant P18 as criar_grupo_opcao()
    participant P19 as excluir_grupo_opcao()
    participant P20 as criar_opcao()
    participant P21 as excluir_opcao()
    participant P22 as get_categorias()
    participant P23 as get_categoria()
    participant P24 as excluir_categoria()
    participant P25 as excluir_item()
    participant P26 as get_horario_funcionamento()
    participant P27 as get_interrupcoes()
    participant P28 as get_grupos_opcao()
    participant P29 as registrar_auditoria()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P1: calls
    P1-->>- P2: return
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
    P2->>+ P10: calls
    P10-->>- P2: return
    P2->>+ P11: calls
    P11-->>- P2: return
    P2->>+ P12: calls
    P12-->>- P2: return
    P2->>+ P13: calls
    P13-->>- P2: return
    P2->>+ P14: calls
    P14-->>- P2: return
    P2->>+ P15: calls
    P15-->>- P2: return
    P2->>+ P16: calls
    P16-->>- P2: return
    P2->>+ P17: calls
    P17-->>- P2: return
    P2->>+ P18: calls
    P18-->>- P2: return
    P2->>+ P19: calls
    P19-->>- P2: return
    P2->>+ P20: calls
    P20-->>- P2: return
    P2->>+ P21: calls
    P21-->>- P2: return
    P2->>+ P22: calls
    P22-->>- P2: return
    P2->>+ P23: calls
    P23-->>- P2: return
    P2->>+ P24: calls
    P24-->>- P2: return
    P2->>+ P25: calls
    P25-->>- P2: return
    P2->>+ P26: calls
    P26-->>- P2: return
    P2->>+ P27: calls
    P27-->>- P2: return
    P2->>+ P28: calls
    P28-->>- P2: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P29: calls
    P29-->>- P1: return
    P1->>+ P3: calls
    P3-->>- P1: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P0->>+ P6: calls
    P6-->>- P0: return
    P0->>+ P7: calls
    P7-->>- P0: return
    P0->>+ P9: calls
    P9-->>- P0: return
    P0->>+ P10: calls
    P10-->>- P0: return
    P0->>+ P11: calls
    P11-->>- P0: return
    P0->>+ P12: calls
    P12-->>- P0: return
    P0->>+ P13: calls
    P13-->>- P0: return
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
    P0->>+ P25: calls
    P25-->>- P0: return
    P0->>+ P26: calls
    P26-->>- P0: return
    P0->>+ P27: calls
    P27-->>- P0: return
    P0->>+ P28: calls
    P28-->>- P0: return
```

## Connections by Relation

### calls
- [[criar_item()]] `EXTRACTED`
- [[pausar_em_massa()]] `EXTRACTED`
- [[criar_combo()]] `EXTRACTED`
- [[editar_categoria()]] `EXTRACTED`
- [[get_catalogo()]] `EXTRACTED`
- [[alterar_status()]] `EXTRACTED`
- [[alterar_preco()]] `EXTRACTED`
- [[alterar_codigo_pdv()]] `EXTRACTED`
- [[definir_horario_funcionamento()]] `EXTRACTED`
- [[criar_interrupcao()]] `EXTRACTED`
- [[criar_categoria_dedicada()]] `EXTRACTED`
- [[alterar_turnos()]] `EXTRACTED`
- [[excluir_interrupcao()]] `EXTRACTED`
- [[criar_grupo_opcao()]] `EXTRACTED`
- [[excluir_grupo_opcao()]] `EXTRACTED`
- [[criar_opcao()]] `EXTRACTED`
- [[excluir_opcao()]] `EXTRACTED`
- [[get_categorias()]] `EXTRACTED`
- [[get_categoria()]] `EXTRACTED`
- [[excluir_categoria()]] `EXTRACTED`

### contains
- [[app.py]] `EXTRACTED`
- [[app.py]] `EXTRACTED`

### rationale_for
- [[Loja alvo da requisição: vem de ?loja=<id> na query string, ou a padrão do .env.]] `EXTRACTED`
- [[Loja alvo da requisição: vem de ?loja=<id> na query string, ou a padrão do .env.]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*