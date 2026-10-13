const CATEGORIES = {
    income: ['Gaji', 'Usaha', 'Bonus', 'Lainnya'],
    expense: ['Makanan', 'Transportasi', 'Tagihan', 'Belanja', 'Hiburan', 'Tabungan', 'Lainnya']
};

let transactions = JSON.parse(localStorage.getItem('moneybi_transactions')) || [];
let chartInstance = null;

const transactionForm = document.getElementById('transactionForm');
const categorySelect = document.getElementById('category');
const typeRadios = document.querySelectorAll('input[name="type"]');
const transactionList = document.getElementById('transactionList');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterMonth = document.getElementById('filterMonth');
const themeToggle = document.getElementById('themeToggle');
const exportCsvBtn = document.getElementById('exportCsvBtn');

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    updateCategoryOptions('expense');

    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    renderUI();
    lucide.createIcons();
});

typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => updateCategoryOptions(e.target.value));
});

transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const category = categorySelect.value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const note = document.getElementById('note').value.trim() || category;

    const newTransaction = {
        id: Date.now().toString(),
        type,
        category,
        amount,
        date,
        note
    };

    transactions.unshift(newTransaction);
    saveData();
    renderUI();
    transactionForm.reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    updateCategoryOptions(document.querySelector('input[name="type"]:checked').value);
});

searchInput.addEventListener('input', renderUI);
filterType.addEventListener('change', renderUI);
filterMonth.addEventListener('change', renderUI);

themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    renderChart();
});

exportCsvBtn.addEventListener('click', exportToCSV);

function updateCategoryOptions(type) {
    categorySelect.innerHTML = CATEGORIES[type]
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('');
}

function saveData() {
    localStorage.setItem('moneybi_transactions', JSON.stringify(transactions));
}

function deleteTransaction(id) {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        renderUI();
    }
}

function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

function renderUI() {
    const filtered = getFilteredTransactions();
    renderSummary();
    renderList(filtered);
    renderChart();
}

function getFilteredTransactions() {
    const search = searchInput.value.toLowerCase();
    const type = filterType.value;
    const month = filterMonth.value;

    return transactions.filter(t => {
        const matchesSearch = t.note.toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
        const matchesType = type === 'all' || t.type === type;
        const matchesMonth = !month || t.date.startsWith(month);
        return matchesSearch && matchesType && matchesMonth;
    });
}

function renderSummary() {
    const totalInc = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExp = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalInc - totalExp;

    document.getElementById('totalBalance').textContent = formatIDR(balance);
    document.getElementById('totalIncome').textContent = formatIDR(totalInc);
    document.getElementById('totalExpense').textContent = formatIDR(totalExp);

    const incCount = transactions.filter(t => t.type === 'income').length;
    const expCount = transactions.filter(t => t.type === 'expense').length;
    document.getElementById('incomeCount').textContent = `${incCount} Transaksi`;
    document.getElementById('expenseCount').textContent = `${expCount} Transaksi`;

    const ratio = totalInc > 0 ? Math.min(Math.round((totalExp / totalInc) * 100), 100) : 0;
    document.getElementById('expenseRatio').textContent = `${ratio}%`;
    document.getElementById('expenseProgressBar').style.width = `${ratio}%`;
}

function renderList(listData) {
    if (listData.length === 0) {
        transactionList.innerHTML = `
            <div class="text-center py-8 text-slate-400 text-sm">
                Tidak ada transaksi yang ditemukan.
            </div>`;
        return;
    }

    transactionList.innerHTML = listData.map(t => {
        const isInc = t.type === 'income';
        const badgeColor = isInc 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';

        return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-3">
                    <div class="p-2.5 rounded-xl ${isInc ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}">
                        <i data-lucide="${isInc ? 'arrow-down-left' : 'arrow-up-right'}" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-medium text-sm text-slate-800 dark:text-slate-200">${t.note}</span>
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md ${badgeColor}">${t.category}</span>
                        </div>
                        <span class="text-xs text-slate-400">${formatDate(t.date)}</span>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-sm ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                        ${isInc ? '+' : '-'} ${formatIDR(t.amount)}
                    </span>
                    <button onclick="deleteTransaction('${t.id}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function renderChart() {
    const canvas = document.getElementById('expenseChart');
    const emptyMsg = document.getElementById('emptyChartMessage');
    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length === 0) {
        canvas.classList.add('hidden');
        emptyMsg.classList.remove('hidden');
        if (chartInstance) chartInstance.destroy();
        return;
    }

    canvas.classList.remove('hidden');
    emptyMsg.classList.add('hidden');

    const catTotals = {};
    expenses.forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(catTotals);
    const data = Object.values(catTotals);

    if (chartInstance) {
        chartInstance.destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');

    chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#f43f5e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4', '#10b981', '#64748b'],
                borderWidth: 2,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDark ? '#cbd5e1' : '#334155',
                        font: { family: 'Plus Jakarta Sans', size: 11 }
                    }
                }
            }
        }
    });
}

function exportToCSV() {
    if (transactions.length === 0) {
        alert('Tidak ada data untuk diekspor!');
        return;
    }

    const headers = ['ID', 'Tanggal', 'Tipe', 'Kategori', 'Nominal', 'Catatan'];
    const rows = transactions.map(t => [
        t.id,
        t.date,
        t.type,
        `"${t.category}"`,
        t.amount,
        `"${t.note}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MoneyBi_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}