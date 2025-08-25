import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ValidationErrors {
  username?: string;
  password?: string;
  general?: string;
}

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    password: false
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  // Username validation regex (alphanumeric, underscores, hyphens, or email format)
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Validation functions
  const validateUsername = (username: string): string | undefined => {
    if (!username) {
      return 'Username or email is required';
    }
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    // Allow either username format or email format
    if (!usernameRegex.test(username) && !emailRegex.test(username)) {
      return 'Please enter a valid username or email';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return undefined;
  };

  // Real-time validation
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (touched.username) {
      const error = validateUsername(value);
      setErrors(prev => ({ ...prev, username: error, general: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      const error = validatePassword(value);
      setErrors(prev => ({ ...prev, password: error, general: undefined }));
    }
  };

  // Handle field blur (mark as touched)
  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur
    switch (field) {
      case 'username':
        setErrors(prev => ({ ...prev, username: validateUsername(username) }));
        break;
      case 'password':
        setErrors(prev => ({ ...prev, password: validatePassword(password) }));
        break;
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    
    return !usernameError && !passwordError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ username: true, password: true });
    
    // Validate all fields
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    
    setErrors({
      username: usernameError,
      password: passwordError
    });

    // If validation fails, don't submit
    if (usernameError || passwordError) {
      return;
    }

    setIsLoading(true);

    try {
      // Determine if input is email or username and call appropriate method
      const isEmail = emailRegex.test(username);
      
      if (isEmail) {
        // If it's an email, use the email login
        await login(username, password);
      } else {
        // If it's a username, we need to modify our auth service to handle username login
        // For now, we'll pass it as email parameter but the backend should handle both
        await login(username, password);
      }
      
      navigate('/');
    } catch (err: any) {
      // Handle different types of login errors
      if (err.message.includes('Invalid') || err.message.includes('not found') || err.message.includes('incorrect')) {
        setErrors({ 
          general: 'Invalid username/email or password. Please check your credentials and try again.' 
        });
      } else if (err.message.includes('blocked') || err.message.includes('suspended')) {
        setErrors({ 
          general: 'Your account has been suspended. Please contact support.' 
        });
      } else if (err.message.includes('verified')) {
        setErrors({ 
          general: 'Please verify your email address before logging in.' 
        });
      } else {
        setErrors({ 
          general: err.message || 'Login failed. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <p className="text-muted-foreground">Sign in to your Grid Spot account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* General Error Alert */}
            {errors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Username/Email Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username or Email</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  onBlur={() => handleBlur('username')}
                  className={`pr-10 ${errors.username ? 'border-red-500' : ''}`}
                  placeholder="Enter your username or email"
                  autoComplete="username"
                />
                {touched.username && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {errors.username ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                )}
              </div>
              {errors.username && touched.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`pr-20 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  {touched.password && (
                    <>
                      {errors.password ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
              {errors.password && touched.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
                <button
                type="button"
                disabled
                title="Feature coming soon!"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-gray-400 hover:cursor-not-allowed"
                >
                Forgot your password?
                </button>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700" 
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-red-600 hover:underline font-medium"
              >
                Create account
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
