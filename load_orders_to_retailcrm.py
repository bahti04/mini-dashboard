import json
import requests

CRM_URL = "https://nurbahti2004.retailcrm.ru"
API_KEY = "vdwh6myJZqfbSDuNF2i8EIorsDAF3l07"

with open("mock_orders.json", "r", encoding="utf-8") as f:
    orders = json.load(f)

# подставляем реальный код типа заказа
for o in orders:
    o["orderType"] = "main"

for i in range(0, len(orders), 50):
    batch = orders[i:i+50]
    r = requests.post(
        f"{CRM_URL}/api/v5/orders/upload",
        headers={"X-API-KEY": API_KEY},
        data={"orders": json.dumps(batch, ensure_ascii=False)},
    )
    print(f"Батч {i//50 + 1}: HTTP {r.status_code}")
    print(json.dumps(r.json(), ensure_ascii=False, indent=2))