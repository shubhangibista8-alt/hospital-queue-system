 Hospital Queue Management System — TO CARE

## Person 3: Subhangi Bista | Roll No. 8
**Module:** Records & Testing

## Files
- `record_store.py` — PatientRecord and RecordStore classes
- `test_record_store.py` — Test cases TC-01 to TC-07

## How to run tests
```bash
python -m unittest test_record_store.py -v
```

## Test Cases
| ID | Description | Expected Result |
|----|-------------|-----------------|
| TC-01 | Add new patient record | Record created successfully |
| TC-02 | Get existing record by ID | Record returned |
| TC-03 | Get non-existent record | Returns None |
| TC-04 | Update status to in-progress | Status updated |
| TC-05 | Update status to done | Status updated |
| TC-06 | Update non-existent patient | No crash |
| TC-07 | Default status on new record | Status = waiting |