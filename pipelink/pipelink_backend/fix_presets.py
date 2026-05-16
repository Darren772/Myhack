from firebase_client import db

docs = list(db.collection("event_presets").stream())
fixed = 0
for doc in docs:
    d = doc.to_dict()
    if not d.get("preset_id"):
        db.collection("event_presets").document(doc.id).update({"preset_id": doc.id})
        print(f"Fixed: {doc.id}  name={d.get('name','?')}")
        fixed += 1
    else:
        print(f"OK: {doc.id}")
print(f"Done. Fixed {fixed} presets.")
