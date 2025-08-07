import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Database, 
  Globe, 
  BarChart3, 
  FileText,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalUsers: number;
  blockedDomains: number;
  blockedIPs: number;
  securityEvents: number;
  recentThreats: number;
}

export function AdminHomePage() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    blockedDomains: 0,
    blockedIPs: 0,
    securityEvents: 0,
    recentThreats: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) return;

      try {
        // Check if user has admin role
        const { data: userRole } = await supabase.rpc('get_current_user_role');
        
        if (userRole !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access admin features.",
            variant: "destructive",
          });
          return;
        }

        setIsAdmin(true);
        await fetchAdminStats();
      } catch (error) {
        console.error('Failed to check admin access:', error);
        toast({
          title: "Access Check Failed",
          description: "Unable to verify admin permissions.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, toast]);

  const fetchAdminStats = async () => {
    try {
      // Fetch various admin statistics
      const [
        { count: userCount },
        { count: domainCount },
        { count: ipCount },
        { count: eventCount },
        { count: threatCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('blocked_email_domains').select('*', { count: 'exact', head: true }),
        supabase.from('ip_reputation').select('*', { count: 'exact', head: true }).gt('abuse_count', 0),
        supabase.from('security_audit_log').select('*', { count: 'exact', head: true }),
        supabase.from('security_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('success', false)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      setStats({
        totalUsers: userCount || 0,
        blockedDomains: domainCount || 0,
        blockedIPs: ipCount || 0,
        securityEvents: eventCount || 0,
        recentThreats: threatCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access the admin panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access admin features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button className="w-full">Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminFeatures = [
    {
      title: "User Management",
      description: "Manage user roles and permissions",
      icon: Users,
      href: "/admin/users",
      stats: `${stats.totalUsers} users`,
      color: "text-blue-600"
    },
    {
      title: "Domain Management", 
      description: "Block email domains and manage restrictions",
      icon: Globe,
      href: "/admin/domains",
      stats: `${stats.blockedDomains} blocked`,
      color: "text-orange-600"
    },
    {
      title: "IP Reputation",
      description: "Monitor and manage IP address reputation",
      icon: Shield,
      href: "/admin/ip-reputation", 
      stats: `${stats.blockedIPs} flagged`,
      color: "text-red-600"
    },
    {
      title: "Security Audit",
      description: "View security logs and audit trails",
      icon: FileText,
      href: "/admin/audit",
      stats: `${stats.securityEvents} events`,
      color: "text-green-600"
    },
    {
      title: "Analytics",
      description: "Security analytics and reporting",
      icon: BarChart3,
      href: "/admin/analytics",
      stats: "View reports",
      color: "text-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">System administration and security management</p>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="outline">
                  Back to Dashboard
                </Button>
              </Link>
              <Button onClick={() => supabase.auth.signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Security Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Security Events</p>
                  <p className="text-2xl font-bold">{stats.securityEvents}</p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Blocked IPs</p>
                  <p className="text-2xl font-bold">{stats.blockedIPs}</p>
                </div>
                <Globe className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Threats</p>
                  <p className="text-2xl font-bold">{stats.recentThreats}</p>
                </div>
                {stats.recentThreats > 0 ? (
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminFeatures.map((feature) => (
            <Card key={feature.href} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  <Badge variant="secondary">{feature.stats}</Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to={feature.href}>
                  <Button className="w-full" variant="outline">
                    Manage
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4"
                onClick={() => fetchAdminStats()}
              >
                <BarChart3 className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Refresh Statistics</div>
                  <div className="text-sm text-muted-foreground">Update dashboard data</div>
                </div>
              </Button>
              
              <Link to="/admin/audit">
                <Button variant="outline" className="justify-start h-auto p-4 w-full">
                  <FileText className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">View Recent Logs</div>
                    <div className="text-sm text-muted-foreground">Check latest security events</div>
                  </div>
                </Button>
              </Link>
              
              <Link to="/admin/users">
                <Button variant="outline" className="justify-start h-auto p-4 w-full">
                  <Users className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Manage Users</div>
                    <div className="text-sm text-muted-foreground">Assign roles and permissions</div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}