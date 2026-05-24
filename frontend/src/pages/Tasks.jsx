import React, { useState, useEffect, useCallback } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { tasksAPI, projectsAPI } from '../lib/api';
import { logError } from '../lib/logger';
import { track, MixpanelEvents } from '../lib/mixpanel';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    project_id: '',
    priority: 'medium',
    due_date: '',
    description: '',
    estimated_hours: ''
  });
  const [loading, setLoading] = useState(true);

  const columns = [
    { id: 'todo', title: 'To Do', color: 'border-blue-500' },
    { id: 'inprogress', title: 'In Progress', color: 'border-yellow-500' },
    { id: 'testing', title: 'Testing', color: 'border-purple-500' },
    { id: 'completed', title: 'Completed', color: 'border-green-500' }
  ];

  const loadData = useCallback(async () => {
    try {
      const [tasksData, projectsData] = await Promise.all([
        tasksAPI.getAll(),
        projectsAPI.getAll()
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      if (projectsData.length > 0 && !formData.project_id) {
        setFormData(prev => ({ ...prev, project_id: projectsData[0].id }));
      }
    } catch (error) {
      logError('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [formData.project_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        due_date: formData.due_date || null,
        status: 'todo'
      };
      const created = await tasksAPI.create(submitData);
      track(MixpanelEvents.TASK_CREATED, {
        task_id: created.id,
        project_id: created.project_id,
        priority: created.priority,
        status: created.status,
      });
      setIsModalOpen(false);
      setFormData({
        title: '',
        project_id: projects[0]?.id || '',
        priority: 'medium',
        due_date: '',
        description: '',
        estimated_hours: ''
      });
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find((t) => t.id === taskId);
    const previousStatus = task?.status;
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      if (task && previousStatus !== newStatus) {
        track(MixpanelEvents.TASK_STATUS_CHANGED, {
          task_id: taskId,
          project_id: task.project_id,
          previous_status: previousStatus,
          new_status: newStatus,
        });
      }
      loadData();
    } catch (error) {
      logError('Error updating task:', error);
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'No Project';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-500/20 text-red-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      low: 'bg-green-500/20 text-green-400'
    };
    return colors[priority] || 'bg-muted text-muted-foreground';
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage tasks across all your projects</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={`p-4 border-b-2 ${column.color} bg-muted/30`}>
              <h3 className="font-semibold">{column.title}</h3>
              <p className="text-sm text-muted-foreground">{getTasksByStatus(column.id).length} tasks</p>
            </div>
            <div className="p-3 space-y-3 min-h-[400px]">
              {getTasksByStatus(column.id).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="bg-background border border-border rounded-lg p-4 cursor-move hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{task.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{getProjectName(task.project_id)}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {getTasksByStatus(column.id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Task Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Project *</label>
              <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estimated Hours</label>
              <Input
                type="number"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm min-h-[80px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary">
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
