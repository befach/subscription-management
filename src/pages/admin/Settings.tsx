import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Mail,
  Bell,
  Tag,
  Shield,
  Save,
  Send,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCategories } from '@/features/categories';
import { useAuth } from '@/features/auth';
import { CardSkeleton } from '@/components/shared/skeletons/PageSkeletons';
import type { Id } from '../../../convex/_generated/dataModel';

export default function Settings() {
  const { user } = useAuth();
  const { categories, isLoading, create: createCategory, remove: removeCategory } = useCategories();
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#3B82F6' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zeptoMailConfig, setZeptoMailConfig] = useState({
    apiKey: '',
    fromEmail: 'notifications@company.com',
    fromName: 'SubManager',
    isEnabled: false,
  });
  const [notificationSettings, setNotificationSettings] = useState({
    renewalReminders: true,
    approvalNotifications: true,
    vaultAccessAlerts: true,
    daysBefore: [7, 3, 1],
  });

  const handleSaveZeptoMail = () => {
    toast.success('ZeptoMail configuration saved!');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification settings saved!');
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || !user?.email) {
      toast.error('Please enter a category name');
      return;
    }
    setIsSubmitting(true);
    try {
      await createCategory({
        adminEmail: user.email,
        name: newCategory.name,
        description: newCategory.description,
        color: newCategory.color,
      });
      setNewCategory({ name: '', description: '', color: '#3B82F6' });
      toast.success('Category added!');
    } catch (error) {
      toast.error('Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: Id<"categories">) => {
    if (!user?.email) return;
    try {
      await removeCategory({ adminEmail: user.email, id });
      toast.success('Category deleted!');
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const testEmailConfig = () => {
    toast.success('Test email sent! Check your inbox.');
  };

  const colors = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#6366F1',
    '#EF4444', '#14B8A6', '#F97316', '#84CC16',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Configure system settings and preferences
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-96">
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Email Configuration */}
        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>ZeptoMail Configuration</CardTitle>
              <CardDescription>
                Configure email notifications using ZeptoMail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Enable Email Notifications</p>
                    <p className="text-sm text-gray-500">
                      Send renewal reminders and approval notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={zeptoMailConfig.isEnabled}
                  onCheckedChange={(checked) =>
                    setZeptoMailConfig({ ...zeptoMailConfig, isEnabled: checked })
                  }
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="apiKey">ZeptoMail API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your ZeptoMail API key"
                    value={zeptoMailConfig.apiKey}
                    onChange={(e) =>
                      setZeptoMailConfig({ ...zeptoMailConfig, apiKey: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      placeholder="notifications@company.com"
                      value={zeptoMailConfig.fromEmail}
                      onChange={(e) =>
                        setZeptoMailConfig({ ...zeptoMailConfig, fromEmail: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      placeholder="SubManager"
                      value={zeptoMailConfig.fromName}
                      onChange={(e) =>
                        setZeptoMailConfig({ ...zeptoMailConfig, fromName: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveZeptoMail}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={testEmailConfig}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure when and how notifications are sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Renewal Reminders</p>
                      <p className="text-sm text-gray-500">
                        Send reminders before subscription renewals
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.renewalReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        renewalReminders: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">Approval Notifications</p>
                      <p className="text-sm text-gray-500">
                        Notify requesters when their requests are reviewed
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.approvalNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        approvalNotifications: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Vault Access Alerts</p>
                      <p className="text-sm text-gray-500">
                        Send alerts when credentials are accessed
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.vaultAccessAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        vaultAccessAlerts: checked,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Reminder Schedule (Days Before Renewal)</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => {
                        const current = notificationSettings.daysBefore;
                        const updated = current.includes(days)
                          ? current.filter((d) => d !== days)
                          : [...current, days].sort((a, b) => b - a);
                        setNotificationSettings({
                          ...notificationSettings,
                          daysBefore: updated,
                        });
                      }}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                        notificationSettings.daysBefore.includes(days)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {days} day{days > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveNotifications}>
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Categories</CardTitle>
              <CardDescription>
                Manage categories for organizing subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Category */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <p className="font-medium">Add New Category</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g., Security Tools"
                      value={newCategory.name}
                      onChange={(e) =>
                        setNewCategory({ ...newCategory, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      placeholder="Brief description"
                      value={newCategory.description}
                      onChange={(e) =>
                        setNewCategory({ ...newCategory, description: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewCategory({ ...newCategory, color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newCategory.color === color
                            ? 'border-gray-900 scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={handleAddCategory} disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Adding...' : 'Add Category'}
                </Button>
              </div>

              {/* Existing Categories */}
              <div className="space-y-2">
                <p className="font-medium">Existing Categories</p>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CardSkeleton />
                    <CardSkeleton />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(categories || []).map((category) => (
                      <div
                        key={category._id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-gray-500">
                              {category.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteCategory(category._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
