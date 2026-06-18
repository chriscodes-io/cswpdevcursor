import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { projectsAPI, clientsAPI, paymentsAPI } from '../lib/api';
import { logError } from '../lib/logger';
import ProjectModal from '../components/ProjectModal';
import ProjectsTable from '../components/ProjectsTable';
import StripeCheckout from '../components/StripeCheckout';
import { track, MixpanelEvents } from '../lib/mixpanel';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState({}); // project_id -> bool
  const [paymentToast, setPaymentToast] = useState(null); // {status,session_id}

  const loadData = useCallback(async () => {
    try {
      const [projectsData, clientsData] = await Promise.all([
        projectsAPI.getAll(),
        clientsAPI.getAll()
      ]);
      setProjects(projectsData);
      setFilteredProjects(projectsData);
      setClients(clientsData);
    } catch (error) {
      logError('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle return from Stripe Checkout (?session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    // Strip from URL immediately
    window.history.replaceState(null, '', window.location.pathname);

    let attempts = 0;
    const maxAttempts = 6; // ~12s total
    const poll = async () => {
      attempts += 1;
      try {
        const s = await paymentsAPI.getStatus(sessionId);
        if (s.status === 'paid') {
          setPaymentToast({ status: 'paid', session_id: sessionId });
          track(MixpanelEvents.PAYMENT_COMPLETED, {
            session_id: sessionId,
            amount: s.amount_total != null ? s.amount_total / 100 : undefined,
            currency: s.currency,
            source: s.source || 'client_poll',
            $insert_id: `payment-paid-${sessionId}`,
          });
          return;
        }
        if (s.status === 'expired') {
          setPaymentToast({ status: 'expired', session_id: sessionId });
          return;
        }
        if (attempts >= maxAttempts) {
          setPaymentToast({ status: 'pending', session_id: sessionId });
          return;
        }
        setTimeout(poll, 2000);
      } catch (err) {
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setPaymentToast({ status: 'error', session_id: sessionId });
        }
      }
    };
    poll();
  }, []);

  const handleRequestPayment = async (project) => {
    if (!project.budget || project.budget <= 0) {
      alert('Set a positive budget on the project before requesting payment.');
      return;
    }
    setPaying((p) => ({ ...p, [project.id]: true }));
    try {
      const txn = await paymentsAPI.createCheckout(project.id, project.name);
      track(MixpanelEvents.PAYMENT_CHECKOUT_STARTED, {
        project_id: project.id,
        amount: project.budget,
        currency: 'usd',
        session_id: txn.session_id,
        $insert_id: `checkout-${txn.session_id}`,
      });
      // Redirect to Stripe hosted checkout
      window.location.href = txn.stripe_url;
    } catch (err) {
      alert(err.message || 'Failed to start payment.');
      setPaying((p) => ({ ...p, [project.id]: false }));
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredProjects(filtered);
  }, [searchQuery, projects]);

  const handleOpenModal = (project = null) => {
    setEditingProject(project || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectsAPI.delete(id);
        loadData();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading projects...</div>;
  }

  return (
    <div className="space-y-6" data-testid="projects-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your SEO and web development projects</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <ProjectsTable
        projects={filteredProjects}
        clients={clients}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        onRequestPayment={handleRequestPayment}
        payingIds={paying}
        onAddNew={handleOpenModal}
      />

      <ProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        project={editingProject}
        clients={clients}
        onSuccess={loadData}
      />

      <StripeCheckout
        paymentToast={paymentToast}
        onClear={() => setPaymentToast(null)}
      />
    </div>
  );
};

export default Projects;
