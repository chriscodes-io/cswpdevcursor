import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Zap,
  ClipboardList,
  Code2,
  Shield,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import { contactAPI } from '../lib/api';

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

const OutcomeChip = ({ children }) => (
  <span className="text-[11px] px-2.5 py-1 rounded-full border border-[#1e1e1e] text-[#888] font-mono-brand tracking-wide">
    {children}
  </span>
);

const HERO_AUDIENCES = ['Agencies', 'SaaS', 'ecommerce', 'SMB'];

function RotatingAudience({ words }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timeoutId;
    const interval = setInterval(() => {
      setVisible(false);
      timeoutId = setTimeout(() => {
        setIndex((current) => (current + 1) % words.length);
        setVisible(true);
      }, 280);
    }, 2800);
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [words.length]);

  return (
    <span className="text-[#00FF7F] inline-block min-w-[11ch] text-left" aria-live="polite">
      <span className={`inline-block transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {words[index]}
      </span>
    </span>
  );
}

const LandingPage = () => {
  const [form, setForm] = useState({ name: '', email: '', website: '', message: '' });
  const [status, setStatus] = useState({ state: 'idle', error: '' });
  const [auditUrl, setAuditUrl] = useState('');
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditModalEmail, setAuditModalEmail] = useState('');
  const [auditModalSent, setAuditModalSent] = useState(false);
  const [auditModalSending, setAuditModalSending] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    if (!auditUrl.trim()) {
      shakeField(urlEl);
      return;
    }
    setAuditModalEmail('');
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

  const caseStudies = [
    {
      featured: true,
      client: 'B2B SaaS · ~80 employees',
      title: 'Indexation & Core Web Vitals recovery',
      metrics: ['Lighthouse 58 → 96', '+240% organic · 6 months'],
      engagement: 'Technical audit + implementation',
    },
    {
      client: 'eCommerce · Australia',
      title: 'Headless WordPress rebuild',
      metrics: ['LCP −1.2s', 'Crawl errors −78%'],
      engagement: 'Build + ongoing SEO',
    },
    {
      client: 'Digital agency · 15 people',
      title: 'White-label SEO implementation',
      metrics: ['40+ fixes shipped / quarter'],
      engagement: 'Retained dev-SEO capacity',
    },
  ];

  const testimonials = [
    {
      initials: 'JM',
      quote:
        'Chris is the rare person who understands both the SEO strategy and how to actually implement it. No handoff friction — just results showing up in Search Console.',
      name: 'James Mitchell',
      role: 'Head of Digital',
      company: 'B2B SaaS · Sydney',
      engagement: 'Technical SEO retainer',
      outcomes: ['Indexation recovery', 'Dev-ready fix specs'],
    },
    {
      initials: 'SR',
      quote:
        'Lighthouse scores went from 58 to 96 across the board. Organic traffic up 240% in six months — and he did all the implementation himself.',
      name: 'Sarah Reynolds',
      role: 'Marketing Director',
      company: 'eCommerce · Australia',
      engagement: 'Audit + implementation',
      outcomes: ['Lighthouse 58 → 96', '+240% organic traffic'],
    },
    {
      initials: 'DK',
      quote:
        'Most SEO consultants hand you a 60-page PDF and disappear. Chris ships the fixes, shows you the impact, and doesn\'t charge extra every time you ask a question.',
      name: 'David Kim',
      role: 'CTO',
      company: 'Digital agency',
      engagement: 'White-label implementation',
      outcomes: ['No audit-only handoffs', 'Search Console verified'],
    },
  ];

  const gridServices = [
    {
      icon: ClipboardList,
      title: 'Technical SEO audits that devs can execute',
      desc: 'Prioritised fixes with implementation notes — crawl, render, indexing, structured data, and Core Web Vitals.',
    },
    {
      icon: Code2,
      title: 'Headless + modern CMS builds',
      desc: 'WordPress, Webflow, Shopify, Wix Studio, Framer, and AI-focused CMS setups with performance and SEO baked in.',
    },
    {
      icon: Zap,
      title: 'Core Web Vitals recovery',
      desc: 'LCP, INP, and CLS from field data through to verified fixes — not reports that sit in a backlog.',
    },
  ];

  const featuredService = {
    icon: Shield,
    title: 'SEO implementation & verification',
    desc: 'I write the code, ship the changes, and confirm impact in Search Console. Your recommendations don\'t sit in a backlog.',
    note: 'Typical engagements: 2–8 weeks',
  };

  const processSteps = [
    {
      step: '01',
      title: 'Diagnose',
      desc: 'Crawl, render, CWV, and indexing — ranked backlog with effort and impact, not a 200-line wishlist.',
    },
    {
      step: '02',
      title: 'Prioritise',
      desc: 'Align on revenue and visibility wins. Clear scope before any implementation starts.',
    },
    {
      step: '03',
      title: 'Ship & verify',
      desc: 'I implement (or pair with your team) and confirm movement in Search Console and analytics.',
    },
  ];

  const stats = [
    { num: '150+', label: 'Projects delivered' },
    { num: '94', label: 'Avg Lighthouse score' },
    { num: '+312%', label: 'Avg organic traffic lift' },
    { num: '8yr', label: 'Technical SEO & web eng' },
  ];

  const [featuredCase, ...otherCases] = caseStudies;
  const FeaturedServiceIcon = featuredService.icon;

  return (
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0]" data-testid="landing-page">
      {/* Nav */}
      <nav
        className={`sticky top-0 z-[100] backdrop-blur-[14px] px-[6%] h-[62px] flex items-center justify-between transition-colors duration-200 ${
          navScrolled ? 'bg-[#080808]/98 border-b border-[#2a2a2a]' : 'bg-[#080808]/92 border-b border-[#1e1e1e]'
        }`}
      >
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
            ['work', 'Work'],
            ['about', 'About'],
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
              href="#audit"
              onClick={scrollTo('audit')}
              className={`text-[13px] font-semibold bg-[#00FF7F] text-black px-4 py-[7px] rounded-lg no-underline hover:opacity-[0.82] transition-opacity ${
                navScrolled ? 'shadow-[0_0_20px_rgba(0,255,127,0.15)]' : ''
              }`}
              data-testid="nav-free-audit"
            >
              Free Audit →
            </a>
          </li>
        </ul>
      </nav>

      {/* Hero */}
      <section id="top" className="px-[6%] pt-[90px] pb-[90px] min-h-[calc(100vh-62px)]">
        <div>
          <h1 className="text-[clamp(42px,6vw,68px)] font-semibold leading-[1.06] tracking-[-0.03em] mb-[22px]">
            Technical SEO strategy &amp; implementation for <RotatingAudience words={HERO_AUDIENCES} />
            <span className="block mt-3 text-[clamp(17px,2.2vw,22px)] font-medium text-[#f0f0f0] leading-snug tracking-[-0.02em]">
              fixes shipped, not just documented.
            </span>
          </h1>
          <p className="text-[15px] text-[#888] leading-[1.75] max-w-[520px] mb-9">
            I help growth teams fix technical SEO faster by owning both the audit and the implementation. No handoffs
            between consultants and devs, no recommendations stuck in a backlog.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <BtnPrimary onClick={scrollTo('contact')} data-testid="hero-cta-contact">
              Start a project
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </BtnPrimary>
            <button
              type="button"
              onClick={scrollTo('audit')}
              data-testid="hero-cta-audit"
              className="inline-flex items-center justify-center gap-2 px-[22px] py-3 rounded-lg text-sm font-semibold border-2 border-[#00FF7F] bg-[#00FF7F]/15 text-[#f0f0f0] hover:bg-[#00FF7F]/25 hover:border-[#00FF7F] hover:-translate-y-px transition-all shadow-[0_0_32px_rgba(0,255,127,0.28)]"
            >
              FREE Instant Audit
            </button>
          </div>
          <button
            type="button"
            onClick={scrollTo('audit')}
            className="text-[13px] text-[#666] hover:text-[#00FF7F] bg-transparent border-none cursor-pointer p-0 transition-colors"
          >
            Or run a free WordPress audit →
          </button>
        </div>
      </section>

      {/* Client work */}
      <section id="work" className="px-[6%] py-[90px] bg-black border-t border-[#1e1e1e]">
        <SectionLabel>Selected work</SectionLabel>
        <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-10">
          Results from shipped work, not slide decks.
        </h2>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-8 hover:border-[#00FF7F]/22 transition-colors flex flex-col justify-between min-h-[220px]">
            <div>
              <p className="font-mono-brand text-[11px] text-[#888] uppercase tracking-wide mb-3">{featuredCase.client}</p>
              <h3 className="text-xl font-semibold mb-4 leading-snug">{featuredCase.title}</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {featuredCase.metrics.map((m) => (
                  <OutcomeChip key={m}>{m}</OutcomeChip>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <p className="text-xs text-[#555]">{featuredCase.engagement}</p>
              <button
                type="button"
                onClick={scrollTo('contact')}
                className="text-sm font-semibold text-[#00FF7F] bg-transparent border-none cursor-pointer flex items-center gap-1 hover:opacity-80 p-0"
              >
                Discuss a similar project
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {otherCases.map((c) => (
              <div
                key={c.title}
                className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-6 hover:border-[#00FF7F]/22 transition-colors flex-1 flex flex-col justify-between"
              >
                <div>
                  <p className="font-mono-brand text-[10px] text-[#888] uppercase tracking-wide mb-2">{c.client}</p>
                  <h3 className="text-[15px] font-semibold mb-3 leading-snug">{c.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.metrics.map((m) => (
                      <OutcomeChip key={m}>{m}</OutcomeChip>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#555]">{c.engagement}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="px-[6%] py-[90px] border-y border-[#1e1e1e]">
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
            I sit between strategy and code so audits actually ship — not tickets lost in handover.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-px bg-[#1e1e1e] border border-[#1e1e1e] rounded-t-xl overflow-hidden">
          {gridServices.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#0f0f0f] p-8 hover:bg-[#141414] transition-colors">
              <div className="w-11 h-11 bg-[#00FF7F]/[0.08] rounded-[9px] flex items-center justify-center text-[#00FF7F] mb-[18px]">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold mb-2 leading-snug">{title}</h3>
              <p className="text-sm text-[#888] leading-[1.65]">{desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#0f0f0f] border border-t-0 border-[#1e1e1e] rounded-b-xl p-8 hover:bg-[#141414] transition-colors flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-11 h-11 bg-[#00FF7F]/[0.08] rounded-[9px] flex items-center justify-center text-[#00FF7F] shrink-0">
            <FeaturedServiceIcon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold mb-2">{featuredService.title}</h3>
            <p className="text-sm text-[#888] leading-[1.65]">{featuredService.desc}</p>
          </div>
          <p className="text-xs text-[#555] font-mono-brand uppercase tracking-wide shrink-0">{featuredService.note}</p>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="px-[6%] py-[72px] border-b border-[#1e1e1e]">
        <SectionLabel>Process</SectionLabel>
        <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-12">
          From audit to shipped fixes in three steps.
        </h2>
        <div className="grid md:grid-cols-3 gap-10 md:gap-8">
          {processSteps.map(({ step, title, desc }) => (
            <div key={step} className="border-l border-[#1e1e1e] pl-6 md:border-l-0 md:pl-0">
              <div className="font-mono-brand text-[32px] font-semibold text-[#00FF7F]/40 leading-none mb-4">{step}</div>
              <h3 className="text-base font-semibold mb-2">{title}</h3>
              <p className="text-sm text-[#888] leading-[1.7]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="proof" className="px-[6%] py-[90px] bg-black">
        <SectionLabel>Client results</SectionLabel>
        <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-10">
          What clients say after implementation shipped.
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-[26px] hover:border-[#00FF7F]/22 transition-colors flex flex-col">
              <div className="text-[#00FF7F] text-sm tracking-[2px] mb-3.5">★★★★★</div>
              <p className="text-sm text-[#888] leading-[1.7] mb-4">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {t.outcomes.map((o) => (
                  <OutcomeChip key={o}>{o}</OutcomeChip>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-2.5 pt-4 border-t border-[#1e1e1e]">
                <div className="w-[38px] h-[38px] rounded-full bg-[#00FF7F]/[0.08] border border-[#00FF7F]/22 flex items-center justify-center text-xs font-semibold text-[#00FF7F]">
                  {t.initials}
                </div>
                <div>
                  <div className="text-[13px] font-medium">{t.name}</div>
                  <div className="text-xs text-[#888]">
                    {t.role} · {t.company}
                  </div>
                  <div className="text-[11px] text-[#555] mt-0.5">{t.engagement}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Audit CTA — demoted */}
      <section
        id="audit"
        className="px-[6%] py-[72px] border-t border-[#1e1e1e]"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(0,255,127,.03) 0%, transparent 100%)',
        }}
      >
        <div className="max-w-[560px] mx-auto text-center">
          <SectionLabel>Free tool · WordPress</SectionLabel>
          <h2 className="text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-3">
            Start with a free audit — then prioritise what matters.
          </h2>
          <p className="text-[14px] text-[#888] mb-8 leading-[1.7]">
            Run a 60-second WordPress health check. Use the report to scope fixes — I can help you prioritise and
            implement the highest-impact items.
          </p>
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-6 text-left">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="audit-url"
                type="url"
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                placeholder="https://yourwordpresssite.com.au"
                className="flex-1 bg-[#060606] border border-[#1e1e1e] rounded-lg px-4 py-[13px] text-sm text-[#f0f0f0] font-mono-brand outline-none focus:border-[#00FF7F]/22 placeholder:text-[#444]"
              />
              <BtnPrimary onClick={startAudit} className="shrink-0 whitespace-nowrap" data-testid="audit-cta">
                <Search className="w-3.5 h-3.5" strokeWidth={2.5} />
                Run free audit
              </BtnPrimary>
            </div>
            <p className="text-xs text-[#444] mt-3 flex items-center gap-1.5">
              <Shield className="w-3 h-3" strokeWidth={1.5} />
              Opens wpaudit.pro · PDF report via email · No login required
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-[6%] py-[90px] grid lg:grid-cols-[1.1fr_1fr] gap-20 items-center border-t border-[#1e1e1e]">
        <div>
          <SectionLabel>About</SectionLabel>
          <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-5">Hi, I&apos;m Chris.</h2>
          <p className="text-[15px] text-[#888] leading-[1.8] mb-4">
            I&apos;m a technical SEO and web engineer in Australia, working with teams worldwide. For eight years
            I&apos;ve run audits as a consultant and shipped the fixes as a developer.
          </p>
          <p className="text-[15px] text-[#888] leading-[1.8] mb-4">
            Diploma of IT (Front-End &amp; Back-End Web Development) &amp; Dual Diploma of Business (Marketing &amp;
            Advertising).
          </p>
          <p className="text-[15px] text-[#888] leading-[1.8]">
            Most engagements stop at documentation. I stay through implementation and verification so Search Console
            and analytics show the change — not just the ticket closed.
          </p>
          <div className="mt-7">
            <BtnPrimary onClick={scrollTo('contact')}>Work with me →</BtnPrimary>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map(({ num, label }) => (
            <div key={label} className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-[22px] hover:border-[#00FF7F]/22 transition-colors">
              <div className="font-mono-brand text-[26px] font-semibold text-[#00FF7F] mb-1 tabular-nums">{num}</div>
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
            <h2 className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] mb-4">
              Tell me what&apos;s broken.
            </h2>
            <p className="text-[15px] text-[#888] leading-[1.75] mb-6">
              Share your site, stack (WordPress, Webflow, Shopify, Wix Studio, Framer, AI-focused CMS, headless, custom), and whether you need audit-only, implementation, or
              both. I&apos;ll reply within one business day.
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
                placeholder="Site URL, stack, and what you're trying to fix..."
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
              {status.state === 'sending' ? 'Sending…' : 'Send project enquiry →'}
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
          <div className="text-[13px] text-[#444] flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              Designed &amp; Engineered by Chris Smith with{' '}
              <span
                className="text-[#00FF7F] animate-pulse inline-block"
                aria-hidden="true"
              >
                ♥
              </span>
            </span>
            <span className="text-[#333]" aria-hidden="true">
              |
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-[22px] justify-center">
          {[
            ['#services', 'Services'],
            ['#work', 'Work'],
            ['#about', 'About'],
            ['#contact', 'Contact'],
          ].map(([href, label]) => (
            <a key={href} href={href} onClick={scrollTo(href.slice(1))} className="text-[13px] text-[#888] hover:text-[#f0f0f0] no-underline">
              {label}
            </a>
          ))}
          <a href="#audit" onClick={scrollTo('audit')} className="text-[13px] text-[#888] hover:text-[#f0f0f0] no-underline">
            Free audit
          </a>
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
                  Analysing your site&apos;s performance, SEO health, security, and accessibility. Enter your email for
                  the full PDF report.
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
                <BtnPrimary onClick={submitAuditModal} disabled={auditModalSending} className="w-full py-3">
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
