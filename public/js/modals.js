// public/js/modals.js

// ИЗМЕНЕНИЕ: Используем window.Modal вместо const Modal.
// Это не вызовет ошибку, даже если файл загрузится 10 раз.
window.Modal = {
    closeTimer: null, 

    init() {
        if (document.getElementById('global-modal')) return;
        const html = `
            <div class="modal-overlay" id="global-modal">
                <div class="modal-box" id="modal-box">
                    <div class="modal-icon" id="modal-icon"></div>
                    <h2 class="modal-title" id="modal-title"></h2>
                    <p class="modal-text" id="modal-text"></p>
                    <div class="modal-actions" id="modal-actions"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        document.getElementById('global-modal').addEventListener('click', (e) => {
            if (e.target.id === 'global-modal') window.Modal.close();
        });
    },

    close() {
        const overlay = document.getElementById('global-modal');
        if (!overlay) return;
        
        overlay.classList.remove('active');
        
        if (this.closeTimer) clearTimeout(this.closeTimer);

        this.closeTimer = setTimeout(() => {
            const actions = document.getElementById('modal-actions');
            if (actions) actions.innerHTML = ''; 
        }, 300);
    },

    show(title, text, type = 'info', buttons = []) {
        this.init();
        
        if (this.closeTimer) {
            clearTimeout(this.closeTimer);
            this.closeTimer = null;
        }

        const overlay = document.getElementById('global-modal');
        const box = document.getElementById('modal-box');
        const iconEl = document.getElementById('modal-icon');
        const actionsEl = document.getElementById('modal-actions');

        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-text').innerText = text;
        
        box.className = 'modal-box'; 
        box.classList.add(`type-${type}`);
        
        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'error') iconClass = 'fa-times-circle';
        iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;

        actionsEl.innerHTML = '';
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `btn-modal ${btn.class || 'btn-confirm'}`;
            button.innerText = btn.text;
            button.onclick = () => {
                if (btn.close !== false) window.Modal.close();
                if (btn.onClick) btn.onClick();        
            };
            actionsEl.appendChild(button);
        });

        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    },

    alert(title, text, type = 'info') {
        return new Promise((resolve) => {
            this.show(title, text, type, [
                { text: 'OK', onClick: resolve }
            ]);
        });
    },

    confirm(title, text) {
        return new Promise((resolve) => {
            this.show(title, text, 'info', [
                { text: 'Отмена', class: 'btn-cancel', onClick: () => resolve(false) },
                { text: 'Подтвердить', class: 'btn-confirm', onClick: () => resolve(true) }
            ]);
        });
    }
};