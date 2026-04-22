from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.cases import router as cases_router
from routes.crime_reports import router as crime_reports_router
from routes.assignments import router as assignments_router
from routes.auth import router as auth_router
from routes.notes import router as notes_router
from routes.timeline import router as timeline_router
from routes.audit import router as audit_router
from routes.admin import router as admin_router

# cd backend
# uvicorn main:app --reload

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(cases_router)
app.include_router(crime_reports_router)
app.include_router(assignments_router)
app.include_router(notes_router)
app.include_router(timeline_router)
app.include_router(audit_router)
app.include_router(admin_router)
