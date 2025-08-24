const puppeteer = require('puppeteer');

async function debugRegistration() {
  console.log('🔍 Starting registration page debug...');
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    
    // Navigate to registration page
    console.log('1. Navigating to registration page...');
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for page to load
    
    // Take screenshot
    await page.screenshot({ path: './debug-registration.png' });
    console.log('✅ Screenshot saved: debug-registration.png');
    
    // Get page title
    const title = await page.title();
    console.log('2. Page title:', title);
    
    // Get current URL
    const url = page.url();
    console.log('3. Current URL:', url);
    
    // Check for common form elements
    console.log('4. Checking for form elements...');
    
    const selectors = [
      'input[name="name"]',
      'input[name="email"]', 
      'input[name="password"]',
      'input[name="confirmPassword"]',
      'button[type="submit"]',
      'form',
      '[data-testid="register-form"]',
      '.register-form',
      '#register-form'
    ];
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Found: ${selector}`);
        } else {
          console.log(`❌ Not found: ${selector}`);
        }
      } catch (error) {
        console.log(`❌ Error checking: ${selector}`);
      }
    }
    
    // Get all input elements
    console.log('5. All input elements on page:');
    const inputs = await page.$$('input');
    for (let i = 0; i < inputs.length; i++) {
      try {
        const name = await inputs[i].evaluate(el => el.name || el.id || el.placeholder || 'unnamed');
        const type = await inputs[i].evaluate(el => el.type);
        console.log(`   Input ${i + 1}: type="${type}", name/id/placeholder="${name}"`);
      } catch (error) {
        console.log(`   Input ${i + 1}: Error getting details`);
      }
    }
    
    // Get all buttons
    console.log('6. All buttons on page:');
    const buttons = await page.$$('button');
    for (let i = 0; i < buttons.length; i++) {
      try {
        const text = await buttons[i].evaluate(el => el.textContent?.trim() || el.innerText?.trim() || 'no-text');
        const type = await buttons[i].evaluate(el => el.type);
        console.log(`   Button ${i + 1}: type="${type}", text="${text}"`);
      } catch (error) {
        console.log(`   Button ${i + 1}: Error getting details`);
      }
    }
    
    // Get page HTML structure (first 1000 chars)
    const html = await page.content();
    console.log('7. Page HTML preview (first 1000 chars):');
    console.log(html.substring(0, 1000));
    
    await browser.close();
    console.log('🎉 Registration page debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugRegistration();
