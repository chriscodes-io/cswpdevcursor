import React, { useState, useEffect, useRef } from 'react';
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
  Menu,
} from 'lucide-react';
import { SiWordpress, SiShopify, SiWebflow, SiNextdotjs, SiWix, SiFramer, SiGithub } from 'react-icons/si';
import { FaLinkedin } from 'react-icons/fa6';
import { auditLeadAPI, contactAPI } from '../lib/api';

const scrollTo = (id) => (e) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const SectionLabel = ({ children }) => (
  <p className="font-mono-brand text-[11px] font-medium tracking-[0.1em] uppercase text-[#00FF7F] mb-5 flex items-center gap-2">
    <span className="w-5 h-px bg-[#00FF7F]" />
    {children}
  </p>
);

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

function StarRating() {
  const [litCount, setLitCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setLitCount(5);
      return;
    }

    if (litCount >= 5) return;

    const delay = litCount === 0 ? 250 : 200;
    const timer = window.setTimeout(() => setLitCount((count) => count + 1), delay);
    return () => window.clearTimeout(timer);
  }, [started, litCount]);

  return (
    <div ref={ref} className="flex items-center gap-0.5 mb-3.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => {
        const lit = i < litCount;
        return (
          <svg
            key={i}
            className={`w-3.5 h-3.5 transition-all duration-300 ease-out ${
              lit ? 'text-[#00FF7F] scale-100 opacity-100' : 'text-[#2a2a2a] scale-90 opacity-50'
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path d={STAR_PATH} />
          </svg>
        );
      })}
    </div>
  );
}

const sectionPad = 'px-4 py-16 sm:px-[6%] sm:py-20 lg:py-28 xl:py-[112px]';

const BtnPrimary = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-[22px] py-3 rounded-lg text-sm font-semibold bg-[#00FF7F] text-black hover:opacity-[0.84] hover:-translate-y-px transition-all border-none ${className}`}
    {...props}
  >
    {children}
  </button>
);

const BtnGhost = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-[22px] py-3 rounded-lg text-sm font-semibold bg-transparent text-[#f0f0f0] border border-white/[0.06] hover:border-white/[0.18] hover:bg-white/[0.04] transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);

const OutcomeChip = ({ children, className = '' }) => (
  <span
    className={`text-[11px] px-2.5 py-1 rounded-full border border-[#1e1e1e] text-[#777] font-mono-brand tracking-wide ${className}`}
  >
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
    <span className="text-[#00FF7F] inline sm:inline-block min-w-0 sm:min-w-[11ch] text-left" aria-live="polite">
      <span className={`inline-block transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {words[index]}
      </span>
    </span>
  );
}

function CountUpStat({ value, prefix = '', suffix = '', className }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const duration = 1600;
    const start = performance.now();
    let rafId;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [started, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
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
  const [auditModalError, setAuditModalError] = useState('');
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (id) => (e) => {
    scrollTo(id)(e);
    setMobileMenuOpen(false);
  };

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
    setAuditModalError('');
    setAuditModalOpen(true);
    window.open(`https://wpaudit.pro/?url=${encodeURIComponent(auditUrl.trim())}`, '_blank', 'noopener,noreferrer');
  };

  const submitAuditModal = async () => {
    const email = auditModalEmail.trim();
    const url = auditUrl.trim();
    if (!email) {
      shakeField(document.getElementById('modal-audit-email'));
      return;
    }
    if (!url) {
      setAuditModalError('Website URL is required.');
      return;
    }
    setAuditModalSending(true);
    setAuditModalError('');
    try {
      await auditLeadAPI.submit({ url, email });
      setAuditModalSent(true);
      setTimeout(() => setAuditModalOpen(false), 3000);
    } catch (err) {
      setAuditModalError(err.message || 'Could not send your report. Please try again in a moment.');
    } finally {
      setAuditModalSending(false);
    }
  };

  const caseStudies = [
    {
      featured: true,
      client: 'B2B SaaS · ~80 employees',
      title: 'Indexation & Core Web Vitals recovery',
      primaryOutcome: 'Lighthouse 58 → 96',
      secondaryOutcome: '+240% organic traffic · 6 months',
      engagement: 'Technical audit + implementation',
    },
    {
      client: 'eCommerce · Australia',
      title: 'Headless WordPress rebuild',
      primaryOutcome: 'LCP −1.2s',
      secondaryOutcome: 'Crawl errors −78%',
      engagement: 'Build + ongoing SEO',
    },
    {
      client: 'Digital agency · 15 people',
      title: 'White-label SEO implementation',
      primaryOutcome: '40+ fixes shipped',
      secondaryOutcome: 'per quarter',
      engagement: 'Retained dev-SEO capacity',
    },
  ];

  const testimonials = [
    {
      photo: 'https://i.pravatar.cc/80?u=james-mitchell',
      quote:
        'We\'d been through two agencies that handed us PDFs and disappeared. Chris actually ships — indexing cleared in about three weeks and I could see it in Search Console, not another slide deck.',
      name: 'James Mitchell',
      role: 'Head of Digital',
      company: 'B2B SaaS',
      location: 'Sydney',
      date: 'Oct 2024',
      engagement: 'Technical SEO retainer',
    },
    {
      photo: 'https://i.pravatar.cc/80?u=sarah-reynolds',
      quote:
        'Didn\'t expect him to touch the code himself. Lighthouse went from 58 to 96 over six months and organic traffic is up roughly 240%. Still checks in when something looks off in GSC.',
      name: 'Sarah Reynolds',
      role: 'Marketing Director',
      company: 'eCommerce brand',
      location: 'Melbourne',
      date: 'Jan 2025',
      engagement: 'Audit + implementation',
    },
    {
      photo: 'https://i.pravatar.cc/80?u=david-kim',
      quote:
        'We white-label his implementation for clients who are done with audit-only consultants. Fast turnaround, and he doesn\'t charge extra every time someone asks a follow-up question.',
      name: 'David Kim',
      role: 'CTO',
      company: 'Digital agency',
      location: 'Remote',
      date: 'Aug 2024',
      engagement: 'White-label implementation',
    },
    {
      photo: 'https://i.pravatar.cc/80?u=elena-park',
      quote:
        'The audit read like it was written by someone who\'d actually deploy the fixes — file paths, implementation notes, priority order. Our engineers didn\'t have to decode consultant-speak into tickets.',
      name: 'Elena Park',
      role: 'Engineering Lead',
      company: 'Marketplace',
      location: 'Singapore',
      date: 'Nov 2024',
      engagement: 'Technical audit + CWV',
    },
  ];

  const trustPlatforms = [
    { name: 'WordPress', Icon: SiWordpress, color: '#21759B' },
    { name: 'Shopify', Icon: SiShopify, color: '#96BF48' },
    { name: 'Webflow', Icon: SiWebflow, color: '#146EF5' },
    { name: 'Next.js', Icon: SiNextdotjs, color: '#f0f0f0' },
    { name: 'Wix Studio', Icon: SiWix, color: '#0C6EFC' },
    { name: 'Framer', Icon: SiFramer, color: '#0055FF' },
  ];

  const services = [
    {
      icon: ClipboardList,
      title: 'Technical SEO audits I audit and implement',
      desc: 'Prioritised fixes with implementation notes — crawl, render, indexing, structured data, and Core Web Vitals. I do the audit and ship the code.',
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
    {
      icon: Shield,
      title: 'SEO implementation & verification',
      desc: 'I write the code, ship the changes, and confirm impact in Search Console. Your recommendations don\'t sit in a backlog.',
    },
  ];

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
    { num: '150+', value: 150, prefix: '', suffix: '+', label: 'Projects delivered' },
    { num: '94', value: 94, prefix: '', suffix: '', label: 'Avg Lighthouse score' },
    { num: '+312%', value: 312, prefix: '+', suffix: '%', label: 'Avg organic traffic lift' },
    { num: '5+yr', value: 5, prefix: '', suffix: '+yr', label: 'Technical SEO & web eng' },
  ];

  const [featuredCase, ...otherCases] = caseStudies;

  return (
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0] overflow-x-hidden" data-testid="landing-page">
      {/* Nav */}
      <nav
        className={`sticky top-0 z-[100] backdrop-blur-[14px] px-4 sm:px-[6%] h-[62px] flex items-center justify-between transition-colors duration-200 ${
          navScrolled ? 'bg-[#080808]/98 border-b border-[#2a2a2a]' : 'bg-[#080808]/92 border-b border-[#1e1e1e]'
        }`}
      >
        <a href="#top" onClick={handleNavClick('top')} className="flex items-center gap-2.5 no-underline min-w-0">
          <div className="w-[34px] h-[34px] bg-[#00FF7F] rounded-[7px] flex items-center justify-center font-mono-brand text-[13px] font-semibold text-black shrink-0">
            CS
          </div>
          <div className="leading-tight hidden sm:block min-w-0">
            <div className="text-sm font-medium text-[#f0f0f0] truncate">Chris Smith</div>
            <div className="text-[10px] text-[#888] font-mono-brand tracking-wide hidden sm:block">Technical SEO · Web Engineer</div>
          </div>
        </a>

        <div className="flex items-center gap-2 md:hidden shrink-0">
          <a
            href="#contact"
            onClick={handleNavClick('contact')}
            className="text-[12px] font-semibold bg-[#00FF7F] text-black px-3 py-2 rounded-lg no-underline hover:opacity-[0.82] transition-opacity whitespace-nowrap"
          >
            Work with me
          </a>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#f0f0f0] hover:bg-white/[0.06] transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <ul className="hidden md:flex items-center gap-[26px] list-none m-0 p-0">
          <li>
            <a
              href="#contact"
              onClick={handleNavClick('contact')}
              className="inline-flex items-center justify-center box-border h-[44px] px-[22px] rounded-lg text-sm font-semibold bg-[#00FF7F] text-black border border-white no-underline hover:opacity-[0.82] transition-opacity animate-cta-green-pop"
              data-testid="nav-free-audit"
            >
              Work with me
            </a>
          </li>
        </ul>
      </nav>

      {mobileMenuOpen && (
        <div
          id="mobile-nav"
          className="md:hidden fixed inset-x-0 top-[62px] bottom-0 z-[99] bg-[#080808]/98 backdrop-blur-xl border-b border-[#1e1e1e] overflow-y-auto"
        >
          <ul className="flex flex-col gap-1 p-4 list-none m-0">
            {[
              ['audit', 'Free audit'],
            ].map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={handleNavClick(id)}
                  className="flex items-center min-h-[48px] px-3 text-[15px] text-[#ccc] hover:text-[#f0f0f0] no-underline rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
            <li className="pt-3 px-3">
              <BtnPrimary onClick={handleNavClick('contact')} className="w-full">
                Work with me
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </BtnPrimary>
            </li>
          </ul>
        </div>
      )}

      {/* Hero */}
      <section id="top" className={`${sectionPad} pt-24 pb-16 sm:pt-[100px] sm:pb-[120px] lg:min-h-[calc(100vh-62px)]`}>
        <div className="max-w-[720px] w-full">
          <h1 className="text-[clamp(32px,8.5vw,68px)] font-semibold leading-[1.08] tracking-[-0.03em] mb-5 sm:mb-7">
            Technical SEO strategy &amp; implementation for <RotatingAudience words={HERO_AUDIENCES} />
          </h1>
          <p className="text-[15px] text-[#666] leading-[1.75] sm:leading-[1.8] max-w-[520px] mb-8 sm:mb-12">
            I help growth teams fix technical SEO faster by owning both the audit and the implementation. No handoffs
            between consultants and devs, no recommendations stuck in a backlog.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
            <BtnPrimary onClick={scrollTo('contact')} data-testid="hero-cta-contact" className="w-full sm:w-auto">
              Start a project
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </BtnPrimary>
            <BtnGhost
              onClick={scrollTo('audit')}
              data-testid="hero-cta-audit"
              className="w-full sm:w-auto !border-[#00FF7F]/50 hover:!border-[#00FF7F]/50 hover:!bg-[#00FF7F]/[0.06] hover:text-[#00FF7F]"
            >
              FREE Instant Audit
            </BtnGhost>
          </div>
          <div
            className="pt-8 border-t border-[#1e1e1e]"
            aria-label="Trust indicators"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6">
              {stats.map(({ num, label }) => (
                <div key={label}>
                  <div className="font-mono-brand text-[22px] sm:text-[26px] font-semibold text-[#00FF7F] leading-none tabular-nums">
                    {num}
                  </div>
                  <div className="text-[11px] text-[#666] mt-1.5 leading-snug">{label}</div>
                </div>
              ))}
            </div>
            <p className="font-mono-brand text-[10px] uppercase tracking-[0.08em] text-[#444] mb-2.5">
              Platforms &amp; stacks
            </p>
            <div className="flex flex-wrap gap-2.5">
              {trustPlatforms.map(({ name, Icon, color }) => (
                <span
                  key={name}
                  className="group inline-flex items-center gap-2 text-[11px] font-medium tracking-wide px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#888] hover:bg-white/[0.04] hover:border-white/[0.12] hover:text-[#bbb] transition-all duration-200"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.04] border border-white/[0.04] group-hover:border-white/[0.08] transition-colors">
                    <Icon className="w-3 h-3 shrink-0" style={{ color }} aria-hidden />
                  </span>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Client work */}
      <section id="work" className={`${sectionPad} bg-black border-t border-[#1e1e1e]`}>
        <SectionLabel>Selected work</SectionLabel>
        <h2 className="text-[clamp(26px,6vw,44px)] font-semibold leading-[1.1] sm:leading-[1.08] tracking-[-0.025em] mb-8 sm:mb-12">
          Results from shipped work, not slide decks.
        </h2>
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-6 sm:p-10 lg:p-12 hover:border-[#00FF7F]/22 transition-colors flex flex-col justify-between min-h-[260px] sm:min-h-[300px]">
            <div>
              <p className="font-mono-brand text-[clamp(32px,5vw,48px)] font-semibold text-[#00FF7F] leading-none tracking-tight mb-2">
                {featuredCase.primaryOutcome}
              </p>
              <p className="text-lg text-[#f0f0f0] font-medium mb-8">{featuredCase.secondaryOutcome}</p>
              <h3 className="text-xl font-semibold mb-3 leading-snug max-w-md">{featuredCase.title}</h3>
              <p className="font-mono-brand text-[10px] text-[#444] uppercase tracking-[0.06em]">
                {featuredCase.client}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-[#1a1a1a]">
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
          <div className="flex flex-col gap-4 sm:gap-6">
            {otherCases.map((c) => (
              <div
                key={c.title}
                className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5 sm:p-7 hover:border-[#00FF7F]/22 transition-colors flex-1 flex flex-col justify-between min-h-[140px]"
              >
                <div>
                  <p className="font-mono-brand text-[22px] font-semibold text-[#00FF7F] leading-none mb-1">
                    {c.primaryOutcome}
                  </p>
                  <p className="text-sm text-[#aaa] mb-4">{c.secondaryOutcome}</p>
                  <h3 className="text-[15px] font-semibold mb-2 leading-snug">{c.title}</h3>
                  <p className="font-mono-brand text-[10px] text-[#444] uppercase tracking-[0.06em]">{c.client}</p>
                </div>
                <p className="text-[11px] text-[#555] mt-4 pt-4 border-t border-[#1a1a1a]">{c.engagement}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className={`${sectionPad} border-y border-[#1e1e1e]`}>
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-[60px] items-start lg:items-end mb-10 sm:mb-14">
          <div>
            <SectionLabel>What I do</SectionLabel>
            <h2 className="text-[clamp(26px,6vw,44px)] font-semibold leading-[1.1] sm:leading-[1.08] tracking-[-0.025em]">
              Development-led
              <br />
              technical SEO.
            </h2>
          </div>
          <p className="text-[15px] text-[#888] leading-[1.7] lg:pt-2">
            I sit between strategy and code so audits actually ship — not tickets lost in handover.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1e1e1e] border border-[#1e1e1e] rounded-xl overflow-hidden">
          {services.map(({ icon: Icon, title, desc, note }) => (
            <div key={title} className="bg-[#0f0f0f] p-6 sm:p-8 hover:bg-[#141414] transition-colors flex flex-col">
              <div className="w-11 h-11 bg-[#00FF7F]/[0.08] rounded-[9px] flex items-center justify-center text-[#00FF7F] mb-[18px]">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold mb-2 leading-snug">{title}</h3>
              <p className="text-sm text-[#888] leading-[1.65]">{desc}</p>
              {note ? (
                <p className="text-xs text-[#555] font-mono-brand uppercase tracking-wide mt-4 pt-4 border-t border-[#1a1a1a]">
                  {note}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section id="process" className={`${sectionPad} border-b border-[#1e1e1e]`}>
        <SectionLabel>Process</SectionLabel>
        <h2 className="text-[clamp(26px,6vw,44px)] font-semibold leading-[1.1] sm:leading-[1.08] tracking-[-0.025em] mb-8 sm:mb-14">
          From audit to shipped fixes in three steps.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
          {processSteps.map(({ step, title, desc }) => (
            <div key={step} className="border-l border-[#1e1e1e] pl-5 sm:pl-6 md:border-l-0 md:pl-0">
              <div className="font-mono-brand text-[28px] sm:text-[32px] font-semibold text-[#00FF7F]/40 leading-none mb-3 sm:mb-4">{step}</div>
              <h3 className="text-base font-semibold mb-2">{title}</h3>
              <p className="text-sm text-[#888] leading-[1.7]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="proof" className={`${sectionPad} bg-black`}>
        <SectionLabel>Client results</SectionLabel>
        <h2 className="text-[clamp(26px,6vw,44px)] font-semibold leading-[1.1] sm:leading-[1.08] tracking-[-0.025em] mb-8 sm:mb-12">
          What clients say after implementation.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {testimonials.map((t) => (
            <article
              key={t.name}
              className="rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] p-6 sm:p-7 flex flex-col hover:border-[#2a2a2a] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <StarRating />
                <time className="text-[11px] text-[#555] shrink-0 pt-0.5" dateTime={t.date}>
                  {t.date}
                </time>
              </div>
              <blockquote className="text-[14px] sm:text-[15px] text-[#b0b0b0] leading-[1.7] flex-1 mb-5">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <footer className="flex items-center gap-3 pt-4 border-t border-[#1a1a1a]">
                <img
                  src={t.photo}
                  alt={t.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full shrink-0 bg-[#1a1a1a] ring-1 ring-white/[0.06] object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#e8e8e8]">{t.name}</div>
                  <div className="text-xs text-[#777] leading-snug">
                    {t.role} · {t.company} · {t.location}
                  </div>
                  <div className="text-[11px] text-[#555] mt-1">{t.engagement}</div>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* Audit CTA — demoted */}
      <section
        id="audit"
        className={`${sectionPad} border-t border-[#1e1e1e]`}
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(0,255,127,.03) 0%, transparent 100%)',
        }}
      >
        <div className="max-w-[560px] mx-auto text-center w-full">
          <SectionLabel>Free tool</SectionLabel>
          <h2 className="text-[clamp(22px,5.5vw,32px)] font-semibold leading-[1.15] sm:leading-[1.1] tracking-[-0.02em] mb-3 px-1">
            Start with a free audit — then prioritise what matters.
          </h2>
          <p className="text-[14px] text-[#888] mb-6 sm:mb-8 leading-[1.7] px-1">
            Run a 60-second technical health check on any site. Use the report to scope fixes — I can help you prioritise
            and implement the highest-impact items, whatever your stack.
          </p>
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4 sm:p-6 text-left">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="audit-url"
                type="url"
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                placeholder="https://yoursite.com.au"
                className="flex-1 min-w-0 bg-[#060606] border border-[#1e1e1e] rounded-lg px-4 py-[13px] text-base sm:text-sm text-[#f0f0f0] font-mono-brand outline-none focus:border-[#00FF7F]/22 placeholder:text-[#444]"
              />
              <BtnPrimary onClick={startAudit} className="w-full sm:w-auto shrink-0 whitespace-nowrap animate-cta-green-pop" data-testid="audit-cta">
                <Search className="w-3.5 h-3.5" strokeWidth={2.5} />
                Run free audit
              </BtnPrimary>
            </div>
            <p className="text-xs text-[#444] mt-3 flex items-start sm:items-center gap-1.5 leading-relaxed">
              <Shield className="w-3 h-3" strokeWidth={1.5} />
              Opens in a new tab · PDF report via email · No login required
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={`${sectionPad} grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 items-center border-t border-[#1e1e1e]`}>
        <div className="order-2 lg:order-1">
          <SectionLabel>About</SectionLabel>
          <h2 className="text-[clamp(26px,6vw,44px)] font-semibold leading-[1.1] sm:leading-[1.08] tracking-[-0.025em] mb-5 sm:mb-6">Hi, I&apos;m Chris.</h2>
          <p className="text-[15px] text-[#888] leading-[1.8] mb-4">
            I&apos;m a technical SEO and web engineer in Australia, working with teams worldwide. For 5+ years
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
          <div className="mt-6 sm:mt-7">
            <BtnPrimary onClick={scrollTo('contact')} className="w-full sm:w-auto">Work with me →</BtnPrimary>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 order-1 lg:order-2">
          {stats.map(({ value, prefix, suffix, label }) => (
            <div
              key={label}
              className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5 sm:p-8 hover:border-[#00FF7F]/22 transition-colors text-center flex flex-col items-center justify-center min-h-[108px] sm:min-h-[120px]"
            >
              <CountUpStat
                value={value}
                prefix={prefix}
                suffix={suffix}
                className="font-mono-brand text-[clamp(28px,8vw,48px)] font-semibold text-[#00FF7F] mb-1.5 sm:mb-2 tabular-nums leading-none"
              />
              <div className="text-xs sm:text-sm text-[#888] leading-snug max-w-[120px] sm:max-w-[140px]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={`${sectionPad} bg-black border-t border-[#1e1e1e]`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-20 items-start lg:items-stretch max-w-6xl mx-auto w-full">
          <div className="flex flex-col">
            <SectionLabel>Get in touch</SectionLabel>
            <h2 className="text-[clamp(26px,6vw,44px)] font-semibold leading-[1.1] sm:leading-[1.08] tracking-[-0.025em] mb-4 sm:mb-5">
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
            <p className="text-[13px] text-[#555] leading-relaxed pt-6 lg:max-w-[320px]">
              Or run a free{' '}
              <button
                type="button"
                onClick={scrollTo('audit')}
                className="text-[#888] hover:text-[#00FF7F] bg-transparent border-none cursor-pointer p-0 underline underline-offset-2 decoration-[#333] hover:decoration-[#00FF7F]/40 transition-colors"
              >
                site health audit
              </button>{' '}
              — results in under 60 seconds.
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            data-testid="contact-form"
            className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-6 sm:p-8"
          >
            <SectionLabel>Project enquiry</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="contact-name" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#666] block mb-2">
                  Name *
                </label>
                <input
                  id="contact-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-base sm:text-sm outline-none focus:border-[#00FF7F]/22"
                  data-testid="contact-name-input"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#666] block mb-2">
                  Email *
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-base sm:text-sm outline-none focus:border-[#00FF7F]/22"
                  data-testid="contact-email-input"
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="contact-website" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#666] block mb-2">
                Website URL
              </label>
              <input
                id="contact-website"
                name="website"
                type="url"
                placeholder="https://yoursite.com"
                value={form.website}
                onChange={handleChange}
                className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-base sm:text-sm outline-none focus:border-[#00FF7F]/22 placeholder:text-[#444]"
                data-testid="contact-website-input"
              />
            </div>
            <div className="mb-5">
              <label htmlFor="contact-message" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-[#666] block mb-2">
                Message *
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder="Site URL, stack, and what you're trying to fix..."
                className="w-full min-h-[140px] bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-base sm:text-sm outline-none focus:border-[#00FF7F]/22 resize-y placeholder:text-[#444]"
                data-testid="contact-message-input"
              />
            </div>
            {status.state === 'error' && (
              <div className="flex items-start gap-2 text-red-400 text-sm border border-red-500/30 bg-red-500/5 px-4 py-3 mb-4 rounded-lg" data-testid="contact-error">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{status.error}</span>
              </div>
            )}
            {status.state === 'sent' && (
              <div className="flex items-start gap-2 text-[#00FF7F] text-sm border border-[#00FF7F]/30 bg-[#00FF7F]/5 px-4 py-3 mb-4 rounded-lg" data-testid="contact-success">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Thanks — your message is in. I&apos;ll be in touch within 1 business day.</span>
              </div>
            )}
            <BtnPrimary
              type="submit"
              disabled={status.state === 'sending'}
              className={`w-full py-3.5 ${status.state !== 'sending' ? 'animate-cta-green-pop' : ''}`}
              data-testid="contact-submit"
            >
              {status.state === 'sending' ? 'Sending…' : 'Send project enquiry →'}
            </BtnPrimary>
            <p className="text-[12px] text-[#555] text-center mt-4 leading-relaxed">
              I reply within one business day. Your details stay private — no mailing lists.
            </p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e1e] py-8 sm:py-[30px] px-4 sm:px-[6%] flex flex-col md:flex-row items-center md:items-center justify-between gap-6 md:gap-4 text-center md:text-left">
        <div className="w-full md:w-auto">
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
        <div className="flex flex-col gap-3 items-center md:items-end w-full md:w-auto">
          <div className="flex flex-wrap gap-x-4 gap-y-3 sm:gap-[22px] justify-center md:justify-end">
            {[
              ['#services', 'Services'],
              ['#about', 'About'],
            ].map(([href, label]) => (
              <a key={href} href={href} onClick={scrollTo(href.slice(1))} className="text-[13px] text-[#888] hover:text-[#00FF7F] no-underline transition-colors">
                {label}
              </a>
            ))}
            <a href="#audit" onClick={scrollTo('audit')} className="text-[13px] text-[#888] hover:text-[#00FF7F] no-underline transition-colors">
              Free SEO Audit
            </a>
            <a href="https://wpaudit.pro" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#888] hover:text-[#00FF7F] no-underline transition-colors">
              wpaudit.pro
            </a>
            <Link to="/auth" className="text-[13px] text-[#888] hover:text-[#00FF7F] no-underline transition-colors" data-testid="footer-login">
              Client login
            </Link>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-end">
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="group inline-flex items-center no-underline"
            >
              <FaLinkedin className="w-[18px] h-[18px] text-[#888] group-hover:text-[#00FF7F] transition-colors" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="group inline-flex items-center no-underline"
            >
              <SiGithub className="w-[18px] h-[18px] text-[#888] group-hover:text-[#00FF7F] transition-colors" />
            </a>
          </div>
        </div>
      </footer>

      {/* Audit modal */}
      {auditModalOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setAuditModalOpen(false)}
          role="presentation"
        >
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-6 sm:p-9 max-w-[460px] w-full relative max-h-[90vh] overflow-y-auto">
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
                {auditModalError && (
                  <div className="flex items-start gap-2 text-red-400 text-sm border border-red-500/30 bg-red-500/5 px-4 py-3 mb-4 rounded-lg" data-testid="audit-modal-error">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{auditModalError}</span>
                  </div>
                )}
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
