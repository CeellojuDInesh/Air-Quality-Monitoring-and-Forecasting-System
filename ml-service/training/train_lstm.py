import os
import numpy as np
import joblib
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Ensure directories exist
os.makedirs('training', exist_ok=True)
os.makedirs('models', exist_ok=True)
os.makedirs('plots', exist_ok=True)

# 1. Load data
X_train = np.load('data/processed/X_train.npy')
y_train = np.load('data/processed/y_train.npy')
X_val = np.load('data/processed/X_val.npy')
y_val = np.load('data/processed/y_val.npy')
X_test = np.load('data/processed/X_test.npy')
y_test = np.load('data/processed/y_test.npy')

scaler_target = joblib.load('data/processed/scaler_target.pkl')

print(f"Data loaded successfully.")
print(f"X_train shape: {X_train.shape}")
print(f"y_train shape: {y_train.shape}")

# 2. Build LSTM model
model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])),
    Dropout(0.2),
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1)
])

optimizer = tf.keras.optimizers.Adam(learning_rate=0.001)
model.compile(optimizer=optimizer, loss='mse')

print("\nModel Architecture:")
model.summary()

# 3. Training
epochs = 100
batch_size = 32

early_stopping = EarlyStopping(
    monitor='val_loss',
    patience=15,
    restore_best_weights=True,
    verbose=1
)

checkpoint_path = 'models/lstm_aqi_model.keras'
model_checkpoint = ModelCheckpoint(
    checkpoint_path,
    monitor='val_loss',
    save_best_only=True,
    verbose=1
)

print("\nStarting Training...")
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=epochs,
    batch_size=batch_size,
    callbacks=[early_stopping, model_checkpoint],
    verbose=1
)

actual_epochs = len(history.history['loss'])
best_val_loss = min(history.history['val_loss'])

# Plot training vs validation loss
plt.figure(figsize=(10, 6))
plt.plot(history.history['loss'], label='Training Loss (MSE)')
plt.plot(history.history['val_loss'], label='Validation Loss (MSE)')
plt.title('Training and Validation Loss')
plt.xlabel('Epochs')
plt.ylabel('Loss')
plt.legend()
plt.tight_layout()
plt.savefig('plots/training_validation_loss.png')
plt.close()

# 4. Evaluate on Test set
print("\nEvaluating on Test set...")
model = tf.keras.models.load_model(checkpoint_path)
predictions_scaled = model.predict(X_test)

# 5. Inverse Transform
y_test_inv = scaler_target.inverse_transform(y_test)
predictions_inv = scaler_target.inverse_transform(predictions_scaled)

# Calculate LSTM Metrics
mae = mean_absolute_error(y_test_inv, predictions_inv)
mse = mean_squared_error(y_test_inv, predictions_inv)
rmse = np.sqrt(mse)
r2 = r2_score(y_test_inv, predictions_inv)

# 7. Baseline Comparison (Naive Persistence)
# Tomorrow's AQI = Today's AQI
# Today's AQI is the last time step (-1) of the AQI feature (index 6) in the input sequence
naive_scaled = X_test[:, -1, 6].reshape(-1, 1)
naive_inv = scaler_target.inverse_transform(naive_scaled)

baseline_mae = mean_absolute_error(y_test_inv, naive_inv)
baseline_mse = mean_squared_error(y_test_inv, naive_inv)
baseline_rmse = np.sqrt(baseline_mse)
baseline_r2 = r2_score(y_test_inv, naive_inv)

# 6. Generate visualizations
# Actual vs Predicted
plt.figure(figsize=(14, 6))
plt.plot(y_test_inv, label='Actual AQI', color='blue', alpha=0.7)
plt.plot(predictions_inv, label='Predicted AQI (LSTM)', color='red', alpha=0.7)
plt.title('Actual vs Predicted AQI (Test Set)')
plt.xlabel('Time Step (Days)')
plt.ylabel('AQI')
plt.legend()
plt.tight_layout()
plt.savefig('plots/actual_vs_predicted_aqi.png')
plt.close()

# Prediction Error
error = predictions_inv - y_test_inv
plt.figure(figsize=(10, 6))
plt.hist(error, bins=30, color='orange', edgecolor='black', alpha=0.7)
plt.title('Prediction Error Distribution (Predicted - Actual)')
plt.xlabel('Error (AQI points)')
plt.ylabel('Frequency')
plt.axvline(x=0, color='red', linestyle='--')
plt.tight_layout()
plt.savefig('plots/prediction_error.png')
plt.close()

# Write report to a summary file
report_content = f"""
# Phase 3: LSTM Training Report

## Model Summary
- **Architecture:** LSTM(64) -> Dropout(0.2) -> LSTM(32) -> Dropout(0.2) -> Dense(16, relu) -> Dense(1)
- **Trainable Parameters:** {model.count_params()}
- **Epochs Completed:** {actual_epochs}
- **Best Validation Loss:** {best_val_loss:.6f}

## Test Metrics (Original AQI Scale)
| Metric | LSTM Model | Naive Baseline |
|--------|------------|----------------|
| MAE    | {mae:.2f} | {baseline_mae:.2f} |
| RMSE   | {rmse:.2f} | {baseline_rmse:.2f} |
| MSE    | {mse:.2f} | {baseline_mse:.2f} |
| RÂ²     | {r2:.4f} | {baseline_r2:.4f} |

## Analysis
- **Outperformed Baseline:** {'Yes' if rmse < baseline_rmse else 'No'}
- **Overfitting:** {'Yes' if history.history['val_loss'][-1] > best_val_loss * 1.2 else 'No'} (Final val_loss: {history.history['val_loss'][-1]:.6f}, Best: {best_val_loss:.6f})
"""

with open('training/training_report.md', 'w', encoding='utf-8') as f:
    f.write(report_content)

print(report_content)
print("\nPhase 3 processing completed.")
