import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
    {
        question: "Is my data private and secure?",
        answer: "Absolutely. We use enterprise-grade encryption to protect your family's information. We never share your personal data or your child's medical/school records with third parties."
    },
    {
        question: "Can I cancel my subscription anytime?",
        answer: "Yes, you can cancel your subscription at any time with just one click in your settings. You'll continue to have access until the end of your billing period."
    },
    {
        question: "Is this a replacement for professional therapy?",
        answer: "No. Qimi AI is a support tool designed to empower parents with strategies and organization. It complements professional therapy but does not replace medical advice or diagnosis."
    },
    {
        question: "Do you offer support for schools?",
        answer: "Currently, we focus on supporting families directly. However, many parents use our IEP tools to collaborate more effectively with their school teams."
    }
];

export const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-24 bg-slate-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Frequently asked questions</h2>
                    <p className="text-lg text-slate-600">
                        Have a different question? <a href="#" className="text-primary-purple font-bold hover:underline">Contact support</a>
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                            >
                                <span className="font-bold text-slate-900 text-lg">{faq.question}</span>
                                {openIndex === index ? (
                                    <ChevronUp className="text-primary-purple" />
                                ) : (
                                    <ChevronDown className="text-slate-400" />
                                )}
                            </button>

                            <div
                                className={`px-6 text-slate-600 leading-relaxed overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-48 pb-6 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                {faq.answer}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
