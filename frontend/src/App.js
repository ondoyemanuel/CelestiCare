import React, { useState, useEffect } from 'react';
import './App.css';

const groupProblems = (problems) => {
  return problems.reduce((groups, problem) => {
    const category = problem.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(problem);
    return groups;
  }, {});
};

// NEW: A dedicated component for the Lab Results view WITH SORTING
function LabView({ labs }) {
  const [sortedLabs, setSortedLabs] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });

  useEffect(() => {
    if (!labs) {
      setSortedLabs([]);
      return;
    }
    let sortableLabs = [...labs];
    sortableLabs.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    setSortedLabs(sortableLabs);
  }, [labs, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
       direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  if (!labs || labs.length === 0) {
    return <p className="no-data-message">No lab results on file for this patient.</p>;
  }

  return (
    <div className="lab-container fade-slide-up">
      <table className="lab-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('name')} className="sortable-header">
              Lab Test {getSortIndicator('name')}
            </th>
            <th onClick={() => requestSort('value')} className="sortable-header">
              Value {getSortIndicator('value')}
            </th>
            <th>Units</th>
            <th onClick={() => requestSort('date')} className="sortable-header">
              Date {getSortIndicator('date')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedLabs.map((lab, index) => (
            <tr key={index}>
              <td>{lab.name}</td>
              <td>{lab.value}</td>
              <td>{lab.units}</td>
              <td>{lab.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersView({ medications }) {
  if (!medications || medications.length === 0) {
    return <p className="no-data-message">No active orders on file for this patient.</p>;
  }

  const handleReorder = (medName) => {
    alert(`Reorder button clicked for: ${medName}\n(This would open a new order form)`);
  };

  return (
    <div className="orders-container fade-slide-up">
      <ul className="orders-list">
        {medications.map((med, index) => (
          <li key={index} className="order-item">
            <span className="order-name">{med.name}</span>
            <span className="order-status">{med.status}</span>
            <button 
              className="reorder-button"
              onClick={() => handleReorder(med.name)}
            >
              Reorder
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [detectedProblems, setDetectedProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState(new Set());
  const [activeTab, setActiveTab] = useState('note');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordAttempt, setPasswordAttempt] = useState("");
  const [problemDatabase, setProblemDatabase] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  const handleLogin = () => {
    if (passwordAttempt === "CelestiCareDemo") {
      setIsLoggedIn(true);
    } else {
      alert("Incorrect password");
      setPasswordAttempt("");
    }
  };

  useEffect(() => {
    fetch('http://127.0.0.1:5000/patients')
      .then(response => response.json())
      .then(data => setPatients(data))
      .catch(error => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/problems-kb')
      .then(response => response.json())
      .then(data => {
        console.log('Problem database loaded:', data.length, 'items');
        setProblemDatabase(data);
      })
      .catch(error => console.error("Error fetching problem database:", error));
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setSelectedSearchIndex(-1);
      return;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    const results = problemDatabase.filter(problem => 
      problem.term.toLowerCase().includes(lowerCaseQuery) ||
      problem.variations.some(v => v.toLowerCase().includes(lowerCaseQuery))
    ).slice(0, 7);

    console.log('Search query:', searchQuery);
    console.log('Problem database length:', problemDatabase.length);
    console.log('Search results:', results);

    setSearchResults(results);
    setSelectedSearchIndex(-1);
  }, [searchQuery, problemDatabase]);

  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
    setNoteText(""); 
    setDetectedProblems([]);
    setSelectedProblems(new Set());
    setActiveTab('note');
    setSearchQuery("");
  };

  const handleNoteChange = (event) => {
    setNoteText(event.target.value);
  };
  
  const handleDetectProblems = async () => {
    if (!noteText) return;
    setIsLoading(true);
    setDetectedProblems([]);
    setSelectedProblems(new Set());
    setSearchQuery("");
    
    try {
      const response = await fetch('http://127.0.0.1:5000/detect-problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText: noteText }),
      });
      const problems = await response.json(); 
      setDetectedProblems(problems);
    } catch (error) {
      console.error("Error detecting problems:", error);
    }
    setIsLoading(false);
  };

  const handleProblemClick = (problemTerm) => {
    setSelectedProblems(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(problemTerm)) {
        newSelected.delete(problemTerm);
      } else {
        newSelected.add(problemTerm);
      }
      return newSelected;
    });
  };
  
  const handleAddProblems = async () => {
    const currentProblems = selectedPatient.problems || [];
    const newProblemTerms = Array.from(selectedProblems)
      .filter(term => !currentProblems.includes(term));
    const trimmedNote = noteText.trim();
    if (newProblemTerms.length === 0 && trimmedNote === "") {
      setDetectedProblems([]);
      setSelectedProblems(new Set());
      return;
    }
    const currentNotes = Array.isArray(selectedPatient.notes) ? selectedPatient.notes : [];
    let newNotesArray = [...currentNotes];
    if (trimmedNote !== "") {
      const newNote = {
        id: new Date().toISOString(),
        timestamp: new Date().toLocaleString(),
        text: trimmedNote
      };
      newNotesArray.push(newNote);
    }
    const updatedPatient = {
      ...selectedPatient,
      problems: [...currentProblems, ...newProblemTerms],
      notes: newNotesArray
    };
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/patients/${selectedPatient.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPatient),
        }
      );
      if (!response.ok) throw new Error("Failed to save data");
      const savedPatient = await response.json();
      setPatients(patients.map(p => 
        p.id === savedPatient.id ? savedPatient : p
      ));
      setSelectedPatient(savedPatient);
      setNoteText("");
      setDetectedProblems([]);
      setSelectedProblems(new Set());
    } catch (error) {
      console.error("Error saving patient data:", error);
    }
  };

  const handleDeleteProblem = async (problemToDelete) => {
    if (!selectedPatient) return;
    const newProblemList = selectedPatient.problems.filter(
      (problem) => problem !== problemToDelete
    );
    const updatedPatient = {
      ...selectedPatient,
      problems: newProblemList,
    };
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/patients/${selectedPatient.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPatient),
        }
      );
      if (!response.ok) throw new Error("Failed to delete problem");
      const savedPatient = await response.json();
      setPatients(patients.map(p => 
        p.id === savedPatient.id ? savedPatient : p
      ));
      setSelectedPatient(savedPatient);
    } catch (error) {
      console.error("Error deleting problem:", error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!selectedPatient) return;
    const newNotesArray = selectedPatient.notes.filter(
      (note) => note.id !== noteId
    );
    const updatedPatient = {
      ...selectedPatient,
      notes: newNotesArray,
    };
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/patients/${selectedPatient.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPatient),
        }
      );
      if (!response.ok) throw new Error("Failed to delete note");
      const savedPatient = await response.json();
      setPatients(patients.map(p => 
        p.id === savedPatient.id ? savedPatient : p
      ));
      setSelectedPatient(savedPatient);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleSearchResultClick = (problem) => {
    setDetectedProblems([...detectedProblems, problem]);
    setSelectedProblems(prevSelected => {
      const newSelected = new Set(prevSelected);
      newSelected.add(problem.term);
      return newSelected;
    });
    setSearchQuery("");
    setSearchResults([]);
    setSelectedSearchIndex(-1);
  };

  const handleAddCustomProblem = () => {
    const trimmedText = searchQuery.trim();
    if (trimmedText === "") return;

    const customProblem = {
      term: trimmedText,
      category: "Custom"
    };

    setDetectedProblems([...detectedProblems, customProblem]);
    setSelectedProblems(prevSelected => {
      const newSelected = new Set(prevSelected);
      newSelected.add(trimmedText);
      return newSelected;
    });

    setSearchQuery("");
    setSearchResults([]);
    setSelectedSearchIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    console.log('Key pressed:', e.key);
    console.log('Search results length:', searchResults.length);
    console.log('Current selected index:', selectedSearchIndex);
    
    if (searchResults.length === 0) {
      if (e.key === 'Enter') {
        handleAddCustomProblem();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        console.log('ArrowDown pressed');
        setSelectedSearchIndex(prev => {
          const newIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
          console.log('New selected index:', newIndex);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        console.log('ArrowUp pressed');
        setSelectedSearchIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : searchResults.length - 1;
          console.log('New selected index:', newIndex);
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        console.log('Enter pressed, selected index:', selectedSearchIndex);
        if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
          handleSearchResultClick(searchResults[selectedSearchIndex]);
        } else {
          handleAddCustomProblem();
        }
        break;
      case 'Escape':
        console.log('Escape pressed');
        setSearchQuery("");
        setSearchResults([]);
        setSelectedSearchIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleSaveNote = async () => {
    const trimmedNote = noteText.trim();
    if (!selectedPatient || trimmedNote === "") {
      return;
    }

    const currentNotes = Array.isArray(selectedPatient.notes) ? selectedPatient.notes : [];
    const newNote = {
      id: new Date().toISOString(),
      timestamp: new Date().toLocaleString(),
      text: trimmedNote
    };

    const updatedPatient = {
      ...selectedPatient,
      notes: [...currentNotes, newNote]
    };

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/patients/${selectedPatient.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPatient),
        }
      );
      if (!response.ok) throw new Error("Failed to save note");
      
      const savedPatient = await response.json();
      setPatients(patients.map(p => 
        p.id === savedPatient.id ? savedPatient : p
      ));
      setSelectedPatient(savedPatient);
      setNoteText("");
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const handleAddNewPatient = async () => {
    const name = window.prompt("Enter new patient's name:");
    if (!name) return; 
    const age = window.prompt("Enter new patient's age:");
    if (!age) return;
    try {
      const response = await fetch(
        'http://127.0.0.1:5000/patients',
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, age: parseInt(age) }),
        }
      );
      if (!response.ok) throw new Error("Failed to create patient");
      const newPatient = await response.json();
      setPatients([...patients, newPatient]);
      setSelectedPatient(newPatient);
      setActiveTab('note');
    } catch (error) {
      console.error("Error creating new patient:", error);
    }
  };

  const handleDeletePatient = async (e, patientId) => {
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to permanently delete this patient?")) {
      return;
    }
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/patients/${patientId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete patient");
      setPatients(patients.filter(p => p.id !== patientId));
      if (selectedPatient && selectedPatient.id === patientId) {
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error("Error deleting patient:", error);
    }
  };

  const problemGroups = groupProblems(detectedProblems);
  const categories = Object.keys(problemGroups);

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="login-container fade-in">
          <header className="App-header"><h1>CelestiCare</h1></header>
          <div className="login-box">
            <h2>Please Log In</h2>
            <input
              type="password"
              placeholder="Password"
              value={passwordAttempt}
              onChange={(e) => setPasswordAttempt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            />
            <button onClick={handleLogin}>Login</button>
          </div>
        </div>
      ) : (
        <div className="fade-in">
          <header className="App-header"><h1>CelestiCare</h1></header>
          <div className="container">
            <div className="sidebar fade-slide-up">
              <h2>Patient List</h2>
              <button
                className="add-patient-button"
                onClick={handleAddNewPatient}
              >
                + Add New Patient
              </button>
              <ul>
                {patients.map((patient, index) => (
                  <li
                    key={patient.id}
                    className={`${selectedPatient?.id === patient.id ? 'selected' : ''} fade-slide-up`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => handlePatientClick(patient)}
                  >
                    <span className="patient-name-clickable">
                      {patient.name} (Age: {patient.age})
                    </span>
                    <button
                      className="delete-patient-btn"
                      title="Delete Patient"
                      onClick={(e) => handleDeletePatient(e, patient.id)}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="main-content">
              {selectedPatient ? (
                <div className="fade-slide-up">
                  <h2>Chart for {selectedPatient.name}</h2>

                  <div className="tab-container">
                    <button
                      className={`tab-button ${activeTab === 'note' ? 'active' : ''}`}
                      onClick={() => setActiveTab('note')}
                    >
                      Smart Note
                    </button>
                    <button
                      className={`tab-button ${activeTab === 'labs' ? 'active' : ''}`}
                      onClick={() => setActiveTab('labs')}
                    >
                      Lab Results
                    </button>
                    <button
                      className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
                      onClick={() => setActiveTab('orders')}
                    >
                      Orders
                    </button>
                  </div>

                  {activeTab === 'note' && (
                    <>
                      <div className="problem-list fade-slide-up" style={{ animationDelay: '0.1s' }}>
                        <h3>Problem List:</h3>
                        {Array.isArray(selectedPatient.problems) && selectedPatient.problems.length > 0 ? (
                          <ul>
                            {selectedPatient.problems.map(problem => (
                              <li
                                key={problem}
                                onClick={() => handleDeleteProblem(problem)}
                                className="deletable-problem"
                                title="Click to remove"
                              >
                                {problem}
                              </li>
                            ))}
                          </ul>
                        ) : (<p className="no-data-message">No problems on record.</p>)}
                      </div>

                      <div className="existing-notes fade-slide-up" style={{ animationDelay: '0.15s' }}>
                        <h3>Existing Notes</h3>
                        {Array.isArray(selectedPatient.notes) && selectedPatient.notes.length > 0 ? (
                          <div className="notes-list">
                            {selectedPatient.notes.map(note => (
                              <div key={note.id} className="note-item">
                                <div className="note-header">
                                  <span className="note-timestamp">{note.timestamp}</span>
                                  <button
                                    className="note-delete-btn"
                                    title="Delete note"
                                    onClick={() => handleDeleteNote(note.id)}
                                  >
                                    &times;
                                  </button>
                                </div>
                                <pre className="note-text">{note.text}</pre>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-data-message">No existing notes on file.</p>
                        )}
                      </div>

                      <hr />

                      <div className="smart-note fade-slide-up" style={{ animationDelay: '0.2s' }}>
                        <h3>Smart Note (New Entry)</h3>
                        <textarea
                          rows="10"
                          cols="60"
                          placeholder="Type assessment and plan here..."
                          value={noteText}
                          onChange={handleNoteChange}
                        />
                      </div>

                      <div className="button-group fade-slide-up" style={{ animationDelay: '0.25s' }}>
                        <button
                          onClick={handleDetectProblems}
                          disabled={isLoading}
                          className="detect-button"
                        >
                          {isLoading ? 'Detecting...' : 'Detect Problems'}
                        </button>
                        <button
                          onClick={handleSaveNote}
                          disabled={noteText.trim() === ""}
                          className="save-note-button"
                          title="Save this note without adding problems"
                        >
                          Save Note Only
                        </button>
                      </div>

                      <div className="custom-add-container fade-slide-up" style={{ animationDelay: '0.3s' }}>
                        <input
                          type="text"
                          placeholder="Or search for a problem..."
                          className="custom-add-input"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                        />
                        <button
                          onClick={handleAddCustomProblem}
                          className="custom-add-button"
                          title="Add custom text as a problem"
                        >
                          + Add
                        </button>
                        {searchResults.length > 0 && (
                          <ul className="search-results-list fade-in">
                            {searchResults.map((problem, index) => (
                              <li
                                key={problem.term}
                                onClick={() => handleSearchResultClick(problem)}
                                className={index === selectedSearchIndex ? 'selected-search-result' : ''}
                              >
                                {problem.term} <span>({problem.category})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="fade-slide-up" style={{ animationDelay: '0.35s', marginTop: searchResults.length > 0 ? '220px' : '0px' }}>
                        <h3>Detected Problems</h3>
                        {detectedProblems.length > 0 ? (
                          <div>
                            <div className="grouped-problems">
                              {categories.map(category => (
                                <div key={category} className="problem-category">
                                  <h4>{category}</h4>
                                  <ul>
                                    {problemGroups[category].map(problem => (
                                      <li
                                        key={problem.term}
                                        onClick={() => handleProblemClick(problem.term)}
                                        className={selectedProblems.has(problem.term) ? 'selected-term' : ''}
                                      >
                                        {problem.term}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={handleAddProblems}
                              className="add-button"
                              disabled={selectedProblems.size === 0}
                            >
                              {selectedProblems.size === 0
                                ? "Select problems to add"
                                : `Add ${selectedProblems.size} Selected Problem(s)`}
                            </button>
                          </div>
                        ) : (
                          <p>Type a note and click "Detect Problems" or use the search bar.</p>
                        )}
                      </div>
                    </>
                  )}

                  {activeTab === 'labs' && (
                    <LabView labs={selectedPatient.labs} />
                  )}

                  {activeTab === 'orders' && (
                    <OrdersView medications={selectedPatient.medications} />
                  )}
                </div>
              ) : (
                <h2 className="fade-in">Please select a patient to begin charting.</h2>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;