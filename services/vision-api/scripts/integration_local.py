"""Integración end-to-end contra un Supabase LOCAL (supabase start).

Siembra datos reales (usuario, perfil, reportes, imágenes en Storage), llama al
endpoint /process del servicio Vision API y verifica:
  - 200 y el reporte "target" aparece en el top 3 (idealmente rank 1).
  - matches persistidos en la tabla `matches`.
  - report_updates con kind = "vision_processed".
  - idempotencia: force=false no duplica.

NO forma parte de pytest (requiere infraestructura viva). Ejecutar manualmente:

  VISION_SUPABASE_URL=http://127.0.0.1:54321 \
  VISION_SUPABASE_SERVICE_ROLE_KEY=... \
  VISION_SUPABASE_JWT_SECRET=... \
  VISION_API_URL=http://127.0.0.1:8010 \
  python scripts/integration_local.py

No imprime secretos.
"""

from __future__ import annotations

import io
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import jwt
import numpy as np
from dotenv import load_dotenv
from PIL import Image

# Consola Windows (cp1252) no soporta algunos caracteres; forzamos UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001
    pass

load_dotenv()  # carga services/vision-api/.env si existe

SB_URL = os.environ["VISION_SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["VISION_SUPABASE_SERVICE_ROLE_KEY"]
JWT_SECRET = os.environ["VISION_SUPABASE_JWT_SECRET"]
VISION_URL = os.environ.get("VISION_API_URL", "http://127.0.0.1:8010").rstrip("/")
BUCKET = os.environ.get("VISION_STORAGE_BUCKET", "report-images")

SB_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

client = httpx.Client(timeout=30.0)


def _png(seed: int, size: int = 224) -> bytes:
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, size=(size, size, 3)).astype("uint8")
    buf = io.BytesIO()
    Image.fromarray(arr, "RGB").save(buf, format="PNG")
    return buf.getvalue()


def create_user(email: str) -> str:
    r = client.post(
        f"{SB_URL}/auth/v1/admin/users",
        headers=SB_HEADERS,
        json={"email": email, "password": "Passw0rd!demo", "email_confirm": True},
    )
    r.raise_for_status()
    return r.json()["id"]


def insert(table: str, row: dict) -> dict:
    r = client.post(
        f"{SB_URL}/rest/v1/{table}",
        headers={**SB_HEADERS, "Prefer": "return=representation"},
        json=row,
    )
    r.raise_for_status()
    return r.json()[0]


def upload_image(report_id: str, data: bytes) -> str:
    path = f"{report_id}/photo.png"
    r = client.post(
        f"{SB_URL}/storage/v1/object/{BUCKET}/{path}",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "image/png",
        },
        content=data,
    )
    r.raise_for_status()
    return path


def seed_report(author_id: str, title: str, image_seed: int, *, lat: float, lng: float) -> str:
    rid = str(uuid.uuid4())
    insert(
        "reports",
        {
            "id": rid,
            "author_id": author_id,
            "type": "lost",
            "status": "open",
            "title": title,
            "species": "perro",
            "attributes": {"color": "negro", "tamano": "mediano"},
            "lat": lat,
            "lng": lng,
            "location_accuracy_m": 8.0,
            "location_captured_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    path = upload_image(rid, _png(image_seed))
    insert(
        "report_images",
        {"report_id": rid, "storage_path": path, "is_primary": True},
    )
    return rid


def mint_jwt(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(claims, JWT_SECRET, algorithm="HS256")


def main() -> int:
    print("[1] Creando usuario (el perfil lo crea el trigger on_auth_user_created)...")
    uniq = uuid.uuid4().hex[:8]
    user_id = create_user(f"demo+{uniq}@huellasos.dev")

    print("[2] Sembrando reportes con imagen primaria...")
    # Seed único por ejecución: aísla este run aunque el proyecto compartido
    # acumule reportes de corridas anteriores (el pool de candidatos es global).
    base_seed = int(uniq, 16) % (2**31 - 10)
    source_id = seed_report(user_id, "Perro perdido (fuente)", base_seed, lat=19.4326, lng=-99.1332)
    target_id = seed_report(user_id, "Avistamiento compatible", base_seed, lat=19.4330, lng=-99.1340)
    for i in range(4):
        seed_report(user_id, f"Distractor {i}", base_seed + 1 + i, lat=19.0 + i * 0.5, lng=-99.0 - i * 0.5)

    token = mint_jwt(user_id)
    headers = {"Authorization": f"Bearer {token}"}

    print("[3] POST /process (force=true)...")
    r = client.post(
        f"{VISION_URL}/v1/reports/{source_id}/process",
        headers=headers,
        json={"force": True},
    )
    if r.status_code != 200:
        print(f"   FALLO HTTP {r.status_code}: {r.text}")
        return 1
    body = r.json()
    matches = body["matches"]
    ids = [m["candidate_report_id"] for m in matches]
    print(f"   matches devueltos: {len(matches)} | ranks={[m['rank'] for m in matches]}")
    print(f"   top compatibilidades: {[m['compatibility'] for m in matches]}")

    assert len(matches) == 3, f"se esperaban 3 matches, hubo {len(matches)}"
    assert target_id in ids, "el target NO aparece en el top 3"
    assert matches[0]["candidate_report_id"] == target_id, "el target no es rank 1"
    print("   OK: target en top 3 y rank 1.")

    print("[4] Verificando persistencia en DB...")
    mrows = client.get(
        f"{SB_URL}/rest/v1/matches",
        headers=SB_HEADERS,
        params={"source_report_id": f"eq.{source_id}", "select": "candidate_report_id,rank"},
    ).json()
    assert len(mrows) == 3, f"matches en DB = {len(mrows)} (esperado 3)"
    urows = client.get(
        f"{SB_URL}/rest/v1/report_updates",
        headers=SB_HEADERS,
        params={"report_id": f"eq.{source_id}", "kind": "eq.vision_processed", "select": "id"},
    ).json()
    assert len(urows) >= 1, "no se registró report_updates vision_processed"
    print(f"   OK: {len(mrows)} matches y {len(urows)} report_updates en DB.")

    print("[5] Idempotencia (force=false)...")
    r2 = client.post(
        f"{VISION_URL}/v1/reports/{source_id}/process",
        headers=headers,
        json={"force": False},
    )
    assert r2.status_code == 200, r2.text
    mrows2 = client.get(
        f"{SB_URL}/rest/v1/matches",
        headers=SB_HEADERS,
        params={"source_report_id": f"eq.{source_id}", "select": "id"},
    ).json()
    assert len(mrows2) == 3, f"idempotencia rota: {len(mrows2)} filas"
    print("   OK: sigue habiendo 3 matches (no se duplicó).")

    print("\n=== INTEGRACION OK ===")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as exc:
        print(f"\nASERCION FALLIDA: {exc}")
        sys.exit(1)
