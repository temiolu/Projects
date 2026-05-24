import pandas as pd
import streamlit as st

st.title("Pharmacy Operations Risk Dashboard")

df = pd.read_csv("pharmacy-rag/inventory.csvstreamlit run app.py", dtype={"ndc11": str})

df["margin"] = df["reimbursement_rate"] - df["acquisition_cost"]
df["stockout_risk"] = df["on_hand"] < df["reorder_point"]
df["days_until_expiration"] = (
    pd.to_datetime(df["expiration_date"]) - pd.Timestamp.today()
).dt.days
df["expiration_risk"] = df["days_until_expiration"] <= 60
df["poor_margin"] = df["margin"] < 0

st.subheader("Inventory Data")
st.dataframe(df)

st.subheader("Items Needing Review")
risk_df = df[
    df["stockout_risk"] |
    df["expiration_risk"] |
    df["poor_margin"]
]

st.dataframe(risk_df)

st.metric("Total Items", len(df))
st.metric("Items Needing Review", len(risk_df))