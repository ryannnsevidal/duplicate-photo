import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Cloud, 
  Plus, 
  Settings, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Save
} from 'lucide-react';

interface CloudConfig {
  id: string;
  provider: 's3' | 'gdrive' | 'dropbox' | 'onedrive' | 'other';
  remote_name: string;
  is_active: boolean;
  config_data: any;
  created_at: string;
}

export function CloudConfigPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [configs, setConfigs] = useState<CloudConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CloudConfig | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    provider: 'other' as CloudConfig['provider'],
    remote_name: '',
    is_active: true,
    config_data: {}
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    } else if (user) {
      fetchConfigs();
    }
  }, [user, loading, navigate]);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('cloud_sync_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast({
        title: "Error",
        description: "Failed to load cloud configurations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!formData.remote_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Remote name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('cloud_sync_configs')
          .update({
            provider: formData.provider,
            remote_name: formData.remote_name,
            is_active: formData.is_active,
            config_data: formData.config_data
          })
          .eq('id', editingConfig.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Cloud configuration updated successfully",
        });
      } else {
        // Create new config
        const { error } = await supabase
          .from('cloud_sync_configs')
          .insert({
            user_id: user!.id,
            provider: formData.provider,
            remote_name: formData.remote_name,
            is_active: formData.is_active,
            config_data: formData.config_data
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Cloud configuration added successfully",
        });
      }

      // Reset form and refresh
      resetForm();
      fetchConfigs();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cloud_sync_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Configuration deleted successfully",
      });
      
      fetchConfigs();
    } catch (error: any) {
      console.error('Error deleting config:', error);
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'other',
      remote_name: '',
      is_active: true,
      config_data: {}
    });
    setShowAddForm(false);
    setEditingConfig(null);
  };

  const startEdit = (config: CloudConfig) => {
    setFormData({
      provider: config.provider,
      remote_name: config.remote_name,
      is_active: config.is_active,
      config_data: config.config_data
    });
    setEditingConfig(config);
    setShowAddForm(true);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto pt-8"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Cloud className="h-6 w-6" />
                  Cloud Storage Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Rclone remotes for cloud storage integration
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                disabled={showAddForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Remote
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add/Edit Form */}
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border rounded-lg p-4 bg-accent/10"
              >
                <h3 className="font-medium mb-4">
                  {editingConfig ? 'Edit' : 'Add'} Cloud Remote
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select 
                      value={formData.provider} 
                      onValueChange={(value: CloudConfig['provider']) => 
                        setFormData(prev => ({ ...prev, provider: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s3">Amazon S3</SelectItem>
                        <SelectItem value="gdrive">Google Drive</SelectItem>
                        <SelectItem value="dropbox">Dropbox</SelectItem>
                        <SelectItem value="onedrive">OneDrive</SelectItem>
                        <SelectItem value="other">Other/Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="remote_name">Remote Name</Label>
                    <Input
                      id="remote_name"
                      value={formData.remote_name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        remote_name: e.target.value 
                      }))}
                      placeholder="my-s3-remote"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={saveConfig}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingConfig ? 'Update' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Existing Configurations */}
            <div className="space-y-4">
              <h3 className="font-medium">Configured Remotes</h3>
              
              {configs.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No cloud remotes configured yet. Add your first remote to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                configs.map((config) => (
                  <motion.div
                    key={config.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {config.is_active ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium">{config.remote_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {config.provider.toUpperCase()} • {config.is_active ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(config)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteConfig(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Instructions */}
            <Card className="bg-accent/20">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Rclone Setup Instructions</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Before using cloud sync, ensure you have Rclone configured on your server:
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Install Rclone on your server</li>
                  <li>Run <code className="bg-accent px-1 rounded">rclone config</code> to set up remotes</li>
                  <li>Add the remote name here to enable cloud sync</li>
                  <li>Test the connection with <code className="bg-accent px-1 rounded">rclone ls remote_name:</code></li>
                </ol>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
