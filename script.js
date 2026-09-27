const TG_CHAT_ID = '1984152843';
const TG_BOT_TOKEN = '8504501879:AAFNv-Bga_dZoOgCGYu5aEdbCjCb760zSG0';

let productsData = [];
let currentCategory = 'Всі товари';
let currentPhotos = [];
let currentPhotoIndex = 0;
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

        // Зчитування категорії з колонки I (індекс 8)
        const categoryVal = row[8] && row[8].v ? String(row[8].v).trim() : 'Інше';

        const item = {
            id: i,
            name: row[0] && row[0].v !== null ? row[0].v : 'Товар',
            price: oldPriceVal ? oldPriceVal : priceVal,
            oldPrice: oldPriceVal ? priceVal : null,
            image: row[2] && row[2].v ? row[2].v : 'https://via.placeholder.com/300',
            photos: row[3] && row[3].v ? String(row[3].v).split(',') : [],
            desc: row[4] && row[4].v ? row[4].v : 'Опис відсутній.',
            video: row[5] && row[5].v ? String(row[5].v) : '',
            available: isAvailable,
            category: categoryVal
        };

        productsData.push(item);
    }

    renderFilters();
    renderProducts();
}

// 2. Рендер кнопок Фільтрації
function renderFilters() {
    const filterContainer = document.getElementById('category-filters');
    if (!filterContainer) return;

    // Збираємо унікальні категорії
    const categories = ['Всі товари'];
    productsData.forEach(p => {
        if (p.category && !categories.includes(p.category)) {
            categories.push(p.category);
        }
    });

    filterContainer.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${cat === currentCategory ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            currentCategory = cat;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts();
        };
        filterContainer.appendChild(btn);
    });
}

// 3. Рендер товарів у каталозі з урахуванням фільтра
function renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = '';

    const filtered = currentCategory === 'Всі товари' 
        ? productsData 
        : productsData.filter(p => p.category === currentCategory);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading-state">Товари в цій категорії відсутні.</div>';
        return;
    }

    filtered.forEach(item => {
        const badgeHTML = item.available 
            ? `<span class="badge in-stock">В наявності</span>`
            : `<span class="badge out-stock">Немає в наявності</span>`;

        const priceHTML = item.oldPrice 
            ? `<div class="price"><span class="old-price">${item.oldPrice} грн</span> <span class="sale-price">${item.price} грн</span></div>`
            : `<div class="price">${item.price} <span>грн</span></div>`;

        const btnHTML = item.available
            ? `<button class="btn-card" onclick="event.stopPropagation(); openModal(${item.id})">Замовити</button>`
            : `<button class="btn-card btn-disabled" disabled onclick="event.stopPropagation();">Немає в наявності</button>`;

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
                        ${btnHTML}
                    </div>
                </div>
            </div>
        `;
    });
}

// 4. Відкриття модального вікна товару
function openModal(index) {
    const item = productsData.find(p => p.id === index);
    if (!item) return;

    const modal = document.getElementById('order-modal');
    if (!modal) return;

    const titleEl = document.getElementById('modal-product-title');
    if (titleEl) titleEl.innerText = item.name;
    
    const modalPrice = document.getElementById('modal-product-price');
    if (modalPrice) {
        if (item.oldPrice) {
            modalPrice.innerHTML = `<span class="old-price" style="font-size: 1.1rem;">${item.oldPrice} грн</span> <span class="sale-price">${item.price} грн</span>`;
        } else {
            modalPrice.innerText = `${item.price} грн`;
        }
    }

    const descEl = document.getElementById('modal-product-desc');
    if (descEl) descEl.innerText = item.desc;

    const stockBadge = document.getElementById('modal-stock-badge');
    const addCartBtn = document.getElementById('modal-add-cart-btn');
    
    if (stockBadge) {
        if (item.available) {
            stockBadge.className = 'badge in-stock';
            stockBadge.innerText = 'В наявності';
        } else {
            stockBadge.className = 'badge out-stock';
            stockBadge.innerText = 'Немає в наявності';
        }
    }

    if (addCartBtn) {
        if (item.available) {
            addCartBtn.disabled = false;
            addCartBtn.innerText = 'Додати у кошик 🛒';
            addCartBtn.className = 'btn-primary btn-block';
            addCartBtn.onclick = function() {
                addToCart(item);
                closeModal();
                
                // Анімація кнопок кошика
                document.querySelectorAll('.cartBadge').forEach(badge => {
                    badge.style.transform = 'scale(1.3)';
                    setTimeout(() => badge.style.transform = 'scale(1)', 200);
                });
            };
        } else {
            addCartBtn.disabled = true;
            addCartBtn.innerText = 'Немає в наявності ❌';
            addCartBtn.className = 'btn-primary btn-block btn-disabled';
        }
    }

    // Фото та слайдер
    currentPhotos = [];
    if (item.image && item.image.trim()) currentPhotos.push(item.image.trim());
    if (item.photos && item.photos.length > 0) {
        item.photos.forEach(p => { 
            const cleanP = p ? p.trim() : '';
            if (cleanP && !currentPhotos.includes(cleanP)) currentPhotos.push(cleanP); 
        });
    }
    currentPhotoIndex = 0;
    updateSlider();

    const thumbsContainer = document.getElementById('gallery-thumbs');
    if (thumbsContainer) {
        thumbsContainer.innerHTML = '';
        if (currentPhotos.length > 1) {
            currentPhotos.forEach((photo, idx) => {
                thumbsContainer.innerHTML += `<img src="${photo}" class="${idx === 0 ? 'active' : ''}" onclick="event.stopPropagation(); setSlide(${idx})">`;
            });
        }
    }

    // Відео
    const videoWrapper = document.getElementById('video-wrapper');
    if (videoWrapper) {
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
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateSlider() {
    const mainImg = document.getElementById('main-slide-img');
    if (mainImg && currentPhotos[currentPhotoIndex]) {
        mainImg.src = currentPhotos[currentPhotoIndex];
    }
    const thumbs = document.querySelectorAll('.thumbs-list img');
    thumbs.forEach((t, idx) => {
        if (idx === currentPhotoIndex) t.classList.add('active');
        else t.classList.remove('active');
    });
}

function moveSlide(direction) {
    if (window.event) window.event.stopPropagation();
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
    const modal = document.getElementById('order-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 5. Логіка Кошика
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
    const badges = document.querySelectorAll('.cartBadge');
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalPrice');

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    badges.forEach(b => b.innerText = totalQty);
    if (totalEl) totalEl.innerText = `${totalPrice} грн`;

    if (!container) return;

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
    const cartModal = document.getElementById('cartModal');
    if (cartModal) cartModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartModal() {
    const cartModal = document.getElementById('cartModal');
    if (cartModal) cartModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function toggleFab() {
    const fabMenu = document.getElementById('fabMenu');
    if (fabMenu) fabMenu.classList.toggle('active');
}

// 6. Відправка замовлення в Telegram
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
