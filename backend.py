from test_database import create_tables

from test_database import Session, Transaction

from backend_helper import pull_available_transactions

from fastapi import FastAPI

from test_database import Session, Transaction
from sqlalchemy import select

import time


app = FastAPI()

create_tables()

@app.get("/api/retrieve_transactions")
def retrieve_transactions():
    with Session() as session:
        transactions = session.scalars(select(Transaction)).all()
        
        return {"num_transactions": len(transactions),
                "transactions": transactions}


for i in range(100):
    pull_available_transactions()

    time.sleep(5)