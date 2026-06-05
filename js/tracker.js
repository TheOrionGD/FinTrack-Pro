document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const expenseForm = document.getElementById("expense-form");
    const expenseTableBody = document.getElementById("expense-body");
    const downloadButton = document.getElementById("download-image");
    const exportCsvButton = document.getElementById("export-csv");
    const loader = document.getElementById("loader");
    
    // KPI elements
    const totalSpentEl = document.getElementById("metric-total-spent");
    const totalItemsEl = document.getElementById("metric-total-items");
    const topCategoryEl = document.getElementById("metric-top-category");
    const remainingBudgetEl = document.getElementById("metric-remaining-budget");
    const budgetKpiCard = document.getElementById("budget-kpi-card");
    
    // Budget Setting
    const budgetInput = document.getElementById("budget-input");
    
    // Visualizer container
    const progressBarsContainer = document.getElementById("category-progress-bars");
    
    // Search and filter elements
    const searchInput = document.getElementById("search-input");
    const filterCategory = document.getElementById("filter-category");
    const currencySelect = document.getElementById("currency-select");

    // In-memory state
    let expenses = [];
    let currency = "USD";
    let budget = 1000.00;
    let budgetCardMode = "remaining"; // "remaining" or "allocated"
    
    // Sorting state
    let sortColumn = "date";
    let sortDirection = "desc";

    const currencySymbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        INR: '₹',
        JPY: '¥'
    };

    // Initialize state from LocalStorage
    function init() {
        const storedExpenses = localStorage.getItem("fintrack_expenses");
        if (storedExpenses) {
            try {
                expenses = JSON.parse(storedExpenses);
            } catch (e) {
                console.error("Error parsing stored expenses:", e);
                expenses = [];
            }
        }

        // Load active currency setting
        const storedCurrency = localStorage.getItem("fintrack_currency");
        if (storedCurrency && currencySymbols[storedCurrency]) {
            currency = storedCurrency;
        }
        if (currencySelect) {
            currencySelect.value = currency;
        }

        // Load active budget setting
        const storedBudget = localStorage.getItem("fintrack_budget");
        if (storedBudget) {
            budget = parseFloat(storedBudget);
        }
        if (budgetInput) {
            budgetInput.value = budget.toFixed(2);
        }

        // Load budget card mode preference
        const storedBudgetMode = localStorage.getItem("fintrack_budget_mode");
        if (storedBudgetMode) {
            budgetCardMode = storedBudgetMode;
        }

        // Add toggle listener on budget KPI card
        if (budgetKpiCard) {
            budgetKpiCard.style.cursor = "pointer";
            budgetKpiCard.title = "Click to toggle between Remaining and Allocated budget";
            budgetKpiCard.addEventListener("click", () => {
                budgetCardMode = budgetCardMode === "remaining" ? "allocated" : "remaining";
                localStorage.setItem("fintrack_budget_mode", budgetCardMode);
                render();
            });
        }

        setupSortingHeaders();
        render();
    }

    // Synchronize state data to LocalStorage
    function saveExpenses() {
        localStorage.setItem("fintrack_expenses", JSON.stringify(expenses));
    }

    function saveBudget() {
        localStorage.setItem("fintrack_budget", budget.toString());
    }

    // Setup sorting column event listeners on <th> headers
    function setupSortingHeaders() {
        const headers = document.querySelectorAll(".sortable-header");
        headers.forEach(header => {
            header.addEventListener("click", () => {
                const column = header.getAttribute("data-column");
                if (sortColumn === column) {
                    // Toggle direction
                    sortDirection = sortDirection === "asc" ? "desc" : "asc";
                } else {
                    sortColumn = column;
                    sortDirection = "asc";
                }
                updateSortHeaderStyles();
                render();
            });
        });
        updateSortHeaderStyles();
    }

    // Update the sorting indicator icons in table headers
    function updateSortHeaderStyles() {
        const headers = document.querySelectorAll(".sortable-header");
        headers.forEach(header => {
            const column = header.getAttribute("data-column");
            const iconSpan = header.querySelector(".sort-icon");
            
            header.classList.remove("asc", "desc");
            if (iconSpan) iconSpan.innerHTML = "&#8597;"; // Default up-down arrow

            if (column === sortColumn) {
                header.classList.add(sortDirection);
                if (iconSpan) {
                    iconSpan.innerHTML = sortDirection === "asc" ? "&#8595;" : "&#8593;";
                }
            }
        });
    }

    // Compute metrics, sort columns, filter rows, and render UI
    function render() {
        const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const selectedCategory = filterCategory ? filterCategory.value : "all";
        const symbol = currencySymbols[currency] || '$';

        // Clear existing table items
        expenseTableBody.innerHTML = "";

        // 1. Filter items based on search/category select
        let filteredExpenses = expenses.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery);
            const matchesCategory = (selectedCategory === "all" || item.category === selectedCategory);
            return matchesSearch && matchesCategory;
        });

        // 2. Sort filtered items based on sort state
        filteredExpenses.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === "amount") {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            } else if (sortColumn === "date") {
                valA = new Date(valA);
                valB = new Date(valB);
            } else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }

            if (valA < valB) return sortDirection === "asc" ? -1 : 1;
            if (valA > valB) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });

        // 3. Populate rows in table body
        filteredExpenses.forEach(item => {
            const row = document.createElement("tr");
            row.setAttribute("data-id", item.id);
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${symbol}${parseFloat(item.amount).toFixed(2)}</td>
                <td>${item.date}</td>
                <td><span class="category-badge ${item.category.toLowerCase()}">${item.category}</span></td>
                <td class="expense-actions action-column">
                    <button class="edit-btn" onclick="editExpense(${item.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteExpense(${item.id})">Delete</button>
                </td>
            `;
            expenseTableBody.appendChild(row);
        });

        // Calculate total spent & items
        const totalSpent = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalItems = expenses.length;
        
        // Calculate remaining budget
        const remainingBudget = budget - totalSpent;

        // Group by category to find top spending category and sums
        const categorySums = { Food: 0, Transport: 0, Entertainment: 0, Other: 0 };
        expenses.forEach(item => {
            if (categorySums.hasOwnProperty(item.category)) {
                categorySums[item.category] += parseFloat(item.amount);
            }
        });

        // Top category calc
        let topCategoryName = "-";
        let maxCategoryVal = 0;
        Object.keys(categorySums).forEach(cat => {
            if (categorySums[cat] > maxCategoryVal) {
                maxCategoryVal = categorySums[cat];
                topCategoryName = cat;
            }
        });

        // Update KPI values in DOM
        if (totalSpentEl) totalSpentEl.textContent = `${symbol}${totalSpent.toFixed(2)}`;
        if (totalItemsEl) totalItemsEl.textContent = totalItems;
        if (topCategoryEl) {
            if (topCategoryName !== "-") {
                topCategoryEl.innerHTML = `<span class="category-badge ${topCategoryName.toLowerCase()}">${topCategoryName}</span>`;
            } else {
                topCategoryEl.textContent = "-";
            }
        }

        // Render remaining or allocated budget and trigger alarm animations if exceeded
        const budgetLabelEl = budgetKpiCard ? budgetKpiCard.querySelector("h3") : null;
        if (budgetLabelEl) {
            budgetLabelEl.innerHTML = budgetCardMode === "remaining" 
                ? 'Remaining Budget <span style="font-size: 0.75rem; opacity: 0.5;">⇅</span>' 
                : 'Allocated Budget <span style="font-size: 0.75rem; opacity: 0.5;">⇅</span>';
        }

        if (remainingBudgetEl) {
            const displayValue = budgetCardMode === "remaining" ? remainingBudget : budget;
            remainingBudgetEl.textContent = `${displayValue < 0 ? '-' : ''}${symbol}${Math.abs(displayValue).toFixed(2)}`;
        }
        if (budgetKpiCard) {
            if (remainingBudget < 0) {
                budgetKpiCard.classList.add("budget-alert");
            } else {
                budgetKpiCard.classList.remove("budget-alert");
            }
        }

        // Render progress bars dynamically
        if (progressBarsContainer) {
            progressBarsContainer.innerHTML = "";
            Object.keys(categorySums).forEach(cat => {
                const catSum = categorySums[cat];
                const pct = totalSpent > 0 ? ((catSum / totalSpent) * 100).toFixed(0) : 0;
                
                const barHtml = `
                    <div class="category-progress ${cat.toLowerCase()}">
                        <div class="progress-info">
                            <span class="progress-label">${cat}</span>
                            <span class="progress-val">${symbol}${catSum.toFixed(2)} (${pct}%)</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;
                progressBarsContainer.insertAdjacentHTML("beforeend", barHtml);
            });
        }
    }

    // Add new expense handler
    if (expenseForm) {
        expenseForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("expense-name").value;
            const amount = document.getElementById("expense-amount").value;
            const date = document.getElementById("expense-date").value;
            const category = document.getElementById("expense-category").value;

            const newExpense = {
                id: Date.now(),
                name: name,
                amount: parseFloat(amount),
                date: date,
                category: category
            };

            expenses.push(newExpense);
            saveExpenses();
            render();
            expenseForm.reset();
        });
    }

    // Budget Input Change Handler
    if (budgetInput) {
        budgetInput.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            budget = isNaN(val) || val < 0 ? 0.00 : val;
            saveBudget();
            render();
        });
    }

    // Event listeners for searching/filtering
    if (searchInput) {
        searchInput.addEventListener("input", render);
    }
    if (filterCategory) {
        filterCategory.addEventListener("change", render);
    }
    if (currencySelect) {
        currencySelect.addEventListener("change", (e) => {
            currency = e.target.value;
            localStorage.setItem("fintrack_currency", currency);
            render();
        });
    }

    // Export CSV Spreadsheet Handler
    if (exportCsvButton) {
        exportCsvButton.addEventListener("click", () => {
            if (expenses.length === 0) {
                alert("No expenses recorded to export.");
                return;
            }

            const csvRows = ["Name,Amount,Date,Category"];
            expenses.forEach(item => {
                // Escape name quotations and wrap in quotes
                const escapedName = `"${item.name.replace(/"/g, '""')}"`;
                csvRows.push(`${escapedName},${item.amount.toFixed(2)},${item.date},${item.category}`);
            });

            const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "FinTrack-Expenses.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Download Report Image Handler
    if (downloadButton) {
        downloadButton.addEventListener("click", () => {
            if (loader) loader.style.display = "block"; // Show loader
            
            setTimeout(() => {
                const captureArea = document.getElementById("dashboard-capture-area");
                const formElement = document.getElementById("expense-form");
                const filterElement = document.querySelector(".filter-bar");
                const downloadSec = document.querySelector(".download-section");
                const budgetInputSetting = document.querySelector(".budget-setting");
                
                // Select action columns and edit/delete buttons
                const actionColumns = document.querySelectorAll(".action-column");
                const tableHeaders = document.querySelectorAll(".expense-list th");
                let actionHeader = null;
                tableHeaders.forEach(th => {
                    if (th.classList.contains("action-column") || th.textContent.toLowerCase() === "actions") {
                        actionHeader = th;
                    }
                });

                // Temporarily hide elements not suited for visual reports
                if (formElement) formElement.style.display = "none";
                if (filterElement) filterElement.style.display = "none";
                if (downloadSec) downloadSec.style.display = "none";
                if (budgetInputSetting) budgetInputSetting.style.display = "none";
                if (actionHeader) actionHeader.style.display = "none";
                actionColumns.forEach((col) => col.style.display = "none");

                // Capture and download the dashboard area
                html2canvas(captureArea, {
                    backgroundColor: "#0b0f19", // Force solid dark background color for crisp image exports
                    scale: 2,
                    useCORS: true
                }).then((canvas) => {
                    const link = document.createElement("a");
                    link.download = "FinTrack-Report.png";
                    link.href = canvas.toDataURL();
                    link.click();

                    // Restore display states
                    if (formElement) formElement.style.display = "";
                    if (filterElement) filterElement.style.display = "";
                    if (downloadSec) downloadSec.style.display = "";
                    if (budgetInputSetting) budgetInputSetting.style.display = "";
                    if (actionHeader) actionHeader.style.display = "";
                    actionColumns.forEach((col) => col.style.display = "");
                    
                    if (loader) loader.style.display = "none"; // Hide loader
                }).catch(err => {
                    console.error("Error generating report image:", err);
                    // Ensure UI is restored in case of error
                    if (formElement) formElement.style.display = "";
                    if (filterElement) filterElement.style.display = "";
                    if (downloadSec) downloadSec.style.display = "";
                    if (budgetInputSetting) budgetInputSetting.style.display = "";
                    if (actionHeader) actionHeader.style.display = "";
                    actionColumns.forEach((col) => col.style.display = "");
                    
                    if (loader) loader.style.display = "none";
                });
            }, 1500); // 1.5s delay is plenty for smooth feedback and loaders
        });
    }

    // Expose action handlers globally since HTML canvas links reference them
    window.editExpense = function(id) {
        const item = expenses.find(exp => exp.id === id);
        if (!item) return;

        const nameInput = document.getElementById("expense-name");
        const amountInput = document.getElementById("expense-amount");
        const dateInput = document.getElementById("expense-date");
        const categoryInput = document.getElementById("expense-category");

        if (nameInput) nameInput.value = item.name;
        if (amountInput) amountInput.value = item.amount;
        if (dateInput) dateInput.value = item.date;
        if (categoryInput) categoryInput.value = item.category;

        // Delete the item from state to prepare for save on edit submission
        deleteExpense(id);
    };

    window.deleteExpense = function(id) {
        expenses = expenses.filter(exp => exp.id !== id);
        saveExpenses();
        render();
    };

    // Load initial data
    init();
});
