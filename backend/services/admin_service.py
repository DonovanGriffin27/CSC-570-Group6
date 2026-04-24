"""
admin_service.py
Business logic for the Admin Portal:
  1. Users / Roles
  2. Audit Review
  3. Permissions
"""

from datetime import datetime
from models.user import User          # your existing User model
# from db import get_db             # import however your project exposes the DB session


# ── Helpers ────────────────────────────────────────────────────────────────

def _user_to_dict(user):
    """Serialize a User model to a safe dict (never expose password hash)."""
    return {
        'id':         user.id,
        'username':   user.username,
        'email':      user.email,
        'role':       user.role,
        'is_active':  user.is_active,
        'created_at': user.created_at.isoformat() if user.created_at else None,
    }


# ── 1. Users ───────────────────────────────────────────────────────────────

def get_all_users(page=1, per_page=20):
    """Return a paginated list of all users."""
    db = get_db()
    offset = (page - 1) * per_page
    users = db.query(User).offset(offset).limit(per_page).all()
    total = db.query(User).count()
    return {
        'users': [_user_to_dict(u) for u in users],
        'total': total,
        'page':  page,
        'per_page': per_page,
    }


def get_user_by_id(user_id):
    db = get_db()
    user = db.query(User).filter(User.id == user_id).first()
    return _user_to_dict(user) if user else None


def create_user(data):
    db = get_db()
    new_user = User(
        username=data['username'],
        email=data['email'],
        role=data.get('role', 'investigator'),   # default least-privilege role
        is_active=data.get('is_active', True),
        created_at=datetime.utcnow(),
    )
    # NOTE: hash the password before saving — never store plaintext
    # new_user.set_password(data['password'])
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    _log_audit(action='USER_CREATED', target_id=new_user.id, details=data.get('username'))
    return _user_to_dict(new_user)


def update_user(user_id, data):
    db = get_db()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    for field in ('username', 'email', 'is_active'):
        if field in data:
            setattr(user, field, data[field])
    db.commit()
    db.refresh(user)
    _log_audit(action='USER_UPDATED', target_id=user_id, details=str(data))
    return _user_to_dict(user)


def delete_user(user_id):
    db = get_db()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    db.delete(user)
    db.commit()
    _log_audit(action='USER_DELETED', target_id=user_id)
    return True


# ── 1b. Roles ──────────────────────────────────────────────────────────────

# Defined roles with least-privilege ordering (matches your RBAC/Auth Service)
ROLES = {
    'admin':       'Full system access',
    'supervisor':  'Can view all cases and assign investigators',
    'investigator':'Can manage their own cases and evidence',
    'auditor':     'Read-only access to audit logs',
    'viewer':      'Read-only access to cases',
}


def get_all_roles():
    return [{'name': name, 'description': desc} for name, desc in ROLES.items()]


def assign_role_to_user(user_id, role_name):
    if role_name not in ROLES:
        return None
    db = get_db()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    old_role = user.role
    user.role = role_name
    db.commit()
    db.refresh(user)
    _log_audit(action='ROLE_ASSIGNED', target_id=user_id,
               details=f'{old_role} -> {role_name}')
    return _user_to_dict(user)


# ── 2. Audit Logs ──────────────────────────────────────────────────────────
# Audit logs are immutable — we only ever read them here.
# Writing is done via _log_audit() which should call your AuditLogService.

def get_audit_logs(filters=None, page=1, per_page=50):
    """
    Fetch audit logs from your NoSQL immutable event store.
    Replace the stub below with your actual NoSQL client call
    (MongoDB, DynamoDB, Firestore, etc.).
    """
    # TODO: replace with real NoSQL query
    # Example with pymongo:
    # collection = get_mongo_db()['audit_events']
    # query = _build_mongo_query(filters)
    # logs = list(collection.find(query).skip((page-1)*per_page).limit(per_page))
    # return {'logs': logs, 'page': page, 'per_page': per_page}

    # --- STUB ---
    return {
        'logs': [],
        'page': page,
        'per_page': per_page,
        'filters_applied': filters,
        'note': 'Connect to your NoSQL audit event store here',
    }


def get_audit_log_by_id(log_id):
    """Fetch a single immutable audit event by its ID."""
    # TODO: replace with real NoSQL lookup
    # collection = get_mongo_db()['audit_events']
    # return collection.find_one({'_id': log_id})
    return None  # stub


def _log_audit(action, target_id=None, details=None, performed_by=None):
    """
    Internal helper — write an immutable audit event.
    Calls your existing AuditLogService (audit_logger.py).
    """
    try:
        from middleware.audit_logger import log_event   # adjust import to match your project
        log_event(
            action=action,
            target_id=target_id,
            details=details,
            performed_by=performed_by,
            timestamp=datetime.utcnow().isoformat(),
        )
    except ImportError:
        # Fallback: print so events aren't silently lost during dev
        print(f'[AUDIT] {action} | target={target_id} | details={details}')


# ── 3. Permissions ─────────────────────────────────────────────────────────

# Permission registry — matches "least privilege" requirement from your doc
PERMISSIONS = {
    'view_cases':        'Read-only access to case records',
    'edit_cases':        'Create and update case records',
    'delete_cases':      'Delete case records',
    'view_evidence':     'Read-only access to evidence',
    'manage_evidence':   'Upload, tag, and update evidence',
    'view_audit_logs':   'Read audit log entries',
    'manage_users':      'Create, update, delete user accounts',
    'manage_roles':      'Assign and revoke roles',
    'manage_permissions':'Grant and revoke role permissions',
    'run_reports':       'Generate workload and clearance reports',
}

# Role → permission mapping (least privilege: give only what's needed)
ROLE_PERMISSIONS = {
    'admin':       list(PERMISSIONS.keys()),
    'supervisor':  ['view_cases', 'edit_cases', 'view_evidence', 'view_audit_logs', 'run_reports'],
    'investigator':['view_cases', 'edit_cases', 'view_evidence', 'manage_evidence'],
    'auditor':     ['view_cases', 'view_evidence', 'view_audit_logs'],
    'viewer':      ['view_cases', 'view_evidence'],
}


def get_all_permissions():
    return {
        'permissions': [{'name': k, 'description': v} for k, v in PERMISSIONS.items()],
        'role_permissions': ROLE_PERMISSIONS,
    }


def assign_permission_to_role(role_name, permission):
    if role_name not in ROLE_PERMISSIONS or permission not in PERMISSIONS:
        return None
    if permission not in ROLE_PERMISSIONS[role_name]:
        ROLE_PERMISSIONS[role_name].append(permission)
    _log_audit(action='PERMISSION_GRANTED', details=f'{permission} -> {role_name}')
    return {'role': role_name, 'permissions': ROLE_PERMISSIONS[role_name]}


def revoke_permission_from_role(role_name, permission):
    if role_name not in ROLE_PERMISSIONS:
        return False
    if permission in ROLE_PERMISSIONS[role_name]:
        ROLE_PERMISSIONS[role_name].remove(permission)
        _log_audit(action='PERMISSION_REVOKED', details=f'{permission} from {role_name}')
        return True
    return False


# ── DB session helper ──────────────────────────────────────────────────────

def get_db():
    """
    Replace this with however your project provides a DB session.
    Common patterns:
      - Flask-SQLAlchemy:  from db import db; return db.session
      - Raw SQLAlchemy:    from db import SessionLocal; return SessionLocal()
    """
    raise NotImplementedError('Wire up get_db() to your database session')
