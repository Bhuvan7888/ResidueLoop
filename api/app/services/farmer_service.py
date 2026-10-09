from fastapi import UploadFile, HTTPException
# MOCK: In the hackathon build, we mock the ID review and encryption.
# In production, use AES-256-GCM to encrypt the file before sending to Supabase Storage.

from typing import Any
async def create_plot(user_id: str, plot_data: Any) -> None:
    # Here we would use the repository to insert into the `plots` table.
    # For now, it's a stub to satisfy the router.
    pass

async def upload_id_document(user_id: str, id_type: str, id_last4: str, file: UploadFile) -> None:
    # 1. Signature check (magic bytes)
    header = await file.read(4)
    await file.seek(0)
    
    is_jpeg = header.startswith(b'\xff\xd8\xff')
    is_png = header.startswith(b'\x89PNG')
    is_pdf = header.startswith(b'%PDF')
    
    if not (is_jpeg or is_png or is_pdf):
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and PDF are allowed.")
        
    # 2. Strip metadata (mocked: assume stripped or use a library like PIL for images in production)
    
    # 3. Generate random filename
    # ext = ".pdf" if is_pdf else (".png" if is_png else ".jpg")
    # filename = f"{uuid.uuid4()}{ext}"
    # path = f"{user_id}/{filename}"
    
    # 4. Encrypt file (mocked)
    
    # 5. Upload to Supabase Storage (id-documents bucket)
    # This requires the service role key since it's private.
    # (Mocking actual supabase client call)
    
    # 6. Insert into id_verifications table
    # MOCK: Auto-approve unless id_last4 is '0000' (seeded rejection case)
    # status = 'rejected' if id_last4 == '0000' else 'verified'
    # rejection_reason = 'Invalid ID document' if status == 'rejected' else None
    
    # (Mocking actual db insertion)
    pass
