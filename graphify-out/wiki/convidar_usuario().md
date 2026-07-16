# convidar_usuario()

> God node · 8 connections · [C:\Users\Gustavo\Desktop\automação ifood\server\app.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/server/app.py#L857)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as convidar_usuario()
    participant P1 as registrar_auditoria()
    participant P2 as _supabase_headers()
    participant P3 as resetar_senha_usuario()
    participant P4 as usuario_atual()
    participant P5 as _marcar_senha_temporaria()
    participant P6 as get_lojas()
    participant P7 as criar_loja()
    participant P8 as remover_loja()
    participant P9 as alterar_papel_usuario()
    participant P10 as get_auditoria()
    participant P11 as listar_usuarios()
    participant P12 as criar_item()
    participant P13 as com_retry()
    participant P14 as _merchant_id()
    participant P15 as _catalog_id()
    participant P16 as _categoria_id()
    participant P17 as pausar_em_massa()
    participant P18 as criar_combo()
    participant P19 as editar_categoria()
    participant P20 as alterar_status()
    participant P21 as alterar_preco()
    participant P22 as alterar_codigo_pdv()
    participant P23 as definir_horario_funcionamento()
    participant P24 as criar_interrupcao()
    participant P25 as criar_categoria_dedicada()
    participant P26 as alterar_turnos()
    participant P27 as excluir_interrupcao()
    participant P28 as criar_grupo_opcao()
    participant P29 as excluir_grupo_opcao()
    participant P30 as criar_opcao()
    participant P31 as excluir_opcao()
    participant P32 as excluir_categoria()
    participant P33 as excluir_item()
    participant P34 as _gerar_senha_aleatoria()
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
    P2->>+ P9: calls
    P9-->>- P2: return
    P2->>+ P10: calls
    P10-->>- P2: return
    P2->>+ P11: calls
    P11-->>- P2: return
    P1->>+ P12: calls
    P12-->>- P1: return
    P12->>+ P13: calls
    P13-->>- P12: return
    P12->>+ P14: calls
    P14-->>- P12: return
    P12->>+ P1: calls
    P1-->>- P12: return
    P12->>+ P15: calls
    P15-->>- P12: return
    P12->>+ P16: calls
    P16-->>- P12: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P3: calls
    P3-->>- P1: return
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
    P1->>+ P7: calls
    P7-->>- P1: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P1->>+ P9: calls
    P9-->>- P1: return
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
    P0->>+ P2: calls
    P2-->>- P0: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P0->>+ P34: calls
    P34-->>- P0: return
```

## Connections by Relation

### calls
- [[registrar_auditoria()]] `EXTRACTED`
- [[_supabase_headers()]] `EXTRACTED`
- [[_marcar_senha_temporaria()]] `EXTRACTED`
- [[_gerar_senha_aleatoria()]] `EXTRACTED`

### contains
- [[app.py]] `EXTRACTED`
- [[app.py]] `EXTRACTED`

### rationale_for
- [[Convida alguém por e-mail (Supabase manda o link de convite). O perfil (nome + p]] `EXTRACTED`
- [[Cria a conta do usuário direto pela Admin API do Supabase, já com senha definida]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*