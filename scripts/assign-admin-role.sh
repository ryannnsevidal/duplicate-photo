#!/bin/bash

# 🔐 Admin Role Assignment Script
# This script assigns admin role to a specific user

echo "🔧 Setting up admin role for PIX DUPE DETECT..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found. Please ensure your environment is configured."
    exit 1
fi

echo "✅ Environment loaded"

# Admin email to assign
ADMIN_EMAIL="${1:-rsevidal117@gmail.com}"

echo "🎯 Assigning admin role to: $ADMIN_EMAIL"

# Run the SQL command to assign admin role
echo "📝 Executing admin role assignment..."

# Create temporary SQL file
cat > /tmp/assign_admin.sql << EOF
-- Assign admin role to specific user
INSERT INTO user_roles (user_id, role, assigned_by, assigned_at, is_active)
SELECT 
    id as user_id,
    'admin' as role,
    id as assigned_by,
    NOW() as assigned_at,
    true as is_active
FROM auth.users 
WHERE email = '$ADMIN_EMAIL'
ON CONFLICT (user_id, role) 
DO UPDATE SET 
    is_active = true,
    assigned_at = NOW();

-- Also update profiles table if it exists
UPDATE profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = '$ADMIN_EMAIL';

-- Verify the assignment
SELECT 
    u.email,
    ur.role,
    ur.assigned_at,
    ur.is_active
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = '$ADMIN_EMAIL';
EOF

# Execute the SQL
if npx supabase db reset --db-url "$VITE_SUPABASE_URL" --linked; then
    echo "🗄️ Database connection verified"
    
    if npx supabase db remote exec --file /tmp/assign_admin.sql; then
        echo "✅ Admin role assigned successfully!"
        echo ""
        echo "🎉 $ADMIN_EMAIL is now an admin!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Sign in with $ADMIN_EMAIL"
        echo "2. Navigate to /admin to access the admin dashboard"
        echo "3. Verify admin functionality is working"
    else
        echo "❌ Failed to assign admin role"
        echo "💡 Alternative: Use Supabase Dashboard SQL Editor"
        echo "   Run this query manually:"
        echo ""
        echo "   INSERT INTO user_roles (user_id, role, assigned_by, assigned_at, is_active)"
        echo "   SELECT id, 'admin', id, NOW(), true"
        echo "   FROM auth.users WHERE email = '$ADMIN_EMAIL'"
        echo "   ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;"
    fi
else
    echo "❌ Could not connect to database"
    echo "💡 Manual assignment via Supabase Dashboard:"
    echo "   1. Go to: $VITE_SUPABASE_URL/project/[project-id]/sql"
    echo "   2. Run: SELECT public.assign_admin_role('$ADMIN_EMAIL');"
fi

# Cleanup
rm -f /tmp/assign_admin.sql

echo ""
echo "🔐 Admin setup complete!"
