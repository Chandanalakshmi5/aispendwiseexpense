# SpendWise AI

SpendWise AI is separated into two folders:

- `frontend/` — React, Vite, Supabase UI and client-side expense views
- `backend/` — Python ML implementation using TF-IDF, Logistic Regression, Random Forest, MAE, CSV processing, and budget alerts

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Use `npm run build` for a production build.

## Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python spendwise.py
```

For a custom CSV and budget:

```powershell
python spendwise.py --csv expenses.csv --budget 30000
```

The CSV should contain `date`, `description`, `category`, and `amount` columns.
