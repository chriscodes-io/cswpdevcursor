import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { projectsAPI } from '../lib/api';
import { track, MixpanelEvents } from '../lib/mixpanel';

const ProjectModal = ({ isOpen, onClose, project, clients, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    type: 'seo',
    status: 'active',
    start_date: '',
    deadline: '',
    budget: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens or project changes
  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        name: project.name,
        client_id: project.client_id,
        type: project.type,
        status: project.status,
        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
        budget: project.budget || '',
        description: project.description || ''
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        client_id: clients[0]?.id || '',
        type: 'seo',
        status: 'active',
        start_date: '',
        deadline: '',
        budget: '',
        description: ''
      });
    }
    setError('');
  }, [isOpen, project, clients]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        deadline: formData.deadline || null
      };

      if (project) {
        await projectsAPI.update(project.id, submitData);
        track(MixpanelEvents.PROJECT_UPDATED, {
          project_id: project.id,
          type: submitData.type,
          status: submitData.status,
        });
      } else {
        const created = await projectsAPI.create(submitData);
        track(MixpanelEvents.PROJECT_CREATED, {
          project_id: created.id,
          client_id: created.client_id,
          type: created.type,
          status: created.status,
        });
      }

      onClose();
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">Project Name *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Website Redesign"
              required
            />
          </div>

          {/* Client */}
          <div>
            <label className="text-sm font-medium mb-2 block">Client *</label>
            <Select value={formData.client_id} onValueChange={(value) => handleSelectChange('client_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Type *</label>
            <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seo">SEO</SelectItem>
                <SelectItem value="webdev">Web Development</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status *</label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <Input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="text-sm font-medium mb-2 block">Deadline</label>
            <Input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleInputChange}
            />
          </div>

          {/* Budget */}
          <div>
            <label className="text-sm font-medium mb-2 block">Budget ($)</label>
            <Input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleInputChange}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Project details and notes"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;
