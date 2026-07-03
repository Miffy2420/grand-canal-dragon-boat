let gameState = {
    isGameStarted: false,
    isDragging: false,
    currentEggIndex: 0,
    activeEggs: [],
    appearedEggs: new Set(), // 记录已出现的彩蛋索引
    collectedEggs: 0,
    boatInitialX: 0,
    boatInitialY: 0,
    spawnTimeout: null,
    batchSpawned: 0,
    boatAngle: 0,
    lastMouseX: 0,
    mouseVelocityX: 0
};

const eggs = [
    { image: '白浮泉遗址.png', textImage: '解锁地点/白浮泉遗址.png' },
    { image: '沧州谢家坝.png', textImage: '解锁地点/沧州谢家坝.png' },
    { image: '杭州拱宸桥.png', textImage: '解锁地点/杭州拱宸桥.png' },
    { image: '开封州桥.png', textImage: '解锁地点/开封州桥.png' },
    { image: '南旺分水口.png', textImage: '解锁地点/南旺分水口.png' },
    { image: '天津三岔口.png', textImage: '解锁地点/天津三岔口.png' },
    { image: '龙舟粽.png', textImage: '粽子和船/定胜糕.png' },
    { image: '普通粽.png', textImage: '粽子和船/定胜糕.png' },
    { image: '漕运古船1.png', textImage: '粽子和船/漕运古船.png' },
    { image: '漕运古船2.png', textImage: '粽子和船/漕运古船.png' }
];

const guideText = document.getElementById('guide-text');
const dragonBoat = document.getElementById('dragon-boat');
const eggContainer = document.getElementById('egg-container');
const eggTextContainer = document.getElementById('egg-text-container');
const successBackground = document.getElementById('success-background');
const bgImage = document.getElementById('bg-image');
const bgVideo = document.getElementById('bg-video');

let boatWidth = window.innerWidth * 0.2;
let boatHeight = boatWidth * 0.4;

const moveBounds = {
    vertical: 450,
    horizontal: 450
};

function getBoatMoveArea() {
    const boatCenterX = gameState.boatInitialX;
    const boatCenterY = gameState.boatInitialY;
    const navbarHeight = 76;
    
    return {
        minX: Math.max(boatWidth / 2, boatCenterX - moveBounds.horizontal),
        maxX: window.innerWidth - boatWidth / 2,
        minY: Math.max(navbarHeight + boatHeight / 2, boatCenterY - moveBounds.vertical),
        maxY: window.innerHeight - boatHeight / 2
    };
}

function constrainBoatPosition(x, y) {
    const area = getBoatMoveArea();
    return {
        x: Math.max(area.minX, Math.min(area.maxX, x)),
        y: Math.max(area.minY, Math.min(area.maxY, y))
    };
}

function updateBoatRotation(deltaX) {
    const maxAngle = 60;
    const baseSensitivity = 0.3;
    const maxVelocity = 50;
    
    const velocityFactor = Math.min(Math.abs(deltaX) / maxVelocity, 1);
    let targetAngle = deltaX * baseSensitivity * velocityFactor;
    targetAngle = Math.max(-maxAngle, Math.min(maxAngle, targetAngle));
    
    const smoothing = 0.15;
    gameState.boatAngle += (targetAngle - gameState.boatAngle) * smoothing;
    
    return gameState.boatAngle;
}

let dragStartX = 0;
let dragStartY = 0;
let boatStartX = 0;
let boatStartY = 0;

function handleDragStart(e) {
    if (!gameState.isGameStarted) return;

    e.preventDefault();
    gameState.isDragging = true;
    dragonBoat.classList.add('dragging');

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    dragStartX = clientX;
    dragStartY = clientY;
    gameState.lastMouseX = clientX;

    const boatRect = dragonBoat.getBoundingClientRect();
    boatStartX = boatRect.left + boatRect.width / 2;
    boatStartY = boatRect.top + boatRect.height / 2;
}

function handleDragMove(e) {
    if (!gameState.isDragging || !gameState.isGameStarted) return;

    e.preventDefault();

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;

    const newX = boatStartX + deltaX;
    const newY = boatStartY + deltaY;

    const constrainedPos = constrainBoatPosition(newX, newY);

    const mouseDeltaX = clientX - gameState.lastMouseX;
    gameState.mouseVelocityX = mouseDeltaX;
    gameState.lastMouseX = clientX;

    const angle = updateBoatRotation(mouseDeltaX);

    dragonBoat.style.left = constrainedPos.x + 'px';
    dragonBoat.style.top = constrainedPos.y + 'px';
    dragonBoat.style.bottom = 'auto';
    dragonBoat.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    checkCollisions(constrainedPos.x, constrainedPos.y);
}

function handleDragEnd(e) {
    if (!gameState.isDragging) return;

    gameState.isDragging = false;
    dragonBoat.classList.remove('dragging');
}

function checkCollisions(boatX, boatY) {
    const collisionDistance = boatWidth * 0.4;

    gameState.activeEggs.forEach((eggData, index) => {
        if (eggData.collected) return;

        const distance = Math.sqrt(
            Math.pow(boatX - eggData.x, 2) + Math.pow(boatY - eggData.y, 2)
        );

        if (distance < collisionDistance) {
            collectEgg(index);
        }
    });
}

function collectEgg(index) {
    const eggData = gameState.activeEggs[index];
    if (eggData.collected) return;

    eggData.collected = true;
    gameState.collectedEggs++;

    showEggText(eggData);

    setTimeout(() => {
        hideEgg(eggData);
    }, 1000);
}

function showEggText(eggData) {
    const textElement = document.createElement('img');
    textElement.className = 'egg-text';
    textElement.src = eggData.textImage;
    textElement.alt = '彩蛋文字';
    
    const eggWidth = window.innerWidth * 0.11;
    const offsetY = 20 + Math.random() * 20;
    
    textElement.style.left = eggData.x + 'px';
    textElement.style.top = (eggData.y + eggWidth / 2 + offsetY) + 'px';

    eggTextContainer.appendChild(textElement);
    
    const adjustPositionAndShow = function() {
        const textRect = textElement.getBoundingClientRect();
        
        let adjustedLeft = eggData.x;
        let adjustedTop = textElement.offsetTop;
        
        const padding = 20;
        const bottomPadding = 40;
        const navbarHeight = 76;
        
        if (adjustedLeft - textRect.width / 2 < padding) {
            adjustedLeft = padding + textRect.width / 2;
        } else if (adjustedLeft + textRect.width / 2 > window.innerWidth - padding) {
            adjustedLeft = window.innerWidth - padding - textRect.width / 2;
        }
        
        const minTop = navbarHeight + padding;
        const maxTop = window.innerHeight - bottomPadding - textRect.height;
        
        adjustedTop = Math.max(minTop, Math.min(maxTop, adjustedTop));
        
        textElement.style.left = adjustedLeft + 'px';
        textElement.style.top = adjustedTop + 'px';
        
        requestAnimationFrame(() => {
            textElement.classList.add('show');
        });
    };
    
    if (textElement.complete) {
        adjustPositionAndShow();
    } else {
        textElement.onload = adjustPositionAndShow;
    }
    
    eggData.textElement = textElement;
}

function hideEgg(eggData) {
    eggData.element.classList.remove('show');
    eggData.element.classList.add('hide');

    if (eggData.textElement) {
        eggData.textElement.classList.remove('show');
        eggData.textElement.classList.add('hide');
    }

    setTimeout(() => {
        if (eggData.element && eggData.element.parentNode) {
            eggContainer.removeChild(eggData.element);
        }
        if (eggData.textElement && eggData.textElement.parentNode) {
            eggTextContainer.removeChild(eggData.textElement);
        }

        const index = gameState.activeEggs.indexOf(eggData);
        if (index > -1) {
            gameState.activeEggs.splice(index, 1);
        }

        checkGameEnd();

        // 如果当前没有活跃彩蛋，且还有彩蛋未出现，继续生成下一批
        if (gameState.activeEggs.length === 0 && gameState.appearedEggs.size < eggs.length) {
            gameState.batchSpawned = 0;
            scheduleNextEggBatch();
        }
    }, 500);
}

function checkEggBoatOverlap(x, y, eggWidth, eggHeight) {
    const boatRect = dragonBoat.getBoundingClientRect();
    const boatCenterX = boatRect.left + boatRect.width / 2;
    const boatCenterY = boatRect.top + boatRect.height / 2;
    const boatHalfWidth = boatRect.width / 2 + eggWidth / 2 + 20;
    const boatHalfHeight = boatRect.height / 2 + eggHeight / 2 + 20;

    const dx = Math.abs(x - boatCenterX);
    const dy = Math.abs(y - boatCenterY);

    return dx < boatHalfWidth && dy < boatHalfHeight;
}

function checkEggDistance(x, y) {
    const minVerticalDistance = 300;
    const minHorizontalDistance = 300;
    
    for (const eggData of gameState.activeEggs) {
        if (eggData.collected) continue;
        
        const verticalDistance = Math.abs(y - eggData.y);
        const horizontalDistance = Math.abs(x - eggData.x);
        
        if (verticalDistance < minVerticalDistance || horizontalDistance < minHorizontalDistance) {
            return false;
        }
    }
    
    return true;
}

function getRandomEggIndex() {
    // 可重复出现的彩蛋索引：6-9（龙舟粽、普通粽、漕运古船1、漕运古船2）
    const repeatableIndices = [6, 7, 8, 9];
    
    // 检查是否所有彩蛋都已至少出现一次
    const allAppeared = gameState.appearedEggs.size >= eggs.length;
    
    if (allAppeared) {
        // 所有彩蛋都已出现，只从可重复的彩蛋中随机选择
        return repeatableIndices[Math.floor(Math.random() * repeatableIndices.length)];
    }
    
    // 获取尚未出现的彩蛋索引
    const unappearedIndices = [];
    for (let i = 0; i < eggs.length; i++) {
        if (!gameState.appearedEggs.has(i)) {
            unappearedIndices.push(i);
        }
    }
    
    // 70%概率选择未出现的彩蛋，30%概率选择可重复的彩蛋
    if (Math.random() < 0.7 && unappearedIndices.length > 0) {
        const randomIndex = Math.floor(Math.random() * unappearedIndices.length);
        return unappearedIndices[randomIndex];
    } else {
        // 选择可重复的彩蛋或未出现的彩蛋
        const allIndices = [...unappearedIndices, ...repeatableIndices];
        return allIndices[Math.floor(Math.random() * allIndices.length)];
    }
}

function spawnEgg() {
    // 检查是否所有彩蛋都已至少出现一次且当前没有活跃彩蛋
    if (gameState.appearedEggs.size >= eggs.length && gameState.activeEggs.length === 0) {
        return;
    }

    const eggIndex = getRandomEggIndex();
    const egg = eggs[eggIndex];
    const eggWidth = window.innerWidth * 0.11;
    const eggHeight = eggWidth * 0.8;

    const area = getBoatMoveArea();
    const boatCenterX = gameState.boatInitialX;
    
    let randomX, randomY;
    let attempts = 0;
    const maxAttempts = 200;
    let validPosition = false;
    
    while (attempts < maxAttempts) {
        if (Math.random() < 0.5) {
            randomX = Math.random() * (boatCenterX - area.minX - eggWidth / 2) + area.minX + eggWidth / 2;
        } else {
            randomX = boatCenterX + eggWidth / 2 + Math.random() * (area.maxX - boatCenterX - eggWidth / 2);
        }
        
        const areaHeight = area.maxY - area.minY;
        const boatRelativeY = gameState.boatInitialY;
        
        const upperArea = {
            min: area.minY,
            max: Math.min(boatRelativeY - 200, area.maxY)
        };
        const lowerArea = {
            min: Math.max(boatRelativeY + 200, area.minY),
            max: area.maxY
        };
        
        if (Math.random() < 0.5 && upperArea.max > upperArea.min) {
            randomY = Math.random() * (upperArea.max - upperArea.min) + upperArea.min;
        } else if (lowerArea.max > lowerArea.min) {
            randomY = Math.random() * (lowerArea.max - lowerArea.min) + lowerArea.min;
        } else {
            randomY = Math.random() * (area.maxY - area.minY) + area.minY;
        }
        
        if (!checkEggBoatOverlap(randomX, randomY, eggWidth, eggHeight)) {
            if (checkEggDistance(randomX, randomY)) {
                validPosition = true;
                break;
            }
        }
        
        attempts++;
    }

    if (!validPosition) {
        return; // 找不到有效位置，不创建彩蛋
    }

    const eggElement = document.createElement('img');
    eggElement.src = egg.image;
    eggElement.className = 'egg';
    eggElement.alt = '彩蛋';
    eggElement.style.left = randomX + 'px';
    eggElement.style.top = randomY + 'px';

    eggContainer.appendChild(eggElement);

    setTimeout(() => {
        eggElement.classList.add('show');
    }, 50);

    const eggData = {
        element: eggElement,
        x: randomX,
        y: randomY,
        textImage: egg.textImage,
        collected: false,
        textElement: null,
        eggIndex: eggIndex
    };

    gameState.activeEggs.push(eggData);
    gameState.appearedEggs.add(eggIndex); // 记录该彩蛋已出现
    gameState.currentEggIndex++;
}

function scheduleNextEggBatch() {
    // 检查是否所有彩蛋都已至少出现一次且当前没有活跃彩蛋
    if (gameState.appearedEggs.size >= eggs.length && gameState.activeEggs.length === 0) {
        endGame();
        return;
    }

    if (gameState.spawnTimeout) {
        clearTimeout(gameState.spawnTimeout);
    }

    gameState.spawnTimeout = setTimeout(() => {
        spawnEggBatch();
    }, 1000);
}

function spawnEggBatch() {
    // 检查是否所有彩蛋都已至少出现一次且当前没有活跃彩蛋
    if (gameState.appearedEggs.size >= eggs.length && gameState.activeEggs.length === 0) {
        return;
    }

    const batchCount = Math.floor(Math.random() * 2) + 1;
    
    gameState.batchSpawned = 0;

    for (let i = 0; i < batchCount; i++) {
        spawnEgg();
        gameState.batchSpawned++;
    }
}

function checkGameEnd() {
    // 检查是否所有彩蛋都至少出现一次，且当前没有活跃彩蛋
    if (gameState.appearedEggs.size >= eggs.length && gameState.activeEggs.length === 0) {
        endGame();
    }
}

function startGame() {
    if (gameState.isGameStarted) return;

    gameState.isGameStarted = true;

    guideText.style.animation = 'fadeOut 2s forwards';

    dragonBoat.style.left = '50%';
    dragonBoat.style.bottom = '5%';
    dragonBoat.style.top = 'auto';
    dragonBoat.style.transform = 'translateX(-50%)';

    const boatRect = dragonBoat.getBoundingClientRect();
    gameState.boatInitialX = boatRect.left + boatRect.width / 2;
    gameState.boatInitialY = boatRect.top + boatRect.height / 2;
    
    boatWidth = boatRect.width;
    boatHeight = boatRect.height;

    setTimeout(() => {
        guideText.style.display = 'none';
        bgImage.style.display = 'none';
        bgVideo.style.display = 'block';
        bgVideo.play();
        spawnEggBatch();
    }, 2000);
}

function endGame() {
    gameState.isGameStarted = false;
    gameState.isDragging = false;
    if (gameState.spawnTimeout) {
        clearTimeout(gameState.spawnTimeout);
    }
    successBackground.classList.add('show');
}

document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.navbar')) return;
    if (!gameState.isGameStarted) {
        startGame();
    } else {
        handleDragStart(e);
    }
});

document.addEventListener('mousemove', (e) => {
    handleDragMove(e);
});

document.addEventListener('mouseup', (e) => {
    handleDragEnd(e);
});

document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.navbar')) return;
    if (!gameState.isGameStarted) {
        startGame();
    } else {
        handleDragStart(e);
    }
});

document.addEventListener('touchmove', (e) => {
    handleDragMove(e);
});

document.addEventListener('touchend', (e) => {
    handleDragEnd(e);
});

document.addEventListener('dblclick', (e) => {
    e.preventDefault();
});

document.addEventListener('touchstart', (e) => {
    if (gameState.isGameStarted) {
        e.preventDefault();
    }
}, { passive: false });