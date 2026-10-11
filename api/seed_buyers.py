import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in env.")
    exit(1)

supabase: Client = create_client(url, key)

buyers = [
    {
        "phone": "+919999999901",
        "name": "Rajesh Biomass Plant",
        "type": "biomass",
        "lat": 30.825,
        "lon": 75.175,
        "capacity": 500,
        "price": 1500,
        "min_load": 8,
        "demand": 200,
    },
    {
        "phone": "+919999999902",
        "name": "Punjab Bricks & Kilns",
        "type": "kiln",
        "lat": 30.850,
        "lon": 75.220,
        "capacity": 300,
        "price": 1400,
        "min_load": 10,
        "demand": 150,
    },
    {
        "phone": "+919999999903",
        "name": "Moga CBG Plant",
        "type": "cbg",
        "lat": 30.944,
        "lon": 75.236,
        "capacity": 1000,
        "price": 1800,
        "min_load": 12,
        "demand": 500,
    },
    {
        "phone": "+919999999904",
        "name": "Green Paper Mills",
        "type": "mill",
        "lat": 30.811,
        "lon": 75.210,
        "capacity": 800,
        "price": 1600,
        "min_load": 10,
        "demand": 300,
    },
    {
        "phone": "+919999999905",
        "name": "Aggarwal Biomass Energy",
        "type": "biomass",
        "lat": 30.880,
        "lon": 75.190,
        "capacity": 400,
        "price": 1550,
        "min_load": 8,
        "demand": 100,
    }
]

for b in buyers:
    print(f"Seeding buyer {b['name']} ({b['phone']})...")
    user_id = None
    try:
        user = supabase.auth.admin.create_user({
            "phone": b["phone"],
            "phone_confirm": True,
            "user_metadata": {"role": "buyer"}
        })
        user_id = user.user.id
        print(f" - Auth user created: {user_id}")
    except Exception as e:
        print(f" - Auth user creation failed (might exist). Attempting to find... ({str(e).splitlines()[0]})")
        # Try to find user in auth schema or profiles if already created
        pass

    if not user_id:
        try:
            res = supabase.table("profiles").select("id").eq("phone", b["phone"]).execute()
            if res.data:
                user_id = res.data[0]["id"]
                print(f" - Found existing profile id: {user_id}")
            else:
                print(" - Could not find user. Skipping.")
                continue
        except Exception as e:
            print(f" - Error fetching existing profile: {e}")
            continue
            
    # Insert or update profile
    try:
        supabase.table("profiles").upsert({
            "id": user_id,
            "phone": b["phone"],
            "role": "buyer",
            "name": b["name"]
        }).execute()
        print(" - Profile upserted.")
    except Exception as e:
        print(f" - Profile upsert failed: {e}")

    # Insert or update buyer
    try:
        point_str = f"SRID=4326;POINT({b['lon']} {b['lat']})"
        supabase.table("buyers").upsert({
            "profile_id": user_id,
            "org_name": b["name"],
            "type": b["type"],
            "location": point_str,
            "capacity": b["capacity"],
            "price_per_tonne": b["price"],
            "min_load_tonnes": b["min_load"]
        }).execute()
        print(" - Buyer record upserted.")
    except Exception as e:
        print(f" - Buyer upsert failed: {e}")
        
    # Create an open demand post
    try:
        date_from = datetime.now().strftime("%Y-%m-%d")
        date_to = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Check if they already have an open demand post to avoid duplicates
        existing_demands = supabase.table("demand_posts").select("id").eq("buyer_id", user_id).eq("status", "open").execute()
        
        if not existing_demands.data:
            supabase.table("demand_posts").insert({
                "buyer_id": user_id,
                "tonnes_needed": b["demand"],
                "price_per_tonne": b["price"],
                "location": point_str,
                "date_from": date_from,
                "date_to": date_to,
                "status": "open"
            }).execute()
            print(" - Demand post created.")
        else:
            print(" - Open demand post already exists.")
    except Exception as e:
        print(f" - Demand post creation failed: {e}")

print("Done seeding dummy buyers!")
