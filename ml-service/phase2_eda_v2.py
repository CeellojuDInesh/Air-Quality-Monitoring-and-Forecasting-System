import os
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler
import kagglehub

os.makedirs('data/processed', exist_ok=True)

print("Downloading dataset...")
path = kagglehub.dataset_download("rohanrao/air-quality-data-in-india")
df = pd.read_csv(os.path.join(path, "city_day.csv"))

# 1. Filter for Hyderabad and sort chronologically
df_hyd = df[df['City'] == 'Hyderabad'].copy()
df_hyd['Date'] = pd.to_datetime(df_hyd['Date'])
df_hyd = df_hyd.sort_values('Date').reset_index(drop=True)
df_hyd.set_index('Date', inplace=True)
df_hyd = df_hyd.asfreq('D')

features = ['PM2.5', 'PM10', 'NO2', 'CO', 'SO2', 'O3', 'AQI']
df_hyd = df_hyd[features]

total_records = len(df_hyd)
print(f"Total records before split: {total_records}")

# 2. Chronological Split (BEFORE Imputation and Scaling)
train_end_idx = int(total_records * 0.7)
val_end_idx = int(total_records * 0.85)

train_df = df_hyd.iloc[:train_end_idx].copy()
val_df = df_hyd.iloc[train_end_idx:val_end_idx].copy()
test_df = df_hyd.iloc[val_end_idx:].copy()

train_end_date = train_df.index.max()
val_end_date = val_df.index.max()

print(f"Train date range: {train_df.index.min().date()} to {train_end_date.date()}")
print(f"Val date range: {val_df.index.min().date()} to {val_end_date.date()}")
print(f"Test date range: {test_df.index.min().date()} to {test_df.index.max().date()}")

# 3. Imputation (Leakage-free)
# Train: Linear interpolation is safe within the training set, then ffill/bfill for edges
train_df_imputed = train_df.interpolate(method='linear').ffill().bfill()

# Val: Strictly causal (forward fill only).
# We prepend the last known value from training to carry over across the boundary.
last_train_row = train_df_imputed.iloc[[-1]]
val_df_imputed = pd.concat([last_train_row, val_df]).ffill().iloc[1:]

# Test: Strictly causal (forward fill only).
last_val_row = val_df_imputed.iloc[[-1]]
test_df_imputed = pd.concat([last_val_row, test_df]).ffill().iloc[1:]

# Combine imputed data for scaling convenience
df_imputed = pd.concat([train_df_imputed, val_df_imputed, test_df_imputed])

print("\nMissing values after leakage-free imputation:")
print(df_imputed.isnull().sum())

# 4. Scaling (Fit ONLY on train data)
scaler_features = MinMaxScaler()
scaler_target = MinMaxScaler()

scaler_features.fit(train_df_imputed[features])
# The target is AQI
scaler_target.fit(train_df_imputed[['AQI']])

features_scaled = scaler_features.transform(df_imputed[features])
target_scaled = scaler_target.transform(df_imputed[['AQI']]) # We will shift this during sequence generation

dates = df_imputed.index

# 5. Sequence Generation with explicit timestamp checks
window_size = 7
X_train, y_train, train_target_dates = [], [], []
X_val, y_val, val_target_dates = [], [], []
X_test, y_test, test_target_dates = [], [], []

verification_log = []

for i in range(len(df_imputed) - window_size):
    # Inputs: index i to i+window_size-1
    # Target: index i+window_size
    seq_x = features_scaled[i : i + window_size]
    seq_y = target_scaled[i + window_size]

    input_dates = dates[i : i + window_size]
    target_date = dates[i + window_size]

    # Validation check: strict inequality
    assert input_dates.max() < target_date, "Leakage detected: Input timestamp is >= target timestamp!"

    if i == 0:
        verification_log.append(f"Sample Sequence 1:")
        verification_log.append(f"Input dates: {[d.date().isoformat() for d in input_dates]}")
        verification_log.append(f"Target date: {target_date.date().isoformat()}")

    # Assign to split based on TARGET date
    if target_date <= train_end_date:
        X_train.append(seq_x)
        y_train.append(seq_y)
        train_target_dates.append(target_date)
    elif target_date <= val_end_date:
        X_val.append(seq_x)
        y_val.append(seq_y)
        val_target_dates.append(target_date)
    else:
        X_test.append(seq_x)
        y_test.append(seq_y)
        test_target_dates.append(target_date)

X_train, y_train = np.array(X_train), np.array(y_train)
X_val, y_val = np.array(X_val), np.array(y_val)
X_test, y_test = np.array(X_test), np.array(y_test)

print("\nVerification checks passed:")
for log in verification_log:
    print(log)

print(f"\nSequence shapes:")
print(f"X_train: {X_train.shape} (Targets from {train_target_dates[0].date()} to {train_target_dates[-1].date()})")
print(f"X_val:   {X_val.shape} (Targets from {val_target_dates[0].date()} to {val_target_dates[-1].date()})")
print(f"X_test:  {X_test.shape} (Targets from {test_target_dates[0].date()} to {test_target_dates[-1].date()})")

np.save('data/processed/X_train.npy', X_train)
np.save('data/processed/y_train.npy', y_train)
np.save('data/processed/X_val.npy', X_val)
np.save('data/processed/y_val.npy', y_val)
np.save('data/processed/X_test.npy', X_test)
np.save('data/processed/y_test.npy', y_test)

joblib.dump(scaler_features, 'data/processed/scaler_features.pkl')
joblib.dump(scaler_target, 'data/processed/scaler_target.pkl')

print("\nCorrected preprocessing complete.")
