import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({ title: '', message: '', contact: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ title: '', message: '', contact: '' });
      setStatus(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim() || !formData.contact.trim()) {
      setStatus({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (data.success) {
        setStatus({ type: 'success', text: 'Message sent successfully! We\'ll get back to you soon.' });
        setFormData({ title: '', message: '', contact: '' });
      } else {
        setStatus({ type: 'error', text: data.error || 'Failed to send. Please try again.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl p-8 max-w-[480px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-all"
        >
          <X size={18} />
        </button>

        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Contact Us</h2>
        <p className="text-sm text-slate-500 text-center mb-6">
          Have a question or suggestion? Leave a message and we&apos;ll get back to you.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter subject"
              required
              className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg transition-all focus:outline-none focus:border-primary-teal focus:ring-[3px] focus:ring-primary-teal/10"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter your message"
              rows={4}
              required
              className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg resize-y min-h-[100px] transition-all focus:outline-none focus:border-primary-teal focus:ring-[3px] focus:ring-primary-teal/10"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Contact Info</label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Email or phone number"
              required
              className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg transition-all focus:outline-none focus:border-primary-teal focus:ring-[3px] focus:ring-primary-teal/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 text-base font-semibold text-white rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,212,170,0.4)] disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #00D4AA, #8B5CF6)' }}
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>

          {status && (
            <p className={`text-center mt-4 text-sm ${status.type === 'success' ? 'text-primary-teal' : 'text-red-500'}`}>
              {status.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
