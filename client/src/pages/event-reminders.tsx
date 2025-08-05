import React from 'react';
import { useLocation } from 'wouter';
import EventReminders from '@/components/EventReminders';
import { useAuthStore } from '@/lib/auth';

export default function EventRemindersPage() {
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated or not admin/super_admin
  React.useEffect(() => {
    if (!user) {
      setLocation('/login');
      return;
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      setLocation('/dashboard');
      return;
    }
  }, [user, setLocation]);

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-8" data-testid="event-reminders-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Event Reminders</h1>
        <p className="text-muted-foreground">
          Manage automated and manual event reminders for your events
        </p>
      </div>
      
      <EventReminders userRole={user.role} />
    </div>
  );
}