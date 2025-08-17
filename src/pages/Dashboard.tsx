import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ManagerDashboard from '@/components/ManagerDashboard';
import EmployeeDashboard from '@/components/EmployeeDashboard';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {profile.role === 'manager' ? (
        <ManagerDashboard />
      ) : (
        <EmployeeDashboard />
      )}
    </div>
  );
};

export default Dashboard;