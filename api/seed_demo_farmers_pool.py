import json
import os
import uuid
from supabase import create_client

def main():
    url = None
    service_key = None
    with open('.env') as f:
        for line in f:
            if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                service_key = line.strip().split('=', 1)[1].strip('\"\'')
            elif line.startswith('SUPABASE_URL='):
                url = line.strip().split('=', 1)[1].strip('\"\'')

    if not url or not service_key:
        print("Missing Supabase credentials in api/.env")
        return

    sb = create_client(url, service_key)

    # 1. Villages
    v_badhni = "11111111-1111-1111-1111-111111111111"
    v_ajitwal = "11111111-1111-1111-1111-111111111112"
    v_dharamkot = "11111111-1111-1111-1111-111111111113"

    # Buyer & Baler
    buyer_id = "66d13040-ca08-4e51-aaa2-db8d3ace9c06"
    baler_id = "33333333-3333-3333-3333-333333333331" # Moga Straw Services

    farmers_data = [
        # Badhni Kalan (0.7 km - 1.7 km from Moga Industrial Focal Point)
        {
            "phone": "+919876501101",
            "name": "Gurpreet Singh (ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ)",
            "village_id": v_badhni,
            "acres": 6.0,
            "coords": [75.172, 30.822],
            "tonnes": 15.0,
            "harvest_date": "2026-10-28",
        },
        {
            "phone": "+919876501102",
            "name": "Jaswant Singh (ਜਸਵੰਤ ਸਿੰਘ)",
            "village_id": v_badhni,
            "acres": 8.0,
            "coords": [75.168, 30.825],
            "tonnes": 20.0,
            "harvest_date": "2026-10-29",
        },
        {
            "phone": "+919876501103",
            "name": "Sukhwinder Singh Dhillon (ਸੁਖਵਿੰਦਰ ਢਿੱਲੋਂ)",
            "village_id": v_badhni,
            "acres": 5.0,
            "coords": [75.176, 30.819],
            "tonnes": 12.5,
            "harvest_date": "2026-10-30",
        },
        {
            "phone": "+919876501104",
            "name": "Balwinder Singh Brar (ਬਲਵਿੰਦਰ ਸਿੰਘ ਬਰਾੜ)",
            "village_id": v_badhni,
            "acres": 7.0,
            "coords": [75.164, 30.828],
            "tonnes": 17.5,
            "harvest_date": "2026-10-31",
        },
        # Ajitwal (3.4 km - 4.5 km from Moga Industrial Focal Point)
        {
            "phone": "+919876501105",
            "name": "Harpreet Singh Gill (ਹਰਪ੍ਰੀਤ ਸਿੰਘ ਗਿੱਲ)",
            "village_id": v_ajitwal,
            "acres": 10.0,
            "coords": [75.210, 30.811],
            "tonnes": 25.0,
            "harvest_date": "2026-11-01",
        },
        {
            "phone": "+919876501106",
            "name": "Amarjit Singh Sandhu (ਅਮਰਜੀਤ ਸਿੰਘ ਸੰਧੂ)",
            "village_id": v_ajitwal,
            "acres": 8.0,
            "coords": [75.205, 30.815],
            "tonnes": 20.0,
            "harvest_date": "2026-11-02",
        },
        {
            "phone": "+919876501107",
            "name": "Jagtar Singh Sidhu (ਜਗਤਾਰ ਸਿੰਘ ਸਿੱਧੂ)",
            "village_id": v_ajitwal,
            "acres": 6.0,
            "coords": [75.215, 30.808],
            "tonnes": 15.0,
            "harvest_date": "2026-11-03",
        },
        {
            "phone": "+919876501108",
            "name": "Manjit Singh Deol (ਮਨਜੀਤ ਸਿੰਘ ਦਿਓਲ)",
            "village_id": v_ajitwal,
            "acres": 9.0,
            "coords": [75.220, 30.814],
            "tonnes": 22.5,
            "harvest_date": "2026-11-04",
        },
        # Dharamkot (14 km from Moga Industrial Focal Point)
        {
            "phone": "+919876501109",
            "name": "Kuldeep Singh Toor (ਕੁਲਦੀਪ ਸਿੰਘ ਤੂਰ)",
            "village_id": v_dharamkot,
            "acres": 12.0,
            "coords": [75.236, 30.944],
            "tonnes": 30.0,
            "harvest_date": "2026-11-05",
        },
        {
            "phone": "+919876501110",
            "name": "Amrik Singh Grewal (ਅਮਰੀਕ ਸਿੰਘ ਗਰੇਵਾਲ)",
            "village_id": v_dharamkot,
            "acres": 10.0,
            "coords": [75.240, 30.940],
            "tonnes": 25.0,
            "harvest_date": "2026-11-06",
        },
    ]

    total_seeded_tonnes = sum(f["tonnes"] for f in farmers_data)
    print(f"Seeding {len(farmers_data)} nearby farmers with {total_seeded_tonnes} tonnes to meet 200t tender...")

    for f in farmers_data:
        # Check or create auth user
        user_id = None
        try:
            # Check existing profile with this phone
            existing = sb.table("profiles").select("id").eq("phone", f["phone"]).execute()
            if existing.data:
                user_id = existing.data[0]["id"]
            else:
                user_res = sb.auth.admin.create_user({
                    "phone": f["phone"],
                    "password": "Password123!",
                    "phone_confirm": True,
                })
                user_id = user_res.user.id
        except Exception as e:
            # Fallback generate uuid
            user_id = str(uuid.uuid4())

        # Ensure profile exists
        sb.table("profiles").upsert({
            "id": user_id,
            "phone": f["phone"],
            "name": f["name"],
            "role": "farmer",
            "language": "pa",
        }).execute()

        # Ensure farmer record exists
        sb.table("farmers").upsert({
            "profile_id": user_id,
            "village_id": f["village_id"],
            "id_status": "verified",
            "trust_score": 100,
        }).execute()

        # Find or create plot
        plot_res = sb.table("plots").select("id").eq("farmer_id", user_id).execute()
        if plot_res.data:
            plot_id = plot_res.data[0]["id"]
            sb.table("plots").update({
                "acres": f["acres"],
                "village_id": f["village_id"],
                "centre": {
                    "type": "Point",
                    "coordinates": f["coords"],
                    "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
                },
            }).eq("id", plot_id).execute()
        else:
            new_plot = sb.table("plots").insert({
                "farmer_id": user_id,
                "village_id": f["village_id"],
                "acres": f["acres"],
                "centre": {
                    "type": "Point",
                    "coordinates": f["coords"],
                    "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
                },
            }).execute()
            plot_id = new_plot.data[0]["id"]

        # Find or create open listing
        meta_payload = json.dumps({
            "quality_grade": "grade_a_sms",
            "stubble_form": "delivered_bales",
            "intended_purposes": ["biomass_plant", "paper_mill", "packaging"],
            "moisture_level": "12-15%",
            "expected_price_per_tonne": 1500.0,
        })

        existing_listing = sb.table("listings").select("id").eq("plot_id", plot_id).execute()
        if existing_listing.data:
            sb.table("listings").update({
                "est_tonnes": f["tonnes"],
                "harvest_date": f["harvest_date"],
                "combine_sms_used": True,
                "status": "open",
                "source": meta_payload,
            }).eq("id", existing_listing.data[0]["id"]).execute()
            print(f"Updated listing for {f['name']} ({f['tonnes']}t)")
        else:
            sb.table("listings").insert({
                "farmer_id": user_id,
                "plot_id": plot_id,
                "est_tonnes": f["tonnes"],
                "harvest_date": f["harvest_date"],
                "combine_sms_used": True,
                "status": "open",
                "source": meta_payload,
            }).execute()
            print(f"Created listing for {f['name']} ({f['tonnes']}t)")

    # 2. Seed / Update Village Straw Pools
    print("\nSeeding active Multi-Farmer Straw Pools...")
    # Update old 8t pools to realistic targets if any
    try:
        sb.table("pools").update({
            "target_tonnes": 100.0,
            "current_tonnes": 65.0,
            "status": "forming",
            "pickup_date": "2026-10-28",
        }).eq("target_tonnes", 8.0).execute()
    except Exception as e:
        print("Note on updating old pools:", e)

    # Pool 1: Badhni Kalan
    sb.table("pools").upsert({
        "id": "11111111-2222-3333-4444-555555555551",
        "village_id": v_badhni,
        "buyer_id": buyer_id,
        "baler_id": baler_id,
        "status": "forming",
        "target_tonnes": 100.0,
        "current_tonnes": 65.0,
        "pickup_date": "2026-10-28",
    }).execute()

    # Pool 2: Ajitwal
    sb.table("pools").upsert({
        "id": "11111111-2222-3333-4444-555555555552",
        "village_id": v_ajitwal,
        "buyer_id": buyer_id,
        "baler_id": baler_id,
        "status": "forming",
        "target_tonnes": 100.0,
        "current_tonnes": 82.5,
        "pickup_date": "2026-10-30",
    }).execute()

    print("Successfully seeded 2 village pools: Badhni Kalan (65t / 100t) and Ajitwal (82.5t / 100t)!")

if __name__ == "__main__":
    main()
