/* ==========================================================================
   Pretty Moments - E-commerce Engine & Dynamic Database Logic
   ========================================================================== */

// Default Fallback Products
const DEFAULT_PRODUCTS = [];

// Active Products Mapping (populated dynamically from database)
let PRODUCTS = {};
let productsList = [];

// Global Shopping Cart State
let cart = [];

// Supabase Client Connection
let supabaseClient = null;
let isOnlineMode = false;

if (typeof supabase !== 'undefined' && typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
  supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  isOnlineMode = true;
}

// Active Order Information
let currentOrderRef = '';
let currentPaymentMethod = '';

async function injectGlobalHeader() {
  const placeholder = document.getElementById('global-header-placeholder');
  if (!placeholder) return;

  try {
    const response = await fetch('header.html');
    const html = await response.text();
    placeholder.outerHTML = html;
  } catch (err) {
    console.error('Error loading header:', err);
  }
}

async function injectGlobalFooter() {
  const placeholder = document.getElementById('global-footer-placeholder');
  if (!placeholder) return;

  try {
    const response = await fetch('footer.html');
    const html = await response.text();
    placeholder.outerHTML = html;
  } catch (err) {
    console.error('Error loading footer:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await injectGlobalHeader();
  await injectGlobalFooter();
  initNavbar();
  initFloatingShapes();
  initCollectionsFilter();
  initGalleryLightbox();
  initTestimonialsSlider();
  initContactForm();
  
  // Database & Catalog Setup
  initDatabase();
});

/* 0. Navbar Scroll and Mobile Responsive Navigation */
function initNavbar() {
  const header = document.getElementById('site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.getElementById('main-nav');
  
  // Rebind the cart toggle button after injection
  const globalCartBtn = document.getElementById('global-cart-btn');
  if (globalCartBtn) {
    globalCartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCart();
    });
  }

  if(!header) return;

  // Add scroll listener to add .scrolled class
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile menu hamburger toggle
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
      menuToggle.setAttribute('aria-expanded', !expanded);
      menuToggle.classList.toggle('open');
      mainNav.classList.toggle('active');
    });

    // Close menu when clicking link
    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('open');
        mainNav.classList.remove('active');
      });
    });
  }

  // --- Active Nav Link Indicator ---
  const currentPath = window.location.pathname;
  const navLinksList = document.querySelectorAll('#main-nav a');

  function removeAllActive() {
    navLinksList.forEach(l => l.classList.remove('active'));
  }

  function highlightNavigation() {
    removeAllActive();
    
    const isAbout = currentPath.includes('about');
    const isShop = currentPath.includes('shop');
    const isGallery = currentPath.includes('gallery');
    const isContact = currentPath.includes('contact');

    let activeLink = null;
    if (isAbout) {
      activeLink = Array.from(navLinksList).find(l => l.getAttribute('href') === 'about');
    } else if (isShop) {
      activeLink = Array.from(navLinksList).find(l => l.getAttribute('href') === 'shop');
    } else if (isGallery) {
      activeLink = Array.from(navLinksList).find(l => l.getAttribute('href') === 'gallery');
    } else if (isContact) {
      activeLink = Array.from(navLinksList).find(l => l.getAttribute('href') === 'contact');
    } else {
      activeLink = Array.from(navLinksList).find(l => l.getAttribute('href') === './' || l.getAttribute('href') === './index.html');
    }

    if (activeLink) activeLink.classList.add('active');
  }

  highlightNavigation(); // Run on initialization

  // --- Intersection Observer for Reveal Animations ---
  window.revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  });

  const revealElements = document.querySelectorAll('.reveal');
  revealElements.forEach(el => window.revealObserver.observe(el));
}

/* 1. Database Connection & Catalog Rendering */
async function initDatabase() {
  // Load categories and products
  await loadStoreCategories();
  renderStoreCategories();
  await loadCatalogProducts();
  
  // Initialize E-commerce UI
  initCartDrawer();
  initCatalogQtyControls();
  initInvoiceModal();
  updateCartBadge();
}

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Wedding & Engagement', slug: 'wedding' },
  { id: 2, name: 'Baby Shower', slug: 'baby' },
  { id: 3, name: 'Graduation', slug: 'graduation' },
  { id: 4, name: 'Artisan Soaps', slug: 'soaps' }
];

let categoriesList = [];

async function loadStoreCategories() {
  if (isOnlineMode) {
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      categoriesList = data || [];
    } catch (err) {
      console.error('Error fetching categories from Supabase, using local fallback:', err);
      loadLocalCategories();
    }
  } else {
    loadLocalCategories();
  }
}

function loadLocalCategories() {
  let localCats = localStorage.getItem('pretty_moments_categories');
  if (!localCats) {
    localStorage.setItem('pretty_moments_categories', JSON.stringify(DEFAULT_CATEGORIES));
    categoriesList = [...DEFAULT_CATEGORIES];
  } else {
    categoriesList = JSON.parse(localCats);
  }
}

function renderStoreCategories() {
  const container = document.getElementById('collections-tabs-container');
  if (!container) return; // not on shop page

  let html = '<button class="tab-btn active" data-filter="all">All Designs</button>';
  categoriesList.forEach(c => {
    html += `<button class="tab-btn" data-filter="${c.slug}">${escapeHtml(c.name)}</button>`;
  });
  container.innerHTML = html;

  // Re-initialize click listeners for the filter tabs
  initCollectionsFilter();
}

async function loadCatalogProducts() {
  let rawProductsList = [];
  if (isOnlineMode) {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });
      
      if (error) throw error;
      rawProductsList = data || [];
    } catch (err) {
      console.error('Error fetching from Supabase, using local fallback:', err);
      isOnlineMode = false;
      rawProductsList = loadLocalProductsRaw();
    }
  } else {
    rawProductsList = loadLocalProductsRaw();
  }

  // Populate dynamic mapping for cart calculations (contains all products)
  PRODUCTS = {};
  rawProductsList.forEach(p => {
    PRODUCTS[p.id] = {
      id: p.id,
      name: p.name,
      price: parseFloat(p.price),
      minQty: parseInt(p.min_qty || p.minQty || 10),
      img: p.img,
      category: p.category,
      description: p.description
    };
  });

  // Decide what to render based on the current page
  const hasTabsContainer = document.getElementById('collections-tabs-container') !== null;
  if (!hasTabsContainer) {
    // index.html homepage: Show latest 3 products
    productsList = rawProductsList.slice(-3).reverse();
  } else {
    // shop.html full shop: Show all active products
    productsList = rawProductsList;
  }

  renderCatalogGrid();
}

function loadLocalProductsRaw() {
  try {
    let localData = localStorage.getItem('pretty_moments_products');
    if (!localData) {
      localStorage.setItem('pretty_moments_products', JSON.stringify(DEFAULT_PRODUCTS));
      return [...DEFAULT_PRODUCTS];
    } else {
      const allProducts = JSON.parse(localData);
      return allProducts.filter(p => p.is_active);
    }
  } catch (err) {
    console.error('Error parsing local products, resetting:', err);
    localStorage.setItem('pretty_moments_products', JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }
}

function renderCatalogGrid() {
  const container = document.getElementById('collections-grid');
  if (!container) return;

  if (productsList.length === 0) {
    container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-light); padding:40px;">No active products to display.</p>';
    return;
  }

  let html = '';
  productsList.forEach(p => {
    const minQty = parseInt(p.min_qty || p.minQty || 10);
    const price = parseFloat(p.price).toFixed(2);
    
    // Map category values to display titles
    let catTitle = 'Bespoke Favors';
    if (p.category === 'wedding') catTitle = 'Wedding & Engagement';
    else if (p.category === 'baby') catTitle = 'Baby Shower';
    else if (p.category === 'graduation') catTitle = 'Graduation';
    else if (p.category === 'soaps') catTitle = 'Artisan Soaps';

    html += `
      <div class="collection-card reveal reveal-delay-1" data-category="${p.category}">
        <div class="collection-img-box">
          <img src="${p.img}" alt="${escapeHtml(p.name)}">
          <div class="collection-overlay">
            <button class="collection-overlay-btn" aria-label="Quick View" onclick="triggerQuickView('${p.img}', '${escapeHtml(p.name)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="collection-info">
          <span class="collection-category">${catTitle}</span>
          <h3 class="collection-title">${escapeHtml(p.name)}</h3>
          <div class="product-price-row">
            <span class="product-price">$${price} <span style="font-size:0.78rem; font-weight:400; color:var(--text-light);">/ pc</span></span>
            <span class="product-min-qty">Min: ${minQty} pcs</span>
          </div>
          <p class="collection-desc">${escapeHtml(p.description || '')}</p>
          
          <!-- Qty Selector & Add to Cart -->
          <div class="catalog-qty-selector">
            <button type="button" class="catalog-qty-btn qty-minus" aria-label="Decrease quantity" data-id="${p.id}">-</button>
            <input type="number" class="catalog-qty-input" min="${minQty}" value="${minQty}" readonly id="qty-input-${p.id}">
            <button type="button" class="catalog-qty-btn qty-plus" aria-label="Increase quantity" data-id="${p.id}">+</button>
          </div>
          <button class="btn btn-primary add-to-cart-btn" data-product-id="${p.id}">Add to Cart</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  
  // Re-run tab filter just in case the active filter was different
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab) {
    activeTab.click();
  }

  // Observe newly added products
  if (window.revealObserver) {
    const newReveals = container.querySelectorAll('.reveal');
    newReveals.forEach(el => window.revealObserver.observe(el));
  }
}

// Lightbox popup for overlay button
window.triggerQuickView = function(imgSrc, altText) {
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox ? lightbox.querySelector('img') : null;
  if (lightbox && lightboxImg) {
    lightboxImg.src = imgSrc;
    lightboxImg.alt = altText;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

/* 2. Floating Petals & Sparkles Background Animation */
function initFloatingShapes() {
  const shapes = [
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C9.5 6 6.5 10 6.5 14C6.5 17.5 9 20.5 12 20.5C15 20.5 17.5 17.5 17.5 14C17.5 10 14.5 6 12 2Z" fill="currentColor"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="currentColor"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="7" r="4" fill="currentColor"/><circle cx="12" cy="17" r="4" fill="currentColor"/><circle cx="7" cy="12" r="4" fill="currentColor"/><circle cx="17" cy="12" r="4" fill="currentColor"/></svg>`
  ];

  const colors = [
    '#e4dfd5', '#ffffff', '#ebdcb9', '#d9eeee'
  ];

  function spawnShape() {
    const container = document.body;
    if (!container) return;
    const div = document.createElement('div');
    div.classList.add('floating-shape');

    const shapeType = Math.floor(Math.random() * shapes.length);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.floor(Math.random() * 12) + 8;
    const leftPos = Math.random() * 100;
    const duration = Math.random() * 10 + 10;
    const delay = Math.random() * 3;
    const targetOpacity = (Math.random() * 0.12 + 0.05).toFixed(2);
    const targetScale = (Math.random() * 0.4 + 0.4).toFixed(2);

    div.innerHTML = shapes[shapeType];
    div.style.width = size + 'px';
    div.style.height = size + 'px';
    div.style.color = color;
    div.style.left = leftPos + 'vw';
    div.style.animationDuration = duration + 's';
    div.style.animationDelay = delay + 's';
    div.style.setProperty('--target-opacity', targetOpacity);
    div.style.setProperty('--target-scale', targetScale);

    container.appendChild(div);

    setTimeout(() => {
      div.remove();
    }, (duration + delay) * 1000);
  }

  for (let i = 0; i < 6; i++) {
    spawnShape();
  }
  setInterval(spawnShape, 3500);
}

/* 3. Collections Tab Filter */
function initCollectionsFilter() {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');
      const collectionCards = document.querySelectorAll('.collection-card');

      collectionCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        
        if (filterValue === 'all' || cardCategory === filterValue) {
          card.style.display = 'flex';
          card.style.animation = 'none';
          card.offsetHeight;
          card.style.animation = 'fadeIn 0.5s ease forwards';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* 4. E-commerce Event Delegation: Qty adjustments on dynamic list */
function initCatalogQtyControls() {
  const grid = document.getElementById('collections-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    // Plus Button Clicks
    if (e.target.classList.contains('qty-plus')) {
      const id = e.target.getAttribute('data-id');
      const input = document.getElementById(`qty-input-${id}`);
      input.value = parseInt(input.value) + 5;
    }
    
    // Minus Button Clicks
    if (e.target.classList.contains('qty-minus')) {
      const id = e.target.getAttribute('data-id');
      const input = document.getElementById(`qty-input-${id}`);
      const minVal = parseInt(input.getAttribute('min')) || 10;
      let val = parseInt(input.value);
      if (val > minVal) {
        input.value = val - 5;
      }
    }

    // Add to Cart Button Clicks
    if (e.target.classList.contains('add-to-cart-btn')) {
      const id = parseInt(e.target.getAttribute('data-product-id'));
      const input = document.getElementById(`qty-input-${id}`);
      const qty = parseInt(input.value);
      addToCart(id, qty);
    }
  });
}

/* 5. Cart Management & Drawer Controls */
function initCartDrawer() {
  const cartBtn = document.querySelector('.floating-cart-btn');
  const cartLink = document.querySelector('.nav-cta');
  const cartDrawer = document.querySelector('.cart-drawer');
  const cartClose = document.querySelector('.cart-close-btn');
  const cartOverlay = document.querySelector('.cart-overlay');

  const openDrawer = (e) => {
    if(e) e.preventDefault();
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (cartBtn) cartBtn.addEventListener('click', openDrawer);
  if (cartLink) cartLink.addEventListener('click', openDrawer);
  if (cartClose) cartClose.addEventListener('click', closeDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeDrawer);

  const cartForm = document.getElementById('checkout-info-form');
  if (cartForm) {
    cartForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (cart.length === 0) {
        alert('Your cart is empty. Please add items to checkout.');
        return;
      }

      const name = document.getElementById('cust-name').value.trim();
      const phone = document.getElementById('cust-phone').value.trim();
      const address = document.getElementById('cust-address').value.trim();
      const methodVal = document.querySelector('input[name="payment-method"]:checked').value;
      
      currentPaymentMethod = methodVal === 'invoice' ? 'Custom Invoice / Bank Transfer' : 'Online Payment';
      currentOrderRef = 'PM-' + Math.floor(10000 + Math.random() * 90000); // e.g. PM-82910

      const subtotal = getCartTotal();
      const total = subtotal;

      const submitBtn = cartForm.querySelector('.checkout-btn');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Processing Order...';
      submitBtn.disabled = true;

      try {
        await saveOrderToDatabase({
          order_ref: currentOrderRef,
          customer_name: name,
          customer_phone: phone,
          customer_address: address,
          payment_method: currentPaymentMethod,
          subtotal: subtotal,
          total: total,
          items: cart
        });
        
        closeDrawer();
        openInvoice();
      } catch (err) {
        alert('Failed to save order: ' + err.message);
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
}

// Add Item to Cart
function addToCart(productId, qty) {
  const product = PRODUCTS[productId];
  if (!product) return;

  const min = product.minQty;
  if (qty < min) {
    alert(`The minimum order quantity for ${product.name} is ${min} pieces.`);
    return;
  }

  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.qty = qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: qty,
      img: product.img
    });
  }

  updateCartBadge();
  renderCart();
  
  const cartBtn = document.querySelector('.floating-cart-btn');
  if (cartBtn) {
    cartBtn.style.transform = 'scale(1.2) rotate(10deg)';
    setTimeout(() => {
      cartBtn.style.transform = '';
    }, 300);
  }
}

// Update Cart Quantity (exposed globally)
window.updateCartItemQty = function(productId, newQty) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  const productDef = PRODUCTS[productId];
  if (newQty < productDef.minQty) {
    alert(`The minimum order quantity for this item is ${productDef.minQty}.`);
    return;
  }

  item.qty = newQty;
  renderCart();
  updateCartBadge();
};

// Remove from Cart (exposed globally)
window.removeFromCart = function(productId) {
  cart = cart.filter(i => i.id !== productId);
  renderCart();
  updateCartBadge();
};

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-count');
  const count = cart.length;

  badges.forEach(badge => {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
}

function renderCart() {
  const listContainer = document.querySelector('.cart-items-list');
  const subtotalDisplay = document.getElementById('cart-subtotal');
  const totalDisplay = document.getElementById('cart-total');

  if (!listContainer) return;

  if (cart.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-cart-view">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p>Your shopping cart is empty.</p>
        <p style="font-size:0.75rem; margin-top:4px;">Add custom favors to get started!</p>
      </div>
    `;
    subtotalDisplay.textContent = '$0.00';
    totalDisplay.textContent = '$0.00';
    return;
  }

  let html = '';
  cart.forEach(item => {
    const itemTotal = (item.price * item.qty).toFixed(2);
    html += `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${item.img}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
          <span class="cart-item-price">$${item.price.toFixed(2)} / pc</span>
          
          <div class="cart-item-actions">
            <div class="cart-qty-adjuster">
              <button type="button" class="cart-qty-btn" onclick="updateCartItemQty(${item.id}, ${item.qty - 5})">-</button>
              <span class="cart-qty-val">${item.qty}</span>
              <button type="button" class="cart-qty-btn" onclick="updateCartItemQty(${item.id}, ${item.qty + 5})">+</button>
            </div>
            <button type="button" class="cart-item-delete" onclick="removeFromCart(${item.id})" aria-label="Remove item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div style="font-weight:600; font-size:0.9rem; align-self: flex-start; margin-top:2px;">$${itemTotal}</div>
      </div>
    `;
  });

  listContainer.innerHTML = html;
  
  const subtotal = getCartTotal().toFixed(2);
  subtotalDisplay.textContent = `$${subtotal}`;
  totalDisplay.textContent = `$${subtotal}`;
}

/* 6. Invoice Modal Overlay Controls */
function initInvoiceModal() {
  const modal = document.querySelector('.invoice-modal');
  const closeBtn = document.querySelector('.invoice-close-btn');
  const printBtn = document.getElementById('print-invoice-btn');
  const finalCheckoutBtn = document.getElementById('whatsapp-checkout-btn');

  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (finalCheckoutBtn) {
    finalCheckoutBtn.addEventListener('click', () => {
      submitToWhatsApp();
      closeModal();
    });
  }
}

async function saveOrderToDatabase(orderData) {
  if (isOnlineMode) {
    // 1. Insert header
    const { data: headerData, error: headerErr } = await supabaseClient
      .from('orders')
      .insert([{
        order_ref: orderData.order_ref,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_address: orderData.customer_address,
        payment_method: orderData.payment_method,
        subtotal: orderData.subtotal,
        total: orderData.total,
        status: 'pending'
      }])
      .select();

    if (headerErr) throw headerErr;
    
    const insertedOrderId = headerData[0].id;

    // 2. Insert items
    const itemsToInsert = orderData.items.map(item => ({
      order_id: insertedOrderId,
      product_id: item.id,
      product_name: item.name,
      price: item.price,
      qty: item.qty
    }));

    const { error: itemsErr } = await supabaseClient
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsErr) throw itemsErr;
  } else {
    // Local Mode fallback
    let localOrders = localStorage.getItem('pretty_moments_orders');
    let ordersList = localOrders ? JSON.parse(localOrders) : [];
    const nextId = ordersList.length > 0 ? Math.max(...ordersList.map(o => o.id)) + 1 : 1;
    
    const newOrder = {
      id: nextId,
      created_at: new Date().toISOString(),
      order_ref: orderData.order_ref,
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      customer_address: orderData.customer_address,
      payment_method: orderData.payment_method,
      subtotal: orderData.subtotal,
      total: orderData.total,
      status: 'pending',
      items: orderData.items.map(item => ({
        product_id: item.id,
        product_name: item.name,
        price: item.price,
        qty: item.qty
      }))
    };

    ordersList.push(newOrder);
    localStorage.setItem('pretty_moments_orders', JSON.stringify(ordersList));
  }
}

function openInvoice() {
  const modal = document.querySelector('.invoice-modal');
  const itemsContainer = document.querySelector('.invoice-items');
  const subtotalField = document.getElementById('inv-subtotal');
  const totalField = document.getElementById('inv-total');
  
  const nameInput = document.getElementById('cust-name').value.trim();
  const phoneInput = document.getElementById('cust-phone').value.trim();
  const addressInput = document.getElementById('cust-address').value.trim();

  document.getElementById('inv-cust-name').textContent = nameInput;
  document.getElementById('inv-cust-phone').textContent = phoneInput;
  document.getElementById('inv-cust-address').textContent = addressInput;
  document.getElementById('inv-order-ref').textContent = currentOrderRef;
  document.getElementById('inv-payment-method').textContent = currentPaymentMethod;

  let html = '';
  cart.forEach(item => {
    const total = (item.price * item.qty).toFixed(2);
    html += `
      <div class="invoice-item-row">
        <span>${escapeHtml(item.name)}</span>
        <span class="qty">${item.qty}x</span>
        <span class="total">$${total}</span>
      </div>
    `;
  });
  itemsContainer.innerHTML = html;

  const totalVal = getCartTotal().toFixed(2);
  subtotalField.textContent = `$${totalVal}`;
  totalField.textContent = `$${totalVal}`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function submitToWhatsApp() {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  
  const businessPhone = '15047778801';

  let text = `✨ *PRETTY MOMENTS - DESIGN INQUIRY* ✨\n`;
  text += `----------------------------------\n`;
  text += `Hello Pretty Moments! 🌸\nI would like to request a custom quote for the following:\n\n`;
  text += `🆔 *Order Reference:* \`${currentOrderRef}\`\n`;
  text += `💳 *Payment Method:* ${currentPaymentMethod}\n\n`;
  
  text += `📦 *ORDERED ITEMS:*\n`;
  cart.forEach(item => {
    const itemTotal = (item.price * item.qty).toFixed(2);
    text += `• ${item.qty}x ${item.name} ($${item.price.toFixed(2)}/pc) - $${itemTotal}\n`;
  });
  text += `\n`;

  const total = getCartTotal().toFixed(2);
  text += `💰 *FINANCIAL SUMMARY:*\n`;
  text += `• Subtotal: $${total}\n`;
  text += `• Shipping: Calculated on chat\n`;
  text += `• *Total: $${total}*\n\n`;

  text += `👤 *DELIVERY INFORMATION:*\n`;
  text += `• Name: ${name}\n`;
  text += `• Phone: ${phone}\n`;
  text += `• Address: ${address}\n`;
  text += `----------------------------------\n`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodedText}`;
  
  window.open(whatsappUrl, '_blank');

  // Clear the Cart after checkout redirect
  cart = [];
  updateCartBadge();
  renderCart();
  document.getElementById('checkout-overlay').style.display = 'none';
}

/* ==========================================================================
   Gallery Management System
   ========================================================================== */
const DEFAULT_GALLERY = [];

async function fetchGalleryItems() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('gallery').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase gallery error, falling back to local:", e);
    }
  }
  
  let localData = localStorage.getItem('pretty_moments_gallery');
  if (!localData) {
    localStorage.setItem('pretty_moments_gallery', JSON.stringify(DEFAULT_GALLERY));
    return DEFAULT_GALLERY;
  }
  return JSON.parse(localData);
}

function createGalleryHTML(item, index) {
  const isTall = item.isTall ? 'tall' : '';
  const delayClass = `reveal-delay-${(index % 3) + 1}`;
  
  let mediaHtml = '';
  if (item.type === 'video') {
    mediaHtml = `<video src="${item.url}" autoplay muted loop playsinline></video>`;
  } else {
    mediaHtml = `<img src="${item.url}" alt="${item.title}">`;
  }

  return `
    <div class="gallery-item reveal ${isTall} ${delayClass}" data-id="${item.id}">
      ${mediaHtml}
      <div class="gallery-overlay">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
      </div>
    </div>
  `;
}

window.initDynamicGallery = async function() {
  const grid = document.getElementById('dynamic-gallery-grid');
  if (!grid) return;
  
  const items = await fetchGalleryItems();
  
  let isHome = document.body.classList.contains('home-page') || window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
  
  let itemsToRender = items;
  if (isHome) {
    // Only show latest 2 items on home page
    itemsToRender = items.slice(0, 2);
    // Force CSS to show 2 items nicely on desktop instead of 4 columns
    grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  } else {
    // On gallery page, make sure columns are 4
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  }
  
  let html = '';
  itemsToRender.forEach((item, idx) => {
    html += createGalleryHTML(item, idx);
  });
  
  grid.innerHTML = html;
  
  if (window.revealObserver) {
    const newReveals = grid.querySelectorAll('.reveal');
    newReveals.forEach(el => window.revealObserver.observe(el));
  }
};

// Also init gallery when DOM is ready in app.js for index.html
document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('dynamic-gallery-grid')){
    if(typeof window.initDynamicGallery === 'function') {
      window.initDynamicGallery();
    }
  }
});

/* 7. Gallery Lightbox Modal */
function initGalleryLightbox() {
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox ? lightbox.querySelector('img') : null;
  const galleryItems = document.querySelectorAll('.gallery-item');
  const closeBtn = document.querySelector('.lightbox-close');

  if (!lightbox || !lightboxImg) return;

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img && !item.classList.contains('active-trigger-ignore')) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* 8. Testimonials Slider */
function initTestimonialsSlider() {
  const wrapper = document.querySelector('.testimonials-wrapper');
  const slides = document.querySelectorAll('.testimonial-slide');
  const dotsContainer = document.querySelector('.slider-dots');

  if (!wrapper || slides.length === 0) return;

  let currentIdx = 0;
  let autoSlideTimer;

  dotsContainer.innerHTML = '';
  slides.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    if (idx === 0) dot.classList.add('active');
    dot.addEventListener('click', () => {
      goToSlide(idx);
      resetAutoSlide();
    });
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.dot');

  function goToSlide(idx) {
    currentIdx = idx;
    wrapper.style.transform = `translateX(-${currentIdx * 100}%)`;
    
    dots.forEach((dot, i) => {
      if (i === currentIdx) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function nextSlide() {
    let nextIdx = currentIdx + 1;
    if (nextIdx >= slides.length) nextIdx = 0;
    goToSlide(nextIdx);
  }

  function startAutoSlide() {
    autoSlideTimer = setInterval(nextSlide, 6000);
  }

  function resetAutoSlide() {
    clearInterval(autoSlideTimer);
    startAutoSlide();
  }

  startAutoSlide();

  // Touch Swipe
  let startX = 0;
  wrapper.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  wrapper.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        let nextIdx = currentIdx + 1;
        if (nextIdx < slides.length) {
          goToSlide(nextIdx);
          resetAutoSlide();
        }
      } else {
        let prevIdx = currentIdx - 1;
        if (prevIdx >= 0) {
          goToSlide(prevIdx);
          resetAutoSlide();
        }
      }
    }
  }, { passive: true });
}

/* 9. Contact Form Inquiry Submission */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const alertBox = document.getElementById('form-success-alert');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('.form-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    setTimeout(() => {
      form.reset();
      
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
          alertBox.style.display = 'none';
        }, 8000);
      }

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }, 1500);
  });
}

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
