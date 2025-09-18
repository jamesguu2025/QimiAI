import Head from 'next/head';
import Link from 'next/link';

export default function About() {
  return (
    <>
      <Head>
        <title>Qimi AI - About Us</title>
        <meta name="description" content="Learn about Qimi AI - an ADHD family support platform built by parents, for parents. Practical guidance for real family life." />
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
            <Link href="/about" className="nav-link active">About</Link>
            <Link href="/founder" className="nav-link">Founder</Link>
            <Link href="/#waitlist" className="nav-link">Join Waitlist</Link>
          </div>
        </div>
      </nav>

      <main className="page-hero">
        <div className="page-container">
          <div className="hero-content">
            <h1 className="page-title">About <span className="title-highlight">Qimi AI</span></h1>
            <p className="page-subtitle">Built by parents, for parents. Practical guidance that fits real family life.</p>
          </div>
        </div>
      </main>

      <section className="about-content">
        <div className="content-container">
          <div className="content-grid">
            <div className="content-card">
              <div className="card-icon">🎯</div>
              <h3>Our Mission</h3>
              <p>Qimi AI is an ADHD family support platform built by parents, for parents. We provide practical, step-by-step guidance that fits real family life — from emotional support for parents to daily action plans for children, covering learning, exercise, nutrition, sleep, and routines.</p>
            </div>
            
            <div className="content-card">
              <div className="card-icon">🧠</div>
              <h3>Our Approach</h3>
              <p>Our approach blends evidence-based psychology with insights from traditional Chinese wellness, translated into actionable, trackable routines. Qimi AI learns your family's rhythm and adapts recommendations over time to help you build sustainable habits that actually work.</p>
            </div>
            
            <div className="content-card">
              <div className="card-icon">💚</div>
              <h3>Parent Support</h3>
              <p>We understand the emotional toll of parenting an ADHD child. Our platform provides emotional wellness strategies to help parents manage stress from children, work, family, and school pressures.</p>
            </div>
            
            <div className="content-card">
              <div className="card-icon">🎯</div>
              <h3>Comprehensive Plans</h3>
              <p>Evidence-based strategies covering learning, exercise, nutrition, and daily routines to help your child thrive. Every plan is tailored to your family's unique needs and circumstances.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to Transform Your Family's Journey?</h2>
          <p>Join thousands of families who are already building better habits with Qimi AI.</p>
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
