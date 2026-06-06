from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid
from pydantic import EmailStr, field_validator
from urllib.parse import urlparse


# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        if len(v) > 255:
            raise ValueError('Email is too long')
        return v.lower()
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Name cannot be empty')
        if len(v) > 200:
            raise ValueError('Name is too long (max 200 characters)')
        return v.strip()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v or len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        if len(v) > 1000:
            raise ValueError('Password is too long')
        return v


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# Client Models
class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClientCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    status: str = Field(default="active", pattern="^(active|inactive|archived)$")
    notes: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Client name cannot be empty')
        if len(v) > 200:
            raise ValueError('Client name is too long (max 200 characters)')
        return v.strip()
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        if len(v) > 255:
            raise ValueError('Email is too long')
        return v.lower()
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and len(v) > 20:
            raise ValueError('Phone number is too long')
        return v
    
    @field_validator('website')
    @classmethod
    def validate_website(cls, v):
        if v:
            if len(v) > 500:
                raise ValueError('Website URL is too long')
            # Basic URL format check
            if not v.startswith(('http://', 'https://', 'www.')):
                raise ValueError('Website must start with http://, https://, or www.')
        return v
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        if v and len(v) > 5000:
            raise ValueError('Notes are too long (max 5000 characters)')
        return v


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# Project Models
class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    client_id: str
    type: str  # seo, webdev, both
    status: str = "active"  # active, completed, on-hold
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    budget: Optional[float] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    name: str
    client_id: str
    type: str
    status: str = Field(default="active", pattern="^(active|completed|on-hold)$")
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    budget: Optional[float] = None
    description: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Project name cannot be empty')
        if len(v) > 200:
            raise ValueError('Project name is too long (max 200 characters)')
        return v.strip()
    
    @field_validator('client_id')
    @classmethod
    def validate_client_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Client ID cannot be empty')
        return v.strip()
    
    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        if v not in ('seo', 'webdev', 'both'):
            raise ValueError('Project type must be one of: seo, webdev, both')
        return v
    
    @field_validator('budget')
    @classmethod
    def validate_budget(cls, v):
        if v is not None and v < 0:
            raise ValueError('Budget cannot be negative')
        if v is not None and v > 1000000:
            raise ValueError('Budget exceeds maximum allowed')
        return v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v and len(v) > 5000:
            raise ValueError('Description is too long (max 5000 characters)')
        return v


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    budget: Optional[float] = None
    description: Optional[str] = None


# Task Models
class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    project_id: str
    status: str = "todo"  # todo, inprogress, testing, completed
    priority: str = "medium"  # low, medium, high
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: str
    status: str = Field(default="todo", pattern="^(todo|inprogress|testing|completed)$")
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Task title cannot be empty')
        if len(v) > 200:
            raise ValueError('Task title is too long (max 200 characters)')
        return v.strip()
    
    @field_validator('project_id')
    @classmethod
    def validate_project_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Project ID cannot be empty')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v and len(v) > 5000:
            raise ValueError('Description is too long (max 5000 characters)')
        return v
    
    @field_validator('estimated_hours')
    @classmethod
    def validate_estimated_hours(cls, v):
        if v is not None and v < 0:
            raise ValueError('Estimated hours cannot be negative')
        if v is not None and v > 1000:
            raise ValueError('Estimated hours exceeds maximum allowed')
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None


# SEO Audit Models
class SEOIssue(BaseModel):
    category: str
    severity: str  # critical, warning, info
    message: str
    recommendation: str


class PerformanceMetrics(BaseModel):
    fcp: Optional[float] = None
    lcp: Optional[float] = None
    tti: Optional[float] = None
    tbt: Optional[float] = None
    cls: Optional[float] = None
    load_time: Optional[float] = None
    page_size_kb: Optional[float] = None


class SEOAudit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    url: str
    
    # Overall scores
    overall_score: int
    performance_score: int
    seo_score: int
    security_score: int
    technical_score: int
    accessibility_score: int
    
    # Performance data provenance: "pagespeed" or "fallback"
    performance_source: str = "fallback"
    pagespeed_strategy: Optional[str] = None  # "mobile" | "desktop" | None
    
    # Optional Lighthouse category scores (only set when PageSpeed is configured)
    lighthouse_seo_score: Optional[int] = None
    lighthouse_accessibility_score: Optional[int] = None
    lighthouse_best_practices_score: Optional[int] = None
    
    # WordPress detection
    is_wordpress: bool = False
    wordpress_confidence: float = 0.0
    wordpress_theme: Optional[str] = None
    wordpress_plugins: List[str] = []
    
    # Performance details
    performance_metrics: Optional[Dict] = None
    performance_issues: List[str] = []
    performance_recommendations: List[str] = []
    
    # SEO details
    seo_details: Optional[Dict] = None
    seo_issues: List[str] = []
    seo_recommendations: List[str] = []
    
    # Security details
    security_details: Optional[Dict] = None
    security_issues: List[str] = []
    security_recommendations: List[str] = []
    
    # Technical details
    technical_details: Optional[Dict] = None
    technical_issues: List[str] = []
    technical_recommendations: List[str] = []
    
    # Accessibility details
    accessibility_details: Optional[Dict] = None
    accessibility_issues: List[str] = []
    accessibility_recommendations: List[str] = []
    wcag_level: Optional[str] = None
    
    audit_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_seconds: Optional[float] = None
    action_plan: Optional[Dict] = None


class SEOAuditRequest(BaseModel):
    project_id: str
    url: str
    strategy: Optional[str] = Field(default="mobile", pattern="^(mobile|desktop)$")
    
    @field_validator('project_id')
    @classmethod
    def validate_project_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Project ID cannot be empty')
        return v.strip()
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('URL cannot be empty')
        if len(v) > 2048:
            raise ValueError('URL is too long (max 2048 characters)')
        
        # Add scheme if missing
        url = v.strip()
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'
        
        # Basic URL validation
        try:
            result = urlparse(url)
            if not all([result.scheme, result.netloc]):
                raise ValueError('Invalid URL format')
        except Exception:
            raise ValueError('Invalid URL format')
        
        return url


# Dashboard Stats
class DashboardStats(BaseModel):
    active_projects: int
    total_clients: int
    total_tasks: int
    completed_tasks: int
    billable_hours: float
    audits_this_month: int = 0
    audits_last_month: int = 0
    avg_audit_score: Optional[float] = None


# Contact form (public landing page)
class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    website: Optional[str] = None
    message: str
    status: str = "new"  # new, read, replied, archived
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContactMessageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=3, max_length=200)
    website: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=5000)


# Stripe payment transactions
class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    session_id: str
    amount: float            # decimal currency units (e.g., 250.00)
    currency: str = "usd"
    status: str = "initiated"   # initiated | pending | paid | expired | failed
    payment_status: Optional[str] = None  # raw Stripe payment_status field
    description: Optional[str] = None
    stripe_url: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    initiated_by_user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateCheckoutRequest(BaseModel):
    project_id: str
    origin_url: str           # frontend origin (window.location.origin)
    description: Optional[str] = None
    # Amount is derived server-side from project.budget — NEVER trust client.
