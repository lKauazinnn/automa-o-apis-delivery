# _supabase_headers()

> God node · 13 connections · [C:\Users\Gustavo\Desktop\automação ifood\server\app.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/server/app.py#L97)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as _supabase_headers()
    participant P1 as registrar_auditoria()
    participant P2 as criar_item()
    participant P3 as com_retry()
    participant P4 as _merchant_id()
    participant P5 as _catalog_id()
    participant P6 as _categoria_id()
    participant P7 as convidar_usuario()
    participant P8 as _marcar_senha_temporaria()
    participant P9 as _gerar_senha_aleatoria()
    participant P10 as resetar_senha_usuario()
    participant P11 as pausar_em_massa()
    participant P12 as criar_combo()
    participant P13 as editar_categoria()
    participant P14 as alterar_status()
    participant P15 as alterar_preco()
    participant P16 as alterar_codigo_pdv()
    participant P17 as definir_horario_funcionamento()
    participant P18 as criar_interrupcao()
    participant P19 as criar_categoria_dedicada()
    participant P20 as alterar_turnos()
    participant P21 as criar_loja()
    participant P22 as remover_loja()
    participant P23 as alterar_papel_usuario()
    participant P24 as excluir_interrupcao()
    participant P25 as criar_grupo_opcao()
    participant P26 as excluir_grupo_opcao()
    participant P27 as criar_opcao()
    participant P28 as excluir_opcao()
    participant P29 as excluir_categoria()
    participant P30 as excluir_item()
    participant P31 as usuario_atual()
    participant P32 as get_lojas()
    participant P33 as get_auditoria()
    participant P34 as listar_usuarios()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P5: calls
    P5-->>- P2: return
    P2->>+ P6: calls
    P6-->>- P2: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P7->>+ P1: calls
    P1-->>- P7: return
    P7->>+ P0: calls
    P0-->>- P7: return
    P7->>+ P8: calls
    P8-->>- P7: return
    P7->>+ P9: calls
    P9-->>- P7: return
    P1->>+ P10: calls
    P10-->>- P1: return
    P10->>+ P1: calls
    P1-->>- P10: return
    P10->>+ P0: calls
    P0-->>- P10: return
    P10->>+ P8: calls
    P8-->>- P10: return
    P10->>+ P9: calls
    P9-->>- P10: return
    P1->>+ P11: calls
    P11-->>- P1: return
    P1->>+ P12: calls
    P12-->>- P1: return
    P1->>+ P13: calls
    P13-->>- P1: return
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
    P0->>+ P7: calls
    P7-->>- P0: return
    P0->>+ P10: calls
    P10-->>- P0: return
    P0->>+ P31: calls
    P31-->>- P0: return
    P0->>+ P8: calls
    P8-->>- P0: return
    P0->>+ P32: calls
    P32-->>- P0: return
    P0->>+ P21: calls
    P21-->>- P0: return
    P0->>+ P22: calls
    P22-->>- P0: return
    P0->>+ P23: calls
    P23-->>- P0: return
    P0->>+ P33: calls
    P33-->>- P0: return
    P0->>+ P34: calls
    P34-->>- P0: return
```

## Connections by Relation

### calls
- [[registrar_auditoria()]] `EXTRACTED`
- [[convidar_usuario()]] `EXTRACTED`
- [[resetar_senha_usuario()]] `EXTRACTED`
- [[usuario_atual()]] `EXTRACTED`
- [[_marcar_senha_temporaria()]] `EXTRACTED`
- [[get_lojas()]] `EXTRACTED`
- [[criar_loja()]] `EXTRACTED`
- [[remover_loja()]] `EXTRACTED`
- [[alterar_papel_usuario()]] `EXTRACTED`
- [[get_auditoria()]] `EXTRACTED`
- [[listar_usuarios()]] `EXTRACTED`

### contains
- [[app.py]] `EXTRACTED`
- [[app.py]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*