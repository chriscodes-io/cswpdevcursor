import React from 'react';
import { FolderKanban, Edit, Trash2, CreditCard, Loader2, Calendar, DollarSign, Plus } from 'lucide-react';
import { Button } from './ui/button';

const ProjectsTable = ({
  projects,
  clients,
  onEdit,
  onDelete,
  onRequestPayment,
  payingIds,
  onAddNew
}) => {
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-primary/20 text-primary',
      completed: 'bg-green-500/20 text-green-400',
      'on-hold': 'bg-yellow-500/20 text-yellow-400'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getTypeColor = (type) => {
    const colors = {
      seo: 'bg-blue-500/20 text-blue-400',
      webdev: 'bg-purple-500/20 text-purple-400',
      both: 'bg-primary/20 text-primary'
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderKanban className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No projects found</h3>
        <p className="text-muted-foreground mb-4">
          Create your first project to get started
        </p>
        <Button onClick={onAddNew} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {projects.map((project) => (
        <div
          key={project.id}
          className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all"
          data-testid={`project-card-${project.id}`}
        >
          {/* Header with Title and Actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{getClientName(project.client_id)}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(project)}
                data-testid={`edit-btn-${project.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(project.id)}
                className="text-destructive"
                data-testid={`delete-btn-${project.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
          )}

          {/* Type and Status Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getTypeColor(project.type)}`}>
              {project.type}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            {project.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">
                  {new Date(project.deadline).toLocaleDateString()}
                </span>
              </div>
            )}
            {project.budget && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">
                  ${project.budget.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Payment Button */}
          {project.budget > 0 && (
            <button
              type="button"
              onClick={() => onRequestPayment(project)}
              disabled={!!payingIds[project.id]}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00FF9D] text-black font-semibold hover:bg-[#00FF9D]/90 transition-colors text-xs uppercase tracking-wider disabled:opacity-50 rounded"
              data-testid={`request-payment-btn-${project.id}`}
            >
              {payingIds[project.id] ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening Stripe…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Request Payment (${project.budget.toLocaleString()})
                </>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProjectsTable;
