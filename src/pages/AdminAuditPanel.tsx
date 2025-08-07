import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  FileText, 
  Activity, 
  AlertTriangle, 
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Users,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FileUpload {
  id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  upload_status: string;
  created_at: string;
  user_id: string;
  cloud_path: string;
  duplicate_of?: string;
  similarity_score?: number;
}

interface CaptchaVerification {
  id: string;
  action_type: string;
  verified_at: string;
  ip_address: string | unknown;
  user_id?: string;
}

interface IPReputation {
  id: string;
  ip_address: string | unknown;
  reputation_score: number;
  abuse_count: number;
  blocked_until?: string;
  block_reason?: string;
  last_activity: string;
  country_code?: string;
}

interface SecurityEvent {
  id: string;
  action: string;
  resource?: string;
  success: boolean;
  created_at: string;
  user_id?: string;
  ip_address?: string | unknown;
  error_message?: string;
  metadata?: any;
}

export function AdminAuditPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('uploads');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('24h');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Data states
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [captchaEvents, setCaptchaEvents] = useState<CaptchaVerification[]>([]);
  const [ipReputations, setIpReputations] = useState<IPReputation[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        navigate('/signin');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error || !data || data.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "Admin privileges required",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
      } catch (error) {
        console.error('Admin check failed:', error);
        navigate('/');
      }
    };

    checkAdminAccess();
  }, [user, navigate, toast]);

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab, dateFilter, statusFilter]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateFilter) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const dateFrom = getDateFilter();

      switch (activeTab) {
        case 'uploads':
          await loadUploads(dateFrom);
          break;
        case 'captcha':
          await loadCaptchaEvents(dateFrom);
          break;
        case 'ips':
          await loadIPReputations();
          break;
        case 'security':
          await loadSecurityEvents(dateFrom);
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load audit data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUploads = async (dateFrom: string) => {
    let query = supabase
      .from('file_upload_logs')
      .select('*')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('upload_status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    setUploads(data || []);
  };

  const loadCaptchaEvents = async (dateFrom: string) => {
    const { data, error } = await supabase
      .from('captcha_verifications')
      .select('*')
      .gte('verified_at', dateFrom)
      .order('verified_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    setCaptchaEvents((data || []).map(item => ({
      ...item,
      ip_address: String(item.ip_address || '0.0.0.0')
    })));
  };

  const loadIPReputations = async () => {
    let query = supabase
      .from('ip_reputation')
      .select('*')
      .order('last_activity', { ascending: false })
      .limit(100);

    if (statusFilter === 'blocked') {
      query = query.not('blocked_until', 'is', null)
        .gte('blocked_until', new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    setIpReputations((data || []).map(item => ({
      ...item,
      ip_address: String(item.ip_address || '0.0.0.0')
    })));
  };

  const loadSecurityEvents = async (dateFrom: string) => {
    let query = supabase
      .from('security_audit_log')
      .select('*')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter === 'failed') {
      query = query.eq('success', false);
    } else if (statusFilter === 'success') {
      query = query.eq('success', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    setSecurityEvents((data || []).map(item => ({
      ...item,
      ip_address: String(item.ip_address || '0.0.0.0')
    })));
  };

  const exportData = async () => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (activeTab) {
        case 'uploads':
          data = uploads;
          filename = 'file_uploads.csv';
          break;
        case 'captcha':
          data = captchaEvents;
          filename = 'captcha_events.csv';
          break;
        case 'ips':
          data = ipReputations;
          filename = 'ip_reputation.csv';
          break;
        case 'security':
          data = securityEvents;
          filename = 'security_events.csv';
          break;
      }

      if (data.length === 0) {
        toast({
          title: "No Data",
          description: "No data available to export",
          variant: "destructive",
        });
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );
      const csv = [headers, ...rows].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${data.length} records exported successfully`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredData = (data: any[]) => {
    if (!searchTerm) return data;
    
    return data.filter(item => 
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Audit Panel</h1>
          <p className="text-muted-foreground">
            Comprehensive system logs and security monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Tables */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="uploads" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            File Uploads
          </TabsTrigger>
          <TabsTrigger value="captcha" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            CAPTCHA Events
          </TabsTrigger>
          <TabsTrigger value="ips" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            IP Reputation
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Security Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uploads">
          <Card>
            <CardHeader>
              <CardTitle>File Upload Logs</CardTitle>
              <CardDescription>
                {filteredData(uploads).length} uploads found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Cloud Path</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData(uploads).map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell className="font-medium max-w-48 truncate">
                        {upload.original_filename}
                      </TableCell>
                      <TableCell>{upload.file_type}</TableCell>
                      <TableCell>{formatFileSize(upload.file_size_bytes)}</TableCell>
                      <TableCell>{getStatusBadge(upload.upload_status)}</TableCell>
                      <TableCell>{formatDate(upload.created_at)}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {upload.cloud_path || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="captcha">
          <Card>
            <CardHeader>
              <CardTitle>CAPTCHA Verifications</CardTitle>
              <CardDescription>
                {filteredData(captchaEvents).length} CAPTCHA events found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Verified At</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData(captchaEvents).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.action_type}</TableCell>
                      <TableCell>{event.ip_address}</TableCell>
                      <TableCell>{formatDate(event.verified_at)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.user_id || 'Anonymous'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ips">
          <Card>
            <CardHeader>
              <CardTitle>IP Reputation</CardTitle>
              <CardDescription>
                {filteredData(ipReputations).length} IP addresses tracked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Abuse Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Blocked Until</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData(ipReputations).map((ip) => (
                    <TableRow key={ip.id}>
                      <TableCell className="font-mono">{ip.ip_address}</TableCell>
                      <TableCell>
                        <Badge variant={ip.reputation_score < 50 ? 'destructive' : 'secondary'}>
                          {ip.reputation_score}
                        </Badge>
                      </TableCell>
                      <TableCell>{ip.abuse_count}</TableCell>
                      <TableCell>
                        {ip.blocked_until && new Date(ip.blocked_until) > new Date() ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {ip.blocked_until ? formatDate(ip.blocked_until) : 'N/A'}
                      </TableCell>
                      <TableCell>{ip.country_code || 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                {filteredData(securityEvents).length} security events found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData(securityEvents).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.action}</TableCell>
                      <TableCell>{event.resource || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(event.success ? 'success' : 'failed')}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.user_id || 'System'}
                      </TableCell>
                      <TableCell>{event.ip_address || 'N/A'}</TableCell>
                      <TableCell>{formatDate(event.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}