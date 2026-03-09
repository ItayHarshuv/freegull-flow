import { Capacitor } from '@capacitor/core';
import { createBrowserRouter, createHashRouter, Outlet } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { DashboardPage } from './routes/DashboardPage';
import { LessonsPage } from './routes/LessonsPage';
import { LoginPage } from './routes/LoginPage';
import { UsersPage } from './routes/UsersPage';

const createRouter = Capacitor.isNativePlatform() ? createHashRouter : createBrowserRouter;

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const router = createRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'lessons', element: <LessonsPage /> },
      { path: 'users', element: <UsersPage /> },
    ],
  },
]);
