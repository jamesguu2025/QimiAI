import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    teal: "#00D4AA",
                    purple: "#8B5CF6",
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "gradient-primary": "linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)",
            },
            fontFamily: {
                sans: ["'Noto Sans SC'", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
                outfit: ["Outfit", "'Noto Sans SC'", "sans-serif"],
            },
            keyframes: {
                'glow-text': {
                    '0%, 100%': {
                        color: 'rgba(0, 212, 170, 0.5)',
                        textShadow: 'none',
                    },
                    '50%': {
                        color: 'rgba(0, 212, 170, 1)',
                        textShadow: '0 0 8px rgba(0, 212, 170, 0.6), 0 0 20px rgba(0, 212, 170, 0.3)',
                    },
                },
            },
            animation: {
                'glow-text': 'glow-text 2.5s ease-in-out infinite',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};
export default config;
