# SpendWise AI

SpendWise AI is a React and Supabase expense tracker with AI-style expense insights.

## Web application

```powershell
npm install
npm run dev
```

Use `npm run build` for a production build.

## Python analytics (`spendwise.py`)

The Python implementation provides:

- TF-IDF and Logistic Regression for description-based category classification
- Random Forest regression for 7-day and 30-day forecasts
- Daily totals, Mean Absolute Error (MAE), and budget alerts
- Automatic `expenses.csv` demo data generation

Install and run:

```powershell
python -m pip install -r requirements.txt
python spendwise.py
```

For a custom CSV and budget:

```powershell
python spendwise.py --csv expenses.csv --budget 30000
```

The CSV should contain `date`, `description`, `category`, and `amount` columns.
