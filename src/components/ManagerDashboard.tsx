import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Plus, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AddEmployeeDialog from '@/components/AddEmployeeDialog';
import AddTaskDialog from '@/components/AddTaskDialog';
import EmployeeDetailsDialog from '@/components/EmployeeDetailsDialog';

interface Employee {
  id: string;
  username: string;
  full_name: string;
  title: string;
  role: string;
  position: string;
  details: string;
  is_active: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'finished';
  start_date: string;
  deadline_date: string;
  assigned_to: string;
  completed_at: string | null;
  created_at: string;
}

const ManagerDashboard = () => {
  const { profile, signOut } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
    fetchTasks();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employee')
      .order('full_name');
    
    if (!error && data) {
      setEmployees(data);
    }
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  const getEmployeeProgress = (employeeId: string) => {
    const employeeTasks = tasks.filter(task => task.assigned_to === employeeId);
    const completedTasks = employeeTasks.filter(task => task.status === 'finished');
    const total = employeeTasks.length;
    const completed = completedTasks.length;
    
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  const getOnTimeCompletionRate = (employeeId: string) => {
    const employeeTasks = tasks.filter(task => 
      task.assigned_to === employeeId && task.status === 'finished' && task.completed_at
    );
    
    const onTimeTasks = employeeTasks.filter(task => {
      const completedDate = new Date(task.completed_at!);
      const deadlineDate = new Date(task.deadline_date);
      return completedDate <= deadlineDate;
    });
    
    return employeeTasks.length > 0 
      ? Math.round((onTimeTasks.length / employeeTasks.length) * 100)
      : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name}</p>
        </div>
        <Button onClick={signOut} variant="outline" className="gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={() => setShowAddEmployee(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
        <Button onClick={() => setShowAddTask(true)} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Assign Task
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(task => task.status === 'finished').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employees.map((employee) => {
              const progress = getEmployeeProgress(employee.id);
              const onTimeRate = getOnTimeCompletionRate(employee.id);
              
              return (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold">{employee.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{employee.title} • {employee.position}</p>
                      </div>
                      <Badge variant={employee.is_active ? "default" : "secondary"}>
                        {employee.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Task Progress</span>
                            <span>{progress.completed}/{progress.total} tasks</span>
                          </div>
                          <Progress value={progress.percentage} className="h-2" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {onTimeRate}% on-time completion
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedEmployee(employee)}
                    className="ml-4"
                  >
                    View Details
                  </Button>
                </div>
              );
            })}
            
            {employees.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No employees found. Add your first employee to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddEmployeeDialog 
        open={showAddEmployee} 
        onOpenChange={setShowAddEmployee}
        onSuccess={() => {
          fetchEmployees();
          setShowAddEmployee(false);
        }}
      />
      
      <AddTaskDialog 
        open={showAddTask} 
        onOpenChange={setShowAddTask}
        employees={employees}
        onSuccess={() => {
          fetchTasks();
          setShowAddTask(false);
        }}
      />
      
      {selectedEmployee && (
        <EmployeeDetailsDialog 
          employee={selectedEmployee}
          open={!!selectedEmployee}
          onOpenChange={(open) => !open && setSelectedEmployee(null)}
          tasks={tasks.filter(task => task.assigned_to === selectedEmployee.id)}
          onTaskUpdate={fetchTasks}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;