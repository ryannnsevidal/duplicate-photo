import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Globe, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdvancedInputValidation } from '@/hooks/useAdvancedInputValidation';

interface BlockedDomain {
  id: string;
  domain: string;
  block_type: string;
  reason: string;
  added_by: string;
  created_at: string;
}

export function DomainsPage() {
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [blockType, setBlockType] = useState('disposable');
  const [reason, setReason] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { validateInput } = useAdvancedInputValidation();

  useEffect(() => {
    fetchBlockedDomains();
  }, []);

  const fetchBlockedDomains = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('blocked_email_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to Load Domains",
        description: error.message || "Could not fetch blocked domains.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBlockedDomain = async () => {
    if (!newDomain.trim()) {
      toast({
        title: "Domain Required",
        description: "Please enter a domain to block.",
        variant: "destructive",
      });
      return;
    }

    // Validate domain format
    const domainValidation = await validateInput(newDomain, 'text', 'admin_block_domain');
    if (!domainValidation.isValid) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain name.",
        variant: "destructive",
      });
      return;
    }

    // Extract domain part (remove @ if present)
    const cleanDomain = newDomain.replace('@', '').toLowerCase().trim();
    
    // Basic domain format check
    if (!cleanDomain.includes('.') || cleanDomain.includes(' ')) {
      toast({
        title: "Invalid Domain Format",
        description: "Please enter a valid domain (e.g., example.com).",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdding(true);
      
      const { error } = await supabase
        .from('blocked_email_domains')
        .insert({
          domain: cleanDomain,
          block_type: blockType,
          reason: reason || 'Manually blocked by admin',
          added_by: user?.id
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Domain Already Blocked",
            description: "This domain is already in the blocked list.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Domain Blocked",
        description: `${cleanDomain} has been added to the blocked list.`,
      });

      setNewDomain('');
      setReason('');
      await fetchBlockedDomains();
    } catch (error: any) {
      toast({
        title: "Failed to Block Domain",
        description: error.message || "Could not add domain to blocked list.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const removeDomain = async (domainId: string, domainName: string) => {
    try {
      const { error } = await supabase
        .from('blocked_email_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      toast({
        title: "Domain Unblocked",
        description: `${domainName} has been removed from the blocked list.`,
      });

      await fetchBlockedDomains();
    } catch (error: any) {
      toast({
        title: "Failed to Remove Domain",
        description: error.message || "Could not remove domain from blocked list.",
        variant: "destructive",
      });
    }
  };

  const getBlockTypeColor = (type: string) => {
    switch (type) {
      case 'disposable': return 'bg-yellow-100 text-yellow-800';
      case 'malicious': return 'bg-red-100 text-red-800';
      case 'spam': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Globe className="h-6 w-6" />
                  Domain Management
                </h1>
                <p className="text-muted-foreground">Manage blocked email domains</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Add New Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Block New Domain
            </CardTitle>
            <CardDescription>
              Add a new email domain to the blocked list
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  disabled={adding}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="blockType">Block Type</Label>
                <Select value={blockType} onValueChange={setBlockType} disabled={adding}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disposable">Disposable Email</SelectItem>
                    <SelectItem value="malicious">Malicious</SelectItem>
                    <SelectItem value="spam">Spam/Abuse</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for blocking..."
                  disabled={adding}
                />
              </div>
            </div>
            
            <Button 
              onClick={addBlockedDomain}
              disabled={adding || !newDomain.trim()}
              className="w-full md:w-auto"
            >
              {adding ? "Adding..." : "Block Domain"}
            </Button>
          </CardContent>
        </Card>

        {/* Blocked Domains List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Blocked Domains ({domains.length})</span>
              <Button variant="outline" size="sm" onClick={fetchBlockedDomains}>
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              List of all blocked email domains
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading blocked domains...</p>
              </div>
            ) : domains.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No blocked domains</p>
                <p className="text-sm">Add your first blocked domain above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domains.map((domain) => (
                      <TableRow key={domain.id}>
                        <TableCell className="font-mono">{domain.domain}</TableCell>
                        <TableCell>
                          <Badge className={getBlockTypeColor(domain.block_type)}>
                            {domain.block_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {domain.reason || 'No reason provided'}
                        </TableCell>
                        <TableCell>
                          {new Date(domain.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDomain(domain.id, domain.domain)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Security Notice</h3>
                <p className="text-sm text-yellow-700">
                  Blocking email domains will prevent users from registering with emails from those domains. 
                  This action is logged in the security audit log and cannot be undone easily.
                  Make sure to only block domains that are genuinely problematic.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}