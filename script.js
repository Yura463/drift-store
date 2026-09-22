const TG_CHAT_ID = '1984152843';
const TG_BOT_TOKEN = '8504501879:AAFNv-Bga_dZoOgCGYu5aEdbCjCb760zSG0';

let productsData = [];
let currentPhotos = [];
let currentPhotoIndex = 0;
let currentActiveProduct = null;
let cart = [];

// 1. Завантаження товарів із Google Таблиці
function handleData(json) {
    const rows = json.table.rows;
    const container = document.getElementById('products-container');
    if (!container) return;
    
    container.innerHTML = '';
    productsData = [];

    if (!rows || rows.length === 0) {
        container.innerHTML = '<div class="loading-state">Товари відсутні.</div>';
        return;
    }

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i].c;
        if (!row) continue;

        const firstVal = row[0] && row[0].v ? String(row[0].v).toLowerCase() : '';
        if (firstVal === 'name' || firstVal === 'назва') continue;

        const inStockVal = row[6] && row[6].v ? String(row[6].v).toLowerCase().trim() : 'так';
        const isAvailable = inStockVal === 'так' || inStockVal === 'yes' || inStockVal === '1' || inStockVal === '+';

        const priceVal = row[1] && row[1].v !== null ? row[1].v : '0';
        const oldPriceVal = row[7] && row[7].v !== null ? row[7].v : null;

        const item = {
            id: i,
            name: row[0] && row[0].v !== null ? row[0].v : 'Товар',
            price: oldPriceVal ? oldPriceVal : priceVal,
            oldPrice: oldPriceVal ? priceVal : null,
            image: row[2] && row[2].v ? row[2].v : 'https://via.placeholder.com/300',
            photos: row[3] && row[3].v ? row[3].v.split(',') : [],
            desc: row[4] && row[4].v ? row[4].v : 'Опис відсутній.',
            video: row[5] && row[5].v ? row[5].v : '',
            available: isAvailable
        };

        productsData.push(item);
    }
    renderProducts();
}

// 2. Рендер товарів на сторінці (Кнопка відкриває модальне вікно товару)
function renderProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    productsData.forEach(item => {
        const badgeHTML = item.available 
            ? `<span class="badge in-stock">В наявності</span>`
            : `<span class="badge out-stock">Немає в наявності</span>`;

        const priceHTML = item.oldPrice 
            ? `<div class="price"><span class="old-price">${item.oldPrice} грн</span> <span class="sale-price">${item.price} грн</span></div>`
            : `<div class="price">${item.price} <span>грн</span></div>`;

        container.innerHTML += `
            <div class="product-card glass-panel" onclick="openModal(${item.id})">
                <div class="card-media">
                    ${badgeHTML}
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="card-details">
                    <h3 class="card-title">${item.name}</h3>
                    <div class="card-footer">
                        ${priceHTML}
                        <button class="btn-card" onclick="event.stopPropagation(); openModal(${item.id})">Замовити</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// 3. Відкриття модального вікна товару
function openModal(index) {
    const item = productsData.find(p => p.id === index);
    if (!item) return;

    currentActiveProduct = item;

    document.getElementById('modal-product-title').innerText = item.name;
    
    const modalPrice = document.getElementById('modal-product-price');
    if (item.oldPrice) {
        modalPrice.innerHTML = `<span class="old-price" style="font-size: 1.1rem;">${item.oldPrice} грн</span> <span class="sale-price">${item.price} грн</span>`;
    } else {
        modalPrice.innerText = `${item.price} грн`;
    }

    document.getElementById('modal-product-desc').innerText = item.desc;

    const stockBadge = document.getElementById('modal-stock-badge');
    const addCartBtn = document.getElementById('modal-add-cart-btn');
    
    if (item.available) {
        stockBadge.className = 'badge in-stock';
        stockBadge.innerText = 'В наявності';
        addCartBtn.disabled = false;
        addCartBtn.onclick = () => { addToCart(item); closeModal(); openCartModal(); };
    } else {
        stockBadge.className = 'badge out-stock';
        stockBadge.innerText = 'Немає в наявності';
        addCartBtn.disabled = true;
    }

    currentPhotos = [];
    if (item.image && item.image.trim()) currentPhotos.push(item.image.trim());
    if (item.photos && item.photos.length > 0) {
        item.photos.forEach(p => { 
            if (p && p.trim() && !currentPhotos.includes(p.trim())) currentPhotos.push(p.trim()); 
        });
    }
    currentPhotoIndex = 0;
    updateSlider();

    const thumbsContainer = document.getElementById('gallery-thumbs');
    thumbsContainer.innerHTML = '';
    if (currentPhotos.length > 1) {
        currentPhotos.forEach((photo, idx) => {
            thumbsContainer.innerHTML += `<img src="${photo}" class="${idx === 0 ? 'active' : ''}" onclick="event.stopPropagation(); setSlide(${idx})">`;
        });
    }

    const videoWrapper = document.getElementById('video-wrapper');
    videoWrapper.innerHTML = '';
    if (item.video && item.video.trim()) {
        let rawUrl = item.video.trim();
        let videoId = '';
        if (rawUrl.includes('youtu.be/')) videoId = rawUrl.split('youtu.be/')[1].split('?')[0];
        else if (rawUrl.includes('watch?v=')) videoId = rawUrl.split('watch?v=')[1].split('&')[0];
        else if (rawUrl.includes('shorts/')) videoId = rawUrl.split('shorts/')[1].split('?')[0];

        if (videoId) {
            videoWrapper.innerHTML = `<h4 style="margin: 10px 0 5px; font-size: 0.9rem; color: #94a3b8;">🎥 Відеоогляд:</h4><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width:100%; height:180px; border-radius:10px;"></iframe>`;
        }
    }

    document.getElementById('order-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateSlider() {
    document.getElementById('main-slide-img').src = currentPhotos[currentPhotoIndex];
    const thumbs = document.querySelectorAll('.thumbs-list img');
    thumbs.forEach((t, idx) => {
        if (idx === currentPhotoIndex) t.classList.add('active');
        else t.classList.remove('active');
    });
}

function moveSlide(direction) {
    if (event) event.stopPropagation();
    currentPhotoIndex += direction;
    if (currentPhotoIndex < 0) currentPhotoIndex = currentPhotos.length - 1;
    if (currentPhotoIndex >= currentPhotos.length) currentPhotoIndex = 0;
    updateSlider();
}

function setSlide(index) {
    currentPhotoIndex = index;
    updateSlider();
}

function closeModal() {
    document.getElementById('order-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 4. ЛОГІКА КОШИКА
function quickAddToCart(id) {
    const item = productsData.find(p => p.id === id);
    if (item && item.available) {
        addToCart(item);
        openCartModal();
    }
}

function addToCart(item) {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: parseInt(item.price) || 0,
            image: item.image,
            qty: 1
        });
    }
    updateCartUI();
}

function changeCartQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(c => c.id !== id);
        }
    }
    updateCartUI();
}

function removeCartItem(id) {
    cart = cart.filter(c => c.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const cartBadge = document.getElementById('cartBadge');
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalPrice');

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    cartBadge.innerText = totalQty;
    totalEl.innerText = `${totalPrice} грн`;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">Ваш кошик порожній.</p>';
        return;
    }

    container.innerHTML = '';
    cart.forEach(item => {
        container.innerHTML += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price * item.qty} грн</div>
                </div>
                <div class="cart-qty-ctrl">
                    <button onclick="changeCartQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="changeCartQty(${item.id}, 1)">+</button>
                </div>
                <button class="cart-remove-btn" onclick="removeCartItem(${item.id})">&times;</button>
            </div>
        `;
    });
}

function openCartModal() {
    document.getElementById('cartModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartModal() {
    document.getElementById('cartModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function toggleFab() {
    document.getElementById('fabMenu').classList.toggle('active');
}

// 5. Відправка замовлення з кошика в Telegram
async function sendCartOrder(e) {
    e.preventDefault();

    if (cart.length === 0) {
        alert('Ваш кошик порожній!');
        return;
    }

    const name = document.getElementById('cartClientName').value;
    const phone = document.getElementById('cartClientPhone').value;
    const city = document.getElementById('cartClientCity').value;

    let itemsText = '';
    let totalSum = 0;

    cart.forEach((item, idx) => {
        const itemTotal = item.price * item.qty;
        totalSum += itemTotal;
        itemsText += `${idx + 1}. ${item.name} — ${item.qty} шт. (${itemTotal} грн)\n`;
    });

    const message = `🛍️ НОВЕ ЗАМОВЛЕННЯ З КОШИКА!\n\n📦 *Товари:*\n${itemsText}\n💰 *Загальна сума:* ${totalSum} грн\n\n👤 *Клієнт:* ${name}\n📞 *Тел:* ${phone}\n📍 *Доставка:* ${city}`;

    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage?chat_id=${TG_CHAT_ID}&text=${encodeURIComponent(message)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok) {
            alert('Дякуємо! Ваше замовлення прийнято.');
            cart = [];
            updateCartUI();
            closeCartModal();
            document.getElementById('cartOrderForm').reset();
        } else {
            alert(`Помилка: ${data.description}`);
        }
    } catch (err) {
        alert('Помилка мережі при відправці замовлення.');
    }
}
