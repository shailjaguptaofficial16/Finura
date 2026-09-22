// Landing Page Interactive Features
document.addEventListener('DOMContentLoaded', () => {
    initTransferFeeCalculator();
    initInvestmentSimulator();
    initFAQAccordion();
    initSpendingCategoryHovers();
});

// 1. Transfer Fee Calculator
function initTransferFeeCalculator() {
    const volInput = document.getElementById('transfer-amount');
    const freqInput = document.getElementById('transfer-frequency');
    
    const volLabel = document.getElementById('amount-label');
    const freqLabel = document.getElementById('freq-label');
    const savingsDisplay = document.getElementById('savings-display');
    
    if (!volInput || !freqInput) return;

    function calculate() {
        const volume = parseFloat(volInput.value);
        const frequency = parseInt(freqInput.value);
        
        volLabel.textContent = `$${volume.toLocaleString()}`;
        freqLabel.textContent = frequency;
        
        // Fee savings calculation:
        // Assume traditional bank charges average of 0.5% per transfer volume
        // Annual savings = Volume * Frequency * 0.005 * 12 months
        const annualSavings = Math.round(volume * frequency * 0.005 * 12);
        savingsDisplay.textContent = `$${annualSavings.toLocaleString()}`;
    }

    volInput.addEventListener('input', calculate);
    freqInput.addEventListener('input', calculate);
    calculate(); // Initial run
}

// 2. Quick Investment Simulator
function initInvestmentSimulator() {
    const capitalInput = document.getElementById('sim-capital');
    const capitalLabel = document.getElementById('sim-capital-lbl');
    const yieldDisplay = document.getElementById('sim-yield');
    const totalDisplay = document.getElementById('sim-total');
    
    if (!capitalInput) return;

    function calculate() {
        const capital = parseFloat(capitalInput.value);
        capitalLabel.textContent = `$${capital.toLocaleString()}`;
        
        // 8.4% APY
        const rate = 0.084;
        const monthlyYield = (capital * rate) / 12;
        const balance5Y = Math.round(capital * Math.pow(1 + rate, 5));
        
        yieldDisplay.textContent = `$${monthlyYield.toFixed(2)}`;
        totalDisplay.textContent = `$${balance5Y.toLocaleString()}`;
    }

    capitalInput.addEventListener('input', calculate);
    calculate(); // Initial run
}

// 3. Dynamic FAQs Accordion
async function initFAQAccordion() {
    const accordion = document.getElementById('faq-accordion');
    if (!accordion) return;

    try {
        const faqs = await API.getFAQ();
        if (faqs && faqs.length > 0) {
            accordion.innerHTML = faqs.map((faq, index) => `
                <div class="faq-item ${index === 0 ? 'active' : ''}">
                    <div class="faq-question">
                        <span>${faq.question}</span>
                        <span class="faq-toggle">${index === 0 ? '✕' : '+'}</span>
                    </div>
                    <div class="faq-answer" style="max-height: ${index === 0 ? '200px' : '0'}">
                        <p>${faq.answer}</p>
                    </div>
                </div>
            `).join('');
            
            // Add click listeners
            const items = accordion.querySelectorAll('.faq-item');
            items.forEach(item => {
                const question = item.querySelector('.faq-question');
                const answer = item.querySelector('.faq-answer');
                const toggle = item.querySelector('.faq-toggle');
                
                question.addEventListener('click', () => {
                    const isActive = item.classList.contains('active');
                    
                    // Collapse all
                    items.forEach(otherItem => {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-answer').style.maxHeight = '0';
                        otherItem.querySelector('.faq-toggle').textContent = '+';
                    });
                    
                    // Toggle current
                    if (!isActive) {
                        item.classList.add('active');
                        answer.style.maxHeight = '200px';
                        toggle.textContent = '✕';
                    }
                });
            });
        }
    } catch (e) {
        console.error("Error setting up FAQ accordion:", e);
    }
}

// 4. Hover states on spending categories to highlight cashflow chart
function initSpendingCategoryHovers() {
    const items = document.querySelectorAll('.spending-item');
    const bars = document.querySelectorAll('.chart-bar');
    if (items.length === 0 || bars.length === 0) return;

    items.forEach((item, index) => {
        item.addEventListener('mouseenter', () => {
            bars.forEach(bar => bar.classList.remove('active'));
            // Highlight a corresponding bar
            const targetBar = bars[index % bars.length];
            if (targetBar) targetBar.classList.add('active');
        });
        
        item.addEventListener('mouseleave', () => {
            bars.forEach(bar => bar.classList.remove('active'));
            // Highlight default active bar (usually the 5th bar)
            if (bars[4]) bars[4].classList.add('active');
        });
    });
}
