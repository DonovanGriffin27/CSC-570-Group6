/* global use, db */
// MongoDB Testing Script for CaseVault

use("casevault");


// 1. Insert Valid Note

db.investigation_notes.insertOne({
  case_id: 1,
  author_user_id: 1,
  note_text: "Testing note insert",
  time_stamp: new Date()
});


// 2. Query Notes
db.investigation_notes.find().toArray();


// 3. Insert Timeline Event
db.timeline_events.insertOne({
  case_id: 1,
  event_type: "NOTE_ADDED",
  created_by_user_id: 1,
  time_stamp: new Date(),
  description: "Added a test note"
});


// 4. Query Timeline
db.timeline_events.find({ case_id: 1 }).toArray();
