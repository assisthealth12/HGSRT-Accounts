import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Let the global auth listener handle routing, but we can push to home here too
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-2xl border-white/20 bg-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-white/10 overflow-hidden relative">
      {/* Glossy top edge highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      
      <CardHeader className="space-y-2 pb-6 items-center">
        <div className="flex justify-center mb-2">
          <div className="p-1 bg-white/20 rounded-xl shadow-inner backdrop-blur-md">
            <img src="/logo.jpeg" alt="Hotel GSR Logo" className="h-16 w-auto object-contain rounded-lg" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center tracking-tight text-white drop-shadow-md">Hotel GSR</CardTitle>
        <CardDescription className="text-center text-gray-200">
          Sign in to manage rooms, restaurant, staff, and accounts
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-5">
          {error && (
            <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 text-red-100 backdrop-blur-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-200">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="employee@hotelgsr.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40 transition-all h-11"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-200">Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40 transition-all pr-10 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pb-8">
          <Button 
            className="w-full font-bold h-11 bg-white text-zinc-900 hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]" 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
