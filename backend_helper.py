import plaid
from plaid.api import plaid_api
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from dotenv import load_dotenv
import os

from database import Session, Transaction, Item

from plaid.model.accounts_get_request import AccountsGetRequest

def get_account_names(access_token: str) -> dict[str, str]:
    try:
        resp = get_plaid_client().accounts_get(
            AccountsGetRequest(access_token=access_token)
        )
    except plaid.ApiException:
        return {}
    return {
        a["account_id"]: f'{a["name"]} ••{a["mask"] or ""}'.strip()
        for a in resp["accounts"]
    }

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
    for t in transactions:
        pfc = t.get("personal_finance_category")
        session.merge(
            Transaction(
                transaction_id=t["transaction_id"],
                # merchant_name is often null; "name" is always present
                merchant_name=t.get("merchant_name") or t["name"],
                amount=float(t["amount"]),
                date=t["date"],
                category=pfc["primary"] if pfc else "UNKNOWN",
                pending=t["pending"],
                pending_transaction_id=t["pending_transaction_id"],
                account_id=t["account_id"],  # used in fix 4
            )
        )


def apply_page(session, response):
    """Apply one page of /transactions/sync results to the database."""
    store_transaction_list(
        session, list(response["added"]) + list(response["modified"])
    )
    for removed in response["removed"]:
        row = session.get(Transaction, removed["transaction_id"])
        if row:
            session.delete(row)


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
            count = len(response["added"]) + len(response["modified"])
            apply_page(session, response)

            while response["has_more"]:
                response = client.transactions_sync(
                    TransactionsSyncRequest(
                        access_token=access_token,
                        cursor=response["next_cursor"],
                    )
                )
                count += len(response["added"]) + len(response["modified"])
                apply_page(session, response)

            item.cursor = response["next_cursor"]

    return count