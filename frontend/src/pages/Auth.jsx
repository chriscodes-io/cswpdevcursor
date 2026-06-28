import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, Eye, EyeOff, Terminal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { authAPI } from '../lib/api';

const containerAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const demoAccessAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay: 0.3 }
};

const allowSignup = process.env.REACT_APP_ALLOW_SIGNUP === 'true';

const Auth = ({ onLogin, initialMode = 'login' }) => {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  const safeInitialMode =
    initialMode === 'signup' && !allowSignup ? 'login' : initialMode;
  const [mode, setMode] = useState(resetToken ? 'reset' : safeInitialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setDevResetUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevResetUrl('');
    setLoading(true);

    try {
      if (isForgot) {
        if (!formData.email) {
          setError('Email is required');
          return;
        }
        const response = await authAPI.forgotPassword(formData.email);
        setSuccess(response.message);
        if (response.dev_reset_url) {
          setDevResetUrl(response.dev_reset_url);
        }
        return;
      }

      if (isReset) {
        if (!resetToken) {
          setError('Reset link is invalid or missing. Request a new one.');
          return;
        }
        if (!formData.password || formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        const response = await authAPI.resetPassword(resetToken, formData.password);
        setSuccess(response.message);
        setMode('login');
        return;
      }

      if (!formData.email || !formData.password) {
        setError('Email and password are required');
        return;
      }

      if (isSignUp && !allowSignup) {
        setError('Registration is disabled. Contact your administrator for access.');
        return;
      }

      if (isSignUp && !formData.name) {
        setError('Name is required for sign up');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      let response;
      if (isSignUp) {
        response = await authAPI.register(formData.email, formData.name, formData.password);
      } else {
        response = await authAPI.login(formData.email, formData.password);
      }

      onLogin(response.user, response.access_token);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const title = isReset
    ? 'Set New Password'
    : isForgot
      ? 'Reset Password'
      : isSignUp
        ? 'Create Account'
        : 'Team sign in';

  const subtitle = isReset
    ? 'Choose a new password for your account'
    : isForgot
      ? 'Enter your email and we will send reset instructions'
      : isSignUp
        ? 'Sign up to start managing your projects'
        : 'Staff workspace — sign in to continue';

  const submitLabel = isReset
    ? 'Update Password'
    : isForgot
      ? 'Send Reset Link'
      : isSignUp
        ? 'Create Account'
        : 'Sign In';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        {...containerAnimation}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/assets/cs-logo.png" alt="CS" className="w-12 h-12 object-contain" />
            <div className="text-left">
              <h1 className="text-2xl font-bold leading-tight">Chris Smith</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Technical SEO &amp; Web Engineer</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Project management workspace — staff sign in
          </p>
        </div>

        <Card className="p-8 bg-card border-border">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded bg-destructive/10 border border-destructive/50 text-destructive text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded bg-primary/10 border border-primary/30 text-primary text-sm">
              {success}
              {devResetUrl && (
                <p className="mt-2">
                  <a href={devResetUrl} className="underline break-all">
                    Open reset link
                  </a>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {!isReset && (
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {!isForgot && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isReset ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>
            )}

            {isReset && (
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {!isForgot && !isReset && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? 'Processing...' : submitLabel}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {isForgot || isReset ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                Back to sign in
              </button>
            ) : allowSignup ? (
              <button
                type="button"
                onClick={() => switchMode(isSignUp ? 'login' : 'signup')}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Need access? Contact your administrator.
              </p>
            )}
          </div>
        </Card>

        {!isForgot && !isReset && allowSignup && (
          <motion.div
            {...demoAccessAnimation}
            className="mt-6 p-4 bg-muted/50 border border-border rounded-lg"
          >
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Local development</p>
                <p className="text-muted-foreground">
                  Sign up is enabled for local testing only.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
