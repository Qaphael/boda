import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOTP(phone);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.querySelector(`input[data-otp="${index + 1}"]`);
      if (next) next.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.querySelector(`input[data-otp="${index - 1}"]`);
      if (prev) prev.focus();
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyOTP(phone, otpString);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex items-center justify-center p-5">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0050cb 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>
      <main className="w-full max-w-[380px] relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 bg-primary-container text-on-primary-container flex items-center justify-center rounded mb-3 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">motorcycle</span>
          </div>
          <h1 className="text-headline-sm font-black tracking-tight text-on-surface">Boda Admin</h1>
          <p className="text-body-sm text-on-surface-variant">Logistics Hub Operations</p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm">
          {step === 'phone' ? (
            <div>
              <div className="mb-4">
                <h2 className="text-headline-sm mb-1">Sign in</h2>
                <p className="text-body-sm text-on-surface-variant">Enter your phone number to receive a secure login code.</p>
              </div>
              {error && (
                <div className="bg-error-container text-on-error-container p-3 rounded text-sm mb-4">{error}</div>
              )}
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-body-md text-outline">+254</span>
                    </div>
                    <input
                      className="block w-full pl-14 pr-4 py-2 bg-surface border border-outline-variant rounded focus:border-primary focus:ring-2 focus:ring-primary/10 text-body-md placeholder:text-outline-variant transition-all outline-none"
                      placeholder="700 000 000"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  className="w-full bg-primary text-on-primary py-2.5 rounded text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <button
                  className="flex items-center gap-1 text-primary text-label-md mb-3 hover:underline"
                  onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to phone
                </button>
                <h2 className="text-headline-sm mb-1">Verify your code</h2>
                <p className="text-body-sm text-on-surface-variant">
                  We've sent a 6-digit code to <span className="font-medium text-on-surface">+256 {phone}</span>
                </p>
              </div>
              {error && (
                <div className="bg-error-container text-on-error-container p-3 rounded text-sm mb-4">{error}</div>
              )}
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="flex justify-between gap-1">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      data-otp={i}
                      className="w-11 h-12 text-center bg-surface border border-outline-variant rounded text-headline-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                      maxLength={1}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOTPChange(i, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(i, e)}
                      required
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  <button
                    className="w-full bg-primary text-on-primary py-2.5 rounded text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                  <div className="text-center">
                    <button type="button" className="text-on-surface-variant text-label-md hover:text-primary transition-colors">
                      Didn't receive code? <span className="font-bold underline">Resend in 0:59</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center space-y-3">
          <p className="text-[11px] text-outline uppercase tracking-widest">Secure Administrator Access Only</p>
          <div className="flex items-center justify-center gap-6">
            <a className="text-label-md text-outline hover:text-on-surface-variant transition-colors" href="#">Help Center</a>
            <a className="text-label-md text-outline hover:text-on-surface-variant transition-colors" href="#">Privacy Policy</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
