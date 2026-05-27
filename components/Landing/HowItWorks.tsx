import React from 'react';
import { MessageSquare, Sparkles, TrendingUp } from 'lucide-react';

export const HowItWorks = () => {
    const steps = [
        {
            icon: MessageSquare,
            title: "1. Tell us about your child",
            description: "Chat with Qimi to share your child's age, strengths, and current challenges. It's as easy as texting a friend.",
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            icon: Sparkles,
            title: "2. Get a personalized plan",
            description: "Our AI instantly generates IEP goals, visual schedules, or de-escalation scripts tailored specifically to your needs.",
            color: "text-purple-600",
            bg: "bg-purple-50"
        },
        {
            icon: TrendingUp,
            title: "3. Track and adjust",
            description: "Log daily progress and let Qimi refine its suggestions over time, growing with your family.",
            color: "text-teal-600",
            bg: "bg-teal-50"
        }
    ];

    return (
        <section className="py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Complex support made simple. No steep learning curve, just immediate help.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting Line (Desktop only) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-200 -z-10" />

                    {steps.map((step, index) => (
                        <div key={index} className="relative flex flex-col items-center text-center group">
                            <div className={`w-24 h-24 rounded-2xl ${step.bg} ${step.color} flex items-center justify-center mb-8 shadow-sm transition-transform group-hover:scale-110 duration-300 bg-white border-4 border-slate-50`}>
                                <step.icon size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                            <p className="text-slate-600 leading-relaxed max-w-xs">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
