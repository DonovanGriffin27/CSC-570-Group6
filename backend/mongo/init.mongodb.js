/* global use, db */
// MongoDB Initialization Script for CaseVault
// Run this file once to initialize MongoDB collections and validation rules


use("casevault");


// Investigation Notes
if (!db.getCollectionNames().includes("investigation_notes")) {
  db.createCollection("investigation_notes", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["case_id", "author_user_id", "note_text", "time_stamp"],
        properties: {
          case_id: { bsonType: "int" },
          author_user_id: { bsonType: "int" },
          note_text: { bsonType: "string" },
          time_stamp: { bsonType: "date" }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });
}


db.investigation_notes.createIndex({ case_id: 1 });




// Interview Summaries
if (!db.getCollectionNames().includes("interview_summaries")) {
  db.createCollection("interview_summaries", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["case_id", "created_by_user_id", "summary_text", "time_stamp"],
        properties: {
          case_id: { bsonType: "int" },
          created_by_user_id: { bsonType: "int" },
          summary_text: { bsonType: "string" },
          time_stamp: { bsonType: "date" }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });
}


db.interview_summaries.createIndex({ case_id: 1 });




// Evidence Metadata
if (!db.getCollectionNames().includes("evidence_metadata")) {
  db.createCollection("evidence_metadata", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["evidence_id"],
        properties: {
          evidence_id: { bsonType: "int" },
          file_hash: { bsonType: "string" },
          metadata_tags: {
            bsonType: "array",
            items: { bsonType: "string" }
          },
          timeline_events: {
            bsonType: "array",
            items: { bsonType: "object" }
          }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });
}


db.evidence_metadata.createIndex({ evidence_id: 1 });




// Timeline Events
if (!db.getCollectionNames().includes("timeline_events")) {
  db.createCollection("timeline_events", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["case_id", "event_type", "time_stamp"],
        properties: {
          case_id: { bsonType: "int" },
          event_type: {
            bsonType: "string",
            enum: ["STATUS_CHANGE", "NOTE_ADDED", "EVIDENCE_ADDED"]
          },
          created_by_user_id: { bsonType: "int" },
          time_stamp: { bsonType: "date" },
          description: { bsonType: "string" }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });
}


db.timeline_events.createIndex({ case_id: 1 });


// Audit Events
if (!db.getCollectionNames().includes("audit_events")) {
  db.createCollection("audit_events", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["user_id", "action_type", "time_stamp"],
        properties: {
          user_id: { bsonType: "int" },
          action_type: { bsonType: "string" },
          time_stamp: { bsonType: "date" },
          description: { bsonType: "string" }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });
}


db.audit_events.createIndex({ user_id: 1 });