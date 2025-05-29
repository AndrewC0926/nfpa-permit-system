// Essential Role-Based Access Control for NFPA System
class EssentialRBAC {
    constructor() {
        this.roles = {
            'ADMIN': {
                permissions: ['*'], // All permissions
                description: 'System administrator'
            },
            'FIRE_MARSHAL': {
                permissions: [
                    'permits:read',
                    'permits:update_status',
                    'permits:assign_inspector',
                    'inspections:read',
                    'inspections:create',
                    'reports:read'
                ],
                description: 'Fire marshal or department head'
            },
            'INSPECTOR': {
                permissions: [
                    'permits:read',
                    'inspections:read',
                    'inspections:create',
                    'inspections:update',
                    'documents:upload'
                ],
                description: 'Fire safety inspector'
            },
            'CONTRACTOR': {
                permissions: [
                    'permits:create',
                    'permits:read_own',
                    'permits:update_own',
                    'documents:upload_own'
                ],
                description: 'Fire safety contractor'
            },
            'CLERK': {
                permissions: [
                    'permits:read',
                    'permits:update_status',
                    'payments:process'
                ],
                description: 'Administrative clerk'
            }
        };
    }

    // Check if user has permission
    hasPermission(userRole, permission) {
        const role = this.roles[userRole];
        if (!role) return false;

        // Admin has all permissions
        if (role.permissions.includes('*')) return true;

        // Check specific permission
        return role.permissions.includes(permission);
    }

    // Middleware for permission checking
    requirePermission(permission) {
        return (req, res, next) => {
            const userRole = req.user?.role;
            
            if (!userRole) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!this.hasPermission(userRole, permission)) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    required: permission,
                    userRole: userRole
                });
            }

            next();
        };
    }

    // Check resource ownership (for :read_own, :update_own permissions)
    requireOwnership() {
        return (req, res, next) => {
            const userId = req.user?.id;
            const resourceOwnerId = req.body?.createdBy || req.params?.userId;

            if (userId !== resourceOwnerId && !this.hasPermission(req.user?.role, '*')) {
                return res.status(403).json({ 
                    error: 'Can only access own resources' 
                });
            }

            next();
        };
    }

    // Get user's available actions for a resource
    getAvailableActions(userRole, resourceType) {
        const role = this.roles[userRole];
        if (!role) return [];

        return role.permissions
            .filter(perm => perm.startsWith(resourceType + ':') || perm === '*')
            .map(perm => perm.split(':')[1] || 'all');
    }
}

module.exports = EssentialRBAC;
