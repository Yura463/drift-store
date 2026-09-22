// Конфігурація вашого Telegram бота
const TELEGRAM_BOT_TOKEN = "8504501879:AAFnV-Bga_dZoOgCGYu5aEdbCJcB760zSG0";
const TELEGRAM_CHAT_ID = "1984152843";

// Масив кошика
let cart = [];

// Відкриття / закриття кошика
const cartModal = document.getElementById('cartModal');
const openCartBtn = document.getElementById('openCartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');

openCartBtn.addEventListener('click', () => cartModal.classList.add('active'));
closeCartBtn.addEventListener('click', () => cartModal.classList.remove('active'));

cartModal.addEventListener('click', (e) => {
  if (e.target === cartModal) cartModal.classList.remove('active');
});

// Додавання товару в кошик
function addToCart(title, price, image) {
  const existingIndex = cart.findIndex(item => item.title === title);
  
  if (existingIndex > -1) {
    cart[existingIndex].qty += 1;
  } else {
    cart.push({ title, price, image, qty: 1 });
  }
  
  updateCartUI();
  cartModal.classList.add('active');
}

// Зміна кількості
function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  updateCartUI();
}

// Видалення товару
function removeItem(index) {
  cart.splice(index, 1);
  updateCartUI();
}

// Оновлення інтерфейсу кошика
function updateCartUI() {
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const cartBadge = document.getElementById('cartBadge');
  const cartTotalPrice = document.getElementById('cartTotalPrice');

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  cartBadge.textContent = totalQty;
  cartTotalPrice.textContent = `${totalPrice} грн`;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p style="color:#a0aec0; text-align:center;">Ваш кошик порожній</p>';
    return;
  }

  cartItemsContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.title}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-price">${item.price * item.qty} грн</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
        <span style="color:#fff;">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
      </div>
      <button class="remove-btn" onclick="removeItem(${index})">&times;</button>
    </div>
  `).join('');
}

// Відправка замовлення в Telegram
document.getElementById('cartOrderForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (cart.length === 0) {
    alert("Додайте хоча б один товар у кошик!");
    return;
  }

  const name = document.getElementById('cartClientName').value;
  const phone = document.getElementById('cartClientPhone').value;
  const city = document.getElementById('cartClientCity').value;

  const itemsList = cart.map((item, i) => `${i + 1}. *${item.title}* — ${item.qty} шт. (${item.price * item.qty} грн)`).join('\n');
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const message = `🚀 *НОВЕ ЗАМОВЛЕННЯ З САЙТУ!*\n\n` +
                  `👤 *Клієнт:* ${name}\n` +
                  `📞 *Телефон:* ${phone}\n` +
                  `📍 *Доставка:* ${city}\n\n` +
                  `📦 *Товари у кошику:*\n${itemsList}\n\n` +
                  `💰 *Загальна сума:* ${totalPrice} грн`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (response.ok) {
      alert('Дякуємо! Ваше замовлення успішно відправлено. Ми зв’яжемося з вами найближчим часом.');
      cart = [];
      updateCartUI();
      cartModal.classList.remove('active');
      e.target.reset();
    } else {
      alert('Помилка відправки. Спробуйте ще раз або напишіть нам у Telegram.');
    }
  } catch (err) {
    alert('Помилка мережі. Зв’яжіться з нами через Telegram.');
  }
});
