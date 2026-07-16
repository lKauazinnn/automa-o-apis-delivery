# registrar_auditoria()

> God node · 28 connections · [C:\Users\Gustavo\Desktop\automação ifood\server\app.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/server/app.py#L198)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as registrar_auditoria()
    participant P1 as _supabase_headers()
    participant P2 as convidar_usuario()
    participant P3 as _marcar_senha_temporaria()
    participant P4 as _gerar_senha_aleatoria()
    participant P5 as resetar_senha_usuario()
    participant P6 as usuario_atual()
    participant P7 as ErroAutenticacao
    participant P8 as get_lojas()
    participant P9 as criar_loja()
    participant P10 as remover_loja()
    participant P11 as alterar_papel_usuario()
    participant P12 as get_auditoria()
    participant P13 as listar_usuarios()
    participant P14 as criar_item()
    participant P15 as pausar_em_massa()
    participant P16 as criar_combo()
    participant P17 as editar_categoria()
    participant P18 as alterar_status()
    participant P19 as alterar_preco()
    participant P20 as alterar_codigo_pdv()
    participant P21 as definir_horario_funcionamento()
    participant P22 as criar_interrupcao()
    participant P23 as criar_categoria_dedicada()
    participant P24 as alterar_turnos()
    participant P25 as excluir_interrupcao()
    participant P26 as criar_grupo_opcao()
    participant P27 as excluir_grupo_opcao()
    participant P28 as criar_opcao()
    participant P29 as excluir_opcao()
    participant P30 as excluir_categoria()
    participant P31 as excluir_item()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P0: calls
    P0-->>- P2: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P1->>+ P5: calls
    P5-->>- P1: return
    P5->>+ P0: calls
    P0-->>- P5: return
    P5->>+ P1: calls
    P1-->>- P5: return
    P5->>+ P3: calls
    P3-->>- P5: return
    P5->>+ P4: calls
    P4-->>- P5: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P6->>+ P1: calls
    P1-->>- P6: return
    P6->>+ P7: calls
    P7-->>- P6: return
    P1->>+ P3: calls
    P3-->>- P1: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P1->>+ P9: calls
    P9-->>- P1: return
    P1->>+ P10: calls
    P10-->>- P1: return
    P1->>+ P11: calls
    P11-->>- P1: return
    P1->>+ P12: calls
    P12-->>- P1: return
    P1->>+ P13: calls
    P13-->>- P1: return
    P0->>+ P14: calls
    P14-->>- P0: return
    P0->>+ P2: calls
    P2-->>- P0: return
    P0->>+ P5: calls
    P5-->>- P0: return
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
    P0->>+ P9: calls
    P9-->>- P0: return
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
    P0->>+ P30: calls
    P30-->>- P0: return
    P0->>+ P31: calls
    P31-->>- P0: return
```

## Connections by Relation

### calls
- [[_supabase_headers()]] `EXTRACTED`
- [[criar_item()]] `EXTRACTED`
- [[convidar_usuario()]] `EXTRACTED`
- [[resetar_senha_usuario()]] `EXTRACTED`
- [[pausar_em_massa()]] `EXTRACTED`
- [[criar_combo()]] `EXTRACTED`
- [[editar_categoria()]] `EXTRACTED`
- [[alterar_status()]] `EXTRACTED`
- [[alterar_preco()]] `EXTRACTED`
- [[alterar_codigo_pdv()]] `EXTRACTED`
- [[definir_horario_funcionamento()]] `EXTRACTED`
- [[criar_interrupcao()]] `EXTRACTED`
- [[criar_categoria_dedicada()]] `EXTRACTED`
- [[alterar_turnos()]] `EXTRACTED`
- [[criar_loja()]] `EXTRACTED`
- [[remover_loja()]] `EXTRACTED`
- [[alterar_papel_usuario()]] `EXTRACTED`
- [[excluir_interrupcao()]] `EXTRACTED`
- [[criar_grupo_opcao()]] `EXTRACTED`
- [[excluir_grupo_opcao()]] `EXTRACTED`

### contains
- [[app.py]] `EXTRACTED`
- [[app.py]] `EXTRACTED`

### rationale_for
- [[Grava uma linha na tabela `auditoria` do Supabase para toda ação que altera o ca]] `EXTRACTED`
- [[Grava uma linha na tabela `auditoria` do Supabase para toda ação que altera o ca]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*