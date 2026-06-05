import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

describe('LandingPage audit modal', () => {
  let container;
  let root;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    global.fetch = jest.fn();
    window.open = jest.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  const openAuditModal = async () => {
    const urlInput = container.querySelector('#audit-url');
    const auditButton = container.querySelector('[data-testid="audit-cta"]');

    await act(async () => {
      Simulate.change(urlInput, { target: { value: 'https://example.com' } });
    });
    await act(async () => {
      Simulate.click(auditButton);
    });
  };

  const submitEmail = async (email) => {
    const emailInput = container.querySelector('#modal-audit-email');
    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Send me the PDF report')
    );

    await act(async () => {
      Simulate.change(emailInput, { target: { value: email } });
    });
    await act(async () => {
      Simulate.click(submitButton);
    });
  };

  it('submits URL and email before showing success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, shareLink: '/audit/share/abc123' }),
    });

    await openAuditModal();
    await submitEmail('lead@example.com');

    expect(global.fetch).toHaveBeenCalledWith('/api/audit/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', email: 'lead@example.com' }),
    });
    expect(container.textContent).toContain('Report on its way!');
    expect(container.textContent).toContain('lead@example.com');
  });

  it('keeps the modal in retry state when submission fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Submission failed' }),
    });

    await openAuditModal();
    await submitEmail('lead@example.com');

    expect(container.textContent).toContain('Submission failed');
    expect(container.textContent).toContain('Send me the PDF report');
    expect(container.textContent).not.toContain('Report on its way!');
  });
});
