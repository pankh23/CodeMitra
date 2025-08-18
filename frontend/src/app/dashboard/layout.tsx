import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - CodeMitra',
  description: 'Manage your coding rooms and collaborate with your team',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
