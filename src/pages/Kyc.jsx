import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, CreditCard, FileText, Building, UploadCloud, ChevronRight, ChevronLeft, CheckCircle2, ShieldCheck, Lock, X, Clock } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const steps = [
  { id: 1, name: 'Profile', icon: User },
  { id: 2, name: 'Aadhar', icon: CreditCard },
  { id: 3, name: 'PAN Card', icon: FileText },
  { id: 4, name: 'Bank Details', icon: Building },
];

const Kyc = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [kycStatus, setKycStatus] = useState(null); // 'none', 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [actualFiles, setActualFiles] = useState({});
  const [isUploading, setIsUploading] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    aadharNumber: '',
    panNumber: ''
  });

  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const res = await api.get('/kyc/status');
        if (res.data) {
          setKycStatus(res.data.status);
          if (res.data.status === 'approved') setCurrentStep(6);
          else if (res.data.status === 'pending') setCurrentStep(5);
        } else {
          setKycStatus('none');
        }
      } catch (err) {
        console.error('Error fetching KYC status:', err);
        setKycStatus('none');
      } finally {
        setLoading(false);
      }
    };
    fetchKycStatus();
  }, []);
  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const payload = new FormData();
      // Append text data
      Object.keys(formData).forEach(key => {
        payload.append(key, formData[key]);
      });
      
      // Append files
      Object.keys(actualFiles).forEach(key => {
        payload.append(key, actualFiles[key]);
      });

      const response = await api.post('/kyc/upload', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message || 'KYC submitted successfully!');
      setCurrentStep(5); // Show success state or redirect
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFileUpload = (e, key) => {
    const file = e.target.files[0];
    if (file) {
      setActualFiles(prev => ({ ...prev, [key]: file }));
      setIsUploading(prev => ({ ...prev, [key]: true }));
      
      // Generate a local preview URL from the real selected file
      const previewUrl = URL.createObjectURL(file);
      
      setTimeout(() => {
        setUploadedFiles(prev => ({
          ...prev,
          [key]: previewUrl
        }));
        setIsUploading(prev => ({ ...prev, [key]: false }));
      }, 600);
    }
  };

  const handleRemoveFile = (key) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[key];
      return newFiles;
    });
    setActualFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[key];
      return newFiles;
    });
  };

  const FileUploadBox = ({ label, id }) => {
    const isUploaded = !!uploadedFiles[id];
    const isLoading = isUploading[id];
    
    return (
      <div className="flex flex-col gap-2">
        {label && <label className="text-sm font-medium text-gray-400">{label}</label>}
        
        {isLoading ? (
          <div className="relative border border-gray-700 bg-[#161B2A] rounded-2xl h-40 flex flex-col items-center justify-center overflow-hidden">
            <div className="w-full h-full bg-gray-800 animate-pulse absolute inset-0"></div>
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[#A020F0] text-sm font-semibold animate-pulse">Encrypting & Uploading...</span>
            </div>
          </div>
        ) : isUploaded ? (
          <div className="relative border border-[#A020F0] bg-[#161B2A] rounded-2xl h-40 flex flex-col items-center justify-center overflow-hidden group">
            <img src={uploadedFiles[id]} alt={label} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center">
              <CheckCircle2 className="text-[#00FF99] mb-2" size={32} />
              <span className="text-white font-semibold">Uploaded</span>
            </div>
            <button 
              onClick={() => handleRemoveFile(id)}
              className="absolute top-3 right-3 bg-red-500/20 hover:bg-red-500 text-white rounded-full p-1.5 transition-colors z-20"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label 
            htmlFor={`file-upload-${id}`}
            className="relative border border-dashed border-gray-600 hover:border-[#A020F0] bg-[#161B2A]/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 group hover:shadow-[inset_0_0_20px_rgba(160,32,240,0.15)] h-40 w-full"
          >
            <input 
              id={`file-upload-${id}`}
              type="file" 
              accept="image/*"
              className="hidden" 
              onChange={(e) => handleFileUpload(e, id)} 
            />
            <UploadCloud className="text-gray-500 group-hover:text-[#A020F0] transition-colors" size={32} />
            <div className="text-center">
              <p className="text-sm font-semibold text-[#A020F0]">Click to upload</p>
              <p className="text-[10px] text-gray-500 mt-1">SVG, PNG, JPG (MAX. 5MB)</p>
            </div>
          </label>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A020F0]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 pt-4">
      {/* Header */}
      <div className="mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold text-white mb-3"
        >
          KYC <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#A020F0] to-[#FF00FF]">Verification</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 max-w-2xl"
        >
          Complete your identity verification to unlock full platform access and secure your account.
        </motion.p>
      </div>

      {/* Stepper */}
      <div className="mb-12 relative px-4 md:px-12">
        {/* Progress Lines */}
        <div className="absolute top-7 left-0 right-0 px-4 md:px-12 z-0 flex items-center justify-center">
           <div className="w-[calc(100%-3.5rem)] h-[2px] bg-gray-800 relative">
             <div 
               className="h-full bg-gradient-to-r from-[#A020F0] to-[#FF00FF] transition-all duration-700 ease-in-out"
               style={{ width: `${Math.min(((currentStep - 1) / 3) * 100, 100)}%` }}
             />
           </div>
        </div>

        <div className="flex justify-between items-start relative z-10">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center gap-3">
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative ${
                    isActive 
                      ? 'bg-[#161B2A] border-2 border-[#A020F0] text-[#FF00FF] shadow-[0_0_20px_rgba(160,32,240,0.4)] scale-110' 
                      : isCompleted
                        ? 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white'
                        : 'bg-[#161B2A] border border-gray-700 text-gray-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={isActive ? 28 : 24} />}
                </div>
                <span className={`text-sm font-semibold transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-600'}`}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content (Glassmorphism Container) */}
      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4 }}
        className="relative bg-[#0B0F1A]/60 backdrop-blur-xl border border-[#A020F0]/30 rounded-3xl p-6 md:p-10 shadow-[0_8px_32px_rgba(160,32,240,0.1)] overflow-hidden"
      >
        {/* Subtle background glow */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-[#A020F0]/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="min-h-[400px] relative z-10">
          {/* Step 1: Profile */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center h-full py-8">
              
              {/* Left Column: Instructions */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-xs font-semibold text-yellow-500 mb-6">
                  <ShieldCheck size={14} />
                  KYC Mandatory Requirement
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-4">Profile Verification</h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Your profile photo is used to securely verify your identity. This is required to process withdrawals and ensure platform integrity.
                </p>
                
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h4 className="text-emerald-400 font-semibold text-sm">SSL Secured</h4>
                    <p className="text-xs text-emerald-500/70">Encrypted 256-bit Connection</p>
                  </div>
                </div>
              </div>
              
              {/* Right Column: Upload Area */}
              <div className="flex flex-col items-center justify-center">
                {isUploading['profile'] ? (
                  <div className="relative w-56 h-56 rounded-full border-4 border-gray-700 bg-[#161B2A] overflow-hidden flex flex-col items-center justify-center">
                    <div className="w-full h-full bg-gray-800 animate-pulse absolute inset-0"></div>
                    <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin relative z-10 mb-2"></div>
                    <span className="text-[#A020F0] text-xs font-semibold animate-pulse relative z-10">Encrypting...</span>
                  </div>
                ) : uploadedFiles['profile'] ? (
                  <div className="relative w-56 h-56 rounded-full border-4 border-[#A020F0] overflow-hidden shadow-[0_0_30px_rgba(160,32,240,0.4)] group">
                    <img src={uploadedFiles['profile']} alt="Profile Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => handleRemoveFile('profile')}
                        className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    htmlFor="profile-upload"
                    className="relative group cursor-pointer"
                  >
                    <input 
                      id="profile-upload"
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, 'profile')} 
                    />
                    <div className="absolute inset-0 bg-[#A020F0] rounded-full blur-[40px] opacity-20 group-hover:opacity-40 animate-pulse transition-opacity"></div>
                    <div className="relative w-56 h-56 rounded-full border-2 border-dashed border-[#A020F0] bg-[#161B2A]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 group-hover:border-[#FF00FF] shadow-[inset_0_0_30px_rgba(160,32,240,0.15)] group-hover:shadow-[inset_0_0_50px_rgba(255,0,255,0.2)] transition-all duration-300">
                      <UploadCloud className="text-gray-400 group-hover:text-[#FF00FF] transition-colors" size={40} />
                      <div className="text-center">
                        <span className="block text-sm font-semibold text-gray-200 group-hover:text-white">Select Photo</span>
                        <span className="block text-[10px] text-gray-500 mt-1">Click to browse</span>
                      </div>
                    </div>
                  </label>
                )}
              </div>

            </div>
          )}

          {/* Step 2: Aadhar */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-white">Aadhar Verification</h2>
                <div className="px-2 py-1 bg-emerald-500/10 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1"><Lock size={12}/> Secured</div>
              </div>
              <p className="text-gray-400 mb-8 text-sm">Enter your government ID details securely.</p>
              
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-400 mb-2">Aadhar Number</label>
                <input 
                  type="text" 
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleInputChange}
                  placeholder="1234 5678 9012"
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUploadBox label="Front Side" id="aadharFront" />
                <FileUploadBox label="Back Side" id="aadharBack" />
              </div>
            </div>
          )}

          {/* Step 3: PAN Card */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-white">PAN Verification</h2>
                <div className="px-2 py-1 bg-emerald-500/10 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1"><Lock size={12}/> Secured</div>
              </div>
              <p className="text-gray-400 mb-8 text-sm">Tax identification details.</p>
              
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-400 mb-2">PAN Number</label>
                <input 
                  type="text" 
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleInputChange}
                  placeholder="ABCDE1234F"
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all uppercase"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUploadBox label="PAN Card Photo" id="panFront" />
                <FileUploadBox label="Signed Agreement" id="panAgreement" />
              </div>
            </div>
          )}

          {/* Step 4: Bank Details */}
          {currentStep === 4 && (
            <div>
               <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-white">Bank Account Details</h2>
                <div className="px-2 py-1 bg-emerald-500/10 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1"><Lock size={12}/> Secured</div>
              </div>
              <p className="text-gray-400 mb-8 text-sm">Provide bank details for your future withdrawals.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Account Holder Name</label>
                  <input 
                    type="text" 
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Name as per Bank"
                    className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Bank Name</label>
                  <input 
                    type="text" 
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="e.g. State Bank of India"
                    className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Account Number</label>
                  <input 
                    type="text" 
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Enter Account Number"
                    className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">IFSC Code</label>
                  <input 
                    type="text" 
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="SBIN0001234"
                    className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all uppercase"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Branch Name</label>
                <input 
                  type="text" 
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleInputChange}
                  placeholder="Enter Branch Name"
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.2)] transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-10 pt-6 border-t border-gray-800/50 flex items-center justify-between relative z-10">
          <div>
            {currentStep > 1 && (
              <button 
                onClick={prevStep}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium py-2 px-4 rounded-lg hover:bg-white/5"
              >
                <ChevronLeft size={18} /> Back
              </button>
            )}
          </div>
          
          <button 
            onClick={currentStep === 4 ? handleSubmit : nextStep}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all duration-300 ${
              currentStep === 4 
                ? 'bg-gradient-to-r from-[#00FF99] to-[#00C6FF] shadow-[0_0_20px_rgba(0,255,153,0.4)] hover:scale-[1.02]' 
                : 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] shadow-[0_0_20px_rgba(160,32,240,0.4)] hover:shadow-[0_0_30px_rgba(255,0,255,0.6)] hover:scale-[1.02]'
            }`}
          >
            {isSubmitting ? 'Submitting...' : currentStep === 4 ? 'Submit Verification' : 'Next Step'} 
            {currentStep < 4 && <ChevronRight size={18} />}
            {currentStep === 4 && !isSubmitting && <CheckCircle2 size={18} />}
          </button>
        </div>

        {/* Step 5: Pending State */}
        {currentStep === 5 && (
          <div className="absolute inset-0 bg-[#0B0F1A] flex flex-col items-center justify-center p-8 z-50 text-center">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(234,179,8,0.2)]"
            >
              <Clock size={48} className="text-yellow-500" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-4">Verification Pending</h2>
            <p className="text-gray-400 mb-8 max-w-md">
              Your KYC details are currently under review by our team. This usually takes 24-48 hours. We will notify you once verified.
            </p>
            <button 
              onClick={() => setKycStatus('none') || setCurrentStep(1)}
              className="text-gray-500 hover:text-white text-sm underline transition-colors"
            >
              Need to update details? Click here to re-upload (will reset status)
            </button>
          </div>
        )}

        {/* Step 6: Verified State */}
        {currentStep === 6 && (
          <div className="absolute inset-0 bg-[#0B0F1A] flex flex-col items-center justify-center p-8 z-50 text-center">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]"></div>
            </div>

            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-gradient-to-tr from-[#00FF99] to-[#00C6FF] rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,255,153,0.4)] relative z-10"
            >
              <ShieldCheck size={48} className="text-white" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white mb-2 relative z-10">Account Verified</h2>
            <p className="text-[#00FF99] font-bold mb-6 relative z-10 tracking-widest uppercase text-xs">Level 1 Verified</p>
            
            <p className="text-gray-400 mb-10 max-w-md relative z-10 leading-relaxed">
              Congratulations! Your identity has been successfully verified. You now have full access to all platform features, including withdrawals.
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm relative z-10">
              <div className="bg-[#161B2A] border border-gray-800 p-4 rounded-2xl">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Status</p>
                <p className="text-emerald-400 font-bold text-sm">Active</p>
              </div>
              <div className="bg-[#161B2A] border border-gray-800 p-4 rounded-2xl">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Withdraw Limit</p>
                <p className="text-white font-bold text-sm">Unlimited</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Kyc;
