import Head from 'next/head';
import { signIn } from 'next-auth/react';

export default function Home() {
  return (
    <>
      <Head>
        <title>Qimi AI - Join the Waitlist</title>
        <meta name="description" content="Qimi AI - Intelligent Family Intervention Assistant for ADHD Families. Join our waitlist to be notified when we launch." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.svg" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3T1NP7EG91"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3T1NP7EG91');`
          }}
        />
      </Head>
      <div className="coming-soon-banner" style={{position: 'fixed', top: '70px', left: '0', right: '0', background: 'linear-gradient(135deg, #00D4AA, #8B5CF6)', color: 'white', textAlign: 'center', padding: '12px 0', fontSize: '16px', fontWeight: '600', zIndex: 1001, display: 'block'}}>🚀 Coming Soon</div>
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
      </nav>

      <main className="hero">
        <div className="hero-container">
          <div>
            <h1 className="hero-title">Intelligent Family Intervention <span className="title-highlight">for ADHD Families</span></h1>
            <p className="hero-description">Qimi AI is revolutionizing how ADHD families receive support and guidance. Join our growing community to be the first to experience our innovative AI-powered family intervention platform.</p>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🧠</div>
                <h3>Smart Insights</h3>
                <p>AI-powered guidance tailored for ADHD family dynamics</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">❤️</div>
                <h3>Family Support</h3>
                <p>Compassionate care for the entire family unit</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <h3>Progress Tracking</h3>
                <p>Measurable growth and development insights</p>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="waitlist-counter-display">
              <div className="waitlist-number" id="waitlistCount">0</div>
              <div className="waitlist-label">Families Waiting</div>
              <p className="waitlist-description">Join the waitlist to be the first to experience Qimi AI when we launch. Get early access and exclusive benefits.</p>
            </div>
          </div>
        </div>
      </main>

      <section className="top-login-section">
        <div className="top-login-container">
          <div className="login-content">
            <h2>Get Early Access</h2>
            <p>Be the first to know when we launch</p>
            <div className="social-login">
              <button className="social-btn google-btn" onClick={() => signIn('google', { callbackUrl: 'https://www.qimiai.to' })} aria-label="Continue with Google">
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
              <input type="email" placeholder="Enter your email address" className="email-input" id="emailInput" />
              <button className="join-btn" onClick={() => alert('Thanks! You\'re on the waitlist.')}>Join Waitlist</button>
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
