import datetime
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import plaid
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from sqlalchemy import select

from backend_helper import get_plaid_client, sync_available_transactions, get_account_names
from database import Item, Session, Transaction, create_tables


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    create_tables()
    with Session() as session:
        with session.begin():
            if session.get(Item, 1) is None:
                session.add(Item(id=1))
    yield


app = FastAPI(lifespan=lifespan)


class TransactionResponse(BaseModel):
    id: str
    date: datetime.date
    merchant: str
    category: str
    amount: float
    pending: bool
    account: str
    
class TransactionsResponse(BaseModel):
    transactions: list[TransactionResponse]
    count: int


class LinkTokenResponse(BaseModel):
    link_token: str


class PublicTokenRequest(BaseModel):
    public_token: str


class ConnectionResponse(BaseModel):
    connected: bool
    transactions_added: int


class LinkStatusResponse(BaseModel):
    connected: bool


@app.get("/api/link_status", response_model=LinkStatusResponse)
def link_status():
    with Session() as session:
        item = session.get(Item, 1)
        return LinkStatusResponse(connected=bool(item and item.access_token))


@app.post("/api/create_link_token", response_model=LinkTokenResponse)
def create_link_token():
    try:
        client = get_plaid_client()
        request = LinkTokenCreateRequest(
            client_name="Personal Fintech",
            language="en",
            country_codes=[CountryCode("US")],
            user=LinkTokenCreateRequestUser(
                client_user_id="personal-fintech-local-user"
            ),
            products=[Products("transactions")],
        )
        redirect_uri = os.getenv("PLAID_REDIRECT_URI")
        if redirect_uri:
            request = LinkTokenCreateRequest(
                client_name="Personal Fintech",
                language="en",
                country_codes=[CountryCode("US")],
                user=LinkTokenCreateRequestUser(
                    client_user_id="personal-fintech-local-user"
                ),
                products=[Products("transactions")],
                redirect_uri=redirect_uri,
            )
        response = client.link_token_create(request)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500, detail="Plaid credentials or environment are not configured."
        ) from exc
    except plaid.ApiException as exc:
        raise HTTPException(
            status_code=502, detail="Plaid could not create a Link token."
        ) from exc

    return LinkTokenResponse(link_token=response["link_token"])


@app.post("/api/exchange_public_token", response_model=ConnectionResponse)
def exchange_public_token(payload: PublicTokenRequest):
    try:
        response = get_plaid_client().item_public_token_exchange(
            ItemPublicTokenExchangeRequest(public_token=payload.public_token)
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500, detail="Plaid credentials or environment are not configured."
        ) from exc
    except plaid.ApiException as exc:
        raise HTTPException(
            status_code=502, detail="Plaid could not exchange the public token."
        ) from exc

    access_token = response["access_token"]
    with Session() as session:
        with session.begin():
            item = session.get(Item, 1)
            if item is None:
                item = Item(id=1)
                session.add(item)
            item.access_token = access_token
            item.cursor = None

    try:
        transactions_added = sync_available_transactions(access_token)
    except plaid.ApiException as exc:
        raise HTTPException(
            status_code=502,
            detail="The bank was linked, but the initial transaction sync failed.",
        ) from exc

    return ConnectionResponse(connected=True, transactions_added=transactions_added)


@app.get("/api/retrieve_transactions", response_model=TransactionsResponse)
def retrieve_transactions():
    with Session() as session:
        item = session.get(Item, 1)
        names = get_account_names(item.access_token) if item and item.access_token else {}
        transactions = session.scalars(
            select(Transaction).where(
                Transaction.category.notin_(["TRANSFER_IN", "TRANSFER_OUT"])
            )
        ).all()
        return {
            "transactions": [
                {
                    "id": t.transaction_id,
                    "date": t.date or datetime.date.today(),
                    "merchant": t.merchant_name or "Unknown",
                    "amount": -float(t.amount),  # Plaid: outflow > 0; app: outflow < 0
                    "category": t.category or "UNKNOWN",
                    "pending": t.pending,
                    "account": names.get(t.account_id or "", "Account"),
                }
                for t in transactions
            ],
            "count": len(transactions),
        }
