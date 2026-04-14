import os
import json
import requests
from pathlib import Path

# ---------- настройки ----------
CRM_URL   = "https://nurbahti2004.retailcrm.ru"
CRM_KEY   = "vdwh6myJZqfbSDuNF2i8EIorsDAF3l07"

TG_TOKEN  = "8703035053:AAGFvkhw4yVOWAqRqOZl7_yR83DMlkMb78c"          # токен от BotFather
TG_CHAT   = "1651083300"             # ваш chat_id (число или @channelname)

THRESHOLD = 50000                   # порог суммы, ₸
STATE_FILE = Path(__file__).with_name("last_seen.txt")
# --------------------------------


def load_last_seen() -> int:
    if STATE_FILE.exists():
        try:
            return int(STATE_FILE.read_text().strip())
        except ValueError:
            pass
    return 0


def save_last_seen(order_id: int) -> None:
    STATE_FILE.write_text(str(order_id))


def fetch_new_orders(last_id: int):
    """Забираем заказы с id > last_id, постранично по 100."""
    page = 1
    new_orders = []
    while True:
        params = {
            "page": page,
            "limit": 100,
            # фильтр по id — получаем только то что новее
            "filter[ids][]": [],  # оставлено для заметки, ниже используем minId альтернативно
        }
        # У RetailCRM удобного filter[idGt] нет, поэтому сортируем по id desc
        # и останавливаемся, как только встретим уже обработанный.
        r = requests.get(
            f"{CRM_URL}/api/v5/orders",
            headers={"X-API-KEY": CRM_KEY},
            params={"page": page, "limit": 100},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        orders = data.get("orders", [])
        if not orders:
            break

        stop = False
        for o in orders:
            if o["id"] <= last_id:
                stop = True
                break
            new_orders.append(o)
        if stop:
            break

        pag = data.get("pagination", {})
        if page >= pag.get("totalPageCount", 1):
            break
        page += 1

    # От старых к новым
    new_orders.sort(key=lambda x: x["id"])
    return new_orders


def send_telegram(text: str) -> None:
    r = requests.post(
        f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
        json={
            "chat_id": TG_CHAT,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        },
        timeout=15,
    )
    if not r.ok:
        print(f"Telegram error: {r.status_code} {r.text}")


def format_message(o: dict) -> str:
    total = int(o.get("totalSumm") or 0)
    name  = f'{o.get("firstName","")} {o.get("lastName","")}'.strip() or "—"
    phone = o.get("phone") or "—"
    city  = ((o.get("delivery") or {}).get("address") or {}).get("city") or "—"
    utm   = (o.get("customFields") or {}).get("utm_source") or "—"
    num   = o.get("number") or o.get("id")

    items = o.get("items") or []
    lines = []
    for it in items[:5]:
        pname = (it.get("offer") or {}).get("name") or it.get("productName") or "товар"
        qty   = it.get("quantity") or 1
        lines.append(f"• {pname} × {qty}")
    items_block = "\n".join(lines) if lines else "—"
    if len(items) > 5:
        items_block += f"\n• …и ещё {len(items) - 5}"

    crm_link = f"{CRM_URL}/orders/{o['id']}/edit"

    return (
        f"🔥 <b>Крупный заказ #{num}</b>\n"
        f"💰 <b>{total:,} ₸</b>\n\n"
        f"👤 {name}\n"
        f"📞 {phone}\n"
        f"🏙 {city}\n"
        f"🔗 UTM: {utm}\n\n"
        f"<b>Состав:</b>\n{items_block}\n\n"
        f'<a href="{crm_link}">Открыть в CRM</a>'
    ).replace(",", " ")  # формат чисел с пробелами


def main():
    last_seen = load_last_seen()
    print(f"[info] last_seen = {last_seen}")

    orders = fetch_new_orders(last_seen)
    print(f"[info] новых заказов: {len(orders)}")

    max_id = last_seen
    sent = 0
    for o in orders:
        max_id = max(max_id, o["id"])
        total = float(o.get("totalSumm") or 0)
        if total >= THRESHOLD:
            send_telegram(format_message(o))
            sent += 1
            print(f"[sent] order #{o.get('number')} — {total:.0f} ₸")

    if max_id > last_seen:
        save_last_seen(max_id)
        print(f"[info] обновлён last_seen → {max_id}")

    print(f"[done] отправлено уведомлений: {sent}")


if __name__ == "__main__":
    main()
