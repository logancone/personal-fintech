import plaid
from plaid.api import plaid_api
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.model.sandbox_public_token_create_request_options import SandboxPublicTokenCreateRequestOptions
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from plaid.model.products import Products

from dotenv import load_dotenv
import os

from test_database import create_tables

from test_database import Session, Transaction

from backend_helper import pull_available_transactions

from fastapi import FastAPI

from test_database import Session, Transaction
from sqlalchemy import select

# 
app = FastAPI()

@app.get("/api/hello")
def hello():
    return {"num_transactions": pull_transaction_num(),
            "amount": pull_total_money()}