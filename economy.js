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
    availableSkins: [
        { id: 'default', name: 'Branco Firma', color: 0xeeeeee, cost: 0 },
        { id: 'carbon', name: 'Carbono Tech', color: 0x111111, cost: 100 },
        { id: 'gold', name: 'Uno de Ouro', color: 0xffd700, cost: 500 },
        { id: 'neon', name: 'Neon Pink', color: 0xff00ff, cost: 250 },
        { id: 'taxi', name: 'Táxi Perigoso', color: 0xffcc00, cost: 150 },
        { id: 'police', name: 'Rocam Fake', color: 0x003366, cost: 200 },
        { id: 'corinthians', name: 'Timão (Corinthians)', color: 0x000000, cost: 300 },
        { id: 'palmeiras', name: 'Verdão (Palmeiras)', color: 0x008000, cost: 300 },
        { id: 'saopaulo', name: 'Tricolor (São Paulo)', color: 0xff0000, cost: 300 },
        { id: 'santos', name: 'Peixe (Santos)', color: 0xffffff, cost: 300 },
        { id: 'dogeram', name: 'Doge Ram (Especial)', color: 0xffaa00, cost: 700 },
        { id: 'ferrari_f40', name: 'Ferrari F40', color: 0xff2800, cost: 1200 },
        { id: 'bmw320i', name: 'BMW 320i M-Sport', color: 0x3366ff, cost: 2000 },
        { id: 'batmobile', name: 'Batmovel (Legendário)', color: 0x111111, cost: 10000 },
        { id: 'mcqueen', name: 'Relâmpago Marquinhos', color: 0xff0000, cost: 24000 },
        { id: 'the_cube', name: 'O Quadrado Supremo', color: 0xffffff, cost: 1000000000 }
    ],
    unlockedSkins: JSON.parse(localStorage.getItem('turbo_skins_unlocked')) || ['default'],
    selectedSkin: localStorage.getItem('turbo_selected_skin') || 'default',

    currentUpgradeCost: 0,

    init() {
        this.generateRandomCost();
        this.updateUI();
        this.updateSkinsUI();
    },

    generateRandomCost() {
        this.currentUpgradeCost = Math.floor(Math.random() * 90) + 10; // 10 to 99
        const costEl = document.getElementById('upgrade-cost');
        if (costEl) costEl.innerText = `CUSTO: ${this.currentUpgradeCost}`;
    },

    save() {
        localStorage.setItem('turbo_coins', this.coins);
        localStorage.setItem('turbo_inventory', JSON.stringify(this.inventory));
        localStorage.setItem('turbo_skins_unlocked', JSON.stringify(this.unlockedSkins));
        localStorage.setItem('turbo_selected_skin', this.selectedSkin);
        this.updateUI();
        this.updateSkinsUI();
    },

    updateUI() {
        // Update coin displays
        ['menu-coins', 'shop-coins', 'skin-coins'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = this.coins;
        });

        // Update inventory counter and list in shop
        const counterEl = document.getElementById('upgrades-counter');
        if (counterEl) {
            counterEl.innerText = `UPGRADES ATIVOS (${this.inventory.length}/10):`;
        }

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

    updateSkinsUI() {
        const grid = document.getElementById('skins-grid');
        if (!grid) return;
        grid.innerHTML = '';

        this.availableSkins.forEach(skin => {
            const isUnlocked = this.unlockedSkins.includes(skin.id);
            const isSelected = this.selectedSkin === skin.id;

            const card = document.createElement('div');
            card.className = 'panel';
            card.style.border = isSelected ? '2px solid #ffcc00' : '1px solid rgba(255,255,255,0.1)';
            card.style.textAlign = 'center';
            card.style.padding = '15px';
            card.style.background = isSelected ? 'rgba(255, 204, 0, 0.1)' : 'rgba(255,255,255,0.05)';

            card.innerHTML = `
                <div style="width: 50px; height: 30px; background: #${skin.color.toString(16).padStart(6, '0')}; margin: 0 auto 10px; border-radius: 4px; border: 1px solid white;"></div>
                <div style="font-weight: bold;">${skin.name}</div>
                <div style="font-size: 0.8rem; margin: 10px 0;">${isUnlocked ? 'DESBLOQUEADO' : `PREÇO: ${skin.cost} 🪙`}</div>
                <button class="btn" style="padding: 5px 15px; font-size: 0.8rem; width: 100%;" 
                        onclick="economy.${isUnlocked ? 'selectSkin' : 'buySkin'}('${skin.id}')">
                    ${isSelected ? 'SELECIONADO' : (isUnlocked ? 'USAR' : 'COMPRAR')}
                </button>
            `;
            grid.appendChild(card);
        });
    },

    buySkin(skinId) {
        const skin = this.availableSkins.find(s => s.id === skinId);
        if (this.coins < skin.cost) {
            alert('Moedas insuficientes!');
            return;
        }
        this.coins -= skin.cost;
        this.unlockedSkins.push(skinId);
        this.selectedSkin = skinId;
        this.save();
        alert(`Skin ${skin.name} desbloqueada!`);
    },

    selectSkin(skinId) {
        this.selectedSkin = skinId;
        this.save();
    },

    getSelectedSkinColor() {
        const skin = this.availableSkins.find(s => s.id === this.selectedSkin);
        return (skin && skin.color !== undefined) ? skin.color : 0xeeeeee;
    },

    buyRandomUpgrade() {
        if (this.inventory.length >= 10) {
            alert('Limite de upgrades atingido! (Máximo: 10). Remova algum para comprar novos.');
            return;
        }

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

    removeRandomUpgrade() {
        const REMOVE_COST = 10;
        if (this.coins < REMOVE_COST) {
            alert('Moedas insuficientes!');
            return;
        }
        if (this.inventory.length === 0) {
            alert('Nenhum upgrade para remover!');
            return;
        }

        this.coins -= REMOVE_COST;
        const randomIndex = Math.floor(Math.random() * this.inventory.length);
        const removed = this.inventory.splice(randomIndex, 1)[0];

        this.save();
        console.log(`REMOVED: ${removed.name}`);

        alert(`Upgrade removido: ${removed.name}`);
    },

    removeAllDebuffs() {
        const COST = 500;
        const debuffs = this.inventory.filter(item => item.type === 'debuff');

        if (debuffs.length === 0) {
            alert('Você não tem upgrades ruins (debuffs) para remover!');
            return;
        }

        if (this.coins < COST) {
            alert(`Moedas insuficientes! Você precisa de ${COST} 🪙.`);
            return;
        }

        if (confirm(`Deseja remover TODOS os ${debuffs.length} debuffs por ${COST} 🪙?`)) {
            this.coins -= COST;
            this.inventory = this.inventory.filter(item => item.type !== 'debuff');
            this.save();
            alert('Todos os debuffs foram removidos!');
        }
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

// Expose globally
window.economy = economy;

// Initialize economy on load
window.addEventListener('DOMContentLoaded', () => economy.init());
