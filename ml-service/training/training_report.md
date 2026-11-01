
# Phase 3: LSTM Training Report

## Model Summary
- **Architecture:** LSTM(64) -> Dropout(0.2) -> LSTM(32) -> Dropout(0.2) -> Dense(16, relu) -> Dense(1)
- **Trainable Parameters:** 31393
- **Epochs Completed:** 67
- **Best Validation Loss:** 0.000236

## Test Metrics (Original AQI Scale)
| Metric | LSTM Model | Naive Baseline |
|--------|------------|----------------|
| MAE    | 9.75 | 10.79 |
| RMSE   | 12.80 | 15.33 |
| MSE    | 163.72 | 234.93 |
| R²     | 0.8719 | 0.8162 |

## Analysis
- **Outperformed Baseline:** Yes
- **Overfitting:** Yes (Final val_loss: 0.000293, Best: 0.000236)
