from fastapi import APIRouter

from app.dependencies import DB, CurrentUserDep
from app.models.programs import (
    DiabetesProgramResponse,
    DiabetesProgramStartRequest,
    ProgramProgressResponse,
    ProgramTaskCompleteRequest,
)
from app.services import program_service

router = APIRouter()


@router.post("/diabetes/start", response_model=DiabetesProgramResponse, status_code=201)
async def start_diabetes_program(
    req: DiabetesProgramStartRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await program_service.start_diabetes_program(current_user.uid, req, db)


@router.get("/diabetes/today", response_model=DiabetesProgramResponse)
async def get_diabetes_today(current_user: CurrentUserDep, db: DB):
    return await program_service.get_diabetes_today(current_user.uid, db)


@router.get("/diabetes/progress", response_model=ProgramProgressResponse)
async def get_diabetes_progress(current_user: CurrentUserDep, db: DB):
    return await program_service.get_diabetes_progress(current_user.uid, db)


@router.post("/{program_id}/tasks/{task_id}/complete")
async def complete_program_task(
    program_id: str,
    task_id: str,
    req: ProgramTaskCompleteRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await program_service.complete_program_task(
        current_user.uid,
        program_id,
        task_id,
        req,
        db,
    )
