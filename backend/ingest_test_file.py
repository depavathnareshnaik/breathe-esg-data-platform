import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import IngestionBatch
from api.services.ingestion import parse_csv_batch
from api.services.normalization import normalize_row

def main():
    # Load user analyst_aerohi
    user = User.objects.get(username='analyst_aerohi')
    tenant = user.profile.tenant
    
    csv_path = '/Users/depavathnaresh/Desktop/breathe1/utility_sample.csv'
    with open(csv_path, 'r') as f:
        content = f.read()
        
    batch = IngestionBatch.objects.create(
        tenant=tenant,
        source_type='UTILITY',
        file_name='utility_sample.csv',
        raw_content=content,
        uploaded_by=user
    )
    
    rows = parse_csv_batch(batch)
    print(f"Parsed {len(rows)} rows.")
    
    for r in rows:
        record = normalize_row(r)
        print(f"Ingested record: ID={record.id}, Status={record.status}, Quantity={record.quantity}")

if __name__ == '__main__':
    main()
