import csv
import io
from api.models import IngestionBatch, IngestionRow

def parse_csv_batch(batch: IngestionBatch):
    """
    Parses the raw CSV content of an IngestionBatch and creates IngestionRow objects.
    """
    raw_text = batch.raw_content
    f = io.StringIO(raw_text)
    
    try:
        # Use DictReader to parse headers
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("CSV file is empty or has no header row.")
        
        # Clean headers to prevent spacing issues
        reader.fieldnames = [name.strip() for name in reader.fieldnames]
        
        rows_created = []
        for idx, row in enumerate(reader, start=1):
            # Clean keys and values of any stray whitespace
            cleaned_row = {
                k.strip(): v.strip() if v else "" 
                for k, v in row.items() 
                if k is not None
            }
            
            ingestion_row = IngestionRow.objects.create(
                batch=batch,
                row_index=idx,
                raw_data=cleaned_row,
                status='PENDING'
            )
            rows_created.append(ingestion_row)
        return rows_created
    except Exception as e:
        IngestionRow.objects.create(
            batch=batch,
            row_index=0,
            raw_data={},
            status='FAILED',
            error_message=str(e)
        )
        raise e
