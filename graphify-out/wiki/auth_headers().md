# auth_headers()

> God node · 41 connections · [C:\Users\Gustavo\Desktop\automação ifood\src\ifood_automacao\auth.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/src/ifood_automacao/auth.py#L45)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as auth_headers()
    participant P1 as update_item_price()
    participant P2 as update_item_v3()
    participant P3 as get_auth_token()
    participant P4 as _post()
    participant P5 as update_item_campos()
    participant P6 as _achar_item_v3()
    participant P7 as list_items_v3()
    participant P8 as alterar_preco_99food()
    participant P9 as str
    participant P10 as registrar_auditoria()
    participant P11 as update_item_status()
    participant P12 as upsert_item()
    participant P13 as patch_item_external_code()
    participant P14 as get_access_token()
    participant P15 as list_merchants()
    participant P16 as list_catalogs()
    participant P17 as list_categories()
    participant P18 as create_category()
    participant P19 as get_merchant_details()
    participant P20 as get_merchant_status()
    participant P21 as create_combo()
    participant P22 as edit_category()
    participant P23 as update_item_shifts()
    participant P24 as create_interruption()
    participant P25 as create_option_group()
    participant P26 as create_option()
    participant P27 as delete_option()
    participant P28 as edit_option()
    participant P29 as update_option_price()
    participant P30 as update_option_status()
    participant P31 as upload_image()
    participant P32 as poll_events()
    participant P33 as acknowledge_events()
    participant P34 as get_order_details()
    participant P35 as get_category()
    participant P36 as delete_category()
    participant P37 as delete_item()
    participant P38 as get_opening_hours()
    participant P39 as set_opening_hours()
    participant P40 as list_interruptions()
    participant P41 as delete_interruption()
    participant P42 as list_option_groups()
    participant P43 as delete_option_group()
    participant P44 as confirm_order()
    participant P45 as start_preparation()
    participant P46 as ready_to_pickup()
    participant P47 as dispatch_order()
    participant P48 as cancel_order()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
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
    P1->>+ P6: calls
    P6-->>- P1: return
    P6->>+ P1: calls
    P1-->>- P6: return
    P6->>+ P5: calls
    P5-->>- P6: return
    P6->>+ P7: calls
    P7-->>- P6: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P8->>+ P9: calls
    P9-->>- P8: return
    P8->>+ P10: calls
    P10-->>- P8: return
    P8->>+ P1: calls
    P1-->>- P8: return
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
    P0->>+ P29: calls
    P29-->>- P0: return
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
    P0->>+ P35: calls
    P35-->>- P0: return
    P0->>+ P36: calls
    P36-->>- P0: return
    P0->>+ P37: calls
    P37-->>- P0: return
    P0->>+ P38: calls
    P38-->>- P0: return
    P0->>+ P39: calls
    P39-->>- P0: return
    P0->>+ P40: calls
    P40-->>- P0: return
    P0->>+ P41: calls
    P41-->>- P0: return
    P0->>+ P42: calls
    P42-->>- P0: return
    P0->>+ P43: calls
    P43-->>- P0: return
    P0->>+ P44: calls
    P44-->>- P0: return
    P0->>+ P45: calls
    P45-->>- P0: return
    P0->>+ P46: calls
    P46-->>- P0: return
    P0->>+ P47: calls
    P47-->>- P0: return
    P0->>+ P48: calls
    P48-->>- P0: return
```

## Connections by Relation

### calls
- [[update_item_price()]] `INFERRED`
- [[update_item_status()]] `INFERRED`
- [[upsert_item()]] `INFERRED`
- [[patch_item_external_code()]] `INFERRED`
- [[get_access_token()]] `EXTRACTED`
- [[list_merchants()]] `INFERRED`
- [[list_catalogs()]] `INFERRED`
- [[list_categories()]] `INFERRED`
- [[create_category()]] `INFERRED`
- [[get_merchant_details()]] `INFERRED`
- [[get_merchant_status()]] `INFERRED`
- [[create_combo()]] `INFERRED`
- [[edit_category()]] `INFERRED`
- [[update_item_shifts()]] `INFERRED`
- [[create_interruption()]] `INFERRED`
- [[create_option_group()]] `INFERRED`
- [[create_option()]] `INFERRED`
- [[delete_option()]] `INFERRED`
- [[edit_option()]] `INFERRED`
- [[update_option_price()]] `INFERRED`

### contains
- [[auth.py]] `EXTRACTED`
- [[auth.py]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*