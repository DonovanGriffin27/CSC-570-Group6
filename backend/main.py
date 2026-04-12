from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.cases import router as cases_router
from routes.crime_reports import router as crime_reports_router
from routes.assignments import router as assignments_router

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

app.include_router(cases_router)
app.include_router(crime_reports_router)
app.include_router(assignments_router)
