import React from 'react';
import AppLayout from '../components/Layout/AppLayout';
import {
    MessageSquarePlus,
    Calendar,
    FileText,
    Heart,
    ArrowRight,
    Clock
} from 'lucide-react';
import Link from 'next/link';

const Dashboard = () => {
    const quickActions = [
        {
            title: 'IEP Assistant',
            description: 'Get help with Individualized Education Plans',
            icon: FileText,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            href: '/chat?mode=iep'
        },
        {
            title: 'Routine Builder',
            description: 'Create visual schedules for daily tasks',
            icon: Calendar,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            href: '/chat?mode=routine'
        },
        {
            title: 'Emotional Support',
            description: 'Guidance for difficult moments',
            icon: Heart,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            href: '/chat?mode=support'
        },
        {
            title: 'New Chat',
            description: 'Start a fresh conversation',
            icon: MessageSquarePlus,
            color: 'text-teal-600',
            bg: 'bg-teal-50',
            href: '/chat'
        }
    ];

    const recentActivity = [
        { title: 'Morning Routine Help', date: '2 hours ago', type: 'Chat' },
        { title: 'IEP Review for Math', date: 'Yesterday', type: 'Document' },
        { title: 'Meltdown De-escalation', date: '2 days ago', type: 'Chat' },
    ];

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Welcome Section */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Good morning, James</h1>
                    <p className="text-slate-500 mt-2">Here's what we can help you with today.</p>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action) => (
                        <Link
                            key={action.title}
                            href={action.href}
                            className="group p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-primary-teal/20"
                        >
                            <div className={`w-12 h-12 rounded-lg ${action.bg} ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <action.icon size={24} />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-1">{action.title}</h3>
                            <p className="text-sm text-slate-500">{action.description}</p>
                        </Link>
                    ))}
                </div>

                {/* Recent Activity & Tips */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                                <Clock size={20} className="text-slate-400" />
                                Recent Activity
                            </h2>
                            <Link href="/history" className="text-sm text-primary-purple hover:underline">View all</Link>
                        </div>
                        <div className="space-y-4">
                            {recentActivity.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                            <MessageSquarePlus size={20} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{item.title}</p>
                                            <p className="text-xs text-slate-500">{item.date}</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-400" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Daily Tip / Insight */}
                    <div className="bg-gradient-to-br from-primary-purple/5 to-primary-teal/5 rounded-xl border border-primary-purple/10 p-6">
                        <h3 className="font-semibold text-slate-900 mb-2">Daily Insight</h3>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4">
                            "Consistency is key. Try to maintain the same morning routine for at least 2 weeks to help it stick."
                        </p>
                        <button className="w-full py-2 bg-white text-primary-purple font-medium text-sm rounded-lg border border-primary-purple/20 hover:bg-primary-purple/5 transition-colors">
                            Read more
                        </button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Dashboard;
