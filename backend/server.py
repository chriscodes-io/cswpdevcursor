from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import requests
from bs4 import BeautifulSoup
import asyncio
import time
import uuid
from .models import (
    User, UserCreate, UserLogin, Token,
    Client, ClientCreate, ClientUpdate,
    Project, ProjectCreate, ProjectUpdate,
    Task, TaskCreate, TaskUpdate,
    SEOAudit, SEOAuditRequest, SEOIssue,
    DashboardStats,
    ContactMessage, ContactMessageCreate,
    PaymentTransaction, CreateCheckoutRequest,
)
from .auth import hash_password, verify_password, create_access_token, get_current_user
from .wp_analyzers import (
    PerformanceAnalyzer,
    SEOAnalyzer,
    SecurityAnalyzer,
    TechnicalSEOAnalyzer,
    AccessibilityAnalyzer,
    WordPressDetector
)
from .seo_action_plan import build_action_plan, build_report_payload
from .pagespeed_client import (
    fetch_pagespeed_insights,
    map_pagespeed_to_seo_audit,
    is_configured as pagespeed_is_configured,
    PageSpeedUnavailable,
)
from .email_service import (
    send_contact_notification,
    send_contact_autoreply,
    send_audit_ready,
    is_configured as email_is_configured,
)
from .db import db, ensure_indexes
from .analytics import track_event
from . import stripe_service

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


def _normalize_pagination(skip: int = 0, limit: int = 1000):
    skip = max(skip, 0)
    limit = max(1, min(limit, 1000))
    return skip, limit


# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password)
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    # Create token
    token = create_access_token({"user_id": user.id, "email": user.email})
    
    return Token(
        access_token=token,
        user={"id": user.id, "email": user.email, "name": user.name}
    )


@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user or not user.get('password_hash'):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    token = create_access_token({"user_id": user['id'], "email": user['email']})
    
    return Token(
        access_token=token,
        user={"id": user['id'], "email": user['email'], "name": user['name']}
    )


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info from JWT."""
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth context")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@api_router.post("/auth/logout")
async def logout():
    """JWT logout is client-side; endpoint kept for API symmetry."""
    return {"ok": True}


# ============= CLIENT ENDPOINTS =============

@api_router.get("/clients", response_model=List[Client])
async def get_clients(skip: int = 0, limit: int = 1000, current_user: dict = Depends(get_current_user)):
    """Get all clients"""
    skip, limit = _normalize_pagination(skip, limit)
    clients = await db.clients.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    for client in clients:
        if isinstance(client.get('created_at'), str):
            client['created_at'] = datetime.fromisoformat(client['created_at'])
    return clients


@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Create a new client"""
    client = Client(**client_data.model_dump())
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clients.insert_one(doc)
    return client


@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific client"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if isinstance(client.get('created_at'), str):
        client['created_at'] = datetime.fromisoformat(client['created_at'])
    return client


@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: ClientUpdate, current_user: dict = Depends(get_current_user)):
    """Update a client"""
    update_data = {k: v for k, v in client_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if isinstance(client.get('created_at'), str):
        client['created_at'] = datetime.fromisoformat(client['created_at'])
    return client


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a client"""
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}


# ============= PROJECT ENDPOINTS =============

@api_router.get("/projects", response_model=List[Project])
async def get_projects(client_id: Optional[str] = None, skip: int = 0, limit: int = 1000, current_user: dict = Depends(get_current_user)):
    """Get all projects, optionally filtered by client"""
    query = {"client_id": client_id} if client_id else {}
    skip, limit = _normalize_pagination(skip, limit)
    projects = await db.projects.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    for project in projects:
        for date_field in ['created_at', 'start_date', 'deadline']:
            if isinstance(project.get(date_field), str):
                project[date_field] = datetime.fromisoformat(project[date_field])
    return projects


@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    """Create a new project"""
    project_dict = project_data.model_dump()
    
    # Parse date strings if provided
    if project_dict.get('start_date'):
        project_dict['start_date'] = datetime.fromisoformat(project_dict['start_date'])
    if project_dict.get('deadline'):
        project_dict['deadline'] = datetime.fromisoformat(project_dict['deadline'])
    
    project = Project(**project_dict)
    doc = project.model_dump()
    
    # Convert dates to ISO strings for MongoDB
    for date_field in ['created_at', 'start_date', 'deadline']:
        if doc.get(date_field):
            doc[date_field] = doc[date_field].isoformat()
    
    await db.projects.insert_one(doc)
    return project


@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for date_field in ['created_at', 'start_date', 'deadline']:
        if isinstance(project.get(date_field), str):
            project[date_field] = datetime.fromisoformat(project[date_field])
    return project


@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectUpdate, current_user: dict = Depends(get_current_user)):
    """Update a project"""
    update_data = {k: v for k, v in project_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Parse date strings if provided
    if update_data.get('start_date'):
        update_data['start_date'] = datetime.fromisoformat(update_data['start_date']).isoformat()
    if update_data.get('deadline'):
        update_data['deadline'] = datetime.fromisoformat(update_data['deadline']).isoformat()
    
    result = await db.projects.update_one({"id": project_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    for date_field in ['created_at', 'start_date', 'deadline']:
        if isinstance(project.get(date_field), str):
            project[date_field] = datetime.fromisoformat(project[date_field])
    return project


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a project"""
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}


# ============= TASK ENDPOINTS =============

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(project_id: Optional[str] = None, skip: int = 0, limit: int = 1000, current_user: dict = Depends(get_current_user)):
    """Get all tasks, optionally filtered by project"""
    query = {"project_id": project_id} if project_id else {}
    skip, limit = _normalize_pagination(skip, limit)
    tasks = await db.tasks.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    for task in tasks:
        for date_field in ['created_at', 'due_date']:
            if isinstance(task.get(date_field), str):
                task[date_field] = datetime.fromisoformat(task[date_field])
    return tasks


@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    task_dict = task_data.model_dump()
    
    if task_dict.get('due_date'):
        task_dict['due_date'] = datetime.fromisoformat(task_dict['due_date'])
    
    task = Task(**task_dict)
    doc = task.model_dump()
    
    for date_field in ['created_at', 'due_date']:
        if doc.get(date_field):
            doc[date_field] = doc[date_field].isoformat()
    
    await db.tasks.insert_one(doc)
    return task


@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific task"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for date_field in ['created_at', 'due_date']:
        if isinstance(task.get(date_field), str):
            task[date_field] = datetime.fromisoformat(task[date_field])
    return task


@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """Update a task"""
    update_data = {k: v for k, v in task_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    if update_data.get('due_date'):
        update_data['due_date'] = datetime.fromisoformat(update_data['due_date']).isoformat()
    
    result = await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    for date_field in ['created_at', 'due_date']:
        if isinstance(task.get(date_field), str):
            task[date_field] = datetime.fromisoformat(task[date_field])
    return task


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


# ============= DASHBOARD ENDPOINTS =============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    try:
        active_projects = await db.projects.count_documents({"status": "active"})
        total_clients = await db.clients.count_documents({})
        total_tasks = await db.tasks.count_documents({})
        completed_tasks = await db.tasks.count_documents({"status": "completed"})
        
        # Calculate billable hours from tasks
        tasks = await db.tasks.find({"actual_hours": {"$exists": True}}, {"_id": 0, "actual_hours": 1}).to_list(1000)
        billable_hours = sum(task.get('actual_hours', 0) for task in tasks)

        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 1:
            last_month_start = month_start.replace(year=month_start.year - 1, month=12)
        else:
            last_month_start = month_start.replace(month=month_start.month - 1)

        audits_this_month = await db.seo_audits.count_documents(
            {"audit_date": {"$gte": month_start.isoformat()}}
        )
        audits_last_month = await db.seo_audits.count_documents(
            {
                "audit_date": {
                    "$gte": last_month_start.isoformat(),
                    "$lt": month_start.isoformat(),
                }
            }
        )
        recent_scores = await db.seo_audits.find(
            {"overall_score": {"$exists": True}},
            {"_id": 0, "overall_score": 1},
        ).sort("audit_date", -1).limit(20).to_list(20)
        avg_audit_score = None
        if recent_scores:
            avg_audit_score = round(
                sum(a.get("overall_score", 0) for a in recent_scores) / len(recent_scores),
                1,
            )
        
        return DashboardStats(
            active_projects=active_projects,
            total_clients=total_clients,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            billable_hours=billable_hours,
            audits_this_month=audits_this_month,
            audits_last_month=audits_last_month,
            avg_audit_score=avg_audit_score,
        )
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard statistics")


# ============= SEO AUDIT ENDPOINTS =============

def _user_id_from_auth(current_user: dict) -> Optional[str]:
    return current_user.get("sub") or current_user.get("user_id")


@api_router.post("/seo-audit", response_model=SEOAudit)
async def run_seo_audit(audit_request: SEOAuditRequest, current_user: dict = Depends(get_current_user)):
    """Run a comprehensive WordPress health audit"""
    start_time = time.time()
    
    try:
        url = audit_request.url
        
        # Fetch website HTML
        try:
            response = requests.get(
                url, 
                timeout=15, 
                headers={'User-Agent': 'Mozilla/5.0'},
                allow_redirects=True,
                verify=True
            )
            response.raise_for_status()
            html = response.text
            soup = BeautifulSoup(html, 'html.parser')
        except requests.Timeout:
            raise HTTPException(status_code=408, detail="Request timeout: The website took too long to respond. Please check the URL and try again.")
        except requests.ConnectionError:
            raise HTTPException(status_code=502, detail="Connection error: Unable to reach the website. Please check the URL and your internet connection.")
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                raise HTTPException(status_code=400, detail="Website not found (404). Please check the URL.")
            elif e.response.status_code == 403:
                raise HTTPException(status_code=400, detail="Access denied (403). The website may be blocking automated requests.")
            else:
                raise HTTPException(status_code=400, detail=f"HTTP error {e.response.status_code}: Unable to fetch the website.")
        except requests.RequestException as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error while fetching URL: {str(e)}")
        
        # Run all NON-performance analyzers in parallel (performance handled separately below)
        seo_task = asyncio.create_task(SEOAnalyzer.analyze(url, html, soup))
        security_task = asyncio.create_task(SecurityAnalyzer.analyze(url))
        technical_task = asyncio.create_task(TechnicalSEOAnalyzer.analyze(url, soup))
        accessibility_task = asyncio.create_task(AccessibilityAnalyzer.analyze(soup))

        # Performance: prefer Google PageSpeed Insights when API key is configured,
        # otherwise fall back to the BeautifulSoup-based PerformanceAnalyzer.
        strategy = (audit_request.strategy or "mobile").lower()
        if strategy not in ("mobile", "desktop"):
            strategy = "mobile"

        performance_source = "fallback"
        pagespeed_strategy = None
        lighthouse_scores = {
            "lighthouse_seo_score": None,
            "lighthouse_accessibility_score": None,
            "lighthouse_best_practices_score": None,
        }

        if pagespeed_is_configured():
            try:
                ps_raw = await fetch_pagespeed_insights(url, strategy=strategy)
                ps_mapped = map_pagespeed_to_seo_audit(ps_raw)
                performance_result = {
                    "score": ps_mapped.get("performance_score") or 0,
                    "metrics": ps_mapped.get("performance_metrics") or {},
                    "issues": ps_mapped.get("performance_issues") or [],
                    "recommendations": ps_mapped.get("performance_recommendations") or [],
                }
                performance_source = "pagespeed"
                pagespeed_strategy = strategy
                lighthouse_scores["lighthouse_seo_score"] = ps_mapped.get("lighthouse_seo_score")
                lighthouse_scores["lighthouse_accessibility_score"] = ps_mapped.get("lighthouse_accessibility_score")
                lighthouse_scores["lighthouse_best_practices_score"] = ps_mapped.get("lighthouse_best_practices_score")
            except PageSpeedUnavailable as ps_err:
                logger.warning(f"PageSpeed unavailable, falling back: {ps_err}")
                performance_result = await PerformanceAnalyzer.analyze(url)
        else:
            performance_result = await PerformanceAnalyzer.analyze(url)

        # Wait for the remaining analyses to complete
        seo_result, security_result, technical_result, accessibility_result = await asyncio.gather(
            seo_task, security_task, technical_task, accessibility_task
        )
        
        # WordPress detection
        wp_info = WordPressDetector.detect(html, soup)
        
        # Calculate overall score (weighted average)
        overall_score = int(
            (performance_result['score'] * 0.25) +
            (seo_result['score'] * 0.25) +
            (security_result['score'] * 0.20) +
            (technical_result['score'] * 0.15) +
            (accessibility_result['score'] * 0.15)
        )
        
        duration = round(time.time() - start_time, 2)
        
        # Create audit object
        audit = SEOAudit(
            project_id=audit_request.project_id,
            url=url,
            overall_score=overall_score,
            performance_score=performance_result['score'],
            seo_score=seo_result['score'],
            security_score=security_result['score'],
            technical_score=technical_result['score'],
            accessibility_score=accessibility_result['score'],

            performance_source=performance_source,
            pagespeed_strategy=pagespeed_strategy,
            lighthouse_seo_score=lighthouse_scores["lighthouse_seo_score"],
            lighthouse_accessibility_score=lighthouse_scores["lighthouse_accessibility_score"],
            lighthouse_best_practices_score=lighthouse_scores["lighthouse_best_practices_score"],

            is_wordpress=wp_info['is_wordpress'],
            wordpress_confidence=wp_info['confidence'],
            wordpress_theme=wp_info.get('theme'),
            wordpress_plugins=wp_info.get('plugins', []),
            
            performance_metrics=performance_result.get('metrics', {}),
            performance_issues=performance_result.get('issues', []),
            performance_recommendations=performance_result.get('recommendations', []),
            
            seo_details=seo_result.get('details', {}),
            seo_issues=seo_result.get('issues', []),
            seo_recommendations=seo_result.get('recommendations', []),
            
            security_details=security_result.get('details', {}),
            security_issues=security_result.get('issues', []),
            security_recommendations=security_result.get('recommendations', []),
            
            technical_details=technical_result.get('details', {}),
            technical_issues=technical_result.get('issues', []),
            technical_recommendations=technical_result.get('recommendations', []),
            
            accessibility_details=accessibility_result.get('details', {}),
            accessibility_issues=accessibility_result.get('issues', []),
            accessibility_recommendations=accessibility_result.get('recommendations', []),
            wcag_level=accessibility_result.get('wcag_level'),
            
            duration_seconds=duration
        )

        audit.action_plan = build_action_plan(audit.model_dump())
        
        # Save to database
        doc = audit.model_dump()
        doc['audit_date'] = doc['audit_date'].isoformat()
        await db.seo_audits.insert_one(doc)

        # Fire-and-forget "audit ready" email to the project's client, if any
        try:
            project = await db.projects.find_one({"id": audit_request.project_id}, {"_id": 0})
            if project and project.get("client_id"):
                client_doc = await db.clients.find_one({"id": project["client_id"]}, {"_id": 0})
                if client_doc and client_doc.get("email"):
                    asyncio.create_task(send_audit_ready(
                        client_name=client_doc.get("name") or "",
                        client_email=client_doc["email"],
                        site_url=url,
                        overall_score=overall_score,
                    ))
        except Exception as notify_err:
            logger.warning(f"audit-ready notification skipped: {notify_err}")

        actor_id = _user_id_from_auth(current_user)
        if actor_id:
            track_event(
                actor_id,
                "seo_audit_completed",
                {
                    "project_id": audit_request.project_id,
                    "url": url,
                    "overall_score": overall_score,
                    "performance_source": audit.performance_source,
                    "is_wordpress": audit.is_wordpress,
                    "duration_seconds": duration,
                    "strategy": strategy,
                },
                insert_id=f"seo-audit-{audit.id}",
            )

        return audit
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audit error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")


async def _get_audit_doc(audit_id: str) -> dict:
    doc = await db.seo_audits.find_one({"id": audit_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Audit not found")
    if isinstance(doc.get("audit_date"), str):
        doc["audit_date"] = datetime.fromisoformat(doc["audit_date"])
    return doc


@api_router.get("/seo-audit/report/{audit_id}")
async def get_seo_audit_report(
    audit_id: str,
    company: str = "",
    created_by: str = "",
    current_user: dict = Depends(get_current_user),
):
    """Template 129 JSON report for a saved audit."""
    doc = await _get_audit_doc(audit_id)
    if not doc.get("action_plan"):
        doc["action_plan"] = build_action_plan(doc)
    return build_report_payload(doc, company=company, created_by=created_by)


@api_router.get("/seo-audit/{audit_id}/action-plan")
async def get_seo_audit_action_plan(
    audit_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Action plan only for a saved audit (recomputed if missing)."""
    doc = await _get_audit_doc(audit_id)
    plan = doc.get("action_plan") or build_action_plan(doc)
    return plan


@api_router.get("/seo-audit/{project_id}", response_model=List[SEOAudit])
async def get_seo_audits(project_id: str, skip: int = 0, limit: int = 100, current_user: dict = Depends(get_current_user)):
    """Get all SEO audits for a project"""
    skip, limit = _normalize_pagination(skip, limit)
    audits = await db.seo_audits.find({"project_id": project_id}, {"_id": 0}).sort("audit_date", -1).skip(skip).limit(limit).to_list(limit)
    for audit in audits:
        if isinstance(audit.get('audit_date'), str):
            audit['audit_date'] = datetime.fromisoformat(audit['audit_date'])
        if not audit.get("action_plan"):
            audit["action_plan"] = build_action_plan(audit)
    return audits


@api_router.get("/seo-audit-status")
async def get_seo_audit_status(current_user: dict = Depends(get_current_user)):
    """Returns whether external integrations are configured."""
    return {
        "pagespeed_enabled": pagespeed_is_configured(),
        "performance_source": "pagespeed" if pagespeed_is_configured() else "fallback",
        "email_enabled": email_is_configured(),
        "stripe_enabled": _stripe_is_configured(),
    }


# ============= STRIPE PAYMENT ENDPOINTS =============

def _stripe_is_configured() -> bool:
    return stripe_service.is_configured()


@api_router.post("/payments/checkout", response_model=PaymentTransaction)
async def create_payment_checkout(
    payload: CreateCheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Create a Stripe Checkout Session for a project. Amount comes from
    project.budget on the server — never from the client."""
    if not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    project = await db.projects.find_one({"id": payload.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.get("budget") or float(project["budget"]) <= 0:
        raise HTTPException(status_code=400, detail="Project has no positive budget set")

    amount = float(project["budget"])
    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/projects?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/projects"

    try:
        metadata = {
            "project_id": project["id"],
            "client_id": project.get("client_id") or "",
            "description": payload.description or project.get("name") or "Service",
        }
        session = stripe_service.create_checkout_session(
            amount_usd=amount,
            description=metadata["description"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )

        actor_id = _user_id_from_auth(current_user)
        txn = PaymentTransaction(
            project_id=project["id"],
            client_id=project.get("client_id"),
            session_id=session["session_id"],
            amount=amount,
            currency="usd",
            status="initiated",
            description=metadata["description"],
            stripe_url=session["url"],
            metadata=metadata,
            initiated_by_user_id=actor_id,
        )
        doc = txn.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await db.payment_transactions.insert_one(doc)

        if actor_id:
            track_event(
                actor_id,
                "payment_checkout_started",
                {
                    "project_id": project["id"],
                    "amount": amount,
                    "currency": "usd",
                    "session_id": session["session_id"],
                },
                insert_id=f"checkout-{session['session_id']}",
            )

        return txn
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Poll the status of a Checkout Session. Updates the local
    payment_transactions row idempotently if the upstream status changed.
    Falls back to local DB state if the upstream call fails — webhook
    events remain the authoritative source."""
    if not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Unknown session_id")

    try:
        status = stripe_service.get_checkout_status(session_id)
        upstream_payment_status = status["payment_status"]
        upstream_session_status = status["status"]
        amount_total = status["amount_total"]
        currency = status["currency"]
    except Exception as exc:
        logger.warning(f"upstream stripe status fetch failed for {session_id}: {exc} — using local state")
        return {
            "session_id": session_id,
            "status": txn["status"],
            "payment_status": txn.get("payment_status"),
            "amount_total": int(round(float(txn.get("amount", 0)) * 100)),
            "currency": txn.get("currency", "usd"),
            "source": "local-fallback",
        }
    
    try:
        new_status = txn["status"]
        if upstream_payment_status == "paid" and txn["status"] != "paid":
            new_status = "paid"
        elif upstream_session_status == "expired":
            new_status = "expired"
        elif upstream_payment_status in ("unpaid", "no_payment_required"):
            new_status = txn["status"] if txn["status"] in ("paid", "expired") else "pending"

        if new_status != txn["status"] or upstream_payment_status != txn.get("payment_status"):
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": new_status,
                    "payment_status": upstream_payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )

        return {
            "session_id": session_id,
            "status": new_status,
            "payment_status": upstream_payment_status,
            "amount_total": amount_total,
            "currency": currency,
            "source": "upstream",
        }
    except Exception as e:
        logger.error(f"Error processing payment status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch payment status")


@api_router.get("/payments", response_model=List[PaymentTransaction])
async def list_payments(
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
    current_user: dict = Depends(get_current_user),
):
    """List payment transactions, optionally filtered by project."""
    query = {"project_id": project_id} if project_id else {}
    skip, limit = _normalize_pagination(skip, limit)
    rows = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for r in rows:
        for field in ("created_at", "updated_at"):
            if isinstance(r.get(field), str):
                r[field] = datetime.fromisoformat(r[field])
    return rows


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe → us webhook. We update the matching payment_transactions row.
    Idempotent: re-receiving the same event for a 'paid' transaction is a no-op."""
    if not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = stripe_service.parse_webhook_event(body, sig)
    except Exception as exc:
        logger.error(f"Stripe webhook verification failed: {exc}")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if not event:
        return {"received": True}

    session_id = event["session_id"]
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        return {"received": True, "unknown_session": True}

    if event.get("session_status") == "expired" and txn["status"] != "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "expired",
                "payment_status": event.get("payment_status"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {"received": True}

    if event.get("payment_status") == "paid" and txn["status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "paid",
                "payment_status": "paid",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        logger.info(f"Payment {session_id} marked paid via webhook")

        distinct_id = txn.get("initiated_by_user_id") or f"project-{txn.get('project_id')}"
        track_event(
            distinct_id,
            "payment_completed",
            {
                "project_id": txn.get("project_id"),
                "client_id": txn.get("client_id"),
                "amount": txn.get("amount"),
                "currency": txn.get("currency", "usd"),
                "session_id": session_id,
                "source": "stripe_webhook",
            },
            insert_id=f"payment-paid-{session_id}",
        )

    return {"received": True}


# ============= PUBLIC CONTACT ENDPOINTS =============

@api_router.post("/contact", response_model=ContactMessage)
async def submit_contact_message(payload: ContactMessageCreate):
    """Public endpoint - landing page contact form. Stores message in DB
    and (if Resend is configured) fires off owner notification + auto-reply."""
    try:
        msg = ContactMessage(**payload.model_dump())
        doc = msg.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.contact_messages.insert_one(doc)

        # Fire-and-forget emails (failures are logged, never bubble up)
        asyncio.create_task(send_contact_notification(msg.name, msg.email, msg.website, msg.message))
        asyncio.create_task(send_contact_autoreply(msg.name, msg.email))

        return msg
    except ValueError as e:
        logger.warning(f"Invalid contact data: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid contact information: {str(e)}")
    except Exception as e:
        logger.error(f"Error submitting contact message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit contact message")


@api_router.get("/contact", response_model=List[ContactMessage])
async def list_contact_messages(skip: int = 0, limit: int = 500, current_user: dict = Depends(get_current_user)):
    """Authenticated - list inbound contact messages."""
    skip, limit = _normalize_pagination(skip, limit)
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for m in messages:
        if isinstance(m.get('created_at'), str):
            m['created_at'] = datetime.fromisoformat(m['created_at'])
    return messages


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    # Closing handled by motor garbage collection; nothing to do
    pass


@app.on_event("startup")
async def startup_db_indexes():
    await ensure_indexes()
