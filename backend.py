from database import create_tables

from database import Session, Transaction

from backend_helper import sync_available_transactions

from fastapi import FastAPI

from database import Session, Transaction
from sqlalchemy import select

import time

from pydantic import BaseModel

# from datetime import date
import datetime

app = FastAPI()

create_tables()
sync_available_transactions()


class TransactionResponse(BaseModel):
    id: str
    date: datetime.date
    merchant: str
    category: str
    amount: float
    pending: bool
    
class TransactionsReponse(BaseModel):
    transactions: list[TransactionResponse]
    count: int
    

@app.get("/api/retrieve_transactions", response_model=TransactionResponse)
def retrieve_transactions():
    with Session() as session:
        transactions = session.scalars(select(Transaction)).all()
        
        return {
            "transactions": [
                {
                    "id": t.id,
                    "merchant": t.merchant,
                    "amount": t.amount,
                    "date": t.date,
                    "category": t.category,
                    "pending": t.pending
                }
                for t in transactions
            ],
            "count": len(transactions)
        }

