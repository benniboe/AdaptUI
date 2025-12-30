console.log('AdaptiveMenu: Universal version loading...');
console.log('AdaptiveMenu: Page URL:', window.location.href);

// Verfügbarkeit TensorFlow.js
if (typeof tf === 'undefined') {
    console.error('TensorFlow.js not loaded!');
} else {
    console.log('TensorFlow.js loaded successfully');
}

if (typeof NextPagePredictor === 'undefined') {
    console.error('NextPagePredictor class not loaded!');
} else {
    console.log('NextPagePredictor class available');
}

// Menüerkennung

function findNavigationMenus() {
    console.log('Searching for navigation menus...');
    
    const candidates = [];
    
    // <nav> elemente
    const navElements = document.querySelectorAll('nav');
    navElements.forEach(nav => {
        const links = nav.querySelectorAll('a');
        if (links.length >= 3 && links.length <= 20) {
            candidates.push({
                element: nav,
                links: Array.from(links),
                score: 100,
                type: 'nav-element'
            });
            console.log('Found <nav> with', links.length, 'links');
        }
    });
    
    // menü-namen klassen
    const navClasses = [
        'menu', 'navigation', 'navbar', 'nav-bar', 'nav',
        'main-menu', 'primary-menu', 'header-menu', 'top-menu',
        'site-navigation', 'main-navigation'
    ];
    
    navClasses.forEach(className => {
        const elements = document.querySelectorAll(`[class*="${className}"]`);
        elements.forEach(el => {
            const links = el.querySelectorAll('a');
            if (links.length >= 3 && links.length <= 20) {
                const alreadyFound = candidates.some(c => c.element === el);
                if (!alreadyFound) {
                    candidates.push({
                        element: el,
                        links: Array.from(links),
                        score: 80,
                        type: 'class-name'
                    });
                    console.log(`Found .${className} with`, links.length, 'links');
                }
            }
        });
    });
    
    // navigation IDs
    const navIds = ['menu', 'navigation', 'navbar', 'nav', 'main-menu', 'primary-menu'];
    
    navIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const links = el.querySelectorAll('a');
            if (links.length >= 3 && links.length <= 20) {
                const alreadyFound = candidates.some(c => c.element === el);
                if (!alreadyFound) {
                    candidates.push({
                        element: el,
                        links: Array.from(links),
                        score: 90,
                        type: 'id'
                    });
                    console.log(`Found #${id} with`, links.length, 'links');
                }
            }
        }
    });
    
    // listen mit vielen links im header
    const headers = document.querySelectorAll('header, [role="banner"]');
    headers.forEach(header => {
        const lists = header.querySelectorAll('ul, ol');
        lists.forEach(list => {
            const links = list.querySelectorAll('a');
            if (links.length >= 3 && links.length <= 20) {
                const alreadyFound = candidates.some(c => c.element === list);
                if (!alreadyFound) {
                    candidates.push({
                        element: list,
                        links: Array.from(links),
                        score: 70,
                        type: 'header-list'
                    });
                    console.log('Found list in header with', links.length, 'links');
                }
            }
        });
    });
    
    // Scoren und filter
    candidates.forEach(candidate => {
        const inList = candidate.element.tagName === 'UL' || candidate.element.tagName === 'OL';
        if (inList) candidate.score += 10;
        
        const rect = candidate.element.getBoundingClientRect();
        const pageHeight = document.documentElement.scrollHeight;
        if (rect.top < pageHeight * 0.2) candidate.score += 15;
        
        if (candidate.links.length > 15) candidate.score -= 20;
        
        const externalLinks = candidate.links.filter(link => {
            const href = link.getAttribute('href');
            return href && (href.startsWith('http://') || href.startsWith('https://')) 
                   && !href.includes(window.location.hostname);
        });
        if (externalLinks.length > candidate.links.length * 0.5) {
            candidate.score -= 30;
        }
    });
    
    // sortieren
    candidates.sort((a, b) => b.score - a.score);
    
    console.log('Found', candidates.length, 'candidate menus');
    candidates.forEach((c, i) => {
        console.log(`  ${i + 1}. Score: ${c.score}, Type: ${c.type}, Links: ${c.links.length}`);
    });
    
    // top candidate
    if (candidates.length > 0 && candidates[0].score >= 60) {
        console.log('Selected best menu candidate');
        return candidates[0];
    }
    
    console.log('No suitable navigation menu found');
    return null;
}

// HELPER FUNCTIONS

function getCurrentPage() {
    // From URL path
    const path = window.location.pathname;
    let page = path.split('/').filter(p => p).pop();
    
    if (page) {
        page = page.replace('.html', '').replace('.php', '').replace('.aspx', '');
        if (page && page !== 'index') {
            return page.toLowerCase();
        }
    }
    
    // From full URL
    const url = window.location.href;
    const hashMatch = url.match(/#([^?&]+)/);
    if (hashMatch) {
        return hashMatch[1].toLowerCase();
    }
    
    return 'home';
}

function getPageIdentifier(link) {
    
    const dataPage = link.getAttribute('data-page');
    if (dataPage) return dataPage.toLowerCase();
    
    const href = link.getAttribute('href');
    if (href) {
        // entferne domain, protocol, query parameter
        let cleanHref = href.split('?')[0].split('#')[0];
        
        let parts = cleanHref.split('/').filter(p => p);
        let page = parts.pop() || 'home';
        
        // entferne file extension
        page = page.replace(/\.(html|php|aspx|htm|jsp)$/, '');
        
        if (page && page !== 'index') {
            return page.toLowerCase();
        }
    }
    
    // Fallback: link text
    return link.textContent.trim().toLowerCase().replace(/\s+/g, '-');
}

function getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    let timeSlot;
    if (hour >= 6 && hour < 12) timeSlot = 'morning';
    else if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
    else if (hour >= 18 && hour < 24) timeSlot = 'evening';
    else timeSlot = 'night';
    
    const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';
    
    return { timeSlot, dayType, hour };
}

// TRACKING

let trackedMenu = null;

function trackMenuInteraction(menuData) {
    if (!menuData || !menuData.links) {
        console.log('No menu data to track');
        return;
    }
    
    trackedMenu = menuData;
    
    console.log('Setting up tracking for', menuData.links.length, 'links...');
    
    menuData.links.forEach((link, index) => {
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        menuData.links[index] = newLink;
        
        newLink.addEventListener('click', function(e) {
            const pageId = getPageIdentifier(this);
            const currentPage = getCurrentPage();
            const context = getTimeContext();
            
            console.log(`Clicked "${pageId}" (from "${currentPage}")`);
            
            // domain-specific storage key
            const domain = window.location.hostname || 'local';
            const storageKey = `adaptui_${domain}`;
            
            chrome.storage.local.get([storageKey], function(result) {
                if (chrome.runtime.lastError) {
                    console.error('Storage error:', chrome.runtime.lastError);
                    return;
                }
                
                let siteData = result[storageKey] || {
                    menuClicks: {},
                    timePatterns: {
                        morning: {}, afternoon: {}, evening: {}, night: {},
                        weekday: {}, weekend: {}
                    },
                    clickSequence: []
                };
                
                // Update clicks
                siteData.menuClicks[pageId] = (siteData.menuClicks[pageId] || 0) + 1;
                
                // Update time patterns
                if (!siteData.timePatterns[context.timeSlot]) {
                    siteData.timePatterns[context.timeSlot] = {};
                }
                siteData.timePatterns[context.timeSlot][pageId] = 
                    (siteData.timePatterns[context.timeSlot][pageId] || 0) + 1;
                
                if (!siteData.timePatterns[context.dayType]) {
                    siteData.timePatterns[context.dayType] = {};
                }
                siteData.timePatterns[context.dayType][pageId] = 
                    (siteData.timePatterns[context.dayType][pageId] || 0) + 1;
                
                // Update sequence
                siteData.clickSequence.push({
                    from: currentPage,
                    to: pageId,
                    timestamp: Date.now(),
                    timeSlot: context.timeSlot,
                    dayType: context.dayType
                });
                
                if (siteData.clickSequence.length > 200) {
                    siteData.clickSequence = siteData.clickSequence.slice(-200);
                }
                
                // Save
                chrome.storage.local.set({ [storageKey]: siteData }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Save error:', chrome.runtime.lastError);
                    } else {
                        console.log('Data saved for', domain);
                    }
                });
            });
        });
    });
}

// ADAPTATION FUNCTIONS

function adaptMenu(menuData) {
    if (!menuData || !menuData.links) {
        console.log('No menu to adapt');
        return;
    }
    
    const domain = window.location.hostname || 'local';
    const storageKey = `adaptui_${domain}`;
    
    chrome.storage.local.get([storageKey], function(result) {
        if (chrome.runtime.lastError) {
            console.error('Error reading storage:', chrome.runtime.lastError);
            return;
        }
        
        const siteData = result[storageKey] || { menuClicks: {} };
        const clicks = siteData.menuClicks || {};
        
        console.log('Retrieved click data:', clicks);
        
        if (Object.keys(clicks).length === 0) {
            console.log('No click data yet');
            return;
        }
        
        // menu item data
        let linkData = [];
        menuData.links.forEach(link => {
            const pageId = getPageIdentifier(link);
            const clickCount = clicks[pageId] || 0;
            
            linkData.push({
                element: link,
                pageId: pageId,
                clicks: clickCount
            });
        });
        
        // Sortieren nach Klicks
        linkData.sort((a, b) => b.clicks - a.clicks);
        
        console.log('Sorted links:', linkData.map(d => `${d.pageId}: ${d.clicks}`));
        
        // parent container
        let container = menuData.element;
        if (menuData.element.tagName === 'NAV') {
            const list = menuData.element.querySelector('ul, ol');
            if (list) container = list;
        }
        
        // Reset styles
        menuData.links.forEach(link => {
            link.style.fontSize = '';
            link.style.fontWeight = '';
            link.style.opacity = '';
            link.style.backgroundColor = '';
            link.style.padding = '';
            link.style.border = '';
            link.style.boxShadow = '';
            link.style.background = '';
            link.style.transform = '';
        });
        
        // Reorder and style
        linkData.forEach((item, index) => {
            const link = item.element;
            const parent = link.parentElement;
            
            // Reorder (nicht implementiert)
            //if (parent && container.contains(parent)) {
            //    container.appendChild(parent);
        })
            
            // Style by popularity
            if (item.clicks >= 5) {
                link.style.fontWeight = 'bold';
                link.style.transform = 'scale(1.05)';
                console.log(`"${item.pageId}" - VERY POPULAR`);
            } else if (item.clicks >= 3) {
                link.style.fontWeight = '600';
                console.log(`"${item.pageId}" - Popular`);
            }
            
            // Fade unused
            if (linkData.length > 3 && item.clicks === 0 && index >= 3) {
                link.style.opacity = '0.6';
            }
            
            // Highlight top
            if (index === 0 && item.clicks > 0) {
                link.style.backgroundColor = 'rgba(52, 152, 219, 0.15)';
                link.style.borderRadius = '4px';
                link.style.padding = '4px 8px';
            }
        });
        
        console.log('Frequency adaptation complete');
    };

function adaptMenuByTime(menuData) {
    if (!menuData || !menuData.links) return;
    
    const domain = window.location.hostname || 'local';
    const storageKey = `adaptui_${domain}`;
    const context = getTimeContext();
    
    chrome.storage.local.get([storageKey], function(result) {
        if (chrome.runtime.lastError) return;
        
        const siteData = result[storageKey] || { timePatterns: {} };
        const patterns = siteData.timePatterns || {};
        
        const currentTimePattern = patterns[context.timeSlot] || {};
        const currentDayPattern = patterns[context.dayType] || {};
        
        if (Object.keys(currentTimePattern).length === 0 && 
            Object.keys(currentDayPattern).length === 0) {
            console.log('Time: Not enough context data yet');
            return;
        }
        
        // Combine patterns
        let combinedPattern = {};
        for (let page in currentTimePattern) {
            combinedPattern[page] = (combinedPattern[page] || 0) + currentTimePattern[page] * 0.6;
        }
        for (let page in currentDayPattern) {
            combinedPattern[page] = (combinedPattern[page] || 0) + currentDayPattern[page] * 0.4;
        }
        
        // Find top page
        let topPage = null;
        let maxScore = 0;
        for (let page in combinedPattern) {
            if (combinedPattern[page] > maxScore) {
                maxScore = combinedPattern[page];
                topPage = page;
            }
        }
        
        if (!topPage) return;
        
        console.log(`Time: Recommending "${topPage}"`);
        
        // Highlight
        menuData.links.forEach(link => {
            const pageId = getPageIdentifier(link);
            if (pageId === topPage) {
                link.style.border = '2px dashed #f39c12';
                link.style.borderRadius = '4px';
                link.style.padding = '4px 8px';
                
                const emoji = context.timeSlot === 'morning' ? '🌅' : 
                             context.timeSlot === 'afternoon' ? '☀️' : 
                             context.timeSlot === 'evening' ? '🌆' : '🌙';
                
                link.setAttribute('title', `${emoji} Popular during ${context.timeSlot}`);
                console.log(`Time: Highlighted "${topPage}"`);
            }
        });
    });
}

// ML VORHERSAGe

let mlPredictor = null;
let mlReady = false;

async function initializeMLPredictor(menuData) {
    if (typeof tf === 'undefined' || typeof NextPagePredictor === 'undefined') {
        console.log('Prerequisites not met');
        return;
    }
    
    const domain = window.location.hostname || 'local';
    const storageKey = `adaptui_${domain}`;
    
    chrome.storage.local.get([storageKey], async function(result) {
        const siteData = result[storageKey] || { clickSequence: [] };
        const sequence = siteData.clickSequence || [];
        
        console.log('Found', sequence.length, 'sequences for', domain);
        
        if (sequence.length < 15) {
            console.log(`Need 15+ clicks (have ${sequence.length})`);
            return;
        }
        
        if (!mlPredictor) {
            mlPredictor = new NextPagePredictor();
        }
        
        console.log('Training...');
        const trained = await mlPredictor.train(sequence);
        
        if (trained) {
            mlReady = true;
            console.log('Model trained!');
            applyMLPrediction(menuData);
        }
    });
}

async function applyMLPrediction(menuData) {
    if (!mlReady || !mlPredictor || !menuData) return;
    
    const currentPage = getCurrentPage();
    const prediction = mlPredictor.predict(currentPage);
    
    if (!prediction) {
        console.log('No prediction');
        return;
    }
    
    console.log(`Predicting: "${currentPage}" → "${prediction.page}"`);
    
    menuData.links.forEach(link => {
        const pageId = getPageIdentifier(link);
        if (pageId === prediction.page || prediction.page.includes(pageId) || pageId.includes(prediction.page)) {
            link.style.border = '2px solid #27ae60';
            link.style.boxShadow = '0 0 10px rgba(39, 174, 96, 0.4)';
            link.style.borderRadius = '4px';
            link.style.padding = '4px 8px';
            
            const badge = document.createElement('span');
            badge.textContent = ' 🤖';
            badge.style.fontSize = '0.8em';
            badge.setAttribute('data-ml-badge', 'true');
            
            if (!link.querySelector('[data-ml-badge]')) {
                link.appendChild(badge);
            }
            
            link.setAttribute('title', `AI prediction (${(prediction.confidence * 100).toFixed(0)}%)`);
            console.log(`Highlighted "${pageId}"`);
        }
    });
}

// INITIALISIERUNG

function init() {
    console.log('Initializing universal detection...');
    
    // navigation menu
    const menuData = findNavigationMenus();
    
    if (!menuData) {
        console.log('No navigation menu detected on this page');
        return;
    }
    
    console.log('Menu detected, setting up...');
    
    // Track interaktionen
    trackMenuInteraction(menuData);
    
    // adaptationen
    setTimeout(() => {
        adaptMenu(menuData);
        
        setTimeout(() => {
            adaptMenuByTime(menuData);
        }, 500);
        
        setTimeout(() => {
            initializeMLPredictor(menuData);
        }, 1000);
    }, 1000);
}

// beim laden ausführen
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    setTimeout(init, 500);
}

// dynamic menus
const observer = new MutationObserver(() => {
    const nav = document.querySelector('nav');
    if (nav && !nav.dataset.adaptiveTracked) {
        nav.dataset.adaptiveTracked = 'true';
        console.log('Dynamic menu detected');
        init();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('Universal version loaded');