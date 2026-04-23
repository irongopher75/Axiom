import sys
import os
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "packages" / "ml-engine" / "src"))

import duckdb
from app.core.sidecar_auth import get_password_hash

# Path to the duckdb file
db_path = Path("/Users/vishnupanicker/Library/Application Support/AXIOM/axiom.duckdb")

# Ensure directory exists
db_path.parent.mkdir(parents=True, exist_ok=True)

# Connect to DB
conn = duckdb.connect(str(db_path))

# Ensure users table exists (mirroring the logic in DuckDBClient.initialize)
conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        email VARCHAR PRIMARY KEY,
        hashed_password VARCHAR,
        is_active BOOLEAN DEFAULT TRUE,
        is_approved BOOLEAN DEFAULT FALSE,
        is_superuser BOOLEAN DEFAULT FALSE,
        subscribed_to_news BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# Insert admin user
email = "admin@axiom.local"
password = "adminpassword123"
hashed = get_password_hash(password)

conn.execute("""
    INSERT OR REPLACE INTO users (email, hashed_password, is_active, is_approved, is_superuser)
    VALUES (?, ?, TRUE, TRUE, TRUE)
""", [email, hashed])

conn.close()
print(f"Admin user created: {email} / {password}")
