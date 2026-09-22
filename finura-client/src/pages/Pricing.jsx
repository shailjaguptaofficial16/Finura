import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Pricing.css';

const plans = [
  {
    name: 'Basic',
    description: 'Access a complete payments platform with simple pay-as-you-go pricing.',
    monthlyPrice: 0,
    features: ['Tracking up to 5 assets', 'Basic analytics and insights', 'Standard security settings', 'Email support assistance'],
    cta: 'Get Started',
    variant: 'outline',
  },
  {
    name: 'Pro',
    description: 'Advanced options for scaling portfolios and fast clearing cycles.',
    monthlyPrice: 19,
    features: ['AI auto-investing routines', 'Live charts and balance tracking', 'Unlimited asset synchronization', 'Priority automated rebalancing'],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'Institutional-grade limits and direct custom private advisory access.',
    monthlyPrice: 49,
    features: ['Dedicated wealth manager', 'Custom tax-saving advisory tools', 'Premium metal card', '24/7 dedicated support priority line'],
    cta: 'Go Enterprise',
    variant: 'outline',
  },
];

function Pricing() {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);

  const displayedPlans = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        price: yearly
          ? plan.name === 'Pro'
            ? 15
            : plan.name === 'Enterprise'
              ? 39
              : 0
          : plan.monthlyPrice,
      })),
    [yearly],
  );

  const handlePlanSelect = (planName) => {
    const normalizedPlan = planName.toLowerCase();
    navigate(`/signup?plan=${normalizedPlan}`);
  };

  return (
    <main className="pricing-page">
      <div className="pricing-shell landing-container">
        <section className="pricing-header">
          <span className="badge badge-primary">Pricing Plans</span>
          <h1 className="break-words">Choose the right plan for your future</h1>
          <p>
            Unlock the power of smart wealth management, digital banking solutions,
            and automated savings routines tailored for you.
          </p>
        </section>

        <div className="pricing-toggle-wrap">
          <span id="monthly-label" className={`pricing-toggle-label ${!yearly ? 'active' : ''}`}>Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-labelledby="monthly-label annual-label"
            className={`pricing-toggle-button ${yearly ? 'active' : ''}`}
            onClick={() => setYearly((value) => !value)}
            aria-label="Toggle annual billing"
          />
          <span id="annual-label" className={`pricing-toggle-label ${yearly ? 'active' : ''}`}>
            Billed Annually <span className="badge badge-primary">Save 20%</span>
          </span>
        </div>

        <section aria-label="Subscription Plans" className="pricing-grid">
          {displayedPlans.map((plan) => (
            <article key={plan.name} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              <div className="pricing-card-header">
                {plan.popular ? (
                  <span className="badge badge-primary" style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#10b981', color: 'white' }}>
                    Most Popular
                  </span>
                ) : null}
                <h2 className="break-words text-xl font-bold">{plan.name}</h2>
                <p>{plan.description}</p>
                <div className="pricing-price">
                  ${plan.price}
                  <span className="price-period">/mo</span>
                </div>
              </div>
              <ul className="features-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="check-icon" aria-hidden="true">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`card-btn ${plan.popular ? 'btn-solid' : 'btn-outline'} pricing-cta`}
                aria-label={`Select ${plan.name} plan: ${plan.cta}`}
                onClick={() => handlePlanSelect(plan.name)}
              >
                {plan.cta}
              </button>
            </article>
          ))}
        </section>

        <div className="pricing-info-grid">
          <div className="pricing-info-card">
            <span className="badge badge-primary">Support</span>
            <h3 className="break-words">Have pricing-related questions?</h3>
            <p>
              Our billing specialists are available to answer compliance,
              invoicing, and account volume structures.
            </p>
          </div>
          <div className="pricing-info-card">
            <span className="badge badge-primary">Security</span>
            <h3 className="break-words">Protected every step of the way</h3>
            <p>
              Each plan includes encrypted account access, dedicated monitoring
              alerts, and secure bank-grade identity checks.
            </p>
          </div>
        </div>

        <div className="pricing-banner">
          <span className="badge badge-primary">Try Us</span>
          <h2 className="break-words">Transaction safely and worry free!</h2>
          <p>
            Life-centric financial solutions help you build your future while
            enjoying life, even with the smallest things that matter.
          </p>
          <button type="button" className="btn btn-primary" aria-label="Create Account with Pro plan" onClick={() => handlePlanSelect('Pro')}>
            Create Account
          </button>
        </div>
      </div>
    </main>
  );
}

export default Pricing;