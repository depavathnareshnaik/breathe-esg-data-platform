import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import NormalizedRecord

def main():
    try:
        record = NormalizedRecord.objects.get(id='3f9bb8bc-ed1c-420f-be91-58a597f4cebd')
        record.status = 'APPROVED'
        record.save()
        print("Record approved programmatically.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
