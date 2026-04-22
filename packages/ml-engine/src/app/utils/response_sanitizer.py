import math
from datetime import date, datetime

import numpy as np
import pandas as pd


def sanitize_json_value(value):
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        numeric = float(value)
        if not math.isfinite(numeric):
            return None
        return numeric
    if isinstance(value, str):
        return value
    if pd.isna(value):
        return None
    return value


def sanitize_record(record: dict) -> dict:
    return {key: sanitize_json_value(value) for key, value in record.items()}


def sanitize_records(records: list[dict]) -> list[dict]:
    return [sanitize_record(record) for record in records]


def sanitize_json_data(value):
    if isinstance(value, dict):
        return {key: sanitize_json_data(item) for key, item in value.items()}
    if isinstance(value, list):
        return [sanitize_json_data(item) for item in value]
    return sanitize_json_value(value)
