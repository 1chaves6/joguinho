const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajusta o tamanho da tela
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Configurações do Mundo Aberto
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

// Estado do Jogador
const player = {
    x: 1000,
    y: 1000,
    radius: 18,
    speed: 3.5,
    bag: 0,
    maxBag: 5,
    coins: 0,
    magnetRange: 0,
    emoji: '🧑‍🌾'
};

// Níveis e Custos dos Power-Ups
const upgrades = {
    speed: { level: 1, cost: 30 },
    bag: { level: 1, cost: 40 },
    magnet: { level: 0, cost: 60 }
};

// Listas de Entidades
const solids = [];     // Casas e árvores (com colisão)
const trashBins = [];  // Lixeiras
const trashes = [];    // Lixos espalhados
const npcs = [];       // Moradores na calçada
const pets = [];       // Animais domésticos
const floatingTexts = []; // Textos flutuantes (+10 moedas, etc)

// Controles
const keys = {};
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    if (key === 'e') handleInteract();
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Construção da Cidade (Casas, Árvores, Lixeiras)
function buildCity() {
    const houseEmojis = ['🏠', '🏡', '🏢', '🏪', '🏫', '🏥'];
    const treeEmojis = ['🌳', '🌲', '🌴'];

    // Quarteirões de casas (deixando ruas livres em x=500, 1000, 1500 e y=500, 1000, 1500)
    const blocks = [
        { x: 150, y: 150 }, { x: 300, y: 150 }, { x: 150, y: 300 },
        { x: 650, y: 150 }, { x: 800, y: 150 }, { x: 650, y: 300 },
        { x: 1150, y: 150 }, { x: 1300, y: 150 }, { x: 1650, y: 200 },
        { x: 150, y: 650 }, { x: 300, y: 650 }, { x: 150, y: 800 },
        { x: 1150, y: 650 }, { x: 1300, y: 650 }, { x: 1650, y: 700 },
        { x: 150, y: 1150 }, { x: 300, y: 1150 }, { x: 150, y: 1650 },
        { x: 650, y: 1150 }, { x: 800, y: 1150 }, { x: 650, y: 1650 },
        { x: 1150, y: 1150 }, { x: 1300, y: 1650 }, { x: 1650, y: 1650 }
    ];

    blocks.forEach((b, i) => {
        solids.push({
            x: b.x,
            y: b.y,
            radius: 36,
            size: 75,
            emoji: houseEmojis[i % houseEmojis.length],
            type: 'house'
        });
    });

    // Árvores espalhadas (evitando o meio das ruas)
    for (let i = 0; i < 65; i++) {
        let tx = 80 + Math.random() * (WORLD_WIDTH - 160);
        let ty = 80 + Math.random() * (WORLD_HEIGHT - 160);

        // Não colocar árvore no meio das ruas principais
        const onRoadX = Math.abs(tx - 500) < 75 || Math.abs(tx - 1000) < 75 || Math.abs(tx - 1500) < 75;
        const onRoadY = Math.abs(ty - 500) < 75 || Math.abs(ty - 1000) < 75 || Math.abs(ty - 1500) < 75;

        if (!onRoadX && !onRoadY && !checkSolidCollision(tx, ty, 35)) {
            solids.push({
                x: tx,
                y: ty,
                radius: 22,
                size: 52,
                emoji: treeEmojis[Math.floor(Math.random() * treeEmojis.length)],
                type: 'tree'
            });
        }
    }

    // Lixeiras nas esquinas das calçadas
    const binCoords = [
        { x: 435, y: 435 }, { x: 1065, y: 435 }, { x: 1565, y: 435 },
        { x: 435, y: 1065 }, { x: 935, y: 935 }, { x: 1565, y: 1065 },
        { x: 435, y: 1565 }, { x: 1065, y: 1565 }, { x: 1565, y: 1565 }
    ];
    binCoords.forEach(coord => {
        trashBins.push({ x: coord.x, y: coord.y, emoji: '🗑️' });
    });

    // Criar NPCs que andam pelas calçadas
    const npcEmojis = ['🚶', '🚶‍♀️', '🏃', '👩‍💼', '👨‍🔧', '👵', '🧑‍🎤'];
    const sidewalkPaths = [445, 555, 945, 1055, 1445, 1555];
    for (let i = 0; i < 18; i++) {
        const horizontal = i % 2 === 0;
        const fixedCoord = sidewalkPaths[i % sidewalkPaths.length];
        npcs.push({
            x: horizontal ? Math.random() * WORLD_WIDTH : fixedCoord,
            y: horizontal ? fixedCoord : Math.random() * WORLD_HEIGHT,
            vx: horizontal ? (Math.random() < 0.5 ? 1.2 : -1.2) : 0,
            vy: horizontal ? 0 : (Math.random() < 0.5 ? 1.2 : -1.2),
            emoji: npcEmojis[i % npcEmojis.length]
        });
    }

    // Criar Animais Domésticos
    const petEmojis = ['🐕', '🐩', '🐈', '🐈‍⬛', '🐇', '🕊️'];
    for (let i = 0; i < 16; i++) {
        pets.push({
            x: 200 + Math.random() * (WORLD_WIDTH - 400),
            y: 200 + Math.random() * (WORLD_HEIGHT - 400),
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            timer: Math.random() * 100,
            emoji: petEmojis[i % petEmojis.length]
        });
    }

    // Gerar lixos iniciais
    for (let i = 0; i < 45; i++) spawnTrash();
}

function spawnTrash() {
    const trashEmojis = ['🍌', '🥤', '📰', '🥫', '🛍️', '🧃', '🍕'];
    let x, y;
    do {
        x = 60 + Math.random() * (WORLD_WIDTH - 120);
        y = 60 + Math.random() * (WORLD_HEIGHT - 120);
    } while (checkSolidCollision(x, y, 25));

    trashes.push({
        x,
        y,
        emoji: trashEmojis[Math.floor(Math.random() * trashEmojis.length)]
    });
}

// Verifica colisão com casas e árvores
function checkSolidCollision(x, y, radius) {
    for (let s of solids) {
        const dx = x - s.x;
        const dy = y - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist < radius + s.radius) {
            return true;
        }
    }
    return false;
}

// Interação com tecla E
function handleInteract() {
    // 1. Verificar se está perto de alguma lixeira para descarregar
    for (let bin of trashBins) {
        if (Math.hypot(player.x - bin.x, player.y - bin.y) < 65) {
            if (player.bag > 0) {
                const earned = player.bag * 10;
                player.coins += earned;
                addFloatingText(bin.x, bin.y - 20, `+${earned} 💰`, '#ffeb3b');
                player.bag = 0;
                updateHUD();
            } else {
                addFloatingText(bin.x, bin.y - 20, 'Mochila vazia!', '#ffffff');
            }
            return;
        }
    }

    // 2. Verificar se está perto de algum lixo para coletar
    for (let i = trashes.length - 1; i >= 0; i--) {
        const t = trashes[i];
        if (Math.hypot(player.x - t.x, player.y - t.y) < 55) {
            if (player.bag < player.maxBag) {
                trashes.splice(i, 1);
                player.bag++;
                addFloatingText(player.x, player.y - 25, '+1 Lixo 🎒', '#81c784');
                updateHUD();
            } else {
                addFloatingText(player.x, player.y - 25, 'Mochila Cheia! Vá à 🗑️', '#ff5252');
            }
            return;
        }
    }
}

function addFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, alpha: 1 });
}

// Atualização Lógica do Jogo
function update() {
    // Movimento do Jogador (WASD ou Setas)
    let moveX = 0;
    let moveY = 0;
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;

    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
    }

    const nextX = Math.max(25, Math.min(WORLD_WIDTH - 25, player.x + moveX * player.speed));
    const nextY = Math.max(25, Math.min(WORLD_HEIGHT - 25, player.y + moveY * player.speed));

    // Colisão deslizante (permite deslizar nas paredes das casas/árvores)
    if (!checkSolidCollision(nextX, player.y, player.radius)) {
        player.x = nextX;
    }
    if (!checkSolidCollision(player.x, nextY, player.radius)) {
        player.y = nextY;
    }

    // Efeito do Power-Up Ímã Ecológico
    if (player.magnetRange > 0 && player.bag < player.maxBag) {
        for (let i = trashes.length - 1; i >= 0; i--) {
            const t = trashes[i];
            const dist = Math.hypot(player.x - t.x, player.y - t.y);
            if (dist < player.magnetRange) {
                t.x += (player.x - t.x) * 0.08;
                t.y += (player.y - t.y) * 0.08;
                if (dist < 28 && player.bag < player.maxBag) {
                    trashes.splice(i, 1);
                    player.bag++;
                    addFloatingText(player.x, player.y - 25, '🧲 +1 Lixo', '#4fc3f7');
                    updateHUD();
                }
            }
        }
    }

    // Movimento dos NPCs nas calçadas (e ocasionalmente jogam lixo!)
    npcs.forEach(npc => {
        npc.x += npc.vx;
        npc.y += npc.vy;

        if (npc.x < 40 || npc.x > WORLD_WIDTH - 40) npc.vx *= -1;
        if (npc.y < 40 || npc.y > WORLD_HEIGHT - 40) npc.vy *= -1;

        // Chance pequena de um NPC deixar cair lixo na cidade
        if (Math.random() < 0.0006 && trashes.length < 70) {
            spawnTrash();
            updateHUD();
        }
    });

    // Movimento dos Animais Domésticos
    pets.forEach(pet => {
        pet.timer--;
        if (pet.timer <= 0) {
            pet.vx = (Math.random() - 0.5) * 2.2;
            pet.vy = (Math.random() - 0.5) * 2.2;
            pet.timer = 60 + Math.random() * 120;
        }
        const px = pet.x + pet.vx;
        const py = pet.y + pet.vy;
        if (px > 40 && px < WORLD_WIDTH - 40 && !checkSolidCollision(px, pet.y, 15)) pet.x = px;
        if (py > 40 && py < WORLD_HEIGHT - 40 && !checkSolidCollision(pet.x, py, 15)) pet.y = py;
    });

    // Atualiza textos flutuantes
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].y -= 0.8;
        floatingTexts[i].alpha -= 0.018;
        if (floatingTexts[i].alpha <= 0) floatingTexts.splice(i, 1);
    }

    // Verifica proximidade para mostrar aviso "Pressione [E]"
    const promptEl = document.getElementById('prompt-action');
    const nearBin = trashBins.some(b => Math.hypot(player.x - b.x, player.y - b.y) < 65);
    const nearTrash = trashes.some(t => Math.hypot(player.x - t.x, player.y - t.y) < 55);

    if (nearBin) {
        promptEl.textContent = player.bag > 0
            ? `Pressione [E] para reciclar (${player.bag * 10} moedas)`
            : 'Lixeira 🗑️ (Colete lixos primeiro)';
        promptEl.classList.remove('hidden');
    } else if (nearTrash) {
        promptEl.textContent = player.bag < player.maxBag
            ? 'Pressione [E] para coletar o lixo'
            : 'Mochila cheia! Procure uma lixeira 🗑️';
        promptEl.classList.remove('hidden');
    } else {
        promptEl.classList.add('hidden');
    }
}

// Renderização do Mundo
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Câmera centralizada no jogador
    const camX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width / 2));
    const camY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, player.y - canvas.height / 2));

    ctx.save();
    ctx.translate(-camX, -camY);

    // 1. Gramado base da cidade
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 2. Calçadas e Ruas
    const roadCoords = [500, 1000, 1500];
    roadCoords.forEach(pos => {
        // Calçadas (cinza claro)
        ctx.fillStyle = '#cfd8dc';
        ctx.fillRect(pos - 65, 0, 130, WORLD_HEIGHT);
        ctx.fillRect(0, pos - 65, WORLD_WIDTH, 130);

        // Asfalto (cinza escuro)
        ctx.fillStyle = '#37474f';
        ctx.fillRect(pos - 42, 0, 84, WORLD_HEIGHT);
        ctx.fillRect(0, pos - 42, WORLD_WIDTH, 84);
    });

    // Faixas amarelas das ruas
    ctx.strokeStyle = '#ffca28';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    roadCoords.forEach(pos => {
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, WORLD_HEIGHT);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(WORLD_WIDTH, pos);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // Praça Central (em torno de 1000, 1000)
    ctx.fillStyle = '#d7ccc8';
    ctx.beginPath();
    ctx.arc(1000, 1000, 85, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '45px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛲', 1000, 1000);

    // Raio visual do Ímã Ecológico (se comprado)
    if (player.magnetRange > 0) {
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.magnetRange, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 3. Lixos no chão
    ctx.font = '26px Arial';
    trashes.forEach(t => {
        ctx.fillText(t.emoji, t.x, t.y);
    });

    // 4. Lixeiras
    ctx.font = '36px Arial';
    trashBins.forEach(bin => {
        ctx.fillText(bin.emoji, bin.x, bin.y);
    });

    // 5. Animais Domésticos
    ctx.font = '26px Arial';
    pets.forEach(pet => {
        ctx.fillText(pet.emoji, pet.x, pet.y);
    });

    // 6. NPCs
    ctx.font = '32px Arial';
    npcs.forEach(npc => {
        ctx.fillText(npc.emoji, npc.x, npc.y);
    });

    // 7. Jogador
    ctx.font = '36px Arial';
    ctx.fillText(player.emoji, player.x, player.y);

    // 8. Casas e Árvores (desenhadas por cima para dar profundidade)
    solids.forEach(s => {
        ctx.font = `${s.size}px Arial`;
        ctx.fillText(s.emoji, s.x, s.y);
    });

    // 9. Textos Flutuantes
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 18px Segoe UI';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
    });

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Atualiza Interface (HUD)
function updateHUD() {
    document.getElementById('coins').textContent = player.coins;
    document.getElementById('bag').textContent = player.bag;
    document.getElementById('max-bag').textContent = player.maxBag;
    document.getElementById('trash-count').textContent = trashes.length;
}

// Lógica da Loja de Power-Ups
const shopModal = document.getElementById('shop-modal');
document.getElementById('btn-shop').addEventListener('click', () => shopModal.classList.remove('hidden'));
document.getElementById('close-shop').addEventListener('click', () => shopModal.classList.add('hidden'));

document.getElementById('buy-speed').addEventListener('click', () => {
    if (player.coins >= upgrades.speed.cost) {
        player.coins -= upgrades.speed.cost;
        upgrades.speed.level++;
        upgrades.speed.cost += 25;
        player.speed += 0.9;
        document.getElementById('lvl-speed').textContent = upgrades.speed.level;
        document.getElementById('buy-speed').textContent = `💰 ${upgrades.speed.cost}`;
        updateHUD();
    }
});

document.getElementById('buy-bag').addEventListener('click', () => {
    if (player.coins >= upgrades.bag.cost) {
        player.coins -= upgrades.bag.cost;
        upgrades.bag.level++;
        upgrades.bag.cost += 30;
        player.maxBag += 3;
        document.getElementById('lvl-bag').textContent = upgrades.bag.level;
        document.getElementById('buy-bag').textContent = `💰 ${upgrades.bag.cost}`;
        updateHUD();
    }
});

document.getElementById('buy-magnet').addEventListener('click', () => {
    if (player.coins >= upgrades.magnet.cost) {
        player.coins -= upgrades.magnet.cost;
        upgrades.magnet.level++;
        upgrades.magnet.cost += 50;
        player.magnetRange = upgrades.magnet.level === 1 ? 110 : player.magnetRange + 45;
        document.getElementById('lvl-magnet').textContent = upgrades.magnet.level;
        document.getElementById('buy-magnet').textContent = `💰 ${upgrades.magnet.cost}`;
        updateHUD();
    }
});

// Inicializar Jogo
buildCity();
updateHUD();
gameLoop();
