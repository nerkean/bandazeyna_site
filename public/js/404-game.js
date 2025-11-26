const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('gameOverlay');
const scoreEl = document.getElementById('scoreBoard');

// Настройки
const box = 20; // Размер клетки
let snake = [];
let food = {};
let score = 0;
let d = null; // Направление
let game; // Интервал игры
let isPlaying = false;

// Инициализация
function initGame() {
    snake = [];
    snake[0] = { x: 10 * box, y: 8 * box };
    generateFood();
    score = 0;
    d = null;
    scoreEl.innerText = 0;
}

function generateFood() {
    food = {
        x: Math.floor(Math.random() * (canvas.width / box)) * box,
        y: Math.floor(Math.random() * (canvas.height / box)) * box
    };
    // Проверка, чтобы еда не спавнилась в теле змейки
    for(let i=0; i<snake.length; i++) {
        if(food.x == snake[i].x && food.y == snake[i].y) {
            generateFood();
        }
    }
}

// Управление (Клавиатура)
document.addEventListener('keydown', direction);

function direction(event) {
    let key = event.keyCode;

    // --- ВАЖНО: БЛОКИРУЕМ СКРОЛЛ ---
    // 37=Left, 38=Up, 39=Right, 40=Down, 32=Space
    if([37, 38, 39, 40, 32].includes(key)) {
        event.preventDefault();
    }
    // -------------------------------

    if (!isPlaying) return;
    
    // Логика поворотов (нельзя развернуться на 180)
    // Если d === null (старт), разрешаем любую стрелку, кроме обратной (хотя хвоста еще нет)
    if (d === null) {
        if(key == 37) d = "LEFT";
        else if(key == 38) d = "UP";
        else if(key == 39) d = "RIGHT";
        else if(key == 40) d = "DOWN";
        return;
    }

    if(key == 37 && d != "RIGHT") d = "LEFT";
    else if(key == 38 && d != "DOWN") d = "UP";
    else if(key == 39 && d != "LEFT") d = "RIGHT";
    else if(key == 40 && d != "UP") d = "DOWN";
}

// Управление (Свайпы для мобилок)
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    e.preventDefault(); // Блок скролла на мобиле
}, {passive: false});

canvas.addEventListener('touchend', function(e) {
    if (!isPlaying) return;
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
}, {passive: false});

function handleSwipe(sx, sy, ex, ey) {
    let dx = ex - sx;
    let dy = ey - sy;
    
    // Если первый ход
    if (d === null) {
        if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? "RIGHT" : "LEFT";
        else d = dy > 0 ? "DOWN" : "UP";
        return;
    }
    
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && d != "LEFT") d = "RIGHT";
        else if (dx < 0 && d != "RIGHT") d = "LEFT";
    } else {
        if (dy > 0 && d != "UP") d = "DOWN";
        else if (dy < 0 && d != "DOWN") d = "UP";
    }
}

// Рисование
function draw() {
    // Фон
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Сетка
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += box) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += box) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Змейка
    for(let i = 0; i < snake.length; i++) {
        ctx.fillStyle = (i == 0) ? "#00f3ff" : "#0099aa";
        
        // Свечение головы
        if(i == 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00f3ff";
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.fillRect(snake[i].x + 1, snake[i].y + 1, box - 2, box - 2);
    }
    ctx.shadowBlur = 0;

    // Еда
    ctx.fillStyle = "#ff0055";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff0055";
    ctx.fillRect(food.x + 2, food.y + 2, box - 4, box - 4);
    ctx.shadowBlur = 0;

    // --- ОЖИДАНИЕ СТАРТА ---
    if (d === null) return;

    // Логика
    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if(d == "LEFT") snakeX -= box;
    if(d == "UP") snakeY -= box;
    if(d == "RIGHT") snakeX += box;
    if(d == "DOWN") snakeY += box;

    // Еда съедена
    if(snakeX == food.x && snakeY == food.y) {
        score++;
        scoreEl.innerText = score;
        generateFood();
    } else {
        snake.pop();
    }

    let newHead = { x: snakeX, y: snakeY };

    // Смерть
    if(snakeX < 0 || snakeX >= canvas.width || snakeY < 0 || snakeY >= canvas.height || collision(newHead, snake)) {
        clearInterval(game);
        isPlaying = false;
        showGameOver();
        return;
    }

    snake.unshift(newHead);
}

function collision(head, array) {
    for(let i = 0; i < array.length; i++) {
        if(head.x == array[i].x && head.y == array[i].y) {
            return true;
        }
    }
    return false;
}

function startGame() {
    if (isPlaying) return;
    
    isPlaying = true;
    overlay.style.display = 'none';
    scoreEl.style.display = 'block';
    
    initGame();
    if (game) clearInterval(game);
    game = setInterval(draw, 100);
}

function showGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0,0,canvas.width, canvas.height);
    
    ctx.fillStyle = "#fff";
    ctx.font = "30px Montserrat";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle"; 
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
    
    setTimeout(() => {
        overlay.style.display = 'flex';
        scoreEl.style.display = 'none';
        document.querySelector('.play-btn').innerHTML = '<i class="fas fa-redo"></i> ЕЩЁ РАЗ';
    }, 1000);
}