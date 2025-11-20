import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 bg-white" style={{
      backgroundImage: 'radial-gradient(circle, #5A7BEF15 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    }}>
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ECF0F3]/40 via-transparent to-[#D9E1FF]/30 pointer-events-none"></div>
      
      {/* Animated background elements - positioned to frame the card */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-[#5A7BEF]/8 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#1B3F7A]/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5A7BEF]/3 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      
      {/* Login Card */}
      <Card className="relative w-full max-w-md bg-white shadow-2xl rounded-2xl border-2 border-[#DBDBDB] animate-in fade-in slide-in-from-bottom-4 duration-700 ring-4 ring-[#5A7BEF]/10 ring-offset-4 ring-offset-white/50">
        <CardHeader className="space-y-3 pb-8 pt-10">
          <div className="flex flex-col items-center space-y-2">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-[#1A1A1A] via-[#1B3F7A] to-[#1A1A1A] bg-clip-text text-transparent text-center animate-in fade-in slide-in-from-top-4 duration-500">
              JTM Ledger
            </CardTitle>
            <CardDescription className="text-sm text-center text-[#9EA2AD] animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
              Enterprise Financial Management System
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2.5 animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
              <Label htmlFor="email" className="text-sm font-medium text-[#1A1A1A]">
                Email address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9EA2AD] transition-colors duration-300 group-focus-within:text-[#5A7BEF]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-11 h-12 border border-[#DBDBDB] focus:border-[#5A7BEF] focus:ring-2 focus:ring-[#5A7BEF]/20 transition-all duration-300 hover:border-[#5A7BEF]/50 text-[#1A1A1A] bg-white rounded-lg shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2.5 animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
              <Label htmlFor="password" className="text-sm font-medium text-[#1A1A1A]">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9EA2AD] transition-colors duration-300 group-focus-within:text-[#5A7BEF]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-11 pr-11 h-12 border border-[#DBDBDB] focus:border-[#5A7BEF] focus:ring-2 focus:ring-[#5A7BEF]/20 transition-all duration-300 hover:border-[#5A7BEF]/50 text-[#1A1A1A] bg-white rounded-lg shadow-sm hover:shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9EA2AD] hover:text-[#5A7BEF] transition-all duration-300 focus:outline-none hover:scale-110 active:scale-95"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3.5 text-center shadow-sm">
                  {error}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#1B3F7A] to-[#5A7BEF] hover:from-[#1B3F7A] hover:to-[#5A7BEF] text-white transition-all duration-300 rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                  </>
                )}
              </Button>
            </div>

            {/* Forgot Password Link */}
            <div className="text-center animate-in fade-in duration-500 delay-400">
              <button
                type="button"
                className="text-sm text-[#5A7BEF] hover:text-[#1B3F7A] transition-all duration-300 underline-offset-4 hover:underline font-medium"
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            </div>
          </form>
          
          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-[#DBDBDB]/50 space-y-1.5 animate-in fade-in duration-700 delay-500">
            <p className="text-xs text-center text-[#9EA2AD] leading-relaxed">
              Secure login powered by advanced encryption
            </p>
            <p className="text-xs text-center text-[#9EA2AD]">
              © 2025 JTM Logic Inc. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};