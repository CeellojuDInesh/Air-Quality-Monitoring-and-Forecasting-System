import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import MinMaxScaler
import kagglehub
import joblib

# Ensure plot directory exists
os.makedirs('plots', exist_ok=True)
os.makedirs('data/processed', exist_ok=True)

print("Downloading dataset...")
path = kagglehub.dataset_download("rohanrao/air-quality-data-in-india")
print(f"Path to dataset files: {path}")

# Load the daily city dataset
df = pd.read_csv(os.path.join(path, "city_day.csv"))

print(f"Total records in dataset: {len(df)}")
print(f"Cities available: {df['City'].unique()}")

# 1. Filter for Hyderabad
df_hyd = df[df['City'] == 'Hyderabad'].copy()
print(f"Records for Hyderabad: {len(df_hyd)}")

# 2. Timestamp analysis
df_hyd['Date'] = pd.to_datetime(df_hyd['Date'])
df_hyd = df_hyd.sort_values('Date').reset_index(drop=True)
print(f"Date range: {df_hyd['Date'].min().date()} to {df_hyd['Date'].max().date()}")

# 3. Duplicate analysis
duplicates = df_hyd.duplicated(subset=['Date']).sum()
print(f"Duplicates by date: {duplicates}")

# Ensure daily frequency
df_hyd.set_index('Date', inplace=True)
df_hyd = df_hyd.asfreq('D')

# 4. Feature Selection (Air quality only, NAQI standard)
# We keep the primary pollutants used for NAQI calculation and the AQI itself.
features = ['PM2.5', 'PM10', 'NO2', 'CO', 'SO2', 'O3', 'AQI']
df_hyd = df_hyd[features]

# 5. Missing-value analysis
missing_stats = df_hyd.isnull().sum()
print("\nMissing values before imputation:")
print(missing_stats)

plt.figure(figsize=(10, 6))
sns.heatmap(df_hyd.isnull(), cbar=False, cmap='viridis')
plt.title('Missing Values Heatmap (Yellow = Missing)')
plt.tight_layout()
plt.savefig('plots/missing_values.png')
plt.close()

# 6. Imputation strategy
# Using linear interpolation for time-series data
df_hyd = df_hyd.interpolate(method='linear')
# Forward fill and backward fill for any remaining NaNs at the edges
df_hyd = df_hyd.ffill().bfill()
print("\nMissing values after imputation:")
print(df_hyd.isnull().sum())

# 7. Outlier analysis (simple visual inspection via boxplots)
plt.figure(figsize=(12, 6))
sns.boxplot(data=df_hyd)
plt.yscale('log')
plt.title('Outlier Analysis (Log Scale)')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('plots/outliers.png')
plt.close()

# Plot historical AQI trend
plt.figure(figsize=(14, 6))
plt.plot(df_hyd.index, df_hyd['AQI'], color='red', linewidth=1)
plt.title('Historical AQI Trend in Hyderabad (2015-2020)')
plt.xlabel('Date')
plt.ylabel('AQI')
plt.tight_layout()
plt.savefig('plots/aqi_trend.png')
plt.close()

# 8. Define Target (Next-day AQI)
# We shift the AQI column by -1 to create the target variable
df_hyd['Target_AQI'] = df_hyd['AQI'].shift(-1)
# Drop the last row which now has a NaN target
df_hyd = df_hyd.dropna()

print(f"\nFinal processed dataset shape before sequencing: {df_hyd.shape}")

# 9. Chronological Train/Validation/Test Split (70/15/15)
n = len(df_hyd)
train_end = int(n * 0.7)
val_end = int(n * 0.85)

train_df = df_hyd.iloc[:train_end]
val_df = df_hyd.iloc[train_end:val_end]
test_df = df_hyd.iloc[val_end:]

print(f"\nSplit sizes:")
print(f"Train: {len(train_df)} ({train_df.index.min().date()} to {train_df.index.max().date()})")
print(f"Val:   {len(val_df)} ({val_df.index.min().date()} to {val_df.index.max().date()})")
print(f"Test:  {len(test_df)} ({test_df.index.min().date()} to {test_df.index.max().date()})")

# 10. Scaling (Fit ONLY on train data to prevent leakage)
feature_columns = features
scaler_features = MinMaxScaler()
scaler_target = MinMaxScaler()

# We scale features and target separately so we can inverse-transform the predictions later
train_features_scaled = scaler_features.fit_transform(train_df[feature_columns])
val_features_scaled = scaler_features.transform(val_df[feature_columns])
test_features_scaled = scaler_features.transform(test_df[feature_columns])

train_target_scaled = scaler_target.fit_transform(train_df[['Target_AQI']])
val_target_scaled = scaler_target.transform(val_df[['Target_AQI']])
test_target_scaled = scaler_target.transform(test_df[['Target_AQI']])

# 11. Sequence Generation
def create_sequences(features, target, window_size):
    X, y = [], []
    for i in range(len(features) - window_size):
        X.append(features[i:(i + window_size)])
        y.append(target[i + window_size])
    return np.array(X), np.array(y)

window_size = 7 # Previous 7 days

X_train, y_train = create_sequences(train_features_scaled, train_target_scaled, window_size)
X_val, y_val = create_sequences(val_features_scaled, val_target_scaled, window_size)
X_test, y_test = create_sequences(test_features_scaled, test_target_scaled, window_size)

print(f"\nSequence shapes (Window = {window_size} days):")
print(f"X_train: {X_train.shape}, y_train: {y_train.shape}")
print(f"X_val:   {X_val.shape}, y_val:   {y_val.shape}")
print(f"X_test:  {X_test.shape}, y_test:  {y_test.shape}")

# 12. Save processed datasets
np.save('data/processed/X_train.npy', X_train)
np.save('data/processed/y_train.npy', y_train)
np.save('data/processed/X_val.npy', X_val)
np.save('data/processed/y_val.npy', y_val)
np.save('data/processed/X_test.npy', X_test)
np.save('data/processed/y_test.npy', y_test)

joblib.dump(scaler_features, 'data/processed/scaler_features.pkl')
joblib.dump(scaler_target, 'data/processed/scaler_target.pkl')

print("\nPreprocessing complete. Data and scalers saved to data/processed/")
