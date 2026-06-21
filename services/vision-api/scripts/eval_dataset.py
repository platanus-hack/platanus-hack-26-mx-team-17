"""Evaluación de calidad de match con imágenes REALES de animales.

Valida el criterio de aceptación "el animal objetivo aparece en top 3" usando
fotos reales (no ruido), ejerciendo la discriminación visual de DINOv2.

Diseño:
- Descarga N fotos reales de perros distintos (placedog.net, cacheadas).
- Por cada query i:
    source  = foto original del animal i
    target  = versión aumentada de la MISMA foto (flip + crop + brillo),
              simulando una segunda toma del mismo animal
    distractores = fotos originales de los otros animales (j != i)
- Pool de candidatos = [target_i] + distractores. Se calcula la similitud
  coseno del embedding DINOv2 entre source y cada candidato, se rankea y se
  comprueba la posición del target.

Métricas: top-1 (target es rank 1) y top-3 (target en los 3 primeros).

Usa el MISMO código del servicio (app.model.embed_image, app.embeddings,
app.scoring), así que valida la ruta de producción. Corre en local, sin
Supabase ni red salvo la descarga de imágenes (cacheada).

Uso:
    python scripts/eval_dataset.py            # N=10 por defecto
    EVAL_N=14 python scripts/eval_dataset.py
"""

from __future__ import annotations

import io
import os
import sys
from pathlib import Path

import httpx
from PIL import Image, ImageEnhance

# Importa el código del servicio.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings  # noqa: E402
from app.embeddings import cosine_similarity  # noqa: E402
from app.model import init_model  # noqa: E402
from app.scoring import visual_score  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001
    pass

N = int(os.environ.get("EVAL_N", "10"))
CACHE = Path(__file__).resolve().parents[1] / "eval" / "cache"
CACHE.mkdir(parents=True, exist_ok=True)


def fetch_dog(idx: int) -> Image.Image:
    """Descarga (o lee de caché) una foto real de perro distinta por id."""
    path = CACHE / f"dog_{idx}.jpg"
    if not path.exists():
        url = f"https://placedog.net/640/480?id={idx}"
        r = httpx.get(url, timeout=30, follow_redirects=True)
        r.raise_for_status()
        path.write_bytes(r.content)
    return Image.open(io.BytesIO(path.read_bytes())).convert("RGB")


def augment(img: Image.Image) -> Image.Image:
    """Simula una segunda toma del mismo animal: flip + crop central + brillo."""
    w, h = img.size
    m = 0.10  # recorta 10% por lado
    cropped = img.crop((int(w * m), int(h * m), int(w * (1 - m)), int(h * (1 - m))))
    flipped = cropped.transpose(Image.FLIP_LEFT_RIGHT)
    brighter = ImageEnhance.Brightness(flipped).enhance(1.12)
    return brighter.resize((w, h))


def main() -> int:
    print(f"[1] Descargando {N} fotos reales de perros (cache: {CACHE})...")
    images: list[Image.Image] = []
    idx = 1
    seen: set[bytes] = set()
    while len(images) < N and idx < N * 4:
        try:
            img = fetch_dog(idx)
            key = img.resize((16, 16)).tobytes()
            if key not in seen:  # evita duplicados
                seen.add(key)
                images.append(img)
        except Exception as exc:  # noqa: BLE001
            print(f"   (id {idx} fallo: {type(exc).__name__})")
        idx += 1
    if len(images) < 3:
        print("   No se pudieron descargar suficientes imágenes.")
        return 1
    n = len(images)
    print(f"   {n} imágenes distintas listas.")

    print("[2] Cargando DINOv2 y calculando embeddings...")
    model = init_model(get_settings())
    src_emb = [model.embed_image(im) for im in images]
    tgt_emb = [model.embed_image(augment(im)) for im in images]

    print("[3] Evaluando (source vs target-mismo-animal + distractores)...")
    top1 = top3 = 0
    for i in range(n):
        # candidatos: target del animal i + originales de los demás
        cands = [("target", i, tgt_emb[i])] + [
            ("distractor", j, src_emb[j]) for j in range(n) if j != i
        ]
        scored = sorted(
            (
                (visual_score(cosine_similarity(src_emb[i], emb)), kind, j)
                for (kind, j, emb) in cands
            ),
            key=lambda t: t[0],
            reverse=True,
        )
        rank = next(k for k, (_, kind, _) in enumerate(scored, 1) if kind == "target")
        top1 += rank == 1
        top3 += rank <= 3
        best = scored[0][0]
        tgt_v = next(s for s, kind, _ in scored if kind == "target")
        print(f"   query {i:2d}: target rank {rank}  (visual target={tgt_v:.1f}, mejor={best:.1f})")

    print(f"\n=== Resultados ({n} queries) ===")
    print(f"top-1 accuracy: {top1}/{n} = {100*top1/n:.0f}%")
    print(f"top-3 accuracy: {top3}/{n} = {100*top3/n:.0f}%")
    ok = top3 == n
    print("=== EVAL OK ===" if ok else "=== EVAL con fallos ===")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
