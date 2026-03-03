/**
 * Turbo Drift Evolution: Chaos Economy & Upgrade System
 * Managed via localStorage for persistence.
 */

const economy = {
    coins: parseInt(localStorage.getItem('turbo_coins')) || 500,
    inventory: JSON.parse(localStorage.getItem('turbo_inventory')) || [],
    availableUpgrades: [
        /* BUFFS */
        { id: 'nitro_boost', name: 'Nitro +50%', type: 'buff', effect: { nitro: 1.5 }, color: '#00f2ff', desc: 'Aumento na potência do Nitro.' },
        { id: 'super_accel', name: 'Super Accel', type: 'buff', effect: { accel: 1.3 }, color: '#00ff88', desc: 'Aceleração instantânea.' },
        { id: 'heavy_car', name: 'Heavy Frame', type: 'buff', effect: { stability: 1.5, drift: 0.8 }, color: '#7000ff', desc: 'Mais estabilidade nas curvas.' },
        { id: 'grip_tires', name: 'Grip Tires', type: 'buff', effect: { grip: 1.6 }, color: '#00f2ff', desc: 'Melhor aderência ao asfalto.' },

        /* DEBUFFS */
        { id: 'brake_fail', name: 'Brake Fade', type: 'debuff', effect: { brake: 0.4 }, color: '#ff3333', desc: 'Freios perdem eficiência.' },
        { id: 'bald_tires', name: 'Bald Tires', type: 'debuff', effect: { grip: 0.5, drift: 1.5 }, color: '#ff7700', desc: 'Pneus carecas (mais drift).' },
        { id: 'overheat', name: 'Overheat', type: 'debuff', effect: { maxSpeed: 0.8 }, color: '#ff0055', desc: 'Motor superaquece, limita velocidade.' },
        { id: 'loose_steering', name: 'Loose Steering', type: 'debuff', effect: { handling: 0.6 }, color: '#ffcc00', desc: 'Direção menos responsiva.' }
    ],

    currentUpgradeCost: 0,

    init() {
        this.generateRandomCost();
        this.updateUI();
    },

    generateRandomCost() {
        this.currentUpgradeCost = Math.floor(Math.random() * 90) + 10; // 10 to 99
        const costEl = document.getElementById('upgrade-cost');
        if (costEl) costEl.innerText = `CUSTO: ${this.currentUpgradeCost}`;
    },

    save() {
        localStorage.setItem('turbo_coins', this.coins);
        localStorage.setItem('turbo_inventory', JSON.stringify(this.inventory));
        this.updateUI();
    },

    updateUI() {
        // Update coin displays
        ['menu-coins', 'shop-coins'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = this.coins;
        });

        // Update inventory list in shop
        const invList = document.getElementById('upgrades-list');
        if (invList) {
            invList.innerHTML = '';
            this.inventory.forEach(item => {
                const badge = document.createElement('div');
                badge.className = 'upgrade-card';
                badge.style.borderLeft = `5px solid ${item.color}`;
                badge.style.padding = '8px 15px';
                badge.style.minWidth = '120px';
                badge.innerHTML = `
                    <div style="font-weight: bold; font-size: 0.8rem; color: ${item.color}">${item.name}</div>
                    <div style="font-size: 0.6rem; opacity: 0.7">${item.type.toUpperCase()}</div>
                `;
                invList.appendChild(badge);
            });
        }
    },

    buyRandomUpgrade() {
        if (this.coins < this.currentUpgradeCost) {
            alert('Moedas insuficientes!');
            return;
        }

        this.coins -= this.currentUpgradeCost;

        // Select random upgrade or debuff
        const randomIndex = Math.floor(Math.random() * this.availableUpgrades.length);
        const upgrade = this.availableUpgrades[randomIndex];

        // Add to inventory (can have duplicates or stack effects)
        this.inventory.push(upgrade);

        this.generateRandomCost();
        this.save();

        // Visual feedback for gacha
        const gacha = document.getElementById('gacha-container');
        gacha.style.animation = 'none';
        void gacha.offsetWidth; // trigger reflow
        gacha.style.animation = 'pulse 0.5s 1';

        console.log(`BOUGHT: ${upgrade.name}`);
    },

    addCoins(amount) {
        this.coins += amount;
        this.save();
    },

    resetInventory() {
        this.inventory = [];
        this.save();
    },

    getCombinedEffects() {
        // Base multipliers
        const base = {
            nitro: 1.0,
            accel: 1.0,
            stability: 1.0,
            grip: 1.0,
            brake: 1.0,
            drift: 1.0,
            maxSpeed: 1.0,
            handling: 1.0
        };

        this.inventory.forEach(item => {
            for (const effect in item.effect) {
                base[effect] *= item.effect[effect];
            }
        });

        return base;
    }
};

// Initialize economy on load
window.addEventListener('DOMContentLoaded', () => economy.init());
