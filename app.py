import json
import re
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- Updated Regex Engine ---
problem_regex = None
variation_map = {} # This will now store objects, not just terms

def build_regex_engine():
    global problem_regex, variation_map
    print("Building regex engine from knowledge base...")
    
    with open('problems_kb.json', 'r') as f:
        kb = json.load(f)
        
    all_variations = []
    for item in kb:
        canonical_term = item['term']
        category = item['category'] # NEW: Get the category
        
        for variation in item['variations']:
            variation_lower = variation.lower()
            # NEW: Store the full object in the map
            variation_map[variation_lower] = {
                "term": canonical_term,
                "category": category
            }
            all_variations.append(re.escape(variation_lower))
            
    pattern = r'\b(' + '|'.join(all_variations) + r')\b'
    problem_regex = re.compile(pattern, re.IGNORECASE)
    print("Regex engine build complete.")
# --- End of new regex logic ---

def load_data():
    # Make sure this path is correct!
    with open('data/mock.json', 'r') as f:
        return json.load(f)

patients_data = load_data()

@app.route("/patients")
def get_patients():
    return jsonify(patients_data)

@app.route("/patients/<int:patient_id>", methods=["POST"])
def update_patient(patient_id):
    global patients_data
    updated_data = request.json
    for i, patient in enumerate(patients_data):
        if patient['id'] == patient_id:
            patients_data[i] = updated_data
            return jsonify(updated_data), 200
    return jsonify({"error": "Patient not found"}), 404

# --- Updated Problem Detection Endpoint ---
@app.route("/detect-problems", methods=["POST"])
def detect_problems():
    data = request.json
    note_text = data.get('noteText', '')
    
    # Use a dict to store findings to avoid duplicates
    found_problems_map = {}
    
    for match in problem_regex.finditer(note_text):
        found_variation = match.group(1).lower()
        
        # Look up the full info object (e.g., {"term": "Hypertension", "category": "Diagnosis"})
        problem_info = variation_map[found_variation]
        
        # Use the canonical term as the key to prevent duplicates
        found_problems_map[problem_info['term']] = problem_info
        
    # Return a list of the unique problem objects
    return jsonify(list(found_problems_map.values()))
# --- End of new detection endpoint ---

# --- NEW: Route to CREATE a new patient ---
@app.route("/patients", methods=["POST"])
def add_patient():
    global patients_data
    
    # 1. Get the data from the frontend
    data = request.json
    patient_name = data.get('name')
    patient_age = data.get('age')

    if not patient_name or patient_age is None:
        return jsonify({"error": "Name and age are required"}), 400

    # 2. Find the next available ID
    new_id = max(p['id'] for p in patients_data) + 1

    # 3. Create the new patient object
    new_patient = {
        "id": new_id,
        "name": patient_name,
        "age": int(patient_age),
        "notes": [],
        "problems": [],
        "labs": [],
        "medications": []
    }

    # 4. Add it to our "database"
    patients_data.append(new_patient)

    # 5. Send the new patient back to the frontend
    return jsonify(new_patient), 201

# --- NEW: Route to DELETE a specific patient ---
@app.route("/patients/<int:patient_id>", methods=["DELETE"])
def delete_patient(patient_id):
    global patients_data
    
    # Find the patient
    patient_to_delete = None
    for patient in patients_data:
        if patient['id'] == patient_id:
            patient_to_delete = patient
            break
            
    # If we found them, remove them
    if patient_to_delete:
        patients_data.remove(patient_to_delete)
        return jsonify({"status": "deleted", "id": patient_id}), 200
    else:
        return jsonify({"error": "Patient not found"}), 404

if __name__ == "__main__":
    build_regex_engine()
    print("Starting server...")
    app.run(debug=True)