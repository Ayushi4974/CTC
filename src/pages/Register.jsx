import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus, Shield } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register, reset } from '../redux/slices/authSlice';
import { toast } from 'react-toastify';
import logo from '../assets/logo.png';


const extractSponsorId = (text) => {
  if (!text) return '';
  const cleanText = text.trim();
  try {
    if (cleanText.includes('?ref=') || cleanText.includes('&ref=')) {
      const urlParams = new URLSearchParams(cleanText.split('?')[1]);
      const ref = urlParams.get('ref');
      if (ref) return ref.toUpperCase();
    }
    if (cleanText.includes('?sponsor=') || cleanText.includes('&sponsor=')) {
      const urlParams = new URLSearchParams(cleanText.split('?')[1]);
      const sponsor = urlParams.get('sponsor');
      if (sponsor) return sponsor.toUpperCase();
    }
    if (cleanText.includes('?sponsorId=') || cleanText.includes('&sponsorId=')) {
      const urlParams = new URLSearchParams(cleanText.split('?')[1]);
      const sponsorId = urlParams.get('sponsorId');
      if (sponsorId) return sponsorId.toUpperCase();
    }
    if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
      const url = new URL(cleanText);
      const ref = url.searchParams.get('ref') || url.searchParams.get('sponsor') || url.searchParams.get('sponsorId');
      if (ref) return ref.toUpperCase();
    }
  } catch (error) {
    console.error('Failed parsing referral link:', error);
  }
  return cleanText.toUpperCase();
};

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    sponsorId: '',
    password: '',
    confirmPassword: ''
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref') || params.get('sponsor') || params.get('sponsorId');
    if (ref) {
      setFormData((prev) => ({ ...prev, sponsorId: ref.toUpperCase() }));
    }
  }, [location.search]);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'sponsorId') {
      value = extractSponsorId(value);
    }
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handlePaste = (e) => {
    if (e.target.name === 'sponsorId') {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const extractedId = extractSponsorId(pastedText);
      setFormData((prev) => ({ ...prev, sponsorId: extractedId }));
    }
  };

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }
    if (isSuccess || user) {
      navigate('/dashboard');
    }
    dispatch(reset());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
    } else {
      const userData = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        sponsorId: formData.sponsorId
      };
      dispatch(register(userData));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#A020F0]/15 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#FF00FF]/15 rounded-full blur-[150px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10 my-8"
      >
        <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-[#A020F0]/30 rounded-3xl p-8 shadow-[0_8px_32px_rgba(160,32,240,0.15)]">
          <div className="text-center mb-8 flex flex-col items-center">
            <img src={logo} alt="CTC Logo" className="h-16 w-auto object-contain mb-4 drop-shadow-[0_0_12px_rgba(160,32,240,0.4)]" />
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Create <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#A020F0] to-[#FF00FF]">Account</span>
            </h1>
            <p className="text-gray-400 text-sm">Join CTC and start your journey</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Sponsor ID / Referral ID (Required)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  name="sponsorId"
                  required
                  value={formData.sponsorId}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                  placeholder="Enter Sponsor ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start text-gray-400 text-sm cursor-pointer">
                <input type="checkbox" required className="form-checkbox h-4 w-4 mt-0.5 text-[#A020F0] rounded border-gray-600 bg-[#161B2A] focus:ring-[#A020F0] focus:ring-offset-[#0B0F1A]" />
                <span className="ml-2">
                  I agree to the <a href="#" className="text-[#A020F0] hover:text-[#FF00FF] transition-colors">Terms of Service</a> and <a href="#" className="text-[#A020F0] hover:text-[#FF00FF] transition-colors">Privacy Policy</a>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#A020F0] to-[#FF00FF] shadow-[0_0_20px_rgba(160,32,240,0.4)] hover:shadow-[0_0_30px_rgba(255,0,255,0.6)] hover:scale-[1.02] transition-all duration-300"
            >
              <UserPlus size={20} />
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#A020F0] font-semibold hover:text-[#FF00FF] transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
