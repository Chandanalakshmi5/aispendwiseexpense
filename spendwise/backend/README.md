# SpendWise Backend

Python machine-learning backend for:

- TF-IDF feature extraction
- Logistic Regression category classification
- Random Forest 7-day and 30-day forecasting
- Daily expense totals
- Mean Absolute Error (MAE)
- Budget alerts

```powershell
python -m pip install -r requirements.txt
python spendwise.py
```

Expected CSV columns: `date`, `description`, `category`, `amount`.
