from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal

STUDENT_BRANCHES = {"CSC", "CSM", "ECE", "EEE", "IT", "Civil", "Mechanical"}
STUDENT_SECTIONS = {"A", "B", "C", "D"}


class UserBase(BaseModel):
    email: EmailStr
    name: str
    department: Optional[str] = None
    # Student-only fields (optional for teachers).
    branch: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    roll_number: Optional[str] = None

    @field_validator("branch")
    @classmethod
    def validate_branch(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in STUDENT_BRANCHES:
            raise ValueError(f"Invalid branch. Must be one of: {', '.join(sorted(STUDENT_BRANCHES))}")
        return v

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v < 1 or v > 4:
            raise ValueError("Year must be between 1 and 4")
        return v

    @field_validator("section")
    @classmethod
    def validate_section(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        normalized = v.strip().upper()
        if normalized not in STUDENT_SECTIONS:
            raise ValueError("Section must be one of: A, B, C, D")
        return normalized

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        normalized = v.strip()
        if not normalized:
            raise ValueError("Roll number cannot be empty")
        return normalized


class UserCreate(UserBase):
    password: str
    role: Literal["teacher", "student"] = "teacher"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
