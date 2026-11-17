from fastapi import FastAPI

from test_database import Session, Transaction
from sqlalchemy import select

# 
app = FastAPI()

@app.get("/api/hello")
def hello():
    return {"num_transactions": pull_transaction_num(),
            "amount": pull_total_money()}


def pull_total_money():
    with Session() as session:
        transactions = session.scalars(select(Transaction)).all()
        
        total = 0
        for transaction in transactions:
            total += transaction.transaction_amount
            
        return total

def pull_transaction_num():
    with Session() as session:
        transactions = session.scalars(select(Transaction)).all()
        
        return len(transactions)