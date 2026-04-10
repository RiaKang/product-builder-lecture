/**
 * Theme Management
 */
function initTheme() {
    const themeCheckbox = document.getElementById('theme-checkbox');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeCheckbox) {
        themeCheckbox.checked = savedTheme === 'light';
        themeCheckbox.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

document.addEventListener('DOMContentLoaded', initTheme);

/**
 * IngredientItem Component
 * Manages individual ingredient input row
 */
class IngredientItem extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById('ingredient-item-template');
        if (!template) {
            console.error('ingredient-item-template not found');
            return;
        }
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(template.content.cloneNode(true));

        this._nameInput = shadow.querySelector('.name-input');
        this._priceInput = shadow.querySelector('.price-input');
        this._qtyInput = shadow.querySelector('.qty-input');
        this._timeInput = shadow.querySelector('.time-input');
        this._removeBtn = shadow.querySelector('.remove-btn');

        this._setupListeners();
    }

    _setupListeners() {
        if (!this._nameInput) return;
        [this._nameInput, this._priceInput, this._qtyInput, this._timeInput].forEach(input => {
            input.addEventListener('input', () => this._dispatchChange());
        });

        this._removeBtn.addEventListener('click', () => {
            this.remove();
            this._dispatchChange();
        });
    }

    _dispatchChange() {
        this.dispatchEvent(new CustomEvent('ingredient-updated', {
            bubbles: true,
            composed: true
        }));
    }

    get data() {
        return {
            name: this._nameInput.value,
            price: parseFloat(this._priceInput.value) || 0,
            qty: parseFloat(this._qtyInput.value) || 0,
            time: parseFloat(this._timeInput.value) || 0
        };
    }

    set data(val) {
        if (!this._nameInput) return;
        this._nameInput.value = val.name || '';
        this._priceInput.value = val.price || '';
        this._qtyInput.value = val.qty || '';
        this._timeInput.value = val.time || '';
    }
}

/**
 * CraftingApp Component
 * Main application logic and state management
 */
class CraftingApp extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById('crafting-app-template');
        if (!template) {
            console.error('crafting-app-template not found');
            return;
        }
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(template.content.cloneNode(true));

        this._listContainer = shadow.querySelector('#ingredients-list');
        this._addBtn = shadow.querySelector('.add-btn');
        this._targetNameInput = shadow.querySelector('.target-name');
        this._targetPriceInput = shadow.querySelector('.target-price');
        
        // Save button is now in global DOM
        this._saveBtn = document.querySelector('.save-recipe-btn');
        
        // Summary elements
        this._totalCostEl = shadow.querySelector('.total-cost');
        this._totalTimeEl = shadow.querySelector('.total-time');
        this._netProfitEl = shadow.querySelector('.net-profit');
        this._profitMarginEl = shadow.querySelector('.profit-margin');

        this._setupListeners();
        this._loadCurrentState();
        this._renderHistory();
    }

    _setupListeners() {
        if (this._addBtn) {
            this._addBtn.addEventListener('click', () => {
                this._addIngredient();
                this._updateCalculations();
            });
        }

        if (this._saveBtn) {
            this._saveBtn.addEventListener('click', () => this._saveToHistory());
        }

        this.addEventListener('ingredient-updated', () => {
            this._updateCalculations();
            this._saveCurrentState();
        });

        [this._targetNameInput, this._targetPriceInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    this._updateCalculations();
                    this._saveCurrentState();
                });
            }
        });
    }

    _addIngredient(data = {}) {
        if (!this._listContainer) return;
        const item = document.createElement('ingredient-item');
        this._listContainer.appendChild(item);
        if (Object.keys(data).length > 0) {
            item.data = data;
        }
    }

    _updateCalculations() {
        if (!this._listContainer) return;
        const ingredients = Array.from(this._listContainer.querySelectorAll('ingredient-item'));
        const ingredientData = ingredients.map(item => item.data);

        const totalCost = ingredientData.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const totalTime = ingredientData.reduce((sum, item) => sum + item.time, 0);
        const targetPrice = parseFloat(this._targetPriceInput?.value) || 0;
        const netProfit = targetPrice - totalCost;
        const profitMargin = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

        // Update UI
        if (this._totalCostEl) this._totalCostEl.textContent = totalCost.toLocaleString();
        if (this._totalTimeEl) this._totalTimeEl.textContent = totalTime.toLocaleString();

        if (this._netProfitEl) {
            this._netProfitEl.textContent = netProfit.toLocaleString();
            this._netProfitEl.className = `value net-profit ${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;
        }

        if (this._profitMarginEl) {
            this._profitMarginEl.textContent = profitMargin.toFixed(1) + '%';
            this._profitMarginEl.className = `value profit-margin ${profitMargin >= 0 ? 'profit-positive' : 'profit-negative'}`;
        }
    }

    _getState() {
        const ingredients = Array.from(this._listContainer.querySelectorAll('ingredient-item'));
        return {
            targetName: this._targetNameInput?.value || '',
            targetPrice: this._targetPriceInput?.value || '',
            ingredients: ingredients.map(item => item.data),
            timestamp: new Date().toISOString()
        };
    }

    _saveCurrentState() {
        localStorage.setItem('crafting-calc-current', JSON.stringify(this._getState()));
    }

    _loadCurrentState() {
        const saved = localStorage.getItem('crafting-calc-current');
        if (saved) {
            this.loadRecipe(JSON.parse(saved));
        } else {
            this._addIngredient();
            this._updateCalculations();
        }
    }

    loadRecipe(state) {
        if (!this._listContainer) return;
        this._listContainer.innerHTML = '';
        if (this._targetNameInput) this._targetNameInput.value = state.targetName || '';
        if (this._targetPriceInput) this._targetPriceInput.value = state.targetPrice || '';
        
        if (state.ingredients && state.ingredients.length > 0) {
            state.ingredients.forEach(data => this._addIngredient(data));
        } else {
            this._addIngredient();
        }
        this._updateCalculations();
    }

    _saveToHistory() {
        const state = this._getState();
        if (!state.targetName) {
            alert('물품명을 입력해주세요.');
            return;
        }
        
        const history = JSON.parse(localStorage.getItem('crafting-calc-history') || '[]');
        history.unshift(state);
        localStorage.setItem('crafting-calc-history', JSON.stringify(history.slice(0, 50))); // 최대 50개 유지
        this._renderHistory();
        alert('레시피가 저장되었습니다.');
    }

    _renderHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        const history = JSON.parse(localStorage.getItem('crafting-calc-history') || '[]');
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">저장된 데이터가 없습니다.</p>';
            return;
        }

        historyList.innerHTML = '';
        history.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            const date = new Date(item.timestamp).toLocaleDateString();
            div.innerHTML = `
                <div class="history-item-content">
                    <span class="history-item-name">${item.targetName}</span>
                    <div class="history-item-meta">
                        <span>비용: ${parseFloat(item.targetPrice).toLocaleString()}</span>
                        <span>${date}</span>
                    </div>
                </div>
                <button class="delete-history-btn" title="삭제">🗑️</button>
            `;

            // 불러오기 클릭 이벤트
            div.querySelector('.history-item-content').addEventListener('click', () => {
                if (confirm(`'${item.targetName}' 레시피를 불러올까요?`)) {
                    this.loadRecipe(item);
                    this._saveCurrentState();
                }
            });

            // 삭제 클릭 이벤트
            div.querySelector('.delete-history-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`'${item.targetName}' 레시피를 삭제하시겠습니까?`)) {
                    const newHistory = history.filter((_, i) => i !== index);
                    localStorage.setItem('crafting-calc-history', JSON.stringify(newHistory));
                    this._renderHistory();
                }
            });

            historyList.appendChild(div);
        });
    }
}

// Register custom elements
customElements.define('ingredient-item', IngredientItem);
customElements.define('crafting-app', CraftingApp);
