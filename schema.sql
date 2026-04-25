-- CaseVault PostgreSQL Schema
-- Run against a fresh database: psql -d <dbname> -f schema.sql

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE admin_level_enum AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'VIEWER');
CREATE TYPE rank_enum        AS ENUM ('OFFICER', 'DETECTIVE', 'SERGEANT', 'LIEUTENANT', 'CAPTAIN', 'CHIEF');
CREATE TYPE case_status_enum AS ENUM ('Open', 'In Progress', 'Closed');
CREATE TYPE priority_enum    AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE request_status_enum AS ENUM ('Pending', 'Approved', 'Denied');
CREATE TYPE suspect_status_enum AS ENUM ('Active', 'Cleared', 'Arrested');
CREATE TYPE risk_level_enum  AS ENUM ('Low', 'Medium', 'High');

-- ── Department ────────────────────────────────────────────────────────────────

CREATE TABLE department (
    department_id   SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    department_type VARCHAR(80),
    contact_email   VARCHAR(120),
    contact_phone   VARCHAR(30)
);

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    first_name    VARCHAR(60)  NOT NULL,
    last_name     VARCHAR(60)  NOT NULL,
    contact_email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES department(department_id)
);

-- ── Role tables ───────────────────────────────────────────────────────────────

CREATE TABLE admin (
    user_id     INTEGER PRIMARY KEY REFERENCES users(user_id),
    admin_level admin_level_enum NOT NULL DEFAULT 'ADMIN'
);

CREATE TABLE investigator (
    user_id      INTEGER PRIMARY KEY REFERENCES users(user_id),
    badge_number VARCHAR(30),
    rank         rank_enum
);

-- ── Account requests ──────────────────────────────────────────────────────────

CREATE TABLE account_request (
    request_id             SERIAL PRIMARY KEY,
    first_name             VARCHAR(60)  NOT NULL,
    last_name              VARCHAR(60)  NOT NULL,
    contact_email          VARCHAR(120) NOT NULL,
    contact_phone          VARCHAR(30),
    department_id          INTEGER REFERENCES department(department_id),
    requested_role         VARCHAR(30)  NOT NULL,          -- 'investigator' | 'admin'
    requested_admin_level  admin_level_enum,
    badge_number           VARCHAR(30),
    rank                   rank_enum,
    password_hash          VARCHAR(255) NOT NULL,
    status                 request_status_enum NOT NULL DEFAULT 'Pending',
    requested_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by            INTEGER REFERENCES users(user_id),
    reviewed_at            TIMESTAMPTZ
);

-- ── Cases ─────────────────────────────────────────────────────────────────────

CREATE TABLE cases (
    case_id     SERIAL PRIMARY KEY,
    case_number VARCHAR(30) UNIQUE,
    title       VARCHAR(255),
    status      case_status_enum NOT NULL DEFAULT 'Open',
    priority    priority_enum    NOT NULL DEFAULT 'Low',
    date_opened TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_closed TIMESTAMPTZ
);

-- ── Crime reports ─────────────────────────────────────────────────────────────

CREATE TABLE crime_report (
    report_id        SERIAL PRIMARY KEY,
    case_id          INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    filed_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    report_type      VARCHAR(60),
    description      TEXT,
    report_date      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Assignments ───────────────────────────────────────────────────────────────

CREATE TABLE assignment (
    assignment_id SERIAL PRIMARY KEY,
    case_id       INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(user_id),
    status        VARCHAR(30) NOT NULL DEFAULT 'Assigned',
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (case_id, user_id)
);

-- ── People ────────────────────────────────────────────────────────────────────

CREATE TABLE person (
    person_id     SERIAL PRIMARY KEY,
    first_name    VARCHAR(60) NOT NULL,
    last_name     VARCHAR(60) NOT NULL,
    dob           DATE,
    contact_phone VARCHAR(30)
);

CREATE TABLE case_suspect (
    person_id  INTEGER NOT NULL REFERENCES person(person_id),
    case_id    INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    status     suspect_status_enum NOT NULL DEFAULT 'Active',
    risk_level risk_level_enum     NOT NULL DEFAULT 'Low',
    PRIMARY KEY (person_id, case_id)
);

CREATE TABLE case_victim (
    case_id   INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES person(person_id),
    PRIMARY KEY (case_id, person_id)
);

-- ── Court dates ───────────────────────────────────────────────────────────────

CREATE TABLE court_date (
    court_date_id SERIAL PRIMARY KEY,
    case_id       INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    date          TIMESTAMPTZ NOT NULL,
    court         VARCHAR(200) NOT NULL,
    hearing_type  VARCHAR(60)
);

-- ── Evidence ──────────────────────────────────────────────────────────────────

CREATE TABLE evidence (
    evidence_id          SERIAL PRIMARY KEY,
    case_id              INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    evidence_type        VARCHAR(60)  NOT NULL,
    description          TEXT         NOT NULL,
    intake_date          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    current_status       VARCHAR(30)  NOT NULL DEFAULT 'Collected',
    collected_by_user_id INTEGER      NOT NULL REFERENCES users(user_id),
    collection_location  VARCHAR(200),
    condition_status     VARCHAR(30)  NOT NULL DEFAULT 'Unknown'
);

-- ── Chain of custody ──────────────────────────────────────────────────────────

CREATE TABLE custody_event (
    custody_event_id SERIAL PRIMARY KEY,
    evidence_id      INTEGER NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
    from_user_id     INTEGER REFERENCES users(user_id),
    to_user_id       INTEGER REFERENCES users(user_id),
    action_type      VARCHAR(40) NOT NULL,
    time_stamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location         VARCHAR(200),
    condition_status VARCHAR(30),
    notes            TEXT
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_assignment_case    ON assignment(case_id);
CREATE INDEX idx_assignment_user    ON assignment(user_id);
CREATE INDEX idx_crime_report_case  ON crime_report(case_id);
CREATE INDEX idx_evidence_case      ON evidence(case_id);
CREATE INDEX idx_custody_evidence   ON custody_event(evidence_id);
CREATE INDEX idx_court_date_case    ON court_date(case_id);
CREATE INDEX idx_case_suspect_case  ON case_suspect(case_id);
CREATE INDEX idx_case_victim_case   ON case_victim(case_id);
