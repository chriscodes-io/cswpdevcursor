import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Lock, Globe, Palette, Save } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const Settings = () => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved) : {
      notifications: {
        email: true,
        push: true,
        taskAssignments: true,
        scheduleChanges: true,
        conflicts: true,
      },
      preferences: {
        language: 'en',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
      },
      profile: {
        name: 'John Doe',
        email: 'john.doe@company.com',
        role: 'Operations Manager',
      },
    };
  });

  const handleSave = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const updateNotification = (key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  // Memoize animation config
  const containerAnimation = useMemo(() => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22 }
  }), []);

  return (
    <motion.div
      {...containerAnimation}
      className="space-y-6"
      data-testid="settings-page"
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList data-testid="settings-tabs">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" data-testid="tab-preferences">
            <Globe className="w-4 h-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="p-6 shadow-sm" data-testid="profile-settings">
            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={settings.profile.name}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    profile: { ...prev.profile, name: e.target.value }
                  }))}
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    profile: { ...prev.profile, email: e.target.value }
                  }))}
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={settings.profile.role}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    profile: { ...prev.profile, role: e.target.value }
                  }))}
                  data-testid="input-role"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-6 shadow-sm" data-testid="notification-settings">
            <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => updateNotification('email', checked)}
                  data-testid="switch-email"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive push notifications</p>
                </div>
                <Switch
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) => updateNotification('push', checked)}
                  data-testid="switch-push"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Task Assignments</p>
                  <p className="text-xs text-muted-foreground">Notify when tasks are assigned</p>
                </div>
                <Switch
                  checked={settings.notifications.taskAssignments}
                  onCheckedChange={(checked) => updateNotification('taskAssignments', checked)}
                  data-testid="switch-task-assignments"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Schedule Changes</p>
                  <p className="text-xs text-muted-foreground">Notify on schedule modifications</p>
                </div>
                <Switch
                  checked={settings.notifications.scheduleChanges}
                  onCheckedChange={(checked) => updateNotification('scheduleChanges', checked)}
                  data-testid="switch-schedule-changes"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Conflict Alerts</p>
                  <p className="text-xs text-muted-foreground">Alert on scheduling conflicts</p>
                </div>
                <Switch
                  checked={settings.notifications.conflicts}
                  onCheckedChange={(checked) => updateNotification('conflicts', checked)}
                  data-testid="switch-conflicts"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card className="p-6 shadow-sm" data-testid="preference-settings">
            <h2 className="text-lg font-semibold mb-4">Application Preferences</h2>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={settings.preferences.language}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, language: value }
                  }))}
                >
                  <SelectTrigger id="language" className="bg-background" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.preferences.timezone}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, timezone: value }
                  }))}
                >
                  <SelectTrigger id="timezone" className="bg-background" data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={settings.preferences.dateFormat}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, dateFormat: value }
                  }))}
                >
                  <SelectTrigger id="dateFormat" className="bg-background" data-testid="select-date-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="p-6 shadow-sm" data-testid="security-settings">
            <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" data-testid="input-current-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" data-testid="input-new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" data-testid="input-confirm-password" />
              </div>
              <Button variant="outline" className="w-full" data-testid="change-password-button">
                Change Password
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} data-testid="save-settings-button">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </motion.div>
  );
};

export default Settings;
