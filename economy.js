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
        { id: 'red_nitro', name: 'Vermelho Nitro', color: 0xff3333, cost: 150 },
        { id: 'blue_electric', name: 'Azul Elétrico', color: 0x3366ff, cost: 150 },
        { id: 'green_krypton', name: 'Verde Krypton', color: 0x33ff33, cost: 150 },
        { id: 'purple_galaxy', name: 'Roxo Galáctico', color: 0x9933ff, cost: 200 },
        { id: 'orange_fire', name: 'Laranja Fogo', color: 0xff6600, cost: 200 },
        { id: 'silver_cyber', name: 'Silver Cyber', color: 0xcccccc, cost: 200 },
        { id: 'black_midnight', name: 'Black Midnight', color: 0x0a0a0a, cost: 250 },
        { id: 'the_cube', name: 'O Quadrado Supremo', color: 0xffffff, cost: 1000000000 }
    ],
    unlockedSkins: JSON.parse(localStorage.getItem('turbo_skins_unlocked')) || ['default'],
    selectedSkin: localStorage.getItem('turbo_selected_skin') || 'default',

    // New: Objectives and Titles
    racesCount: parseInt(localStorage.getItem('turbo_races_count')) || 0,
    unlockedTitles: JSON.parse(localStorage.getItem('turbo_titles')) || ['Iniciante'],
    selectedTitle: localStorage.getItem('turbo_selected_title') || 'Iniciante',
    objectives: [
        { id: 'race_3', name: 'Primeiros Passos', desc: 'Corra 3 vezes.', target: 3, rewardType: 'title', reward: 'Corredor Noob', claimed: JSON.parse(localStorage.getItem('turbo_obj_race_3')) || false },
        { id: 'race_10', name: 'Piloto de Fuga', desc: 'Complete 10 corridas.', target: 10, rewardType: 'title', reward: 'Piloto de Fuga', claimed: JSON.parse(localStorage.getItem('turbo_obj_race_10')) || false },
        { id: 'race_25', name: 'Lenda do Asfalto', desc: 'Complete 25 corridas.', target: 25, rewardType: 'title', reward: 'Lenda do Asfalto', claimed: JSON.parse(localStorage.getItem('turbo_obj_race_25')) || false },
        { id: 'race_50', name: 'Rei do Drift', desc: 'Complete 50 corridas.', target: 50, rewardType: 'title', reward: 'Rei do Drift', claimed: JSON.parse(localStorage.getItem('turbo_obj_race_50')) || false },
        { id: 'race_100', name: 'Fantasma da Noite', desc: 'Complete 100 corridas.', target: 100, rewardType: 'title', reward: 'Fantasma da Noite', claimed: JSON.parse(localStorage.getItem('turbo_obj_race_100')) || false },
        { id: 'race_250', name: 'Lenda Suprema', desc: 'Complete 250 corridas.', target: 250, rewardType: 'title', reward: 'Lenda Suprema', claimed: JSON.parse(localStorage.getItem('turbo_obj_race_250')) || false },
        { id: 'race_500', name: 'Divindade do Asfalto', desc: 'Complete 500 corridas.', target: 500, rewardType: 'title', reward: 'Divindade do Asfalto', claimed: JSON.parse(localStorage.getItem('turbo_obj_race_500')) || false },
        { id: 'coins_5000', name: 'O Magnata', desc: 'Acumule um total de 5.000 moedas ganhas.', target: 5000, rewardType: 'title', reward: 'Magnata das Pistas', claimed: JSON.parse(localStorage.getItem('turbo_obj_coins_5000')) || false }
    ],

    // Daily System
    totalCoinsEarned: parseInt(localStorage.getItem('turbo_total_coins')) || 0,
    dailyRaces: parseInt(localStorage.getItem('turbo_daily_races')) || 0,
    lastDailyDate: localStorage.getItem('turbo_last_daily_date') || "",
    dailyObjectives: [
        { id: 'daily_2', name: 'Corrida Matinal', desc: 'Complete 2 corridas HOJE.', target: 2, rewardType: 'coins', reward: 300, claimed: JSON.parse(localStorage.getItem('turbo_obj_daily_2')) || false },
        { id: 'daily_5', name: 'Trabalho Pesado', desc: 'Complete 5 corridas HOJE.', target: 5, rewardType: 'coins', reward: 800, claimed: JSON.parse(localStorage.getItem('turbo_obj_daily_5')) || false }
    ],

    // Battle Pass System
    xp: parseInt(localStorage.getItem('turbo_xp')) || 0,
    bpLevel: parseInt(localStorage.getItem('turbo_bp_level')) || 1,
    hasPaidPass: JSON.parse(localStorage.getItem('turbo_has_paid_pass')) || false,
    xpPerLevel: 300,
    claimedFreeRewards: JSON.parse(localStorage.getItem('turbo_claimed_free')) || [],
    claimedPaidRewards: JSON.parse(localStorage.getItem('turbo_claimed_paid')) || [],

    currentUpgradeCost: 0,

    init() {
        this.checkDailyRefresh();
        this.generateRandomCost();
        this.updateUI();
        this.updateSkinsUI();
    },

    checkDailyRefresh() {
        const today = new Date().toLocaleDateString();
        if (this.lastDailyDate !== today) {
            this.lastDailyDate = today;
            this.dailyRaces = 0;
            this.dailyObjectives.forEach(obj => {
                obj.claimed = false;
                localStorage.setItem(`turbo_obj_${obj.id}`, false);
            });
            this.save();
        }
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
        localStorage.setItem('turbo_races_count', this.racesCount);
        localStorage.setItem('turbo_titles', JSON.stringify(this.unlockedTitles));
        localStorage.setItem('turbo_selected_title', this.selectedTitle);
        localStorage.setItem('turbo_daily_races', this.dailyRaces);
        localStorage.setItem('turbo_last_daily_date', this.lastDailyDate);
        localStorage.setItem('turbo_total_coins', this.totalCoinsEarned);
        localStorage.setItem('turbo_xp', this.xp);
        localStorage.setItem('turbo_bp_level', this.bpLevel);
        localStorage.setItem('turbo_has_paid_pass', this.hasPaidPass);
        localStorage.setItem('turbo_claimed_free', JSON.stringify(this.claimedFreeRewards));
        localStorage.setItem('turbo_claimed_paid', JSON.stringify(this.claimedPaidRewards));

        // Save objectives status
        this.objectives.forEach(obj => {
            localStorage.setItem(`turbo_obj_${obj.id}`, obj.claimed);
        });
        this.dailyObjectives.forEach(obj => {
            localStorage.setItem(`turbo_obj_${obj.id}`, obj.claimed);
        });

        this.updateUI();
        this.updateSkinsUI();
        this.updateObjectivesUI();
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
        if (amount > 0) this.totalCoinsEarned += amount;
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
    },

    // --- Objectives Methods ---
    incrementRacesCount() {
        this.racesCount++;
        this.dailyRaces++;
        this.save();
    },

    updateObjectivesUI() {
        const grid = document.getElementById('objectives-list-container');
        if (!grid) return;
        grid.innerHTML = '';

        // SEÇÃO DIÁRIA
        const dailyHeader = document.createElement('div');
        dailyHeader.innerHTML = `<h3 style="color: var(--secondary); margin: 15px 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">Objetivos Diários</h3>`;
        grid.appendChild(dailyHeader);

        this.dailyObjectives.forEach(obj => {
            this.renderObjectiveCard(grid, obj, this.dailyRaces);
        });

        // SEÇÃO PERMANENTE (TÍTULOS)
        const permHeader = document.createElement('div');
        permHeader.innerHTML = `<h3 style="color: var(--primary); margin: 25px 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">Conquistas de Carreira</h3>`;
        grid.appendChild(permHeader);

        this.objectives.forEach(obj => {
            let current = this.racesCount;
            if (obj.id.startsWith('coins')) current = this.totalCoinsEarned;
            this.renderObjectiveCard(grid, obj, current);
        });

        // Update Title Selector
        const titleSelect = document.getElementById('title-selector');
        if (titleSelect) {
            titleSelect.innerHTML = '';
            this.unlockedTitles.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.text = t;
                opt.selected = this.selectedTitle === t;
                titleSelect.appendChild(opt);
            });
        }
    },

    renderObjectiveCard(container, obj, currentProgress) {
        const isCompleted = currentProgress >= obj.target;
        const isClaimed = obj.claimed;

        const card = document.createElement('div');
        card.className = 'panel';
        card.style.padding = '12px';
        card.style.marginBottom = '10px';
        card.style.border = isClaimed ? '1px solid rgba(0, 255, 136, 0.3)' : (isCompleted ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)');
        card.style.background = isClaimed ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255,255,255,0.05)';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 0.9rem; color: ${isCompleted ? 'var(--primary)' : 'white'}">${obj.name}</div>
                    <div style="font-size: 0.75rem; opacity: 0.7; margin: 3px 0;">${obj.desc}</div>
                    <div style="font-size: 0.65rem; font-weight: bold; color: var(--secondary);">RECOMPENSA: ${obj.rewardType === 'title' ? `TÍTULO "${obj.reward}"` : `${obj.reward} 🪙`}</div>
                </div>
                <div style="text-align: right; min-width: 80px;">
                    <div style="font-size: 0.8rem; font-weight: bold;">${Math.min(currentProgress, obj.target)}/${obj.target}</div>
                    <button class="btn" style="padding: 4px 10px; font-size: 0.6rem; margin: 5px 0 0 0; min-width: 80px;" 
                            ${(!isCompleted || isClaimed) ? 'disabled' : ''} 
                            onclick="economy.claimObjectiveReward('${obj.id}')">
                        ${isClaimed ? 'RESGATADO' : (isCompleted ? 'RESGATAR' : 'BLOQUEADO')}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    },

    claimObjectiveReward(objId) {
        let obj = this.objectives.find(o => o.id === objId);
        let currentProgress = this.racesCount;
        if (obj && obj.id.startsWith('coins')) currentProgress = this.totalCoinsEarned;

        if (!obj) {
            obj = this.dailyObjectives.find(o => o.id === objId);
            currentProgress = this.dailyRaces;
        }

        if (!obj || obj.claimed || currentProgress < obj.target) return;

        obj.claimed = true;

        if (obj.rewardType === 'coins') {
            this.coins += obj.reward;
            alert(`Recompensa Diária: +${obj.reward} moedas!`);
        } else if (obj.rewardType === 'title') {
            if (!this.unlockedTitles.includes(obj.reward)) {
                this.unlockedTitles.push(obj.reward);
                this.selectedTitle = obj.reward;
                alert(`Título Lendário Desbloqueado: "${obj.reward}"!`);
            }
        }

        this.save();
    },

    changeTitle(newTitle) {
        if (this.unlockedTitles.includes(newTitle)) {
            this.selectedTitle = newTitle;
            this.save();
        }
    },

    // --- Battle Pass Methods ---
    addXP(amount) {
        this.xp += amount;
        while (this.xp >= this.xpPerLevel) {
            this.xp -= this.xpPerLevel;
            this.bpLevel++;
            console.log(`BATTLE PASS LEVEL UP! Now Level ${this.bpLevel}`);
        }
        this.save();
        this.updateBattlePassUI();
    },

    buyPaidPass() {
        const PASS_COST = 1500;
        if (this.hasPaidPass) return;
        if (this.coins < PASS_COST) {
            alert("Moedas insuficientes para o Passe Drift Premium!");
            return;
        }
        this.coins -= PASS_COST;
        this.hasPaidPass = true;
        this.save();
        alert("BEM-VINDO AO PREMIUM! Recompensas exclusivas desbloqueadas.");
    },

    updateBattlePassUI() {
        const list = document.getElementById('bp-list');
        if (!list) return;
        list.innerHTML = '';

        const xpBar = document.getElementById('bp-xp-bar');
        const levelNum = document.getElementById('bp-level-num');
        const xpText = document.getElementById('bp-xp-text');

        if (xpBar) xpBar.style.width = `${(this.xp / this.xpPerLevel) * 100}%`;
        if (levelNum) levelNum.innerText = this.bpLevel;
        if (xpText) xpText.innerText = `${this.xp}/${this.xpPerLevel} XP`;

        // Reward definitions for the pass
        const getRewardName = (lvl, track) => {
            if (track === 'free') {
                if (lvl === 3) return "🔴 Vermelho Nitro";
                if (lvl === 9) return "🔵 Azul Elétrico";
                if (lvl === 15) return "🟢 Verde Krypton";
                if (lvl % 3 === 0) return "🎁 Buff Chaos";
                return "-";
            } else {
                const skinRewards = { 1: '🔥 Laranja Fogo', 5: '🚕 Skin Taxi', 7: '🟣 Roxo Galáctico', 10: '🚓 Skin Rocam', 15: '🏁 Skin Carbono', 20: '💖 Skin Neon', 25: '🏎️ Ferrari F40', 30: '💎 BMW 320i' };
                return skinRewards[lvl] || "150 🪙";
            }
        };

        for (let i = 1; i <= 30; i++) {
            const isUnlocked = this.bpLevel >= i;
            const freeName = getRewardName(i, 'free');
            const paidName = getRewardName(i, 'paid');
            
            const isFreeClaimed = this.claimedFreeRewards.includes(i);
            const isPaidClaimed = this.claimedPaidRewards.includes(i);

            const row = document.createElement('div');
            row.className = 'bp-row';
            row.style.opacity = isUnlocked ? '1' : '0.5';
            row.style.borderLeft = isUnlocked ? '4px solid var(--primary)' : '4px solid #333';

            row.innerHTML = `
                <div class="bp-level-tag">LVL ${i}</div>
                <div class="bp-track free">
                    ${freeName !== '-' ? `
                        <div class="bp-reward-item">
                            <span>${freeName}</span>
                            <button class="btn" style="padding: 2px 10px; font-size: 0.6rem; margin:0;" 
                                ${(!isUnlocked || isFreeClaimed) ? 'disabled' : ''} 
                                onclick="economy.claimBPReward(${i}, 'free')">
                                ${isFreeClaimed ? 'OK' : 'PEGAR'}
                            </button>
                        </div>
                    ` : '<span style="opacity:0.3">-</span>'}
                </div>
                <div class="bp-track paid ${this.hasPaidPass ? 'active' : ''}">
                    <div class="bp-reward-item">
                        <span>${this.hasPaidPass ? paidName : '💠 LOCKED'}</span>
                        <button class="btn" style="padding: 2px 10px; font-size: 0.6rem; margin:0;" 
                            ${(!isUnlocked || !this.hasPaidPass || isPaidClaimed) ? 'disabled' : ''} 
                            onclick="economy.claimBPReward(${i}, 'paid')">
                            ${isPaidClaimed ? 'OK' : 'PEGAR'}
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(row);
        }
    },

    claimBPReward(level, track) {
        if (this.bpLevel < level) return;

        if (track === 'free') {
            if (level % 3 !== 0 || this.claimedFreeRewards.includes(level)) return;

            const freeSkins = { 3: 'red_nitro', 9: 'blue_electric', 15: 'green_krypton' };
            
            if (freeSkins[level]) {
                const skinId = freeSkins[level];
                if (!this.unlockedSkins.includes(skinId)) {
                    this.unlockedSkins.push(skinId);
                    alert(`GRÁTIS: Você desbloqueou a skin ${skinId.toUpperCase()}!`);
                } else {
                    this.coins += 200;
                    alert(`GRÁTIS: Você já tinha essa skin! +200 Moedas de bônus.`);
                }
            } else {
                const randomIndex = Math.floor(Math.random() * this.availableUpgrades.length);
                const upgrade = this.availableUpgrades[randomIndex];

                if (this.inventory.length < 10) {
                    this.inventory.push(upgrade);
                    alert(`Recompensa Grátis Nível ${level}: Você ganhou ${upgrade.name}!`);
                } else {
                    this.coins += 50;
                    alert(`Mochila cheia! Nível ${level}: 50 Moedas como compensação.`);
                }
            }
            this.claimedFreeRewards.push(level);
        } else {
            if (!this.hasPaidPass || this.claimedPaidRewards.includes(level)) return;

            const skinRewards = { 1: 'orange_fire', 5: 'taxi', 7: 'purple_galaxy', 10: 'police', 15: 'carbon', 20: 'neon', 25: 'ferrari_f40', 30: 'bmw320i' };
            
            if (skinRewards[level]) {
                const skinId = skinRewards[level];
                if (!this.unlockedSkins.includes(skinId)) {
                    this.unlockedSkins.push(skinId);
                    alert(`PREMIUM: Você desbloqueou a skin ${skinId.toUpperCase()}!`);
                } else {
                    this.coins += 500;
                    alert(`PREMIUM: Você já tinha essa skin! +500 Moedas como compensação.`);
                }
            } else {
                this.coins += 150;
                alert(`PREMIUM Nível ${level}: +150 Moedas!`);
            }
            this.claimedPaidRewards.push(level);
        }
        this.save();
    }
};

// Expose globally
window.economy = economy;

// Initialize economy on load
window.addEventListener('DOMContentLoaded', () => economy.init());
