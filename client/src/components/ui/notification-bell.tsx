import { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './button';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Separator } from './separator';
import { NotificationService, type Notification, getNotificationIcon, getNotificationColor, formatNotificationTime } from '../../lib/notification-service';
import { useToast } from '../../hooks/use-toast';
import { useLocation } from 'wouter';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: () => NotificationService.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => NotificationService.getNotifications(20),
    refetchInterval: 30000,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => NotificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => NotificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Success",
        description: "Notification deleted"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      });
    }
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    className="text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Unread notifications */}
                  {unreadNotifications.length > 0 && (
                    <>
                      {unreadNotifications.map((notification) => (
                        <NotificationItem
                          key={notification._id}
                          notification={notification}
                          onClick={() => handleNotificationClick(notification)}
                          onMarkAsRead={(e) => handleMarkAsRead(e, notification._id)}
                          onDelete={(e) => handleDelete(e, notification._id)}
                        />
                      ))}
                      {readNotifications.length > 0 && <Separator />}
                    </>
                  )}
                  
                  {/* Read notifications */}
                  {readNotifications.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkAsRead={(e) => handleMarkAsRead(e, notification._id)}
                      onDelete={(e) => handleDelete(e, notification._id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function NotificationItem({ notification, onClick, onMarkAsRead, onDelete }: NotificationItemProps) {
  const colorClasses = getNotificationColor(notification.priority);
  const icon = getNotificationIcon(notification.type);
  const timeAgo = formatNotificationTime(notification.createdAt);

  return (
    <div
      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors border-l-4 ${
        notification.isRead ? 'opacity-75' : ''
      } ${colorClasses}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icon}</span>
            <p className="text-sm font-medium truncate">
              {notification.title}
            </p>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {timeAgo}
            </span>
            
            <div className="flex items-center gap-1">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onMarkAsRead}
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                title="Delete notification"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {notification.actionLabel && (
            <div className="mt-2">
              <Button variant="outline" size="sm" className="h-6 text-xs">
                {notification.actionLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}