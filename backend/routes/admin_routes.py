from flask import Blueprint, jsonify, request
from middleware.auth_middleware import require_admin
from services.admin_service import (
    get_all_users, get_user_by_id, create_user, update_user, delete_user,
    get_all_roles, assign_role_to_user,
    get_audit_logs, get_audit_log_by_id,
    get_all_permissions, assign_permission_to_role, revoke_permission_from_role
)

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


# ── Users ──────────────────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@require_admin
def list_users():
    """Return all users (paginated)."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    users = get_all_users(page=page, per_page=per_page)
    return jsonify(users), 200


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@require_admin
def get_user(user_id):
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user), 200


@admin_bp.route('/users', methods=['POST'])
@require_admin
def add_user():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email'):
        return jsonify({'error': 'username and email are required'}), 400
    new_user = create_user(data)
    return jsonify(new_user), 201


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@require_admin
def edit_user(user_id):
    data = request.get_json()
    updated = update_user(user_id, data)
    if not updated:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(updated), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@require_admin
def remove_user(user_id):
    success = delete_user(user_id)
    if not success:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'message': f'User {user_id} deleted'}), 200


@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@require_admin
def update_user_role(user_id):
    """Assign a role to a user."""
    data = request.get_json()
    role_name = data.get('role')
    if not role_name:
        return jsonify({'error': 'role is required'}), 400
    result = assign_role_to_user(user_id, role_name)
    if not result:
        return jsonify({'error': 'User or role not found'}), 404
    return jsonify(result), 200


# ── Roles ──────────────────────────────────────────────────────────────────

@admin_bp.route('/roles', methods=['GET'])
@require_admin
def list_roles():
    roles = get_all_roles()
    return jsonify(roles), 200


# ── Audit Logs ─────────────────────────────────────────────────────────────

@admin_bp.route('/audit', methods=['GET'])
@require_admin
def list_audit_logs():
    """
    Filterable audit log review.
    Query params: user_id, action, start_date, end_date, page, per_page
    """
    filters = {
        'user_id':    request.args.get('user_id', type=int),
        'action':     request.args.get('action'),
        'start_date': request.args.get('start_date'),
        'end_date':   request.args.get('end_date'),
    }
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    logs = get_audit_logs(filters=filters, page=page, per_page=per_page)
    return jsonify(logs), 200


@admin_bp.route('/audit/<string:log_id>', methods=['GET'])
@require_admin
def get_audit_entry(log_id):
    log = get_audit_log_by_id(log_id)
    if not log:
        return jsonify({'error': 'Audit log entry not found'}), 404
    return jsonify(log), 200


# ── Permissions ────────────────────────────────────────────────────────────

@admin_bp.route('/permissions', methods=['GET'])
@require_admin
def list_permissions():
    perms = get_all_permissions()
    return jsonify(perms), 200


@admin_bp.route('/roles/<string:role_name>/permissions', methods=['POST'])
@require_admin
def add_permission_to_role(role_name):
    data = request.get_json()
    permission = data.get('permission')
    if not permission:
        return jsonify({'error': 'permission is required'}), 400
    result = assign_permission_to_role(role_name, permission)
    if not result:
        return jsonify({'error': 'Role or permission not found'}), 404
    return jsonify(result), 200


@admin_bp.route('/roles/<string:role_name>/permissions/<string:permission>', methods=['DELETE'])
@require_admin
def remove_permission_from_role(role_name, permission):
    success = revoke_permission_from_role(role_name, permission)
    if not success:
        return jsonify({'error': 'Role or permission not found'}), 404
    return jsonify({'message': f'Permission {permission} removed from {role_name}'}), 200
