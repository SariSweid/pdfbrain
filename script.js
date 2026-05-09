// 1. Fake Data (JSON Objects - Lec 2)
const state = {
    documents: [
        { id: 1, title: "אלגוריתמים בבינה מלאכותית", date: "12.05.2026" },
        { id: 2, title: "מבני נתונים מתקדמים", date: "10.05.2026" },
        { id: 3, title: "מבוא להנדסת תוכנה", date: "08.05.2026" }
    ],
    messages: [
        { sender: "bot", text: "שלום! אני סוקרטס. במה אוכל לעזור היום?" }
    ]
};

// 2. Selectors
const docsList = document.getElementById('docs-list');
const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');

// 3. Render Functions (Lec 3 - Dynamic DOM)
function renderDocs() {
    docsList.innerHTML = state.documents.map(doc => `
        <div class="p-4 border-b hover:bg-indigo-50 cursor-pointer transition flex items-center gap-3">
            <span class="text-xl">📄</span>
            <div>
                <p class="font-bold text-gray-800">${doc.title}</p>
                <p class="text-xs text-gray-500">${doc.date}</p>
            </div>
        </div>
    `).join('');
}

function renderChat() {
    chatContainer.innerHTML = state.messages.map(msg => `
        <div class="flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} message-fade-in">
            <div class="max-w-[70%] p-4 rounded-2xl shadow-sm ${
                msg.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-bl-none'
                : 'bg-white text-gray-800 border border-gray-200 rounded-br-none'
            }">
                <p class="text-sm">${msg.text}</p>
            </div>
        </div>
    `).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 4. Event Listeners (Lec 2)
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const text = msgInput.value.trim();
    if (!text) return;

    // Add User Message
    state.messages.push({ sender: 'user', text: text });
    msgInput.value = '';
    renderChat();

    // Bot Response Simulation (Lec 2 Logic)
    setTimeout(() => {
        state.messages.push({
            sender: 'bot',
            text: "קיבלתי את השאלה שלך. אני מנתח את המאמר כרגע..."
        });

        renderChat();
    }, 800);
});

const chatBtn = document.getElementById('chat-btn');
const compareBtn = document.getElementById('compare-btn');
const historyBtn = document.getElementById('history-btn');

function setActiveButton(activeBtn) {
    [chatBtn, compareBtn, historyBtn].forEach(btn => {
        btn.className = "hover:text-indigo-600 transition";
    });

    activeBtn.className = "text-indigo-600 border-b-2 border-indigo-600";
}

function showChatPage() {
    setActiveButton(chatBtn);

    chatContainer.innerHTML = "";
    renderChat();

    msgInput.disabled = false;
    msgInput.placeholder = "שאל שאלה על המאמר...";
}

function showComparePage() {
    setActiveButton(compareBtn);

    chatContainer.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 class="text-2xl font-bold text-indigo-700 mb-4">השוואת מאמרים</h2>
            <p class="text-gray-600 mb-4">
                כאן תוכל להשוות בין שני מאמרים אקדמיים.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border rounded-xl p-4 bg-slate-50">
                    <h3 class="font-bold mb-2">מאמר ראשון</h3>
                    <p class="text-sm text-gray-500">בחר או העלה מאמר ראשון</p>
                </div>

                <div class="border rounded-xl p-4 bg-slate-50">
                    <h3 class="font-bold mb-2">מאמר שני</h3>
                    <p class="text-sm text-gray-500">בחר או העלה מאמר שני</p>
                </div>
            </div>

            <button class="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
                בצע השוואה
            </button>
        </div>
    `;

    msgInput.disabled = true;
    msgInput.placeholder = "אין צ'אט במסך השוואת מאמרים";
}

function showHistoryPage() {
    setActiveButton(historyBtn);

    chatContainer.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 class="text-2xl font-bold text-indigo-700 mb-4">היסטוריה</h2>
            <p class="text-gray-600 mb-4">
                כאן תופיע היסטוריית השאלות והמאמרים שלך.
            </p>

            <div class="space-y-3">
                <div class="p-4 border rounded-xl bg-slate-50">
                    <p class="font-bold">שאלה על אלגוריתמים בבינה מלאכותית</p>
                    <p class="text-sm text-gray-500">12.05.2026</p>
                </div>

                <div class="p-4 border rounded-xl bg-slate-50">
                    <p class="font-bold">סיכום מאמר על מבני נתונים</p>
                    <p class="text-sm text-gray-500">10.05.2026</p>
                </div>

                <div class="p-4 border rounded-xl bg-slate-50">
                    <p class="font-bold">השוואת מאמרים</p>
                    <p class="text-sm text-gray-500">08.05.2026</p>
                </div>
            </div>
        </div>
    `;

    msgInput.disabled = true;
    msgInput.placeholder = "אין צ'אט במסך היסטוריה";
}

chatBtn.addEventListener('click', showChatPage);
compareBtn.addEventListener('click', showComparePage);
historyBtn.addEventListener('click', showHistoryPage);


// Initial Load
window.onload = () => {
    renderDocs();
    renderChat();
};