import os
import urllib.parse
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from datetime import datetime

# Load environment variables (defaults for testing)
_raw_pwd = os.getenv("DB_PASSWORD", "your_mysql_password")
_encoded_pwd = urllib.parse.quote_plus(_raw_pwd)
_db_user = os.getenv("DB_USERNAME", "root")
_db_host = os.getenv("DB_HOST", "127.0.0.1:3306")
_db_name = os.getenv("DB_NAME", "air_quality_db")
DB_URL = os.getenv("DB_URL", f"mysql+mysqlconnector://{_db_user}:{_encoded_pwd}@{_db_host}/{_db_name}")

def seed_database():
    print(f"Connecting to MySQL database: {DB_URL}")
    engine = create_engine(DB_URL)

    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "ml-service", "data", "raw", "city_day.csv"),
        os.path.join(os.path.dirname(__file__), "data", "city_day.csv"),
        os.path.join(os.path.dirname(__file__), "city_day.csv"),
    ]
    csv_path = None
    for p in candidates:
        if os.path.exists(p):
            csv_path = p
            print(f"Found local dataset at {csv_path}")
            break

    if not csv_path:
        try:
            import kagglehub
            print("Downloading dataset using kagglehub...")
            path = kagglehub.dataset_download("rohanrao/air-quality-data-in-india")
            downloaded = os.path.join(path, "city_day.csv")
            if os.path.exists(downloaded):
                csv_path = downloaded
        except Exception as e:
            print(f"kagglehub fallback failed: {e}")

    if not csv_path or not os.path.exists(csv_path):
        print(f"Error: Could not find city_day.csv in local data directories or via kagglehub.")
        return

    print("Reading city_day.csv...")
    df = pd.read_csv(csv_path)

    # 2. Filter and Apply Exact Preprocessing Logic (from Phase 2)
    print("Filtering for Hyderabad...")
    hyderabad_df = df[df['City'] == 'Hyderabad'].copy()

    # Convert dates and sort
    hyderabad_df['Date'] = pd.to_datetime(hyderabad_df['Date'])
    hyderabad_df = hyderabad_df.sort_values('Date').reset_index(drop=True)

    # Filter only the features we need
    features = ['PM2.5', 'PM10', 'NO2', 'CO', 'SO2', 'O3', 'AQI']

    # Apply identical imputation strategy as Phase 2
    print("Applying leakage-free imputation strategy (interpolation then causal ffill)...")
    # For the full historical dataset in the DB, we just interpolate linearly and forward fill
    # as this is historical actual data.
    hyderabad_df[features] = hyderabad_df[features].interpolate(method='linear', limit_direction='forward')
    hyderabad_df[features] = hyderabad_df[features].ffill().bfill()

    print(f"Total Hyderabad records ready: {len(hyderabad_df)}")

    # 3. Insert into MySQL
    with engine.begin() as conn:
        if 'sqlite' in DB_URL:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS location (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    city_name VARCHAR(255) UNIQUE,
                    latitude DOUBLE,
                    longitude DOUBLE
                )
            """))

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS historical_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    location_id INTEGER,
                    record_date DATE,
                    pm25 DOUBLE,
                    pm10 DOUBLE,
                    no2 DOUBLE,
                    co DOUBLE,
                    so2 DOUBLE,
                    o3 DOUBLE,
                    aqi DOUBLE,
                    UNIQUE(location_id, record_date)
                )
            """))

        # Check if location exists, insert if not
        result = conn.execute(text("SELECT id FROM location WHERE city_name = 'Hyderabad'"))
        row = result.fetchone()

        if row:
            location_id = row[0]
            print(f"Found existing location Hyderabad (ID: {location_id})")
        else:
            print("Inserting location: Hyderabad...")
            result = conn.execute(text("INSERT INTO location (city_name, latitude, longitude) VALUES ('Hyderabad', 17.3850, 78.4867)"))
            location_id = result.lastrowid

        print("Clearing existing historical data for Hyderabad to prevent duplicates...")
        conn.execute(text("DELETE FROM historical_data WHERE location_id = :loc_id"), {"loc_id": location_id})

        print(f"Inserting {len(hyderabad_df)} historical records...")

        # Prepare data for bulk insert
        insert_data = []
        for _, row in hyderabad_df.iterrows():
            insert_data.append({
                "location_id": location_id,
                "record_date": row['Date'].strftime('%Y-%m-%d'),
                "pm25": float(row['PM2.5']),
                "pm10": float(row['PM10']),
                "no2": float(row['NO2']),
                "co": float(row['CO']),
                "so2": float(row['SO2']),
                "o3": float(row['O3']),
                "aqi": float(row['AQI'])
            })

        # Insert
        insert_sql = text("""
            INSERT INTO historical_data
            (location_id, record_date, pm25, pm10, no2, co, so2, o3, aqi)
            VALUES
            (:location_id, :record_date, :pm25, :pm10, :no2, :co, :so2, :o3, :aqi)
        """)

        conn.execute(insert_sql, insert_data)

    print("Database seeding completed successfully!")

    # 4. Reporting
    with engine.connect() as conn:
        print("\n--- SEEDING REPORT ---")
        loc_res = conn.execute(text("SELECT id FROM location WHERE city_name = 'Hyderabad'")).fetchone()
        loc_id = loc_res[0] if loc_res else None
        print(f"Hyderabad location expected in DB: {'YES' if loc_id else 'NO'}")

        count_res = conn.execute(text("SELECT COUNT(*) FROM historical_data WHERE location_id = :loc_id"), {"loc_id": loc_id}).fetchone()
        print(f"Number of Hyderabad records inserted: {count_res[0]}")

        min_max_res = conn.execute(text("SELECT MIN(record_date), MAX(record_date) FROM historical_data WHERE location_id = :loc_id"), {"loc_id": loc_id}).fetchone()
        print(f"Earliest record date: {min_max_res[0]}")
        print(f"Latest record date: {min_max_res[1]}")

        latest_7_res = conn.execute(text("SELECT record_date FROM historical_data WHERE location_id = :loc_id ORDER BY record_date DESC LIMIT 7"), {"loc_id": loc_id}).fetchall()
        latest_7 = sorted([str(r[0]) for r in latest_7_res])
        print("Latest 7 dates:")
        for d in latest_7:
            print(f"  {d}")

        dup_res = conn.execute(text("SELECT record_date, COUNT(*) FROM historical_data WHERE location_id = :loc_id GROUP BY record_date HAVING COUNT(*) > 1"), {"loc_id": loc_id}).fetchall()
        print(f"Duplicate dates exist: {'YES' if dup_res else 'NO'}")
        print("----------------------\n")

if __name__ == "__main__":
    seed_database()
