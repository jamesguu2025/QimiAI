import Head from 'next/head';
import Link from 'next/link';

export default function Founder() {
  return (
    <>
      <Head>
        <title>Qimi AI - Meet the Founder</title>
        <meta name="description" content="Meet James Guu, founder of Qimi AI - a 36-year-old ADHD adult, experienced educator, and serial entrepreneur helping families worldwide." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <Link href="/">
              <img src="/logo.svg" alt="Qimi AI" />
            </Link>
          </div>
          <div className="nav-links">
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/founder" className="nav-link active">Founder</Link>
            <Link href="/#waitlist" className="nav-link">Join Waitlist</Link>
          </div>
        </div>
      </nav>

      <main className="page-hero">
        <div className="page-container">
          <div className="hero-content">
            <h1 className="page-title">Meet the <span className="title-highlight">Founder</span></h1>
            <p className="page-subtitle">James Guu - From ADHD child to successful entrepreneur, helping families worldwide.</p>
          </div>
        </div>
      </main>

      <section className="founder-content">
        <div className="content-container">
          <div className="founder-profile">
            <div className="founder-image">
              <img src="/james-family.jpg" alt="James Guu with family" className="profile-photo" />
            </div>
            <div className="founder-info">
              <h2>James Guu</h2>
              <p className="founder-title">Founder & CEO of Qimi AI</p>
              
              <div className="founder-story">
                <p>James Guu is a 36-year-old ADHD adult, experienced educator, and serial entrepreneur who has helped families across North America and China. As a parent to an ADHD child, he turned years of learning into a practical system that families can apply day by day.</p>
                
                <p>James believes every child deserves a path to succeed — and every parent deserves calm, clarity, and support. Qimi AI reflects that mission.</p>
              </div>

              <div className="founder-credentials">
                <div className="credential-item">
                  <div className="credential-icon">🎓</div>
                  <div className="credential-text">
                    <h4>Experienced Educator</h4>
                    <p>Years of teaching experience with deep understanding of learning processes</p>
                  </div>
                </div>
                
                <div className="credential-item">
                  <div className="credential-icon">🚀</div>
                  <div className="credential-text">
                    <h4>Serial Entrepreneur</h4>
                    <p>Multiple successful ventures across North America and China</p>
                  </div>
                </div>
                
                <div className="credential-item">
                  <div className="credential-icon">👨‍👩‍👧‍👦</div>
                  <div className="credential-text">
                    <h4>ADHD Parent</h4>
                    <p>Personal experience raising an ADHD child, understanding the daily challenges</p>
                  </div>
                </div>
              </div>

              <div className="social-links">
                <p>Follow James for daily insights:</p>
                <a href="https://www.tiktok.com/@jamesguu2024" target="_blank" rel="noreferrer" className="social-link">
                  <span className="social-icon">📱</span>
                  TikTok: @jamesguu2024
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to Join Our Community?</h2>
          <p>Be part of the movement that's transforming ADHD family support.</p>
          <Link href="/#waitlist" className="cta-button">Join Our Waitlist</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-logo">
              <h3>Qimi AI</h3>
              <p>Empowering ADHD families through intelligent intervention</p>
            </div>
            <div className="footer-links">
              <Link href="/about" className="footer-link">About</Link>
              <Link href="/founder" className="footer-link">Founder</Link>
              <Link href="/#waitlist" className="footer-link">Join Waitlist</Link>
              <a href="/privacy.html" className="footer-link">Privacy Policy</a>
              <a href="/terms.html" className="footer-link">Terms of Service</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Qimi AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
