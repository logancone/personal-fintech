import plaid
from plaid.api import plaid_api
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.model.sandbox_public_token_create_request_options import SandboxPublicTokenCreateRequestOptions
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from plaid.model.products import Products

from dotenv import load_dotenv
import os

from database import create_tables

from database import Session, Transaction

load_dotenv()

client_id = os.getenv("PLAID_CLIENT_ID")
secret_id = os.getenv("PLAID_SECRET")

configuration = plaid.Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        'clientId': client_id,
        'secret': secret_id,
    }
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

access_token = os.getenv("SANDBOX_ACCESS_TOKEN")
request = TransactionsSyncRequest(
    access_token=access_token
)
response = client.transactions_sync(request)

transactions = response['added']

# print(transactions[0])
# Retrieve all the transactions i guess
while response['has_more']:
    request = TransactionsSyncRequest(
        access_token=access_token,
        cursor=response['next_cursor']
    )
    response=client.transactions_sync(request)
    transactions += response['added']

print(transactions[0])
# if os.path.exists("app_database.db"):
#     os.remove("app_database.db")

# create_tables()


# with Session() as session:
#     with session.begin():
#         for transaction in transactions:
#             new_transaction = Transaction(transaction_amount=transaction['amount'], transaction_date=transaction["date"])
#             session.add(new_transaction)
            

