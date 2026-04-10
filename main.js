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
        this._priceInput.value = val.price || 0;
        this._qtyInput.value = val.qty || 1;
        this._timeInput.value = val.time || 0;
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
        
        // Summary elements
        this._totalCostEl = shadow.querySelector('.total-cost');
        this._totalTimeEl = shadow.querySelector('.total-time');
        this._netProfitEl = shadow.querySelector('.net-profit');
        this._profitMarginEl = shadow.querySelector('.profit-margin');

        this._setupListeners();
        this._loadData();
    }

    _setupListeners() {
        if (this._addBtn) {
            this._addBtn.addEventListener('click', () => {
                this._addIngredient();
                this._updateCalculations();
            });
        }

        this.addEventListener('ingredient-updated', () => {
            this._updateCalculations();
            this._saveData();
        });

        [this._targetNameInput, this._targetPriceInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    this._updateCalculations();
                    this._saveData();
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
        if (this._totalCostEl) this._totalCostEl.textContent = totalCost.toLocaleString() + ' Gold';
        
        if (this._totalTimeEl) {
            const h = Math.floor(totalTime / 60);
            const m = totalTime % 60;
            this._totalTimeEl.textContent = `${h > 0 ? h + '시간 ' : ''}${m}분`;
        }

        if (this._netProfitEl) {
            this._netProfitEl.textContent = netProfit.toLocaleString() + ' Gold';
            this._netProfitEl.className = `value net-profit ${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;
        }

        if (this._profitMarginEl) {
            this._profitMarginEl.textContent = profitMargin.toFixed(1) + '%';
            this._profitMarginEl.className = `value profit-margin ${profitMargin >= 0 ? 'profit-positive' : 'profit-negative'}`;
        }
    }

    _saveData() {
        if (!this._listContainer) return;
        const ingredients = Array.from(this._listContainer.querySelectorAll('ingredient-item'));
        const state = {
            targetName: this._targetNameInput?.value || '',
            targetPrice: this._targetPriceInput?.value || '',
            ingredients: ingredients.map(item => item.data)
        };
        localStorage.setItem('crafting-calc-state', JSON.stringify(state));
    }

    _loadData() {
        const saved = localStorage.getItem('crafting-calc-state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (this._targetNameInput) this._targetNameInput.value = state.targetName || '';
                if (this._targetPriceInput) this._targetPriceInput.value = state.targetPrice || '';
                
                if (state.ingredients && state.ingredients.length > 0) {
                    state.ingredients.forEach(data => this._addIngredient(data));
                } else {
                    this._addIngredient();
                }
            } catch (e) {
                console.error("Failed to load saved state", e);
                this._addIngredient();
            }
        } else {
            this._addIngredient();
        }
        this._updateCalculations();
    }
}

// Register custom elements
customElements.define('ingredient-item', IngredientItem);
customElements.define('crafting-app', CraftingApp);
