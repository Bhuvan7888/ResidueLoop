import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in env.")
    exit(1)

supabase: Client = create_client(url, key)

ngo_data = {
    "phone": "+919999999911",
    "name": "Punjab Clean Air & Bio-Energy Action",
    "description": "Ground NGO deploying balers and community stubble collection across Punjab and Haryana to achieve zero farm-fires.",
    "website_url": "https://residueloop.test/clean-air"
}

print("Checking/seeding NGO...")
user_id = None
try:
    user = supabase.auth.admin.create_user({
        "phone": ngo_data["phone"],
        "phone_confirm": True,
        "user_metadata": {"role": "ngo"}
    })
    user_id = user.user.id
    print(f"Auth user created: {user_id}")
except Exception as e:
    print(f"Auth user creation note: {str(e).splitlines()[0]}")

if not user_id:
    res = supabase.table("profiles").select("id").eq("phone", ngo_data["phone"]).execute()
    if res.data:
        user_id = res.data[0]["id"]
        print(f"Found existing profile: {user_id}")

if user_id:
    supabase.table("profiles").upsert({
        "id": user_id,
        "phone": ngo_data["phone"],
        "role": "ngo",
        "name": ngo_data["name"]
    }).execute()
    print("Profile upserted.")

    supabase.table("ngos").upsert({
        "profile_id": user_id,
        "description": ngo_data["description"],
        "website_url": ngo_data["website_url"]
    }).execute()
    print("NGO record upserted successfully!")
else:
    print("Could not obtain user_id for NGO.")
