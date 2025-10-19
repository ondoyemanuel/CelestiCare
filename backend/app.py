import json
import re
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- Updated Regex Engine ---
problem_regex = None
variation_map = {}  # This will now store objects, not just terms

def build_regex_engine():
    global problem_regex, variation_map
    print("Building regex engine from knowledge base...")
    
    # Updated path to look in data folder
    with open('data/problems_kb.json', 'r') as f:
        kb = json.load(f)
        
    all_variations = []
    for item in kb:
        canonical_term = item['term']
        category = item['category']
        
        for variation in item['variations']:
            variation_lower = variation.lower()
            # Store the full object in the map
            variation_map[variation_lower] = {
                "term": canonical_term,
                "category": category
            }
            all_variations.append(re.escape(variation_lower))
            
    pattern = r'\b(' + '|'.join(all_variations) + r')\b'
    problem_regex = re.compile(pattern, re.IGNORECASE)
    print("Regex engine build complete.")

def load_data():
    with open('data/mock.json', 'r') as f:
        return json.load(f)

# NEW: Function to save data permanently
def save_data():
    with open('data/mock.json', 'w') as f:
        json.dump(patients_data, f, indent=2)
    print("Data saved to file.")

patients_data = load_data()

@app.route("/patients")
def get_patients():
    return jsonify(patients_data)

@app.route("/problems-kb")
def get_problems_kb():
    with open('data/problems_kb.json', 'r') as f:
        return jsonify(json.load(f))

@app.route("/patients/<int:patient_id>", methods=["POST"])
def update_patient(patient_id):
    global patients_data
    updated_data = request.json
    for i, patient in enumerate(patients_data):
        if patient['id'] == patient_id:
            patients_data[i] = updated_data
            save_data()  # Save after updating
            return jsonify(updated_data), 200
    return jsonify({"error": "Patient not found"}), 404

@app.route("/detect-problems", methods=["POST"])
def detect_problems():
    data = request.json
    note_text = data.get('noteText', '')
    
    # Use a dict to store findings to avoid duplicates
    found_problems_map = {}
    
    for match in problem_regex.finditer(note_text):
        found_variation = match.group(1).lower()
        
        # Look up the full info object
        problem_info = variation_map[found_variation]
        
        # Use the canonical term as the key to prevent duplicates
        found_problems_map[problem_info['term']] = problem_info
        
    # Return a list of the unique problem objects
    return jsonify(list(found_problems_map.values()))

@app.route("/patients", methods=["POST"])
def add_patient():
    global patients_data
    
    # Get the data from the frontend
    data = request.json
    patient_name = data.get('name')
    patient_age = data.get('age')

    if not patient_name or patient_age is None:
        return jsonify({"error": "Name and age are required"}), 400

    # Find the next available ID
    if patients_data:
        new_id = max(p['id'] for p in patients_data) + 1
    else:
        new_id = 1  # Handle empty patient list

    # Create the new patient object
    new_patient = {
        "id": new_id,
        "name": patient_name,
        "age": int(patient_age),
        "notes": [],
        "problems": [],
        "labs": [],
        "medications": []
    }

    # Add it to our "database"
    patients_data.append(new_patient)
    save_data()  # Save after adding

    # Send the new patient back to the frontend
    return jsonify(new_patient), 201

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
        save_data()  # Save after deleting
        return jsonify({"status": "deleted", "id": patient_id}), 200
    else:
        return jsonify({"error": "Patient not found"}), 404

if __name__ == "__main__":
    build_regex_engine()
    print("Starting server...")
    app.run(debug=True)