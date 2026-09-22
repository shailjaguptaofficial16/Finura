import React from 'react';
import './Pages.css'; /* CSS link ki gayi hai */

export default function About() {
  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <span className="badge badge-blue">About Finura</span>
      <h1 className="page-title">Building the Future of Wealth</h1>
      <p className="page-subtitle">
        Finura was founded on a simple principle: financial growth should be accessible, secure, and automated. We are a dedicated team of financial experts and technologists providing institutional-grade tools to modern professionals.
      </p>

      <div className="mission-box">
        <h2>Our Mission</h2>
        <p className="mission-text">
          To secure finance solutions and wealth products for everyday people. We help you achieve your dreams through intelligent investing with a sense of security, comfort, and advanced yield protections.
        </p>
      </div>
    </div>
  );
}