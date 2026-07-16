# auth_headers()

> God node · 27 connections · [C:\Users\Gustavo\Desktop\automação ifood\src\ifood_automacao\auth.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/src/ifood_automacao/auth.py#L45)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as auth_headers()
    participant P1 as upsert_item()
    participant P2 as patch_item_external_code()
    participant P3 as update_item_status()
    participant P4 as update_item_price()
    participant P5 as get_access_token()
    participant P6 as list_merchants()
    participant P7 as list_catalogs()
    participant P8 as main()
    participant P9 as list_categories()
    participant P10 as create_category()
    participant P11 as create_combo()
    participant P12 as edit_category()
    participant P13 as update_item_shifts()
    participant P14 as create_interruption()
    participant P15 as create_option_group()
    participant P16 as create_option()
    participant P17 as delete_option()
    participant P18 as get_category()
    participant P19 as delete_category()
    participant P20 as delete_item()
    participant P21 as get_opening_hours()
    participant P22 as set_opening_hours()
    participant P23 as list_interruptions()
    participant P24 as delete_interruption()
    participant P25 as list_option_groups()
    participant P26 as delete_option_group()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P0->>+ P2: calls
    P2-->>- P0: return
    P2->>+ P0: calls
    P0-->>- P2: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P3->>+ P0: calls
    P0-->>- P3: return
    P0->>+ P4: calls
    P4-->>- P0: return
    P4->>+ P0: calls
    P0-->>- P4: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P5->>+ P0: calls
    P0-->>- P5: return
    P0->>+ P6: calls
    P6-->>- P0: return
    P6->>+ P0: calls
    P0-->>- P6: return
    P0->>+ P7: calls
    P7-->>- P0: return
    P7->>+ P0: calls
    P0-->>- P7: return
    P7->>+ P8: calls
    P8-->>- P7: return
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
```

## Connections by Relation

### calls
- [[upsert_item()]] `INFERRED`
- [[patch_item_external_code()]] `INFERRED`
- [[update_item_status()]] `INFERRED`
- [[update_item_price()]] `INFERRED`
- [[get_access_token()]] `EXTRACTED`
- [[list_merchants()]] `INFERRED`
- [[list_catalogs()]] `INFERRED`
- [[list_categories()]] `INFERRED`
- [[create_category()]] `INFERRED`
- [[create_combo()]] `INFERRED`
- [[edit_category()]] `INFERRED`
- [[update_item_shifts()]] `INFERRED`
- [[create_interruption()]] `INFERRED`
- [[create_option_group()]] `INFERRED`
- [[create_option()]] `INFERRED`
- [[delete_option()]] `INFERRED`
- [[get_category()]] `INFERRED`
- [[delete_category()]] `INFERRED`
- [[delete_item()]] `INFERRED`
- [[get_opening_hours()]] `INFERRED`

### contains
- [[auth.py]] `EXTRACTED`
- [[auth.py]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*