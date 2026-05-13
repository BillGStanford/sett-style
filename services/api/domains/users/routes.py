"""Users Domain — Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query
from asyncpg import Connection

from core.database.connection import get_conn
from core.auth.dependencies import get_current_user, get_optional_user
from domains.users.schemas import (
    UserCreateSchema, UserLoginSchema, UserProfileSchema,
    UserUpdateSchema, OnboardingSchema, OnboardingStepSchema, TokenResponseSchema,
)
from domains.users.service import UsersService

router = APIRouter()


@router.post("/register", response_model=TokenResponseSchema, status_code=201)
async def register(body: UserCreateSchema, conn: Connection = Depends(get_conn)):
    service = UsersService(conn)
    return await service.create_user(body)


@router.post("/login", response_model=TokenResponseSchema)
async def login(body: UserLoginSchema, conn: Connection = Depends(get_conn)):
    service = UsersService(conn)
    return await service.login(body)


@router.patch("/onboarding/step")
async def update_onboarding_step(
    body: OnboardingStepSchema,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Track onboarding progress - called on each step transition for drop-off analysis."""
    service = UsersService(conn)
    return await service.update_onboarding_step(current_user["id"], body.step)


@router.post("/onboarding")
async def complete_onboarding(
    body: OnboardingSchema,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = UsersService(conn)
    return await service.complete_onboarding(current_user["id"], body)


@router.get("/me", response_model=UserProfileSchema)
async def get_me(current_user=Depends(get_current_user), conn: Connection = Depends(get_conn)):
    service = UsersService(conn)
    user = await service.get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/me", response_model=UserProfileSchema)
async def update_me(
    body: UserUpdateSchema,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = UsersService(conn)
    return await service.update_user(current_user["id"], body)


@router.get("/@{username}", response_model=UserProfileSchema)
async def get_profile(
    username: str,
    viewer=Depends(get_optional_user),
    conn: Connection = Depends(get_conn),
):
    service = UsersService(conn)
    viewer_id = viewer["id"] if viewer else None
    user = await service.get_user_by_username(username, viewer_id=viewer_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/@{username}/followers")
async def get_followers_list(
    username: str,
    conn: Connection = Depends(get_conn),
):
    service = UsersService(conn)
    profile_user = await service.get_user_by_username(username)
    if not profile_user:
        raise HTTPException(status_code=404, detail="User not found")
    return await service.get_followers_list(profile_user.id)


@router.get("/@{username}/following")
async def get_following_list(
    username: str,
    conn: Connection = Depends(get_conn),
):
    service = UsersService(conn)
    profile_user = await service.get_user_by_username(username)
    if not profile_user:
        raise HTTPException(status_code=404, detail="User not found")
    return await service.get_following_list(profile_user.id)


@router.post("/{user_id}/follow", status_code=204)
async def follow_user(
    user_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    service = UsersService(conn)
    await service.follow(follower_id=current_user["id"], following_id=user_id)


@router.delete("/{user_id}/follow", status_code=204)
async def unfollow_user(
    user_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = UsersService(conn)
    await service.unfollow(follower_id=current_user["id"], following_id=user_id)