import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from app.utils.response_sanitizer import sanitize_json_data


def _cache_file(data_dir: str, namespace: str, key: str) -> Path:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    base = Path(data_dir) / "cache" / "live-fallback"
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{namespace}-{digest}.json"


def save_cached_payload(data_dir: str, namespace: str, key: str, payload):
    cache_path = _cache_file(data_dir, namespace, key)
    body = {
        "cached_at": datetime.now(UTC).isoformat(),
        "payload": sanitize_json_data(payload),
    }
    cache_path.write_text(json.dumps(body), encoding="utf-8")


def load_cached_payload(data_dir: str, namespace: str, key: str):
    cache_path = _cache_file(data_dir, namespace, key)
    if not cache_path.exists():
        return None
    try:
        data = json.loads(cache_path.read_text(encoding="utf-8"))
    except Exception:
        return None
    payload = data.get("payload")
    if payload is None:
        return None
    return {"payload": payload, "cached_at": data.get("cached_at")}
