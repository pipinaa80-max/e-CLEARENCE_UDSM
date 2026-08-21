export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}
