import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Eye,
  EyeOff,
  Shield,
  Stethoscope,
  UserCheck,
  Syringe,
  Pill,
  FlaskConical,
  Receipt,
  User,
  ArrowLeft,
  Droplets,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';
import medicareLogo from '@/assets/medicare-logo.png';

interface PortalConfig {
  role: UserRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  description: string;
}

type AuthMode = 'login' | 'register';

const portals: PortalConfig[] = [
  { role: 'admin', label: 'Admin', icon: Shield, gradient: 'from-red-500 to-rose-600', description: 'System Administration' },
  { role: 'doctor', label: 'Doctor', icon: Stethoscope, gradient: 'from-blue-500 to-cyan-600', description: 'Medical Practice' },
  { role: 'receptionist', label: 'Reception', icon: UserCheck, gradient: 'from-green-500 to-emerald-600', description: 'Front Desk Operations' },
  { role: 'nurse', label: 'Nurse', icon: Syringe, gradient: 'from-pink-500 to-fuchsia-600', description: 'Patient Care' },
  { role: 'pharmacy', label: 'Pharmacy', icon: Pill, gradient: 'from-orange-500 to-amber-600', description: 'Medicine Dispensary' },
  { role: 'laboratory', label: 'Laboratory', icon: FlaskConical, gradient: 'from-purple-500 to-violet-600', description: 'Lab & Diagnostics' },
  { role: 'billing', label: 'Billing', icon: Receipt, gradient: 'from-teal-500 to-cyan-600', description: 'Financial Services' },
  { role: 'patient', label: 'Patient', icon: User, gradient: 'from-indigo-500 to-blue-600', description: 'Patient Portal' },
  { role: 'bloodbank', label: 'Blood Bank', icon: Droplets, gradient: 'from-rose-500 to-red-600', description: 'Blood Bank Management' },
];

export default function Login() {
  const [selectedPortal, setSelectedPortal] = useState<PortalConfig | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const resetAuthInputs = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setAuthMode('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortal) return;

    setIsLoading(true);

    if (authMode === 'register') {
      const normalizedEmail = email.trim().toLowerCase();

      if (!fullName.trim()) {
        toast({ title: 'Validation Error', description: 'Full name is required.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (password.length < 8) {
        toast({ title: 'Validation Error', description: 'Password must be at least 8 characters.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast({ title: 'Validation Error', description: 'Passwords do not match.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const result = await register({
        email: normalizedEmail,
        password,
        name: fullName.trim(),
        role: selectedPortal.role,
      });

      if (!result.success) {
        toast({ title: 'Registration Failed', description: result.error, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (result.requiresEmailVerification) {
        toast({
          title: 'Registration Successful',
          description: result.message || 'Please verify your email before logging in.',
        });
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
        setIsLoading(false);
        return;
      }

      if (result.user) {
        toast({ title: 'Registration Successful', description: 'Your account has been created.' });
        navigate(getDashboardPath(result.user.role), { replace: true });
      }

      setIsLoading(false);
      return;
    }

    const result = await login(email.trim().toLowerCase(), password, selectedPortal.role);

    if (!result.success) {
      toast({ title: 'Login Failed', description: result.error, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const from = location.state?.from?.pathname;
    const userRole = result.user?.role || selectedPortal.role;
    navigate(from || getDashboardPath(userRole), { replace: true });
    setIsLoading(false);
  };

  const handleBackToPortals = () => {
    setSelectedPortal(null);
    resetAuthInputs();
  };

  if (!selectedPortal) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50">
        <header className="p-6 md:p-8">
          <div className="flex items-center justify-center gap-3">
            <img src={medicareLogo} alt="Medicare HMS" className="h-16 md:h-20 object-contain" />
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Select Your Portal</h1>
            <p className="text-muted-foreground text-lg">Choose your role to access the system</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-4xl">
            {portals.map((portal) => {
              const IconComponent = portal.icon;
              return (
                <button
                  key={portal.role}
                  onClick={() => setSelectedPortal(portal)}
                  className="group relative flex flex-col items-center p-6 md:p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-border hover:bg-card hover:border-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <div className={`p-4 md:p-5 rounded-2xl bg-gradient-to-br ${portal.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                    <IconComponent className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{portal.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground text-center hidden md:block">{portal.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-10 p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border max-w-md text-center">
            <p className="text-muted-foreground text-sm">
              <span className="font-semibold text-foreground">Demo Mode:</span> Use password{' '}
              <code className="px-2 py-0.5 rounded bg-muted text-primary font-mono">password123</code>{' '}
              for all accounts
            </p>
          </div>
        </main>

        <footer className="p-4 text-center">
          <p className="text-muted-foreground text-sm">2026 Medicare HMS. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  const SelectedIcon = selectedPortal.icon;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50">
      <header className="p-6">
        <Button
          variant="ghost"
          onClick={handleBackToPortals}
          className="text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Portals
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${selectedPortal.gradient} shadow-lg`}>
                <SelectedIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{selectedPortal.label} Portal</CardTitle>
            <CardDescription>{selectedPortal.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={authMode === 'login' ? 'default' : 'outline'}
                onClick={() => setAuthMode('login')}
              >
                Sign In
              </Button>
              <Button
                type="button"
                variant={authMode === 'register' ? 'default' : 'outline'}
                onClick={() => setAuthMode('register')}
              >
                Register
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              )}

              <Button
                type="submit"
                className={`w-full h-11 bg-gradient-to-r ${selectedPortal.gradient} hover:opacity-90 transition-opacity`}
                disabled={isLoading}
              >
                {isLoading
                  ? authMode === 'login'
                    ? 'Signing in...'
                    : 'Registering...'
                  : authMode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Demo: Use <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">password123</code> for seeded accounts
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
