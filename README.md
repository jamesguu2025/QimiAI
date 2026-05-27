# Qimi AI - ADHD Family Support Platform (Web Version)

> **Empowering Every ADHD Family Through Intelligent Intervention**

A modern, compassionate web platform designed to support ADHD families with practical AI guidance, emotional wellness strategies, and comprehensive action plans.

## 🌟 Project Overview

Qimi AI is a pioneering platform built by parents, for parents, combining James Guu's personal journey as an ADHD adult, experienced educator, and serial entrepreneur with cutting-edge AI technology. Our mission is to transform challenges into triumphs, offering tailored guidance that covers emotional well-being, learning strategies, nutrition, and daily routines.

**Related Projects:**
- **WeChat Mini-Program** (Production): Full-featured version for China market
- **Web Version** (This repo): International version under development

---

## 📊 Current Development Status

### ✅ Completed Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Landing Page** | ✅ Complete | Hero, founder letter, waitlist signup |
| **Authentication** | ✅ Complete | NextAuth.js with Google/Facebook OAuth |
| **Guest Mode** | ✅ Complete | Try-before-signup experience (localStorage) |
| **Chat Interface** | ✅ Complete | ChatGPT-style UI with streaming support |
| **File Upload** | ✅ Complete | Drag & drop, multi-file (images, PDFs, docs) |
| **Responsive Layout** | ✅ Complete | Mobile-first with sidebar navigation |
| **Guest Onboarding** | ✅ Complete | Child age + concerns collection |
| **Login Wall** | ✅ Complete | Soft gate after 5 free messages |

### 🚧 In Development

| Feature | Priority | Status |
|---------|----------|--------|
| **Backend API Integration** | P0 | Planned |
| **Smart Drawer (8 Topic Modules)** | P0 | Planned |
| **Chat History Persistence** | P0 | Planned |
| **RAG Knowledge Base UI** | P1 | Planned |
| **Growth Plan System** | P1 | Planned |
| **PDF Export** | P2 | Planned |
| **Family Profile Memory** | P2 | Planned |

### 📋 Feature Parity with Mini-Program

The WeChat mini-program has the following production features that need to be ported:

1. **Smart Drawer System** - 8 topic modules (Emotion, Learning, Exercise, Nutrition, Social, Sleep, School Communication, Supplements)
2. **RAG v3.0** - Function Calling architecture with LLM-driven retrieval
3. **Growth Plan Extraction** - AI suggestions saved as structured intervention plans
4. **Multi-Image Upload** - Up to 6 images with auto-compression
5. **Cloud Storage** - Redis-based chat history persistence
6. **Token Management** - 180K token limit with pre-check
7. **Smart Title Generation** - LLM-based conversation titles

---

## 🎨 Design Philosophy & Style

### **Core Design Principles**

#### **1. Compassionate Minimalism**
- **Clean, uncluttered layouts** that reduce cognitive load for ADHD families
- **Generous white space** to create breathing room and focus
- **Simplified navigation** with clear, intuitive user flows

#### **2. Warm, Approachable Aesthetics**
- **Soft, rounded corners** (20px border-radius) for friendly, non-threatening feel
- **Gentle gradients** using our signature teal-to-purple color palette
- **Subtle shadows and blur effects** for depth without overwhelming complexity

#### **3. ADHD-Friendly Design Elements**
- **High contrast text** for better readability
- **Large, clear typography** with generous line spacing (1.8 line-height)
- **Consistent visual hierarchy** to reduce decision fatigue
- **Calming color palette** that promotes focus and reduces anxiety

### **Brand Color Palette**

```css
Primary Teal: #00D4AA
Secondary Purple: #8B5CF6
Text Dark: #2C3E50
Text Medium: #4A5A6B
Text Light: #5A6C7D
Background: rgba(255,255,255,0.95)
```

### **Typography System**

- **Primary Font**: Inter (clean, modern, highly readable)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Headings**: Bold, clear hierarchy (2.5rem - 3.5rem)
- **Body Text**: Comfortable reading size (1.1rem) with generous spacing

### **Visual Design Elements**

#### **Cards & Containers**
- **Glassmorphism effect**: `backdrop-filter: blur(10px)` with semi-transparent backgrounds
- **Soft shadows**: `0 20px 60px rgba(0,212,170,0.15)` for gentle depth
- **Rounded corners**: 20px for main containers, 15px for smaller elements
- **Subtle borders**: `1px solid rgba(0,212,170,0.1)` for definition

#### **Interactive Elements**
- **Smooth transitions**: `transition: all 0.3s ease` for all interactive states
- **Hover effects**: Gentle transforms and color changes
- **Focus states**: Clear accessibility indicators
- **Button styles**: Rounded, padded, with gradient backgrounds

#### **Layout Philosophy**
- **Mobile-first responsive design**
- **Flexible grid systems** that adapt to content
- **Consistent spacing system** (1rem, 2rem, 4rem intervals)
- **Centered, max-width containers** for optimal reading experience

## 🚀 Key Features

### **Personal Connection**
- **Founder's Letter**: Authentic, personal story from James Guu
- **Family Photo Integration**: Human connection through real family imagery
- **Empathetic Messaging**: Understanding tone throughout the platform

### **Social Proof & Community**
- **Dynamic Waitlist Counter**: Real-time family count from Mailchimp
- **Community Benefits**: Clear value propositions for joining
- **Social Login Integration**: Google and Facebook authentication

### **User Experience Focus**
- **Progressive Disclosure**: Information revealed in logical, digestible chunks
- **Clear Call-to-Actions**: Prominent, accessible registration flows
- **Accessibility First**: WCAG compliant design patterns

## 🛠 Technical Stack

### **Frontend**
- **Next.js 14** with TypeScript (App Router ready)
- **NextAuth.js** for social authentication (Google, Facebook)
- **Tailwind CSS** for utility-first styling
- **Lucide React** for consistent iconography
- **React Markdown** for AI response rendering

### **Backend Integration**
- **Mailchimp API** for email list management
- **Vercel** for deployment and hosting
- **Environment Variables** for secure configuration
- **Future: Node.js API** (port from mini-program backend)

### **Key Components**

```
components/
├── Chat/
│   ├── ChatInput.tsx       # Message input with file upload
│   ├── ChatMessage.tsx     # Message bubbles (user/AI)
│   ├── GuestOnboarding.tsx # First-time user flow
│   ├── LoginWall.tsx       # Soft login gate
│   └── RAGSources.tsx      # Citation display (planned)
├── Layout/
│   ├── AppLayout.tsx       # Main app shell
│   └── Sidebar.tsx         # Navigation sidebar
└── ui/                     # Reusable UI primitives

utils/
└── guest-storage.ts        # localStorage guest data management

pages/
├── index.tsx               # Landing page
├── chat.tsx                # Main chat interface
└── api/
    ├── auth/[...nextauth].ts
    ├── subscribe.ts
    └── waitlist-count.ts
```

### **Design System**
- **Component-based architecture**
- **Consistent spacing scale** (Tailwind defaults)
- **Responsive breakpoints**: sm (640px), md (768px), lg (1024px)
- **Brand Colors**: Primary Teal (#00D4AA), Secondary Purple (#8B5CF6)

## 📱 Responsive Design Strategy

### **Breakpoint System**
```css
Desktop: 1200px+ (Full layout, side-by-side content)
Tablet: 768px - 1199px (Adjusted spacing, stacked elements)
Mobile: 480px - 767px (Single column, touch-friendly)
Small Mobile: <480px (Compact layout, essential content)
```

### **Mobile-First Approach**
- **Touch-friendly targets**: Minimum 44px touch areas
- **Readable text sizes**: No text smaller than 16px
- **Simplified navigation**: Vertical stacking on mobile
- **Optimized images**: Responsive, compressed, properly sized

## 🎯 User Journey Design

### **Emotional Flow**
1. **Connection**: Personal letter creates immediate emotional bond
2. **Understanding**: Product features explain practical benefits
3. **Social Proof**: Waitlist count builds trust and urgency
4. **Motivation**: Benefits section addresses specific pain points
5. **Action**: Clear, simple registration process

### **Information Architecture**
- **Hero Section**: Tagline + Personal Story
- **Product Introduction**: Core value propositions
- **Community Section**: Social proof and benefits
- **Registration Flow**: Multiple entry points for conversion

## 🔧 Development Guidelines

### **Code Organization**
```
pages/
├── index.tsx          # Homepage with integrated design
├── about.tsx          # Dedicated About page
├── founder.tsx        # Dedicated Founder page
└── api/
    ├── auth/          # NextAuth configuration
    ├── subscribe.ts   # Mailchimp integration
    └── waitlist-count.ts # Dynamic counter

styles/
└── globals.css        # Complete design system
```

### **CSS Architecture**
- **Utility-first approach** with custom components
- **Consistent naming conventions** (BEM-inspired)
- **Modular organization** by component/feature
- **Responsive design patterns** with mobile-first media queries

## 🌈 Design System Components

### **Navigation**
- **Fixed header** with backdrop blur
- **Brand logo** with gradient treatment
- **Clean link styling** with hover states
- **Mobile-responsive** vertical stacking

### **Cards & Content Blocks**
- **Glassmorphism containers** for modern feel
- **Consistent padding** and spacing
- **Subtle animations** for engagement
- **Accessible focus states**

### **Forms & Interactions**
- **Social login buttons** with brand colors
- **Email forms** with clear validation
- **Loading states** and feedback
- **Accessible form labels** and error handling

## 📊 Performance Considerations

### **Optimization Strategies**
- **Image optimization**: Next.js automatic optimization
- **CSS optimization**: Minimal custom CSS, efficient selectors
- **JavaScript optimization**: Code splitting, lazy loading
- **Font optimization**: System fonts with Inter fallback

### **Accessibility Features**
- **Semantic HTML** structure
- **ARIA labels** for interactive elements
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Color contrast** compliance

## 🚀 Deployment

### **Vercel Configuration**
- **Automatic deployments** from GitHub
- **Environment variables** for API keys
- **Custom domain** configuration
- **SSL certificates** automatic setup

### **Environment Setup**

Create a `.env.local` file in the project root:

```bash
# ===========================================
# Authentication (NextAuth.js)
# ===========================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# ===========================================
# Email Marketing (Mailchimp)
# ===========================================
MAILCHIMP_API_KEY=your_mailchimp_api_key
MAILCHIMP_AUDIENCE_ID=your_audience_id
MAILCHIMP_SERVER_PREFIX=us1  # e.g., us1, us2, etc.

# ===========================================
# AI Backend (Future - port from mini-program)
# ===========================================
# QIMI_API_URL=https://api.xingbanai.cn
# QIMI_API_KEY=your_api_key

# ===========================================
# Database (Future - for chat persistence)
# ===========================================
# REDIS_URL=redis://localhost:6379
```

### **Development**

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🎨 Design Inspiration & Philosophy

### **ADHD-Friendly Design Principles**
- **Reduced cognitive load**: Simple, clear interfaces
- **Consistent patterns**: Predictable user experiences
- **Calming aesthetics**: Colors and spacing that promote focus
- **Clear hierarchy**: Obvious information structure
- **Minimal distractions**: Focus on essential content

### **Emotional Design Elements**
- **Personal storytelling**: Founder's authentic voice
- **Family imagery**: Real, relatable photos
- **Warm color palette**: Teal and purple gradients
- **Gentle animations**: Subtle, non-distracting motion
- **Human-centered copy**: Empathetic, understanding tone

## 📈 Future Design Considerations

### **Scalability**
- **Component library** expansion
- **Design token** system implementation
- **Advanced animations** for engagement
- **Personalization** features

### **Accessibility Enhancements**
- **Dark mode** support
- **High contrast** mode
- **Font size** customization
- **Reduced motion** preferences

---

## 👨‍💻 About the Founder

**James Guu** - A 36-year-old ADHD adult, experienced educator, and serial entrepreneur who has helped families across North America and China. As a parent to an ADHD child, he turned years of learning into a practical system that families can apply day by day.

**Follow James on TikTok**: [@jamesguu2024](https://www.tiktok.com/@jamesguu2024)

---

*Built with ❤️ for ADHD families everywhere. Every child deserves a path to succeed, and every parent deserves calm, clarity, and support.*
