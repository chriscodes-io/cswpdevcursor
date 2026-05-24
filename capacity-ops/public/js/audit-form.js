let pendingAuditUrl = '';

function shake(el) {
  el.style.borderColor = '#ff4d4d';
  el.animate(
    [
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(3px)' },
      { transform: 'none' },
    ],
    { duration: 300 }
  );
  setTimeout(() => {
    el.style.borderColor = '';
  }, 2000);
}

function startAudit() {
  const url = document.getElementById('auditUrl').value.trim();
  const email = document.getElementById('auditEmail').value.trim();
  if (!url) {
    shake(document.getElementById('auditUrl'));
    return;
  }
  if (!email) {
    shake(document.getElementById('auditEmail'));
    return;
  }
  pendingAuditUrl = url;
  document.getElementById('modalUrl').textContent = url;
  document.getElementById('modalEmail').value = email;
  document.getElementById('auditModal').classList.add('on');
  window.open(`https://wpaudit.pro/?url=${encodeURIComponent(url)}`, '_blank', 'noopener');
}

function closeModal() {
  document.getElementById('auditModal').classList.remove('on');
}

function showSuccessState(email, shareLink) {
  const inner = document.getElementById('modalInner');
  inner.replaceChildren();

  const wrap = document.createElement('div');
  wrap.className = 'success-state';

  const ico = document.createElement('div');
  ico.className = 'success-ico';
  ico.textContent = '✓';

  const h3 = document.createElement('h3');
  h3.textContent = 'Report sent!';

  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = email;
  p.append('Your WordPress Health Report has been sent to ', strong, '. Check your inbox in the next 60 seconds.');

  wrap.append(ico, h3, p);

  if (shareLink) {
    const linkP = document.createElement('p');
    linkP.style.marginTop = '12px';
    linkP.style.fontSize = '13px';
    linkP.style.color = 'var(--t2)';
    const a = document.createElement('a');
    a.href = shareLink;
    a.textContent = 'View online report';
    a.style.color = 'var(--accent)';
    a.rel = 'noopener';
    linkP.append(a);
    wrap.append(linkP);
  }

  inner.append(wrap);
}

async function submitModal() {
  const btn = document.getElementById('modalBtn');
  const email = document.getElementById('modalEmail').value.trim();
  const url = pendingAuditUrl || document.getElementById('modalUrl').textContent.trim();
  if (!email) {
    shake(document.getElementById('modalEmail'));
    return;
  }
  btn.textContent = 'Sending…';
  btn.style.opacity = '0.7';
  btn.disabled = true;

  try {
    const response = await fetch('/api/audit/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, email }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Submission failed');
    }
    showSuccessState(email, data.shareLink);
    setTimeout(closeModal, 4000);
  } catch (error) {
    console.error('Audit submit failed:', error);
    btn.textContent = 'Send me the PDF report →';
    btn.disabled = false;
    btn.style.opacity = '1';
    alert('Could not send your report. Please try again in a moment.');
  }
}
