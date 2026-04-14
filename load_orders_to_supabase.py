"""
Выгрузка всех заказов из RetailCRM в Supabase.
Разовый запуск. Повторный запуск безопасен — используется upsert по id.

Установка зависимостей:
    pip install requests supabase
"""

import os
import requests
from supabase import create_client

# ---------- настройки ----------
CRM_URL  = "https://nurbahti2004.retailcrm.ru"
CRM_KEY  = "vdwh6myJZqfbSDuNF2i8EIorsDAF3l07"

SB_URL   = "https://jbmjwvxaeeyanybsunny.supabase.co"
SB_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibWp3dnhhZWV5YW55YnN1bm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODAyNDcsImV4cCI6MjA5MTY1NjI0N30.BNF5dzhZNn5BKtrAjlxB-3NE_BjI3B04gNANca0y3Nk"  # service_role, не anon

PAGE_LIMIT = 100  # максимум для /orders
# --------------------------------

sb = create_client(SB_URL, SB_KEY)


def fetch_all_orders():
    """Постранично тянем все заказы из RetailCRM."""
    page = 1
    while True:
        r = requests.get(
            f"{CRM_URL}/api/v5/orders",
            headers={"X-API-KEY": CRM_KEY},
            params={"page": page, "limit": PAGE_LIMIT},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()

        orders = data.get("orders", [])
        if not orders:
            break

        yield from orders

        pagination = data.get("pagination", {})
        if page >= pagination.get("totalPageCount", 1):
            break
        page += 1


def flatten_order(o: dict) -> dict:
    """Превращаем заказ RetailCRM в плоскую строку для таблицы orders."""
    delivery = o.get("delivery") or {}
    address  = delivery.get("address") or {}
    custom   = o.get("customFields") or {}

    return {
        "id":           o["id"],
        "number":       o.get("number"),
        "external_id":  o.get("externalId"),
        "status":       o.get("status"),
        "order_type":   o.get("orderType"),
        "order_method": o.get("orderMethod"),
        "created_at":   o.get("createdAt"),
        "first_name":   o.get("firstName"),
        "last_name":    o.get("lastName"),
        "phone":        o.get("phone"),
        "email":        o.get("email"),
        "total_summ":   o.get("totalSumm"),
        "city":         address.get("city"),
        "address":      address.get("text"),
        "utm_source":   custom.get("utm_source"),
        "raw":          o,
    }


def flatten_items(o: dict):
    """Позиции заказа для таблицы order_items."""
    for item in o.get("items", []):
        yield {
            "id":             item["id"],
            "order_id":       o["id"],
            "product_name":   (item.get("offer") or {}).get("name") or item.get("productName"),
            "quantity":       item.get("quantity"),
            "initial_price":  item.get("initialPrice"),
            "discount_total": item.get("discountTotal"),
            "raw":            item,
        }


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def main():
    orders_rows = []
    items_rows  = []

    print("Загружаю заказы из RetailCRM...")
    for o in fetch_all_orders():
        orders_rows.append(flatten_order(o))
        items_rows.extend(flatten_items(o))

    print(f"Получено заказов: {len(orders_rows)}, позиций: {len(items_rows)}")

    # upsert пачками — Supabase не любит гигантские payload'ы
    print("Пишу orders в Supabase...")
    for batch in chunked(orders_rows, 500):
        sb.table("orders").upsert(batch, on_conflict="id").execute()

    print("Пишу order_items в Supabase...")
    for batch in chunked(items_rows, 500):
        sb.table("order_items").upsert(batch, on_conflict="id").execute()

    print("Готово.")


if __name__ == "__main__":
    main()