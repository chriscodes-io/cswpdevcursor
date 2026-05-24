import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  ClipboardList,
  Code2,
  Shield,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { contactAPI } from '../lib/api';
import { track, MixpanelEvents } from '../lib/mixpanel';

const scrollTo = (id) => (e) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const SectionLabel = ({ children }) => (
  <p className="font-mono-brand text-[11px] font-medium tracking-[0.1em] uppercase text-[#00FF7F] mb-3 flex items-center gap-2">
    <span className="w-5 h-px bg-[#00FF7F]" />
    {children}
  </p>
);

const BtnPrimary = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center gap-2 px-[22px] py-3 rounded-lg text-sm font-semibold bg-[#00FF7F] text-black hover:opacity-[0.84] hover:-translate-y-px transition-all border-none ${className}`}
    {...props}
  >
    {children}
  </button>
);

const BtnGhost = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center gap-2 px-[22px] py-3 rounded-lg text-sm font-semibold bg-transparent text-[#f0f0f0] border border-white/[0.06] hover:border-white/[0.18] hover:bg-white/[0.04] transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);

const LandingPage = () => {
  const [form, setForm] = useState({ name: '', email: '', website: '', message: '' });
  const [status, setStatus] = useState({ state: 'idle', error: '' });
  const [auditUrl, setAuditUrl] = useState('');
  const [auditEmail, setAuditEmail] = useState('');
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditModalEmail, setAuditModalEmail] = useState('');
  const [auditModalSent, setAuditModalSent] = useState(false);
  const [auditModalSending, setAuditModalSending] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setStatus({ state: 'error', error: 'Name, email and message are required.' });
      return;
    }
    setStatus({ state: 'sending', error: '' });
    try {
      await contactAPI.submit(form);
      track(MixpanelEvents.CONTACT_FORM_SUBMITTED, { has_website: Boolean(form.website?.trim()) });
      setStatus({ state: 'sent', error: '' });
      setForm({ name: '', email: '', website: '', message: '' });
    } catch (err) {
      setStatus({ state: 'error', error: err.message || 'Failed to send message.' });
    }
  };

  const shakeField = (el) => {
    if (!el) return;
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
  };

  const startAudit = () => {
    const urlEl = document.getElementById('audit-url');
    const emailEl = document.getElementById('audit-email');
    if (!auditUrl.trim()) {
      shakeField(urlEl);
      return;
    }
    if (!auditEmail.trim()) {
      shakeField(emailEl);
      return;
    }
    setAuditModalEmail(auditEmail);
    setAuditModalSent(false);
    setAuditModalOpen(true);
    window.open(`https://wpaudit.pro/?url=${encodeURIComponent(auditUrl.trim())}`, '_blank', 'noopener,noreferrer');
  };

  const submitAuditModal = () => {
    if (!auditModalEmail.trim()) {
      shakeField(document.getElementById('modal-audit-email'));
      return;
    }
    setAuditModalSending(true);
    setTimeout(() => {
      setAuditModalSending(false);
      setAuditModalSent(true);
      setTimeout(() => setAuditModalOpen(false), 3000);
    }, 1600);
  };

  const testimonials = [
    {
      initials: 'JM',
      quote:
        '"Chris is the rare person who understands both the SEO strategy and how to actually implement it. No handoff friction — just results showing up in Search Console."',
      name: 'James Mitchell',
      role: 'Head of Digital, SaaS Enterprise',
    },
    {
      initials: 'SR',
      quote:
        '"Lighthouse scores went from 58 to 96 across the board. Organic traffic up 240% in six months. Genuinely impressive — and he did all the implementation himself."',
      name: 'Sarah Reynolds',
      role: 'Marketing Director, eCommerce',
    },
    {
      initials: 'DK',
      quote:
        '"Most SEO consultants hand you a 60-page PDF and disappear. Chris ships the fixes, shows you the impact, and doesn\'t charge extra every time you ask a question."',
      name: 'David Kim',
      role: 'CTO, Digital Agency',
    },
  ];

  const services = [
    {
      icon: ClipboardList,
      title: 'Technical SEO Audits',
      desc: 'Crawl, render, indexing, structured data, Core Web Vitals — with prioritised fix lists, not a PDF you hand to a dev and hope for the best.',
    },
    {
      icon: Code2,
      title: 'Headless WordPress Builds',
      desc: 'Next.js + WordPress decoupled for speed, security, and editor flexibility. Built on WP Engine with Faust.js — performance by default.',
    },
    {
      icon: Zap,
      title: 'Performance Engineering',
      desc: "Real LCP/CLS/INP improvements driven by Lighthouse & field data. I don't just report the issues — I fix them and verify the impact.",
    },
    {
      icon: Shield,
      title: 'SEO Implementation',
      desc: "I write the code, ship the changes, and verify the impact in Search Console. Your recommendations don't sit in a backlog.",
    },
  ];

  const stats = [
    { num: '150+', label: 'Projects delivered', icon: Activity },
    { num: '94', label: 'Avg Lighthouse score', icon: Zap },
    { num: '+312%', label: 'Average traffic lift', icon: TrendingUp },
    { num: '8yr', label: 'Industry experience', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0]" data-testid="landing-page">
      {/* Nav */}
      <nav className="sticky top-0 z-[100] bg-[#080808]/92 backdrop-blur-[14px] border-b border-[#1e1e1e] px-[6%] h-[62px] flex items-center justify-between">
        <a href="#top" onClick={scrollTo('top')} className="flex items-center gap-2.5 no-underline">
          <div className="w-[34px] h-[34px] bg-[#00FF7F] rounded-[7px] flex items-center justify-center font-mono-brand text-[13px] font-semibold text-black shrink-0">
            CS
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="text-sm font-medium text-[#f0f0f0]">Chris Smith</div>
            <div className="text-[10px] text-[#888] font-mono-brand tracking-wide">Technical SEO · Web Engineer</div>
          </div>
        </a>
        <ul className="hidden md:flex items-center gap-[26px] list-none m-0 p-0">
          {[
            ['services', 'Services'],
            ['about', 'About'],
            ['audit', 'Free audit'],
            ['contact', 'Contact'],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} onClick={scrollTo(id)} className="text-[13px] text-[#888] hover:text-[#f0f0f0] no-underline transition-colors">
                {label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#contact"
              onClick={scrollTo('contact')}
              className="text-[13px] font-semibold bg-[#00FF7F] text-black px-4 py-[7px] rounded-lg no-underline hover:opacity-[0.82]"
              data-testid="nav-hire-me"
            >
              Start a project →
            </a>
          </li>
        </ul>
      </nav>

      {/* Hero */}
      <section id="top" className="px-[6%] pt-[90px] pb-[90px] grid lg:grid-cols-[1fr_380px] gap-16 items-center min-h-[calc(100vh-62px)]">
        <div>
          <p className="font-mono-brand text-[11px] tracking-[0.07em] uppercase text-[#00FF7F] mb-[22px] flex items-center gap-2">
            <span className="w-5 h-px bg-[#00FF7F]" />
            Technical SEO &amp; Web Engineering — Australia · Remote Worldwide
          </p>
          <h1 className="text-[clamp(38px,5.5vw,60px)] font-semibold leading-[1.08] tracking-[-0.025em] mb-[22px]">
            Bridging the gap between <span className="text-[#00FF7F]">SEO &amp; implementation.</span>
          </h1>
          <p className="text-base text-[#888] leading-[1.75] max-w-[500px] mb-9">
            I handle both technical SEO strategy and the development work, so nothing gets lost between consultants,
            developers, and project managers. Faster execution, cleaner communication, fewer bottlenecks.
          </p>
          <div className="flex flex-wrap gap-3">
            <BtnPrimary onClick={scrollTo('audit')} data-testid="hero-cta-audit">
              <Search className="w-3.5 h-3.5" strokeWidth={2.5} />
              Run free audit
            </BtnPrimary>
            <BtnGhost onClick={scrollTo('contact')} data-testid="hero-cta-contact">
              Start a project
            </BtnGhost>
          </div>
        </div>
        <div className="hidden lg:flex flex-col gap-2.5">
          {stats.map(({ num, label, icon: Icon }) => (
            <div
              key={label}
              className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-6 py-5 flex items-center justify-between hover:border-[#00FF7F]/22 hover:bg-[#141414] transition-colors"
            >
              <div>
                <div className="font-mono-brand text-[30px] font-semibold text-[#00FF7F] leading-none">{num}</div>
                <div className="text-[11px] text-[#888] uppercase tracking-[0.06em] mt-1">{label}</div>
              </div>
              <div className="w-[42px] h-[42px] bg-[#00FF7F]/[0.08] rounded-lg flex items-center justify-center text-[#00FF7F]">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="px-[6%] py-[90px] bg-black border-y border-[#1e1e1e]">
        <div className="grid lg:grid-cols-2 gap-[60px] items-end mb-12">
          <div>
            <SectionLabel>What I do</SectionLabel>
            <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em]">
              Development-led
              <br />
              technical SEO.
            </h2>
          </div>
          <p className="text-[15px] text-[#888] leading-[1.7] hidden lg:block">
            I sit between strategy and code so audits actually ship. No tickets lost in handover, no consultants blaming
            devs, no devs ignoring recommendations.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-px bg-[#1e1e1e] border border-[#1e1e1e] rounded-xl overflow-hidden">
          {services.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#0f0f0f] p-8 hover:bg-[#141414] transition-colors">
              <div className="w-11 h-11 bg-[#00FF7F]/[0.08] rounded-[9px] flex items-center justify-center text-[#00FF7F] mb-[18px]">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold mb-2">{title}</h3>
              <p className="text-sm text-[#888] leading-[1.65]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audit CTA */}
      <section
        id="audit"
        className="px-[6%] py-[90px] border-t border-[#1e1e1e]"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(0,255,127,.04) 0%, transparent 100%)',
        }}
      >
        <div className="max-w-[720px] mx-auto text-center">
          <SectionLabel>Free tool</SectionLabel>
          <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-3.5">
            WordPress Health
            <br />
            Dashboard
          </h2>
          <p className="text-[15px] text-[#888] mb-10 leading-[1.7]">
            Instant analysis of your WordPress site&apos;s performance, SEO health, security, and accessibility — results
            in under 60 seconds. Full PDF report delivered to your inbox.
          </p>
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-8 text-left">
            <div className="flex flex-wrap gap-2 mb-6">
              {['Performance', 'SEO Health', 'Security', 'Accessibility', 'Core Web Vitals'].map((pill) => (
                <span
                  key={pill}
                  className="text-xs px-[11px] py-1 rounded-full border border-[#1e1e1e] text-[#888] flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF7F]" />
                  {pill}
                </span>
              ))}
            </div>
            <input
              id="audit-url"
              type="url"
              value={auditUrl}
              onChange={(e) => setAuditUrl(e.target.value)}
              placeholder="https://yourwordpresssite.com.au"
              className="w-full bg-[#060606] border border-[#1e1e1e] rounded-lg px-4 py-[13px] text-sm text-[#f0f0f0] font-mono-brand outline-none focus:border-[#00FF7F]/22 mb-2.5 placeholder:text-[#444]"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="audit-email"
                type="email"
                value={auditEmail}
                onChange={(e) => setAuditEmail(e.target.value)}
                placeholder="your@email.com — we'll send the full PDF report"
                className="flex-1 bg-[#060606] border border-[#1e1e1e] rounded-lg px-4 py-[13px] text-sm text-[#f0f0f0] outline-none focus:border-[#00FF7F]/22 placeholder:text-[#444]"
              />
              <BtnPrimary onClick={startAudit} className="shrink-0 whitespace-nowrap" data-testid="audit-cta">
                <Search className="w-3.5 h-3.5" strokeWidth={2.5} />
                Run free audit
              </BtnPrimary>
            </div>
            <p className="text-xs text-[#444] mt-3.5 flex items-center gap-1.5">
              <Shield className="w-3 h-3" strokeWidth={1.5} />
              No login required. PDF report delivered to your inbox within 60 seconds. No spam.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="proof" className="px-[6%] py-[90px] bg-black border-t border-[#1e1e1e]">
        <SectionLabel>Client results</SectionLabel>
        <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-10">What clients say.</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-[26px] hover:border-[#00FF7F]/22 transition-colors">
              <div className="text-[#00FF7F] text-sm tracking-[2px] mb-3.5">★★★★★</div>
              <p className="text-sm text-[#888] leading-[1.7] mb-5 italic">{t.quote}</p>
              <div className="flex items-center gap-2.5">
                <div className="w-[38px] h-[38px] rounded-full bg-[#00FF7F]/[0.08] border border-[#00FF7F]/22 flex items-center justify-center text-xs font-semibold text-[#00FF7F]">
                  {t.initials}
                </div>
                <div>
                  <div className="text-[13px] font-medium">{t.name}</div>
                  <div className="text-xs text-[#888]">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-[6%] py-[90px] grid lg:grid-cols-[1.1fr_1fr] gap-20 items-center">
        <div>
          <SectionLabel>About</SectionLabel>
          <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-5">Hi, I&apos;m Chris.</h2>
          <p className="text-[15px] text-[#888] leading-[1.8] mb-4">
            I&apos;m a technical SEO &amp; web engineer based in Australia, working with clients worldwide. For the past
            eight years I&apos;ve sat on both sides of the table — running technical audits as a consultant and shipping
            the fixes as a developer.
          </p>
          <p className="text-[15px] text-[#888] leading-[1.8] mb-4">
            Diploma in IT (Web Front-End &amp; Back-End Web Development) and Dual Diploma in Business (Marketing &amp;
            Advertising).
          </p>
          <p className="text-[15px] text-[#888] leading-[1.8]">
            Most agencies hand you a 60-page audit and walk away. Most developers see SEO as someone else&apos;s problem. I
            do both, end to end, so your site actually gets faster, cleaner and more visible — not just documented.
          </p>
          <div className="mt-7">
            <BtnPrimary onClick={scrollTo('contact')}>Work with me →</BtnPrimary>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map(({ num, label }) => (
            <div key={label} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-[22px] hover:border-[#00FF7F]/22 transition-colors">
              <div className="font-mono-brand text-[26px] font-semibold text-[#00FF7F] mb-1">{num}</div>
              <div className="text-xs text-[#888]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-[6%] py-[90px] bg-black border-t border-[#1e1e1e]">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-start max-w-6xl mx-auto">
          <div>
            <SectionLabel>Get in touch</SectionLabel>
            <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-4">Start a project.</h2>
            <p className="text-[15px] text-[#888] leading-[1.75] mb-6">
              Tell me a bit about your site and what you&apos;re trying to fix. I&apos;ll review it and come back to you
              within one business day.
            </p>
            <div className="flex items-center gap-2.5 text-sm text-[#888] mb-2.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span>
                <strong className="text-[#f0f0f0]">Location</strong> — Australia · Remote Worldwide
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-[#888]">
              <Shield className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span>
                <strong className="text-[#f0f0f0]">Response</strong> — Within 1 business day
              </span>
            </div>
          </div>
          <form onSubmit={handleSubmit} data-testid="contact-form">
            <div className="grid sm:grid-cols-2 gap-3 mb-3.5">
              <div>
                <label htmlFor="contact-name" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#888] block mb-1.5">
                  Name *
                </label>
                <input
                  id="contact-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#00FF7F]/22"
                  data-testid="contact-name-input"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#888] block mb-1.5">
                  Email *
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#00FF7F]/22"
                  data-testid="contact-email-input"
                />
              </div>
            </div>
            <div className="mb-3.5">
              <label htmlFor="contact-website" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#888] block mb-1.5">
                Website URL
              </label>
              <input
                id="contact-website"
                name="website"
                type="url"
                placeholder="https://yoursite.com"
                value={form.website}
                onChange={handleChange}
                className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#00FF7F]/22 placeholder:text-[#444]"
                data-testid="contact-website-input"
              />
            </div>
            <div className="mb-3.5">
              <label htmlFor="contact-message" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#888] block mb-1.5">
                Message *
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder="Tell me about your site and what you're trying to achieve..."
                className="w-full min-h-[120px] bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#00FF7F]/22 resize-y placeholder:text-[#444]"
                data-testid="contact-message-input"
              />
            </div>
            {status.state === 'error' && (
              <div className="flex items-start gap-2 text-red-400 text-sm border border-red-500/30 bg-red-500/5 px-4 py-3 mb-3" data-testid="contact-error">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{status.error}</span>
              </div>
            )}
            {status.state === 'sent' && (
              <div className="flex items-start gap-2 text-[#00FF7F] text-sm border border-[#00FF7F]/30 bg-[#00FF7F]/5 px-4 py-3 mb-3" data-testid="contact-success">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Thanks — your message is in. I&apos;ll be in touch within 1 business day.</span>
              </div>
            )}
            <BtnPrimary type="submit" disabled={status.state === 'sending'} className="w-full py-3.5" data-testid="contact-submit">
              {status.state === 'sending' ? 'Sending…' : 'Send message →'}
            </BtnPrimary>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e1e] py-[30px] px-[6%] flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-[26px] h-[26px] bg-[#00FF7F] rounded-[7px] flex items-center justify-center font-mono-brand text-[10px] font-semibold text-black">
              CS
            </div>
            <span className="text-[13px] font-medium">Chris Smith</span>
            <span className="text-xs text-[#444] hidden sm:inline">— Technical SEO &amp; Web Engineer</span>
          </div>
          <div className="text-[13px] text-[#444]">© {new Date().getFullYear()} Chris Smith. Built in Australia. Remote worldwide.</div>
        </div>
        <div className="flex flex-wrap gap-[22px] justify-center">
          {[
            ['#services', 'Services'],
            ['#audit', 'Free audit'],
            ['#about', 'About'],
            ['#contact', 'Contact'],
          ].map(([href, label]) => (
            <a key={href} href={href} onClick={scrollTo(href.slice(1))} className="text-[13px] text-[#888] hover:text-[#f0f0f0] no-underline">
              {label}
            </a>
          ))}
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#888] hover:text-[#f0f0f0] no-underline">
            LinkedIn
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#888] hover:text-[#f0f0f0] no-underline">
            GitHub
          </a>
          <a href="https://wpaudit.pro" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#888] hover:text-[#f0f0f0] no-underline">
            wpaudit.pro
          </a>
          <Link to="/auth" className="text-[13px] text-[#888] hover:text-[#f0f0f0] no-underline" data-testid="footer-login">
            Client login
          </Link>
        </div>
      </footer>

      {/* Audit modal */}
      {auditModalOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setAuditModalOpen(false)}
          role="presentation"
        >
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-9 max-w-[460px] w-full relative">
            <button
              type="button"
              onClick={() => setAuditModalOpen(false)}
              className="absolute top-3.5 right-3.5 bg-transparent border-none text-[#888] text-[22px] cursor-pointer hover:text-[#f0f0f0] leading-none"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {auditModalSent ? (
              <div className="text-center py-5">
                <div className="w-14 h-14 bg-[#00FF7F]/[0.08] rounded-full flex items-center justify-center text-[#00FF7F] mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Report on its way!</h3>
                <p className="text-sm text-[#888] leading-relaxed">
                  Your full WordPress Health Report has been sent to <strong className="text-[#f0f0f0]">{auditModalEmail}</strong>.
                  Check your inbox in the next 60 seconds.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-[22px] font-semibold mb-2">Audit running…</h3>
                <p className="text-sm text-[#888] mb-5 leading-relaxed">
                  Analysing your site&apos;s performance, SEO health, security, and accessibility. Your full PDF report
                  will be emailed shortly.
                </p>
                <div className="bg-[#080808] border border-[#00FF7F]/22 rounded-lg px-3.5 py-2.5 font-mono-brand text-xs text-[#00FF7F] mb-4 break-all">
                  {auditUrl}
                </div>
                <label htmlFor="modal-audit-email" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#888] block mb-1.5">
                  Your email address *
                </label>
                <input
                  id="modal-audit-email"
                  type="email"
                  value={auditModalEmail}
                  onChange={(e) => setAuditModalEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm mb-4 outline-none focus:border-[#00FF7F]/22"
                />
                <BtnPrimary
                  onClick={submitAuditModal}
                  disabled={auditModalSending}
                  className="w-full py-3"
                >
                  {auditModalSending ? 'Sending…' : 'Send me the PDF report →'}
                </BtnPrimary>
                <p className="text-xs text-[#444] mt-3 flex items-center justify-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  No spam. Your email is only used to send this report.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
