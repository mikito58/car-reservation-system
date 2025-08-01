// データ管理
class CarReservationSystem {
    constructor() {
        this.vehicles = this.loadVehicles();
        this.reservations = this.loadReservations();
        this.currentWeekStart = this.getWeekStart(new Date());
        this.selectedVehicle = null;
    }

    // 車両管理
    loadVehicles() {
        const saved = localStorage.getItem('vehicles');
        if (saved) {
            return JSON.parse(saved);
        }
        // デフォルト車両
        return [
            { id: 1, name: '社用車A（プリウス）', type: 'sedan' },
            { id: 2, name: '社用車B（ノア）', type: 'van' },
            { id: 3, name: '軽自動車（N-BOX）', type: 'kei' }
        ];
    }

    saveVehicles() {
        localStorage.setItem('vehicles', JSON.stringify(this.vehicles));
    }

    addVehicle(name, type = 'sedan') {
        const newVehicle = {
            id: Date.now(),
            name: name,
            type: type
        };
        this.vehicles.push(newVehicle);
        this.saveVehicles();
        return newVehicle;
    }

    // 予約管理
    loadReservations() {
        const saved = localStorage.getItem('reservations');
        return saved ? JSON.parse(saved) : [];
    }

    saveReservations() {
        localStorage.setItem('reservations', JSON.stringify(this.reservations));
    }

    addReservation(reservation) {
        reservation.id = Date.now();
        this.reservations.push(reservation);
        this.saveReservations();
        return reservation;
    }

    deleteReservation(id) {
        this.reservations = this.reservations.filter(r => r.id !== id);
        this.saveReservations();
    }

    getReservationsForVehicle(vehicleId, startDate, endDate) {
        return this.reservations.filter(r => {
            if (r.vehicleId !== vehicleId) return false;
            const resDate = new Date(r.date);
            return resDate >= startDate && resDate <= endDate;
        });
    }

    checkAvailability(vehicleId, date, startTime, endTime) {
        const dateStr = this.formatDate(date);
        const conflicts = this.reservations.filter(r => {
            if (r.vehicleId !== vehicleId || r.date !== dateStr) return false;
            
            const newStart = this.timeToMinutes(startTime);
            const newEnd = this.timeToMinutes(endTime);
            const resStart = this.timeToMinutes(r.startTime);
            const resEnd = this.timeToMinutes(r.endTime);
            
            return !(newEnd <= resStart || newStart >= resEnd);
        });
        
        return conflicts.length === 0;
    }

    // ユーティリティ関数
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
}

// UIコントローラー
class UIController {
    constructor(system) {
        this.system = system;
        this.initializeElements();
        this.bindEvents();
        this.updateUI();
    }

    initializeElements() {
        this.vehicleSelect = document.getElementById('vehicleSelect');
        this.addVehicleBtn = document.getElementById('addVehicleBtn');
        this.calendar = document.getElementById('calendar');
        this.currentWeek = document.getElementById('currentWeek');
        this.prevWeekBtn = document.getElementById('prevWeek');
        this.nextWeekBtn = document.getElementById('nextWeek');
        this.reservationForm = document.getElementById('reservationForm');
        this.reservationList = document.getElementById('reservationList');
        this.modal = document.getElementById('modal');
        this.modalBody = document.getElementById('modalBody');
        this.closeModal = document.querySelector('.close');
        
        // フォーム要素
        this.userName = document.getElementById('userName');
        this.department = document.getElementById('department');
        this.reservationDate = document.getElementById('reservationDate');
        this.startTime = document.getElementById('startTime');
        this.endTime = document.getElementById('endTime');
        this.purpose = document.getElementById('purpose');
    }

    bindEvents() {
        this.vehicleSelect.addEventListener('change', () => this.onVehicleChange());
        this.addVehicleBtn.addEventListener('click', () => this.showAddVehicleModal());
        this.prevWeekBtn.addEventListener('click', () => this.changeWeek(-1));
        this.nextWeekBtn.addEventListener('click', () => this.changeWeek(1));
        this.reservationForm.addEventListener('submit', (e) => this.handleReservation(e));
        this.closeModal.addEventListener('click', () => this.hideModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });
        
        // 今日の日付をデフォルトに設定
        this.reservationDate.valueAsDate = new Date();
    }

    updateUI() {
        this.updateVehicleSelect();
        this.updateCalendar();
        this.updateReservationList();
        this.updateWeekDisplay();
    }

    updateVehicleSelect() {
        this.vehicleSelect.innerHTML = '<option value="">車両を選択してください</option>';
        this.system.vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.id;
            option.textContent = vehicle.name;
            this.vehicleSelect.appendChild(option);
        });
    }

    updateCalendar() {
        if (!this.system.selectedVehicle) {
            this.calendar.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #718096;">車両を選択してください</p>';
            return;
        }

        this.calendar.innerHTML = '';
        
        // ヘッダー行
        const headers = ['時間', '月', '火', '水', '木', '金', '土', '日'];
        headers.forEach(header => {
            const div = document.createElement('div');
            div.className = 'calendar-header';
            div.textContent = header;
            this.calendar.appendChild(div);
        });
        
        // 時間帯ごとの行
        for (let hour = 8; hour < 20; hour++) {
            // 時間ラベル
            const timeDiv = document.createElement('div');
            timeDiv.className = 'calendar-cell';
            timeDiv.textContent = `${hour}:00`;
            timeDiv.style.background = '#4a5568';
            timeDiv.style.color = 'white';
            this.calendar.appendChild(timeDiv);
            
            // 各曜日のセル
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(this.system.currentWeekStart);
                cellDate.setDate(cellDate.getDate() + day);
                
                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                cell.dataset.date = this.system.formatDate(cellDate);
                cell.dataset.hour = hour;
                
                // その時間帯の予約を表示
                const dayReservations = this.system.reservations.filter(r => {
                    if (r.vehicleId !== parseInt(this.system.selectedVehicle)) return false;
                    if (r.date !== this.system.formatDate(cellDate)) return false;
                    
                    const startHour = parseInt(r.startTime.split(':')[0]);
                    const endHour = parseInt(r.endTime.split(':')[0]);
                    return hour >= startHour && hour < endHour;
                });
                
                dayReservations.forEach(res => {
                    const resBlock = document.createElement('div');
                    resBlock.className = 'reservation-block';
                    resBlock.textContent = res.userName;
                    resBlock.onclick = () => this.showReservationDetails(res);
                    cell.appendChild(resBlock);
                });
                
                if (dayReservations.length > 0) {
                    cell.classList.add('has-reservation');
                }
                
                this.calendar.appendChild(cell);
            }
        }
    }

    updateWeekDisplay() {
        const start = new Date(this.system.currentWeekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        
        const formatDate = (date) => {
            return `${date.getMonth() + 1}/${date.getDate()}`;
        };
        
        this.currentWeek.textContent = `${start.getFullYear()}年 ${formatDate(start)} - ${formatDate(end)}`;
    }

    updateReservationList() {
        if (!this.system.selectedVehicle) {
            this.reservationList.innerHTML = '<p style="color: #718096;">車両を選択してください</p>';
            return;
        }

        const vehicleReservations = this.system.reservations
            .filter(r => r.vehicleId === parseInt(this.system.selectedVehicle))
            .sort((a, b) => {
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                return a.startTime.localeCompare(b.startTime);
            });

        if (vehicleReservations.length === 0) {
            this.reservationList.innerHTML = '<p style="color: #718096;">予約はありません</p>';
            return;
        }

        this.reservationList.innerHTML = '';
        vehicleReservations.forEach(reservation => {
            const item = document.createElement('div');
            item.className = 'reservation-item';
            
            const info = document.createElement('div');
            info.className = 'reservation-info';
            info.innerHTML = `
                <h3>${reservation.userName} (${reservation.department})</h3>
                <p>${reservation.date} ${reservation.startTime} - ${reservation.endTime}</p>
                <p>目的: ${reservation.purpose || '未記入'}</p>
            `;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.textContent = '削除';
            deleteBtn.onclick = () => this.deleteReservation(reservation.id);
            
            item.appendChild(info);
            item.appendChild(deleteBtn);
            this.reservationList.appendChild(item);
        });
    }

    onVehicleChange() {
        this.system.selectedVehicle = this.vehicleSelect.value;
        this.updateCalendar();
        this.updateReservationList();
    }

    changeWeek(direction) {
        const newDate = new Date(this.system.currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));
        this.system.currentWeekStart = newDate;
        this.updateUI();
    }

    handleReservation(e) {
        e.preventDefault();
        
        if (!this.system.selectedVehicle) {
            alert('車両を選択してください');
            return;
        }
        
        const reservation = {
            vehicleId: parseInt(this.system.selectedVehicle),
            userName: this.userName.value,
            department: this.department.value,
            date: this.reservationDate.value,
            startTime: this.startTime.value,
            endTime: this.endTime.value,
            purpose: this.purpose.value
        };
        
        // 時間の妥当性チェック
        if (reservation.startTime >= reservation.endTime) {
            alert('終了時刻は開始時刻より後に設定してください');
            return;
        }
        
        // 利用可能性チェック
        const date = new Date(reservation.date);
        if (!this.system.checkAvailability(reservation.vehicleId, date, reservation.startTime, reservation.endTime)) {
            alert('選択した時間帯は既に予約されています');
            return;
        }
        
        this.system.addReservation(reservation);
        this.reservationForm.reset();
        this.reservationDate.valueAsDate = new Date();
        this.updateUI();
        
        alert('予約が完了しました');
    }

    deleteReservation(id) {
        if (confirm('この予約を削除しますか？')) {
            this.system.deleteReservation(id);
            this.updateUI();
        }
    }

    showAddVehicleModal() {
        this.modalBody.innerHTML = `
            <h3>新しい車両を追加</h3>
            <form id="addVehicleForm">
                <div class="form-group">
                    <label for="vehicleName">車両名</label>
                    <input type="text" id="vehicleName" required>
                </div>
                <div class="form-group">
                    <label for="vehicleType">車両タイプ</label>
                    <select id="vehicleType">
                        <option value="sedan">セダン</option>
                        <option value="van">ミニバン</option>
                        <option value="kei">軽自動車</option>
                        <option value="suv">SUV</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">追加</button>
            </form>
        `;
        
        const form = document.getElementById('addVehicleForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('vehicleName').value;
            const type = document.getElementById('vehicleType').value;
            this.system.addVehicle(name, type);
            this.updateVehicleSelect();
            this.hideModal();
        });
        
        this.showModal();
    }

    showReservationDetails(reservation) {
        const vehicle = this.system.vehicles.find(v => v.id === reservation.vehicleId);
        this.modalBody.innerHTML = `
            <h3>予約詳細</h3>
            <p><strong>車両:</strong> ${vehicle.name}</p>
            <p><strong>利用者:</strong> ${reservation.userName}</p>
            <p><strong>部署:</strong> ${reservation.department}</p>
            <p><strong>日付:</strong> ${reservation.date}</p>
            <p><strong>時間:</strong> ${reservation.startTime} - ${reservation.endTime}</p>
            <p><strong>目的:</strong> ${reservation.purpose || '未記入'}</p>
        `;
        this.showModal();
    }

    showModal() {
        this.modal.style.display = 'block';
    }

    hideModal() {
        this.modal.style.display = 'none';
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    const system = new CarReservationSystem();
    const ui = new UIController(system);
});