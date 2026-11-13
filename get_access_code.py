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

# ----- Get my access token. ONLY RUN TO REGEN NEW TOKEN, OTHERWISE NOT NEEDED! -----

pt_request = SandboxPublicTokenCreateRequest(
    institution_id="ins_109508",
    initial_products=[Products("transactions")],
    options=SandboxPublicTokenCreateRequestOptions(
        override_username="user_yuppie",
        override_password="pass_good"
    )
)
pt_response = client.sandbox_public_token_create(pt_request)

exchange_request = ItemPublicTokenExchangeRequest(
    public_token=pt_response['public_token']
)
exchange_response = client.item_public_token_exchange(exchange_request)

access_token = exchange_response['access_token']
print(access_token)
