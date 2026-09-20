"""Demand forecasting service using RandomForestRegressor.

Trains a per-product model on transaction history and predicts future demand
with confidence intervals.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

from app.extensions import db
from app.models.transaction import Transaction


def _build_features(df):
    """Engineer time-series features from daily transaction data."""
    df = df.copy()
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    df["day_of_month"] = df["date"].dt.day
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    # Rolling averages
    df["rolling_avg_7d"] = df["demand"].rolling(window=7, min_periods=1).mean()
    df["rolling_avg_14d"] = df["demand"].rolling(window=14, min_periods=1).mean()
    df["rolling_std_7d"] = df["demand"].rolling(window=7, min_periods=1).std().fillna(0)

    # Lag features
    df["lag_1"] = df["demand"].shift(1).fillna(0)
    df["lag_7"] = df["demand"].shift(7).fillna(0)
    df["lag_14"] = df["demand"].shift(14).fillna(0)

    # Trend
    df["trend"] = np.arange(len(df))

    return df


FEATURE_COLS = [
    "day_of_week", "month", "week_of_year", "day_of_month", "is_weekend",
    "rolling_avg_7d", "rolling_avg_14d", "rolling_std_7d",
    "lag_1", "lag_7", "lag_14", "trend",
]


def get_product_demand_history(product_id, days=90):
    """Aggregate daily stock-out (demand) from transaction history."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    transactions = (
        Transaction.query
        .filter(
            Transaction.product_id == product_id,
            Transaction.type == "stock_out",
            Transaction.created_at >= cutoff,
        )
        .all()
    )

    if not transactions:
        return pd.DataFrame()

    records = [
        {"date": tx.created_at.date(), "demand": tx.quantity}
        for tx in transactions
    ]
    df = pd.DataFrame(records)
    daily = df.groupby("date")["demand"].sum().reset_index()
    daily["date"] = pd.to_datetime(daily["date"])

    # Fill missing days with 0 demand
    date_range = pd.date_range(
        start=daily["date"].min(), end=daily["date"].max(), freq="D"
    )
    daily = daily.set_index("date").reindex(date_range, fill_value=0).reset_index()
    daily.columns = ["date", "demand"]

    return daily


def forecast_demand(product_id, forecast_days=30):
    """Train a RandomForest model and forecast demand for the next N days.

    Returns a dict with:
      - dates: list of ISO date strings
      - predicted: list of predicted demand values
      - lower_bound: lower confidence interval
      - upper_bound: upper confidence interval
      - model_score: R² score on training data
      - avg_daily_demand: average predicted daily demand
      - total_forecasted: total predicted demand over the period
    """
    daily = get_product_demand_history(product_id)

    if daily.empty or len(daily) < 14:
        # Not enough data — return simple average-based estimate
        avg = daily["demand"].mean() if not daily.empty else 0
        dates_future = [
            (datetime.now(timezone.utc) + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            for i in range(forecast_days)
        ]
        predicted = [round(avg, 1)] * forecast_days
        return {
            "dates": dates_future,
            "predicted": predicted,
            "lower_bound": [max(0, round(avg * 0.5, 1))] * forecast_days,
            "upper_bound": [round(avg * 1.5, 1)] * forecast_days,
            "model_score": 0.0,
            "avg_daily_demand": round(avg, 1),
            "total_forecasted": round(avg * forecast_days, 1),
            "method": "simple_average",
        }

    # Build features
    df = _build_features(daily)

    X = df[FEATURE_COLS].values
    y = df["demand"].values

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled, y)
    score = model.score(X_scaled, y)

    # Generate future dates and features
    last_date = df["date"].max()
    future_dates = [last_date + timedelta(days=i + 1) for i in range(forecast_days)]
    future_rows = []

    # Extend the dataframe for rolling features
    extended_df = df.copy()
    for fd in future_dates:
        new_row = {"date": fd, "demand": extended_df["demand"].iloc[-7:].mean()}
        extended_df = pd.concat(
            [extended_df, pd.DataFrame([new_row])], ignore_index=True
        )

    extended_df = _build_features(extended_df)
    future_df = extended_df.iloc[-forecast_days:]

    X_future = future_df[FEATURE_COLS].values
    X_future_scaled = scaler.transform(X_future)

    # Predict with individual tree estimates for confidence intervals
    predictions = model.predict(X_future_scaled)
    tree_predictions = np.array(
        [tree.predict(X_future_scaled) for tree in model.estimators_]
    )
    lower = np.percentile(tree_predictions, 10, axis=0)
    upper = np.percentile(tree_predictions, 90, axis=0)

    predictions = np.maximum(predictions, 0).round(1).tolist()
    lower = np.maximum(lower, 0).round(1).tolist()
    upper = np.maximum(upper, 0).round(1).tolist()

    return {
        "dates": [d.strftime("%Y-%m-%d") for d in future_dates],
        "predicted": predictions,
        "lower_bound": lower,
        "upper_bound": upper,
        "model_score": round(score, 4),
        "avg_daily_demand": round(np.mean(predictions), 1),
        "total_forecasted": round(np.sum(predictions), 1),
        "method": "random_forest",
    }
