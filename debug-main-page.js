const puppeteer = require('puppeteer');

async function debugMainPage() {
  console.log('🔍 Starting main page debug...');
  
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
    
    // Navigate to main page
    console.log('1. Navigating to main page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait for page to load
    
    // Take screenshot
    await page.screenshot({ path: './debug-main-page.png' });
    console.log('✅ Screenshot saved: debug-main-page.png');
    
    // Get page title
    const title = await page.title();
    console.log('2. Page title:', title);
    
    // Get current URL
    const url = page.url();
    console.log('3. Current URL:', url);
    
    // Get all buttons
    console.log('4. All buttons on page:');
    const buttons = await page.$$('button');
    console.log(`   Found ${buttons.length} buttons`);
    
    for (let i = 0; i < buttons.length; i++) {
      try {
        const text = await page.evaluate(el => el.textContent?.trim() || el.innerText?.trim() || 'no-text', buttons[i]);
        const type = await page.evaluate(el => el.type, buttons[i]);
        const className = await page.evaluate(el => el.className, buttons[i]);
        console.log(`   Button ${i + 1}: type="${type}", text="${text}", class="${className}"`);
      } catch (error) {
        console.log(`   Button ${i + 1}: Error getting details`);
      }
    }
    
    // Get all links
    console.log('5. All links on page:');
    const links = await page.$$('a');
    console.log(`   Found ${links.length} links`);
    
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      try {
        const text = await page.evaluate(el => el.textContent?.trim() || el.innerText?.trim() || 'no-text', links[i]);
        const href = await page.evaluate(el => el.href, links[i]);
        console.log(`   Link ${i + 1}: text="${text}", href="${href}"`);
      } catch (error) {
        console.log(`   Link ${i + 1}: Error getting details`);
      }
    }
    
    // Get all divs with text content
    console.log('6. Divs with text content:');
    const divs = await page.$$('div');
    let divsWithText = 0;
    
    for (let i = 0; i < Math.min(divs.length, 50); i++) {
      try {
        const text = await page.evaluate(el => el.textContent?.trim(), divs[i]);
        if (text && text.length > 0 && text.length < 100) {
          console.log(`   Div ${i + 1}: "${text}"`);
          divsWithText++;
          if (divsWithText >= 20) break; // Limit output
        }
      } catch (error) {
        continue;
      }
    }
    
    // Get page HTML structure (first 2000 chars)
    const html = await page.content();
    console.log('7. Page HTML preview (first 2000 chars):');
    console.log(html.substring(0, 2000));
    
    await browser.close();
    console.log('🎉 Main page debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugMainPage();
