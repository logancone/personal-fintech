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

from test_database import Session, Transaction, Item


load_dotenv()

client_id = os.getenv("PLAID_CLIENT_ID")
secret_id = os.getenv("PLAID_SECRET")

access_token = os.getenv("SANDBOX_ACCESS_TOKEN")

configuration = plaid.Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        'clientId': client_id,
        'secret': secret_id,
    }
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

def store_transaction_list(transactions):
    with Session() as session:
        with session.begin():
            for transaction in transactions:
                new_transaction = Transaction(transaction_amount=transaction['amount'], transaction_date=transaction["date"])
                session.add(new_transaction)
    
    
def pull_available_transactions():
    with Session() as session:
        with session.begin():
            item = session.get(Item, 0)
            assert item is not None
            
            if item.cursor is not None:
                request = TransactionsSyncRequest(
                    access_token=access_token,
                    cursor = item.cursor
                )
                response = client.transactions_sync(request)

                transactions = response['added']
            else:
                request = TransactionsSyncRequest(
                    access_token=access_token
                )
                response = client.transactions_sync(request)

                transactions = response['added']

            while response['has_more']:
                request = TransactionsSyncRequest(
                    access_token=access_token,
                    cursor=response['next_cursor']
                )
                response=client.transactions_sync(request)
                transactions += response['added']
            
            item.cursor = response['next_cursor']
            
            store_transaction_list(transactions)
            
            
            return len(transactions)
        

            

