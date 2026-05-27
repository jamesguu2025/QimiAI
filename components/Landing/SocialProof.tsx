import React from 'react';
import { Users } from 'lucide-react';

interface SocialProofProps {
    userCount: number;
}

export const SocialProof: React.FC<SocialProofProps> = ({ userCount }) => {
    // Format number with commas (e.g., 1,234)
    const formattedCount = new Intl.NumberFormat('en-US').format(userCount);

    return (
        <div className="bg-white py-12 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">

                    {/* Live Indicator & Count */}
                    <div className="flex items-center gap-6">
                        <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-teal/10 text-primary-teal">
                            <Users size={32} />
                            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-teal opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary-teal border-2 border-white"></span>
                            </span>
                        </div>

                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                    {formattedCount}
                                </span>
                                <span className="text-sm font-bold text-primary-teal uppercase tracking-wider bg-primary-teal/10 px-2 py-1 rounded-md">
                                    Live
                                </span>
                            </div>
                            <p className="text-slate-600 font-medium">Families empowered globally</p>
                        </div>
                    </div>

                    {/* Divider (Hidden on mobile) */}
                    <div className="hidden md:block h-12 w-px bg-slate-200 mx-4" />

                    {/* Trust Text */}
                    <div className="max-w-md">
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Join the growing community of parents using AI to navigate IEPs, build routines, and find emotional balance.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};
