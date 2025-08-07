import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Shield, Trash2, Plus, AlertTriangle, Clock, User, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BlockedDomain {
  id: string;
  domain: string;
  reason?: string;
  block_type: string;
  created_at: string;
  added_by?: string;
}

export function BlockedDomainsManager() {
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newBlockType, setNewBlockType] = useState('disposable');
  const { toast } = useToast();

  const loadBlockedDomains = async () => {
    try {
      setLoading(true);
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      // Call edge function to get blocked domains
      const { data, error } = await supabase.functions.invoke('admin-domain-management', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      setBlockedDomains(data.domains || []);
    } catch (error: any) {
      console.error('Error loading blocked domains:', error);
      toast({
        title: "Failed to load domains",
        description: error.message || "Could not load blocked domains",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBlockedDomain = async () => {
    if (!newDomain.trim()) {
      toast({
        title: "Domain required",
        description: "Please enter a domain to block",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdding(true);

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      // Call edge function to add blocked domain
      const { data, error } = await supabase.functions.invoke('admin-domain-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: {
          domain: newDomain.trim(),
          reason: newReason.trim() || 'Added by admin',
          block_type: newBlockType,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Domain blocked",
        description: `Successfully blocked ${newDomain}`,
      });

      // Reset form and reload data
      setNewDomain('');
      setNewReason('');
      setNewBlockType('disposable');
      await loadBlockedDomains();
    } catch (error: any) {
      console.error('Error adding blocked domain:', error);
      toast({
        title: "Failed to block domain",
        description: error.message || "Could not block domain",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const removeBlockedDomain = async (domain: string) => {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      // Call edge function to remove blocked domain
      const { error } = await supabase.functions.invoke(`admin-domain-management/${domain}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Domain unblocked",
        description: `Successfully unblocked ${domain}`,
      });

      await loadBlockedDomains();
    } catch (error: any) {
      console.error('Error removing blocked domain:', error);
      toast({
        title: "Failed to unblock domain",
        description: error.message || "Could not unblock domain",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadBlockedDomains();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBlockTypeBadgeVariant = (blockType: string) => {
    switch (blockType) {
      case 'disposable': return 'destructive';
      case 'spam': return 'secondary';
      case 'malicious': return 'outline';
      default: return 'default';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Blocked Email Domains
              </CardTitle>
              <CardDescription>
                Manage domains that are blocked from user registration
              </CardDescription>
            </div>
            <Button
              onClick={loadBlockedDomains}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Domain Form */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Blocked Domain
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="block-type">Block Type</Label>
                <Select value={newBlockType} onValueChange={setNewBlockType}>
                  <SelectTrigger id="block-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disposable">Disposable Email</SelectItem>
                    <SelectItem value="spam">Spam Domain</SelectItem>
                    <SelectItem value="malicious">Malicious Domain</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  placeholder="Why block this domain?"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
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
          </div>

          <Separator />

          {/* Blocked Domains List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Blocked Domains ({blockedDomains.length})
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : blockedDomains.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {blockedDomains.map((domain) => (
                    <motion.div
                      key={domain.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {domain.domain}
                          </code>
                          <Badge 
                            variant={getBlockTypeBadgeVariant(domain.block_type)}
                            className="text-xs"
                          >
                            {domain.block_type}
                          </Badge>
                        </div>
                        
                        {domain.reason && (
                          <p className="text-sm text-muted-foreground">
                            {domain.reason}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(domain.created_at)}
                          </span>
                          {domain.added_by && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {domain.added_by}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => removeBlockedDomain(domain.domain)}
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No blocked domains found. Add domains above to prevent users from registering with those email addresses.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}