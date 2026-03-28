import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANNON_KEY")

if not url or not key:
    print("Warning: Missing SUPABASE_URL or SUPABASE_ANNON_KEY in environment")
    supabase: Client = None
else:
    supabase: Client = create_client(url, key)

def update_order_status(order_id: str, new_status: str) -> bool:
    """Updates the status of an order in Supabase."""
    if not supabase:
        return False
    try:
        response = supabase.table("orders").update({"status": new_status}).eq("id", order_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error updating order status: {e}")
        return False

def get_order(order_id: str) -> dict:
    """Retrieves an order from Supabase."""
    if not supabase:
        return None
    try:
        response = supabase.table("orders").select("*").eq("id", order_id).execute()
        if len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error getting order: {e}")
        return None
