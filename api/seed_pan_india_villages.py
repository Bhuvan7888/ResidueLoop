import uuid
from app.core.security import get_supabase_client

# Comprehensive list of agricultural hubs, villages, and tehsils across Indian States
VILLAGES_DATA = [
    # --- PUNJAB ---
    # Moga
    {"name": "Badhni Kalan", "district": "Moga", "lat": 30.8200, "lng": 75.1710, "area": 1200},
    {"name": "Ajitwal", "district": "Moga", "lat": 30.8110, "lng": 75.2100, "area": 950},
    {"name": "Dharamkot", "district": "Moga", "lat": 30.9440, "lng": 75.2360, "area": 1100},
    {"name": "Nihal Singh Wala", "district": "Moga", "lat": 30.5900, "lng": 75.2800, "area": 1050},
    {"name": "Bagha Purana", "district": "Moga", "lat": 30.6860, "lng": 75.0920, "area": 1300},
    # Ludhiana
    {"name": "Khanna", "district": "Ludhiana", "lat": 30.7072, "lng": 76.2167, "area": 1800},
    {"name": "Samrala", "district": "Ludhiana", "lat": 30.8350, "lng": 76.1920, "area": 1400},
    {"name": "Jagraon", "district": "Ludhiana", "lat": 30.7850, "lng": 75.4780, "area": 1600},
    {"name": "Raikot", "district": "Ludhiana", "lat": 30.6500, "lng": 75.6000, "area": 1200},
    {"name": "Sahnewal", "district": "Ludhiana", "lat": 30.8400, "lng": 75.9800, "area": 900},
    # Sangrur
    {"name": "Sunam", "district": "Sangrur", "lat": 30.1300, "lng": 75.8000, "area": 1500},
    {"name": "Dhuri", "district": "Sangrur", "lat": 30.3700, "lng": 75.8700, "area": 1400},
    {"name": "Moonak", "district": "Sangrur", "lat": 29.8200, "lng": 75.8900, "area": 1100},
    {"name": "Malerkotla", "district": "Sangrur", "lat": 30.5200, "lng": 75.8800, "area": 1300},
    # Bathinda
    {"name": "Rampura Phul", "district": "Bathinda", "lat": 30.2700, "lng": 75.2400, "area": 1450},
    {"name": "Talwandi Sabo", "district": "Bathinda", "lat": 29.9800, "lng": 75.0900, "area": 1600},
    {"name": "Maur", "district": "Bathinda", "lat": 30.0800, "lng": 75.2500, "area": 1250},
    # Patiala
    {"name": "Nabha", "district": "Patiala", "lat": 30.3700, "lng": 76.1500, "area": 1700},
    {"name": "Samana", "district": "Patiala", "lat": 30.1500, "lng": 76.1900, "area": 1500},
    {"name": "Rajpura", "district": "Patiala", "lat": 30.4800, "lng": 76.5900, "area": 1350},
    # Amritsar
    {"name": "Ajnala", "district": "Amritsar", "lat": 31.8400, "lng": 74.7600, "area": 1250},
    {"name": "Majitha", "district": "Amritsar", "lat": 31.7600, "lng": 74.9500, "area": 1150},
    {"name": "Jandiala Guru", "district": "Amritsar", "lat": 31.5600, "lng": 75.0300, "area": 1050},
    # Firozpur
    {"name": "Zira", "district": "Firozpur", "lat": 30.9700, "lng": 74.9800, "area": 1300},
    {"name": "Guruharsahai", "district": "Firozpur", "lat": 30.7200, "lng": 74.4000, "area": 1100},

    # --- HARYANA ---
    # Karnal
    {"name": "Karnal Town", "district": "Karnal", "lat": 29.6857, "lng": 76.9897, "area": 1500},
    {"name": "Nilokheri", "district": "Karnal", "lat": 29.8300, "lng": 76.9200, "area": 1200},
    {"name": "Gharaunda", "district": "Karnal", "lat": 29.5400, "lng": 76.9700, "area": 1300},
    {"name": "Assandh", "district": "Karnal", "lat": 29.5200, "lng": 76.6000, "area": 1400},
    {"name": "Indri", "district": "Karnal", "lat": 29.8800, "lng": 77.0600, "area": 1150},
    # Ambala
    {"name": "Ambala Village", "district": "Ambala", "lat": 30.3782, "lng": 76.7767, "area": 1100},
    {"name": "Barara", "district": "Ambala", "lat": 30.2100, "lng": 77.0400, "area": 950},
    {"name": "Naraingarh", "district": "Ambala", "lat": 30.4800, "lng": 77.1300, "area": 1050},
    # Kurukshetra
    {"name": "Pehowa", "district": "Kurukshetra", "lat": 29.9800, "lng": 76.5800, "area": 1400},
    {"name": "Shahbad Markanda", "district": "Kurukshetra", "lat": 30.1700, "lng": 76.8700, "area": 1350},
    {"name": "Ladwa", "district": "Kurukshetra", "lat": 29.9900, "lng": 77.0500, "area": 1100},
    # Kaithal
    {"name": "Guhla Cheeka", "district": "Kaithal", "lat": 30.0400, "lng": 76.2900, "area": 1450},
    {"name": "Pundri", "district": "Kaithal", "lat": 29.7600, "lng": 76.5600, "area": 1200},
    {"name": "Kalayat", "district": "Kaithal", "lat": 29.6700, "lng": 76.2500, "area": 1100},
    # Fatehabad & Sirsa
    {"name": "Tohana", "district": "Fatehabad", "lat": 29.7000, "lng": 75.9000, "area": 1350},
    {"name": "Ratia", "district": "Fatehabad", "lat": 29.6800, "lng": 75.5800, "area": 1300},
    {"name": "Dabwali", "district": "Sirsa", "lat": 29.9600, "lng": 74.7200, "area": 1500},
    {"name": "Ellenabad", "district": "Sirsa", "lat": 29.4500, "lng": 74.6500, "area": 1200},

    # --- UTTAR PRADESH ---
    # Meerut & NCR
    {"name": "Mawana", "district": "Meerut", "lat": 29.1000, "lng": 77.9200, "area": 1300},
    {"name": "Sardhana", "district": "Meerut", "lat": 29.1500, "lng": 77.6200, "area": 1200},
    {"name": "Khatauli", "district": "Muzaffarnagar", "lat": 29.2800, "lng": 77.7200, "area": 1400},
    {"name": "Deoband", "district": "Saharanpur", "lat": 29.7000, "lng": 77.5800, "area": 1350},
    # Central UP
    {"name": "Gomti Nagar", "district": "Lucknow", "lat": 26.8500, "lng": 81.0000, "area": 800},
    {"name": "Bakshi Ka Talab", "district": "Lucknow", "lat": 26.9800, "lng": 80.9200, "area": 950},
    {"name": "Bilhaur", "district": "Kanpur", "lat": 26.8500, "lng": 80.0500, "area": 1100},
    {"name": "Ghatampur", "district": "Kanpur", "lat": 26.1600, "lng": 80.1700, "area": 1000},
    {"name": "Baheri", "district": "Bareilly", "lat": 28.7800, "lng": 79.5000, "area": 1250},
    {"name": "Palia Kalan", "district": "Lakhimpur Kheri", "lat": 28.4300, "lng": 80.5800, "area": 1400},
    {"name": "Gola Gokarnath", "district": "Lakhimpur Kheri", "lat": 28.0800, "lng": 80.4700, "area": 1300},
    # East UP
    {"name": "Phulpur", "district": "Prayagraj", "lat": 25.5500, "lng": 82.0800, "area": 900},
    {"name": "Pindra", "district": "Varanasi", "lat": 25.4800, "lng": 82.8500, "area": 850},
    {"name": "Sahjanwa", "district": "Gorakhpur", "lat": 26.7500, "lng": 83.2300, "area": 950},
    {"name": "Rudauli", "district": "Ayodhya", "lat": 26.7500, "lng": 81.7500, "area": 1100},

    # --- RAJASTHAN ---
    {"name": "Suratgarh", "district": "Sri Ganganagar", "lat": 29.3200, "lng": 73.9000, "area": 1600},
    {"name": "Anupgarh", "district": "Sri Ganganagar", "lat": 29.1900, "lng": 73.2100, "area": 1400},
    {"name": "Nohar", "district": "Hanumangarh", "lat": 29.1800, "lng": 74.7700, "area": 1300},
    {"name": "Bhadra", "district": "Hanumangarh", "lat": 29.1000, "lng": 75.1700, "area": 1250},
    {"name": "Ramganj Mandi", "district": "Kota", "lat": 24.6500, "lng": 75.9500, "area": 1100},
    {"name": "Chomu", "district": "Jaipur", "lat": 27.1700, "lng": 75.7200, "area": 950},
    {"name": "Kotputli", "district": "Jaipur", "lat": 27.7000, "lng": 76.2000, "area": 1050},

    # --- MADHYA PRADESH ---
    {"name": "Itarsi", "district": "Hoshangabad", "lat": 22.6100, "lng": 77.7600, "area": 1500},
    {"name": "Pipariya", "district": "Hoshangabad", "lat": 22.7600, "lng": 78.3500, "area": 1600},
    {"name": "Ashta", "district": "Sehore", "lat": 23.0200, "lng": 76.7200, "area": 1300},
    {"name": "Nagda", "district": "Ujjain", "lat": 23.4500, "lng": 75.4200, "area": 1200},
    {"name": "Sanwer", "district": "Indore", "lat": 22.9800, "lng": 75.8300, "area": 1150},
    {"name": "Dabra", "district": "Gwalior", "lat": 25.9000, "lng": 78.3300, "area": 1350},
    {"name": "Sihora", "district": "Jabalpur", "lat": 23.4900, "lng": 80.1100, "area": 1250},

    # --- MAHARASHTRA ---
    {"name": "Hinjawadi", "district": "Pune", "lat": 18.5913, "lng": 73.7389, "area": 700},
    {"name": "Baramati", "district": "Pune", "lat": 18.1500, "lng": 74.5800, "area": 1400},
    {"name": "Shirur", "district": "Pune", "lat": 18.8200, "lng": 74.3700, "area": 1200},
    {"name": "Niphad", "district": "Nashik", "lat": 20.0700, "lng": 74.1100, "area": 1300},
    {"name": "Sinnar", "district": "Nashik", "lat": 19.8500, "lng": 74.0000, "area": 1150},
    {"name": "Shirol", "district": "Kolhapur", "lat": 16.7200, "lng": 74.6000, "area": 1250},
    {"name": "Pandharpur", "district": "Solapur", "lat": 17.6700, "lng": 75.3200, "area": 1350},
    {"name": "Rahuri", "district": "Ahmednagar", "lat": 19.3900, "lng": 74.6500, "area": 1400},
    {"name": "Saoner", "district": "Nagpur", "lat": 21.3800, "lng": 78.9200, "area": 1050},

    # --- GUJARAT ---
    {"name": "Petlad", "district": "Anand", "lat": 22.4700, "lng": 72.8000, "area": 1100},
    {"name": "Borsad", "district": "Anand", "lat": 22.4100, "lng": 72.9000, "area": 1050},
    {"name": "Kadi", "district": "Mehsana", "lat": 23.3000, "lng": 72.3300, "area": 1200},
    {"name": "Visnagar", "district": "Mehsana", "lat": 23.7000, "lng": 72.5500, "area": 1150},
    {"name": "Gondal", "district": "Rajkot", "lat": 21.9600, "lng": 70.8000, "area": 1250},
    {"name": "Bardoli", "district": "Surat", "lat": 21.1200, "lng": 73.1100, "area": 1300},

    # --- BIHAR ---
    {"name": "Sasaram", "district": "Rohtas", "lat": 24.9500, "lng": 84.0300, "area": 1600},
    {"name": "Nokha", "district": "Rohtas", "lat": 25.1800, "lng": 84.1500, "area": 1400},
    {"name": "Bikramganj", "district": "Rohtas", "lat": 25.2000, "lng": 84.2500, "area": 1350},
    {"name": "Dumraon", "district": "Buxar", "lat": 25.5500, "lng": 84.1500, "area": 1450},
    {"name": "Brahmpur", "district": "Buxar", "lat": 25.6000, "lng": 84.3000, "area": 1200},
    {"name": "Jagdishpur", "district": "Bhojpur", "lat": 25.4700, "lng": 84.4200, "area": 1300},
    {"name": "Barh", "district": "Patna", "lat": 25.4800, "lng": 85.7100, "area": 1100},
    {"name": "Mokama", "district": "Patna", "lat": 25.4000, "lng": 85.9200, "area": 1150},

    # --- WEST BENGAL ---
    {"name": "Memari", "district": "Purba Bardhaman", "lat": 23.2000, "lng": 88.1100, "area": 1400},
    {"name": "Kalna", "district": "Purba Bardhaman", "lat": 23.2200, "lng": 88.3700, "area": 1300},
    {"name": "Katwa", "district": "Purba Bardhaman", "lat": 23.6500, "lng": 88.1300, "area": 1350},
    {"name": "Arambagh", "district": "Hooghly", "lat": 22.8800, "lng": 87.7800, "area": 1250},
    {"name": "Singur", "district": "Hooghly", "lat": 22.8100, "lng": 88.2300, "area": 1100},
    {"name": "Berhampore", "district": "Murshidabad", "lat": 24.1000, "lng": 88.2500, "area": 1200},

    # --- KARNATAKA ---
    {"name": "Whitefield", "district": "Bengaluru", "lat": 12.9698, "lng": 77.7499, "area": 600},
    {"name": "Hoskote", "district": "Bengaluru", "lat": 13.0700, "lng": 77.8000, "area": 850},
    {"name": "Maddur", "district": "Mandya", "lat": 12.5800, "lng": 77.0400, "area": 1300},
    {"name": "Srirangapatna", "district": "Mandya", "lat": 12.4200, "lng": 76.6900, "area": 1200},
    {"name": "Sindhanur", "district": "Raichur", "lat": 15.7800, "lng": 76.7600, "area": 1600},
    {"name": "Siruguppa", "district": "Bellary", "lat": 15.6300, "lng": 76.9000, "area": 1450},

    # --- ANDHRA PRADESH ---
    {"name": "Gudivada", "district": "Krishna", "lat": 16.4400, "lng": 80.9900, "area": 1400},
    {"name": "Machilipatnam", "district": "Krishna", "lat": 16.1800, "lng": 81.1300, "area": 1200},
    {"name": "Tenali", "district": "Guntur", "lat": 16.2400, "lng": 80.6400, "area": 1350},
    {"name": "Bhimavaram", "district": "West Godavari", "lat": 16.5400, "lng": 81.5200, "area": 1500},
    {"name": "Tadepalligudem", "district": "West Godavari", "lat": 16.8100, "lng": 81.5200, "area": 1400},

    # --- TELANGANA ---
    {"name": "Huzurabad", "district": "Karimnagar", "lat": 18.1900, "lng": 79.4000, "area": 1300},
    {"name": "Jammikunta", "district": "Karimnagar", "lat": 18.2800, "lng": 79.4700, "area": 1250},
    {"name": "Bodhan", "district": "Nizamabad", "lat": 18.6600, "lng": 77.9000, "area": 1400},
    {"name": "Miryalaguda", "district": "Nalgonda", "lat": 16.8700, "lng": 79.5600, "area": 1500},
    {"name": "Suryapet", "district": "Nalgonda", "lat": 17.1400, "lng": 79.6200, "area": 1350},

    # --- TAMIL NADU ---
    {"name": "Kumbakonam", "district": "Thanjavur", "lat": 10.9600, "lng": 79.3800, "area": 1400},
    {"name": "Pattukkottai", "district": "Thanjavur", "lat": 10.4300, "lng": 79.3200, "area": 1300},
    {"name": "Mannargudi", "district": "Tiruvarur", "lat": 10.6600, "lng": 79.4500, "area": 1350},
    {"name": "Mayiladuthurai", "district": "Nagapattinam", "lat": 11.1000, "lng": 79.6500, "area": 1250},

    # --- ODISHA ---
    {"name": "Attabira", "district": "Bargarh", "lat": 21.3600, "lng": 83.7800, "area": 1500},
    {"name": "Barpali", "district": "Bargarh", "lat": 21.1900, "lng": 83.5800, "area": 1350},
    {"name": "Kuchinda", "district": "Sambalpur", "lat": 21.7400, "lng": 84.3500, "area": 1100},

    # --- CHHATTISGARH ---
    {"name": "Abhanpur", "district": "Raipur", "lat": 21.0500, "lng": 81.7500, "area": 1300},
    {"name": "Patan", "district": "Durg", "lat": 21.0300, "lng": 81.5300, "area": 1250},
    {"name": "Kurud", "district": "Dhamtari", "lat": 20.8300, "lng": 81.7200, "area": 1400},

    # --- JHARKHAND ---
    {"name": "Kanke", "district": "Ranchi", "lat": 23.4300, "lng": 85.3200, "area": 950},
    {"name": "Barhi", "district": "Hazaribagh", "lat": 24.3000, "lng": 85.4200, "area": 900},

    # --- UTTARAKHAND ---
    {"name": "Kashipur", "district": "Udham Singh Nagar", "lat": 29.2100, "lng": 78.9600, "area": 1350},
    {"name": "Rudrapur", "district": "Udham Singh Nagar", "lat": 28.9800, "lng": 79.4000, "area": 1400},
    {"name": "Roorkee", "district": "Haridwar", "lat": 29.8500, "lng": 77.8900, "area": 1200},

    # --- HIMACHAL PRADESH ---
    {"name": "Nurpur", "district": "Kangra", "lat": 32.3000, "lng": 75.8900, "area": 850},
    {"name": "Sundernagar", "district": "Mandi", "lat": 31.5300, "lng": 76.9000, "area": 800},
    {"name": "Haroli", "district": "Una", "lat": 31.4200, "lng": 76.2200, "area": 900},

    # --- ASSAM ---
    {"name": "Kaliabor", "district": "Nagaon", "lat": 26.5400, "lng": 93.0000, "area": 1050},
    {"name": "Sarthebari", "district": "Barpeta", "lat": 26.3500, "lng": 91.1300, "area": 1000},

    # --- KERALA ---
    {"name": "Alathur", "district": "Palakkad", "lat": 10.6400, "lng": 76.5400, "area": 1100},
    {"name": "Chittur", "district": "Palakkad", "lat": 10.7000, "lng": 76.7200, "area": 1050},
    {"name": "Kuttanad", "district": "Alappuzha", "lat": 9.4500, "lng": 76.4500, "area": 1200},

    # --- DELHI / NCR ---
    {"name": "Alipur", "district": "North Delhi", "lat": 28.8000, "lng": 77.1300, "area": 850},
    {"name": "Narela", "district": "North Delhi", "lat": 28.8500, "lng": 77.0900, "area": 900},
    {"name": "Najafgarh", "district": "South West Delhi", "lat": 28.6100, "lng": 76.9800, "area": 950},

    # --- CHANDIGARH & UTs ---
    {"name": "Manimajra", "district": "Chandigarh", "lat": 30.7200, "lng": 76.8400, "area": 500},
    {"name": "Villianur", "district": "Puducherry", "lat": 11.9100, "lng": 79.7600, "area": 750},
    {"name": "RS Pura", "district": "Jammu", "lat": 32.6000, "lng": 74.7300, "area": 1100},
]

def seed():
    client = get_supabase_client()
    existing_resp = client.table("villages").select("name, district").execute()
    existing_set = {(item["name"].lower().strip(), item["district"].lower().strip()) for item in existing_resp.data}
    
    print(f"Existing villages count: {len(existing_set)}")
    
    to_insert = []
    for v in VILLAGES_DATA:
        key = (v["name"].lower().strip(), v["district"].lower().strip())
        if key not in existing_set:
            to_insert.append({
                "id": str(uuid.uuid4()),
                "name": v["name"],
                "district": v["district"],
                "geometry": {
                    "type": "Point",
                    "coordinates": [v["lng"], v["lat"]]
                },
                "paddy_area_est": v["area"]
            })
            existing_set.add(key)
            
    print(f"Inserting {len(to_insert)} new villages across Indian states...")
    
    # Insert in batches of 20
    batch_size = 20
    for i in range(0, len(to_insert), batch_size):
        batch = to_insert[i:i + batch_size]
        res = client.table("villages").insert(batch).execute()
        print(f"Batch {i//batch_size + 1} inserted ({len(batch)} items)")
        
    total = client.table("villages").select("id").execute()
    print(f"Total villages now in DB: {len(total.data)}")

if __name__ == "__main__":
    seed()
