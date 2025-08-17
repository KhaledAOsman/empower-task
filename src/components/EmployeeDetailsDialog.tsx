import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  username: string;
  full_name: string;
  title: string;
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
  completed_at: string | null;
  created_at: string;
}

interface EmployeeDetailsDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onTaskUpdate: () => void;
}

const EmployeeDetailsDialog: React.FC<EmployeeDetailsDialogProps> = ({
  employee,
  open,
  onOpenChange,
  tasks,
  onTaskUpdate
}) => {
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'finished').length;
    const inProgress = tasks.filter(task => task.status === 'in_progress').length;
    const notStarted = tasks.filter(task => task.status === 'not_started').length;
    
    // Calculate on-time completion rate
    const completedTasks = tasks.filter(task => task.status === 'finished' && task.completed_at);
    const onTimeTasks = completedTasks.filter(task => {
      const completedDate = new Date(task.completed_at!);
      const deadlineDate = new Date(task.deadline_date);
      return completedDate <= deadlineDate;
    });
    
    const onTimeRate = completedTasks.length > 0 
      ? Math.round((onTimeTasks.length / completedTasks.length) * 100)
      : 0;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      inProgress,
      notStarted,
      onTimeRate,
      completionRate
    };
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId);
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus as 'not_started' | 'in_progress' | 'finished',
        ...(newStatus === 'finished' ? { completed_at: new Date().toISOString() } : { completed_at: null })
      })
      .eq('id', taskId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
      onTaskUpdate();
    }
    
    setUpdatingTaskId(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'finished':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const isOverdue = (deadlineDate: string, status: string) => {
    if (status === 'finished') return false;
    return new Date(deadlineDate) < new Date();
  };

  const stats = getTaskStats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Details - {employee.full_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Employee Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-lg">{employee.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Title</p>
                  <p className="text-lg">{employee.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Position</p>
                  <p className="text-lg">{employee.position}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {employee.details && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Details</p>
                    <p className="text-sm">{employee.details}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.completionRate}%</div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <Progress value={stats.completionRate} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.onTimeRate}%</div>
                  <p className="text-sm text-muted-foreground">On-Time Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tasks List */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Tasks ({tasks.length})</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasks.map((task) => {
                const overdue = isOverdue(task.deadline_date, task.status);
                
                return (
                  <Card key={task.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h4 className="font-medium">{task.title}</h4>
                            {overdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Start: {new Date(task.start_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Deadline: {new Date(task.deadline_date).toLocaleDateString()}</span>
                            </div>
                            {task.completed_at && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Select
                            value={task.status}
                            onValueChange={(value) => updateTaskStatus(task.id, value)}
                            disabled={updatingTaskId === task.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="finished">Finished</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {tasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks assigned to this employee yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDetailsDialog;