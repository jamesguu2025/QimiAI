import Head from 'next/head';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const [waitlistCount, setWaitlistCount] = useState(0);

  // 获取等待列表数量
  const fetchWaitlistCount = async () => {
    try {
      const response = await fetch('/api/waitlist-count');
      const data = await response.json();
      if (data.success) {
        setWaitlistCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch waitlist count:', error);
    }
  };

  // 页面加载时获取数量
  useEffect(() => {
    fetchWaitlistCount();
  }, []);

  // 处理登录后的自动订阅
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscribed = urlParams.get('subscribed');
    
    if (subscribed === 'true' && session?.user?.email) {
      // 自动订阅到邮件列表
      fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session.user.email,
          name: session.user.name || '',
          source: 'google_login',
        }),
      }).then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Welcome! You\'ve been added to our waitlist.');
            // 刷新等待列表数量
            fetchWaitlistCount();
          }
        })
        .catch(error => {
          console.error('Auto-subscription error:', error);
        });
      
      // 清理 URL 参数
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [session]);

  const handleEmailSubmit = async () => {
    const nameInput = document.getElementById('nameInput') as HTMLInputElement;
    const emailInput = document.getElementById('emailInput') as HTMLInputElement;
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          name: name,
          source: 'email_form',
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        nameInput.value = '';
        emailInput.value = '';
        // 刷新等待列表数量
        fetchWaitlistCount();
      } else {
        alert(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Qimi AI - to Empower Every ADHD Family</title>
        <meta name="description" content="Qimi AI provides emotional support for ADHD parents and comprehensive action plans for children. Founded by James Guu, an experienced educator and serial entrepreneur." />
        <meta name="keywords" content="ADHD support, ADHD families, ADHD parents, ADHD children, family intervention, emotional support, ADHD education, ADHD therapy, ADHD management" />
        <meta name="author" content="James Guu" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.qimiai.to/" />
        <meta property="og:title" content="Qimi AI - to Empower Every ADHD Family" />
        <meta property="og:description" content="Qimi AI provides emotional support for ADHD parents and comprehensive action plans for children. Founded by James Guu, an experienced educator and serial entrepreneur." />
        <meta property="og:image" content="https://www.qimiai.to/logo.png" />
        <meta property="og:site_name" content="Qimi AI" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.qimiai.to/" />
        <meta property="twitter:title" content="Qimi AI - to Empower Every ADHD Family" />
        <meta property="twitter:description" content="Qimi AI provides emotional support for ADHD parents and comprehensive action plans for children. Founded by James Guu, an experienced educator and serial entrepreneur." />
        <meta property="twitter:image" content="https://www.qimiai.to/logo.png" />
        
        {/* Additional SEO */}
        <meta name="theme-color" content="#00D4AA" />
        <meta name="msapplication-TileColor" content="#00D4AA" />
        <link rel="canonical" href="https://www.qimiai.to/" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.svg" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3T1NP7EG91"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3T1NP7EG91');`
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Qimi AI",
              "url": "https://www.qimiai.to",
              "logo": "https://www.qimiai.to/logo.png",
              "description": "Qimi AI provides emotional support for ADHD parents and comprehensive action plans for children",
              "founder": {
                "@type": "Person",
                "name": "James Guu",
                "description": "36-year-old ADHD adult, experienced educator, and serial entrepreneur"
              },
              "sameAs": [
                "https://www.qimiai.to"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "url": "https://www.qimiai.to"
              }
            })
          }}
        />
      </Head>
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <img src="/logo.svg" alt="Qimi AI" />
          </div>
          <div className="nav-links">
            <a href="#about" className="nav-link">About</a>
            <a href="#founder" className="nav-link">Founder</a>
            <a href="#waitlist" className="nav-link">Join Waitlist</a>
          </div>
        </div>
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          right: '0',
          width: '100%',
          background: 'linear-gradient(135deg, #00D4AA, #8B5CF6)',
          color: 'white',
          textAlign: 'center',
          padding: '12px 0',
          fontSize: '16px',
          fontWeight: '600',
          zIndex: 1001,
          display: 'block',
          visibility: 'visible',
          opacity: '1',
          margin: '0',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,212,170,0.3)'
        }}>🚀 Coming Soon</div>
      </nav>

      <main className="hero">
        <div className="hero-container">
          <div className="letter-section">
            <div className="letter-content">
              <h1 className="letter-title">A Letter from James</h1>
              <div className="letter-text">
                <p>Dear fellow parent,</p>
                
                <p>This is James Guu. I grew up as a kid with ADHD—always being told to focus, to sit still, to behave. But no one ever told me how. I felt lost, misunderstood, and exhausted.</p>
                
                <p>Years later, when my son began showing the same signs, I made a promise: he wouldn't have to go through this alone like I did.</p>
                
                <p>That's why I created Qimi AI—not as a tech product, but as a parent's tool.</p>
                
                <p>I've been a teacher, an entrepreneur, and now a self-taught AI developer. I spent years connecting ancient Chinese medicine, modern science, and practical daily routines—then built a system that could actually support families like ours.</p>
                
                <p>Qimi AI is here to help. It's not perfect, but it's honest. And it comes from someone who truly understands what you're going through.</p>
                
                <p>From my family to yours,<br/>
                Warmly,<br/><br/>
                <strong>James Guu</strong><br/>
                Founder of Qimi AI</p>
              </div>
            </div>
            <div className="james-photo-section">
              <div className="photo-placeholder">
                <p>James Guu Photo<br/>(9:16 ratio)</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="product-intro">
        <div className="product-container">
          <h2 className="section-title">How Qimi AI Helps Your Family</h2>
          <div className="product-features">
            <div className="product-feature">
              <div className="feature-icon">💚</div>
              <h3>Parent Emotional Support</h3>
              <p>Helping ADHD parents manage stress from children, work, family, and school pressures with proven emotional wellness strategies</p>
            </div>
            <div className="product-feature">
              <div className="feature-icon">🎯</div>
              <h3>Comprehensive Action Plans</h3>
              <p>Evidence-based strategies covering learning, exercise, nutrition, and daily routines to help your child thrive</p>
            </div>
          </div>
        </div>
      </section>

      <section className="waitlist-section">
        <div className="waitlist-container">
          <div className="waitlist-content">
            <h2 className="section-title">Join Our Community</h2>
            <div className="waitlist-counter-display">
              <div className="waitlist-number" id="waitlistCount">{waitlistCount}</div>
              <div className="waitlist-label">Families Already Waiting</div>
              <p className="waitlist-description">Be the first to experience Qimi AI when we launch. Get early access and exclusive benefits for your family's journey.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="top-login-section">
        <div className="top-login-container">
          <div className="login-content">
            <h2>Get Early Access</h2>
            <p>Be the first to know when we launch</p>
            <div className="social-login">
              <button className="social-btn google-btn" onClick={() => signIn('google', { callbackUrl: 'https://www.qimiai.to?subscribed=true' })} aria-label="Continue with Google">
                <img src="/google.svg" alt="Google" />
                <span>Continue with Google</span>
              </button>
              <button className="social-btn facebook-btn" onClick={() => signIn('facebook', { callbackUrl: 'https://www.qimiai.to' })} aria-label="Continue with Facebook">
                <img src="/facebook-f.svg" alt="Facebook" />
                <span>Continue with Facebook</span>
              </button>
            </div>
            <div className="divider"><span>or</span></div>
            <div className="email-form">
              <input type="text" placeholder="Your name (optional)" className="name-input" id="nameInput" />
              <input type="email" placeholder="Enter your email address" className="email-input" id="emailInput" />
              <button className="join-btn" onClick={handleEmailSubmit}>Join Waitlist</button>
            </div>
          </div>
        </div>
      </section>

      <section id="waitlist" className="waitlist">
        <div className="waitlist-container">
          <h2 className="section-title">Why Join Our Waitlist?</h2>
          <div className="waitlist-grid">
            <div className="waitlist-item"><div className="waitlist-icon">🎯</div><h3>First Access</h3><p>Be among the first to experience Qimi AI when we launch. Early users get exclusive access to beta features and special pricing.</p></div>
            <div className="waitlist-item"><div className="waitlist-icon">💡</div><h3>Shape the Product</h3><p>Your feedback matters! Help us build the perfect solution for ADHD families by sharing your needs and preferences.</p></div>
            <div className="waitlist-item"><div className="waitlist-icon">🎁</div><h3>Exclusive Benefits</h3><p>Waitlist members receive special discounts, priority support, and access to exclusive resources and content.</p></div>
          </div>
        </div>
      </section>

      <section id="about" className="about">
        <div className="about-container">
          <h2 className="section-title">About Qimi AI</h2>
          <div className="about-description"><p>Qimi AI is designed specifically for ADHD families who need intelligent, compassionate support. Our platform combines cutting-edge AI technology with evidence-based practices to provide personalized guidance that adapts to your family's unique needs.</p></div>
        </div>
      </section>

      <section id="founder" className="founder">
        <div className="founder-container">
          <h2 className="section-title">Meet the Founder</h2>
          <div className="founder-content">Follow on TikTok: <a href="https://www.tiktok.com/@jamesguu2024" target="_blank">@jamesguu2024</a></div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-logo"><h3>Qimi AI</h3><p>Empowering ADHD families through intelligent intervention</p></div>
            <div className="footer-links">
              <a href="#about" className="footer-link">About</a>
              <a href="#founder" className="footer-link">Founder</a>
              <a href="#waitlist" className="footer-link">Join Waitlist</a>
              <a href="/privacy.html" className="footer-link">Privacy Policy</a>
              <a href="/terms.html" className="footer-link">Terms of Service</a>
            </div>
          </div>
          <div className="footer-bottom"><p>© 2025 Qimi AI. All rights reserved.</p></div>
        </div>
      </footer>
    </>
  );
}
