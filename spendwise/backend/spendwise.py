import argparse
import os

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

CATEGORIES = {
    "Food": ["lunch", "dinner", "breakfast", "cafe", "restaurant", "groceries", "coffee", "food"],
    "Transport": ["uber", "ola", "taxi", "bus", "train", "metro", "fuel", "petrol", "transport"],
    "Shopping": ["amazon", "flipkart", "clothes", "shoes", "shopping", "mobile", "electronics"],
    "Bills & Utilities": ["rent", "electricity", "water", "internet", "mobile bill", "utility", "bill"],
    "Entertainment": ["movie", "cinema", "netflix", "game", "concert", "entertainment"],
    "Health": ["hospital", "medicine", "pharmacy", "doctor", "health", "gym"],
    "Education": ["course", "book", "tuition", "college", "school", "education"],
    "Rent": ["house rent", "apartment rent", "rent payment"],
}


def classify_description(description):
    text = description.lower()
    for category, terms in CATEGORIES.items():
        if any(term in text for term in terms):
            return category
    return "Other"


def generate_demo_csv(path="expenses.csv", days=180):
    rng = np.random.default_rng(42)
    descriptions = [item for terms in CATEGORIES.values() for item in terms]
    descriptions += ["other expense", "miscellaneous purchase", "cash payment"]

    rows = []
    for day in range(days):
        date = pd.Timestamp.today().normalize() - pd.Timedelta(days=days - day - 1)
        for _ in range(1 if rng.random() > 0.3 else 2):
            description = rng.choice(descriptions)
            category = classify_description(description)
            amount = round(max(20, rng.normal(650, 280)), 2)
            rows.append({"date": date.strftime("%Y-%m-%d"), "description": description,
                         "category": category, "amount": amount})
    pd.DataFrame(rows).to_csv(path, index=False)


def load_expenses(path):
    if not os.path.exists(path):
        generate_demo_csv(path)
        print(f"expenses.csv was not found, so {path} was created with demo data.")
    data = pd.read_csv(path)
    required = {"date", "description", "category", "amount"}
    missing = required - set(data.columns)
    if missing:
        raise ValueError(f"Missing columns: {', '.join(sorted(missing))}")
    data["date"] = pd.to_datetime(data["date"])
    data["amount"] = pd.to_numeric(data["amount"])
    return data


def train_category_classifier(data):
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
    X = vectorizer.fit_transform(data["description"].fillna(""))
    model = LogisticRegression(max_iter=1000)
    model.fit(X, data["category"])
    return vectorizer, model


def build_daily_series(data):
    daily = data.groupby("date")["amount"].sum().sort_index()
    full = daily.reindex(pd.date_range(daily.index.min(), daily.index.max()), fill_value=0.0)
    return full.rename("amount")


def build_features(daily):
    frame = pd.DataFrame({"amount": daily})
    frame["day"] = np.arange(len(frame))
    frame["day_of_week"] = frame.index.dayofweek
    frame["lag_1"] = frame["amount"].shift(1)
    frame["lag_7"] = frame["amount"].shift(7)
    frame["rolling_7"] = frame["amount"].rolling(7).mean().shift(1)
    frame["rolling_30"] = frame["amount"].rolling(30).mean().shift(1)
    frame = frame.dropna()
    features = ["day", "day_of_week", "lag_1", "lag_7", "rolling_7", "rolling_30"]
    return frame, features


def train_forecaster(daily):
    frame, features = build_features(daily)
    split = int(len(frame) * 0.8)
    train, test = frame.iloc[:split], frame.iloc[split:]
    model = RandomForestRegressor(n_estimators=300, random_state=42, min_samples_leaf=2)
    model.fit(train[features], train["amount"])
    predictions = model.predict(test[features])
    mae = mean_absolute_error(test["amount"], predictions)
    return model, frame, features, mae


def forecast_days(daily, model, frame, features, horizon):
    history = daily.copy()
    predictions = []
    for step in range(horizon):
        temporary = pd.DataFrame({"amount": history})
        day = len(daily) + step
        values = {
            "day": day,
            "day_of_week": (history.index[-1] + pd.Timedelta(days=1)).dayofweek,
            "lag_1": history.iloc[-1],
            "lag_7": history.iloc[-7] if len(history) >= 7 else history.mean(),
            "rolling_7": history.tail(7).mean(),
            "rolling_30": history.tail(30).mean(),
        }
        row = pd.DataFrame([values])[features]
        predicted = max(0.0, float(model.predict(row)[0]))
        predictions.append(predicted)
        next_date = history.index[-1] + pd.Timedelta(days=1)
        history.loc[next_date] = predicted
    return sum(predictions), predictions


def main():
    parser = argparse.ArgumentParser(description="SpendWise AI expense analytics")
    parser.add_argument("--csv", default="expenses.csv")
    parser.add_argument("--budget", type=float, default=30000.0)
    args = parser.parse_args()

    data = load_expenses(args.csv)
    vectorizer, classifier = train_category_classifier(data)
    print("Category classifier ready")

    samples = ["Lunch at cafe", "Uber ride", "Netflix subscription", "Electricity bill", "Pharmacy medicine"]
    for sample in samples:
        predicted = classifier.predict(vectorizer.transform([sample]))[0]
        print(f"{sample}: {predicted}")

    daily = build_daily_series(data)
    model, frame, features, mae = train_forecaster(daily)
    forecast_7, _ = forecast_days(daily, model, frame, features, 7)
    forecast_30, _ = forecast_days(daily, model, frame, features, 30)

    print(f"Daily-total records: {len(daily)}")
    print(f"Mean Absolute Error (MAE): ₹{mae:.2f}")
    print(f"7-day forecast: ₹{forecast_7:.2f}")
    print(f"30-day forecast: ₹{forecast_30:.2f}")

    monthly_spend = data[data["date"] >= data["date"].max() - pd.DateOffset(months=1)]["amount"].sum()
    if forecast_30 > args.budget:
        print(f"Budget alert: 30-day forecast ₹{forecast_30:.2f} exceeds monthly budget ₹{args.budget:.2f}")
    else:
        print(f"Budget status: forecast is within ₹{args.budget:.2f}")


if __name__ == "__main__":
    main()
