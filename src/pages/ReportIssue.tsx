import React, { useState, useRef } from 'react';
import { Camera, MapPin, Upload, AlertCircle, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import LocationPickerMap from '../components/global/LocationPickerMap';
import { motion, AnimatePresence } from 'motion/react';

export default function ReportIssue() {
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [submittedReport, setSubmittedReport] = useState<any>(null);

  const reportMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      if (data.location?.latitude) formData.append('lat', data.location.latitude.toString());
      if (data.location?.longitude) formData.append('lng', data.location.longitude.toString());
      if (locationName) formData.append('address', locationName);
      
      if (imageFile) {
        formData.append('images', imageFile);
      }
      
      return api.reports.create(formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSubmittedReport(data);
      window.scrollTo(0, 0);
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview immediately
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      
      // Compress image to ensure it's under 1MB
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              setImageFile(compressedFile);
            }
          }, 'image/jpeg', 0.8);
        }
      };
      img.src = url;
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [isLocating, setIsLocating] = useState(false);

  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setValue('location.latitude', lat);
        setValue('location.longitude', lng);
        
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          setLocationName(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch (e) {
          console.error("Reverse geocoding failed", e);
          setLocationName(`Accuracy: ${position.coords.accuracy.toFixed(0)}m - ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        
        setIsLocating(false);
      }, (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationName("Location permission denied. Please enter manually.");
        } else {
          setLocationName("Unable to retrieve your location.");
        }
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    } else {
      setIsLocating(false);
      setLocationName('Geolocation is not supported by your browser.');
    }
  };

  const onSubmit = (data: any) => {
    reportMutation.mutate(data);
  };

  if (submittedReport) {
    const reportId = submittedReport.id || 'CM-2026-00045';
    const isProcessing = submittedReport.message === "AI Analysis in Progress" || !submittedReport.aiDecision;
    const aiDecision = submittedReport.aiDecision || {};
    
    return (
      <div className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 shadow-xl w-full text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
          
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Report Submitted Successfully</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-mono bg-slate-100 dark:bg-slate-800 inline-block px-3 py-1 rounded-md">
            ID: {reportId}
          </p>

          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 text-left space-y-4 mb-8 border border-slate-100 dark:border-slate-800">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">AI Analysis in Progress</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Our Supervisor AI is currently analyzing your report, detecting duplicates, and assigning it to the correct department.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">AI detected:</span>
                  <span className="font-bold text-slate-900 dark:text-white capitalize">{aiDecision.category || 'Pending'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Priority:</span>
                  <span className={`font-bold capitalize ${
                    aiDecision.severity === 'high' || aiDecision.severity === 'critical' ? 'text-red-500' : 
                    aiDecision.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                  }`}>{aiDecision.severity || 'Medium'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Assigned Department:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{aiDecision.department || 'General Intake'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Current Status:</span>
                  <span className="font-bold text-amber-500">Awaiting Community Verification</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Estimated Resolution:</span>
                  <span className="font-bold text-slate-900 dark:text-white">2–4 Days</span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => {
                setSubmittedReport(null);
                reset();
                clearImage();
              }}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Submit Another
            </button>
            <Link 
              to={`/reports/${reportId}`}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              View Report <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Report an Issue</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Our AI will automatically categorize and route your report.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
        {reportMutation.isError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
            {reportMutation.error.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
            <input 
              type="text" 
              {...register('title', { required: true })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              placeholder="e.g. Large pothole on Main St."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
            <textarea 
              {...register('description', { required: true })}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Provide more details about the issue..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Photos or Videos</label>
            
            {imagePreview ? (
              <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={clearImage}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full mb-4">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-slate-900 dark:text-white font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">SVG, PNG, JPG (max. 5MB)</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Location</label>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 flex-col sm:flex-row">
                <button 
                  type="button" 
                  onClick={getLocation}
                  disabled={isLocating}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <MapPin className="w-5 h-5" /> {isLocating ? 'Locating...' : 'Use Current Location'}
                </button>
                <div className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 flex items-center overflow-hidden whitespace-nowrap overflow-ellipsis">
                  {locationName || "Select on map or use current location"}
                </div>
              </div>
              
              <div className="w-full rounded-xl overflow-hidden shadow-sm" style={{ height: '300px' }}>
                <LocationPickerMap 
                  initialPosition={watch('location.latitude') ? { latitude: watch('location.latitude'), longitude: watch('location.longitude') } : undefined}
                  onLocationSelected={(lat, lng, address) => {
                    setValue('location.latitude', lat);
                    setValue('location.longitude', lng);
                    setLocationName(address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3 mt-4">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
              When you submit, our Supervisor Agent will analyze your report, detect duplicates, assess severity, and automatically route it to the correct department.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={reportMutation.isPending}
            className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {reportMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Upload className="w-5 h-5 animate-bounce" /> Processing with AI...
              </span>
            ) : 'Submit Report'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
