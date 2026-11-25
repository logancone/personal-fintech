import plaid
from plaid.api import plaid_api
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from dotenv import load_dotenv
import os

from database import Session, Transaction, Item


def get_plaid_client():
    load_dotenv()
    environment = os.getenv("PLAID_ENV", "sandbox").strip().lower()
    if environment == "production":
        host = plaid.Environment.Production
        secret_id = os.getenv("PLAID_PRODUCTION_SECRET")
    elif environment == "sandbox":
        host = plaid.Environment.Sandbox
        secret_id = os.getenv("PLAID_SECRET")
    else:
        raise RuntimeError("PLAID_ENV must be 'sandbox' or 'production'.")

    client_id = os.getenv("PLAID_CLIENT_ID")
    if not client_id or not secret_id:
        secret_name = "PLAID_PRODUCTION_SECRET" if environment == "production" else "PLAID_SECRET"
        raise RuntimeError(f"Set PLAID_CLIENT_ID and {secret_name}.")

    configuration = plaid.Configuration(
        host=host,
        api_key={
            "clientId": client_id,
            "secret": secret_id,
        },
    )
    return plaid_api.PlaidApi(plaid.ApiClient(configuration))


def store_transaction_list(session, transactions):
    for transaction in transactions:
        session.merge(
            Transaction(
                transaction_id=transaction["transaction_id"],
                merchant_name=transaction["merchant_name"],
                amount=float(transaction["amount"]),
                date=transaction["date"],
                category="NONE",
                pending=transaction["pending"],
                pending_transaction_id=transaction["pending_transaction_id"],
            )
        )


def sync_available_transactions(access_token: str, item_id: int = 1) -> int:
    client = get_plaid_client()
    with Session() as session:
        with session.begin():
            item = session.get(Item, item_id)
            if item is None:
                raise RuntimeError(f"Plaid item {item_id} has not been initialized.")

            request_options = {"cursor": item.cursor} if item.cursor else {}
            response = client.transactions_sync(
                TransactionsSyncRequest(access_token=access_token, **request_options)
            )
            transactions = list(response["added"])

            while response["has_more"]:
                response = client.transactions_sync(
                    TransactionsSyncRequest(
                        access_token=access_token,
                        cursor=response["next_cursor"],
                    )
                )
                transactions.extend(response["added"])

            store_transaction_list(session, transactions)
            item.cursor = response["next_cursor"]

    return len(transactions)

