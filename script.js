// データ管理
class CarReservationSystem {
    constructor() {
        this.vehicles = this.loadVehicles();
        this.reservations = this.loadReservations();
        this.currentDate = new Date();
        this.selectedVehicle = null;
        this.selectedDate = null;
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

    // 日付の予約状況を取得
    getDayStatus(vehicleId, date) {
        const dateStr = this.formatDate(date);
        const dayReservations = this.reservations.filter(r => 
            r.vehicleId === vehicleId && r.date === dateStr
        );

        if (dayReservations.length === 0) {
            return 'available'; // ○：空き
        }

        // 営業時間（8:00-20:00）の総時間数を計算
        const totalMinutes = 12 * 60; // 12時間
        let reservedMinutes = 0;

        dayReservations.forEach(reservation => {
            const start = Math.max(this.timeToMinutes(reservation.startTime), 8 * 60);
            const end = Math.min(this.timeToMinutes(reservation.endTime), 20 * 60);
            if (end > start) {
                reservedMinutes += end - start;
            }
        });

        const occupancyRate = reservedMinutes / totalMinutes;

        if (occupancyRate >= 0.8) {
            return 'full'; // ×：満員（80%以上予約）
        } else if (occupancyRate > 0) {
            return 'partial'; // △：一部予約
        } else {
            return 'available'; // ○：空き
        }
    }

    // 特定の日の時間別予約状況を取得
    getDaySchedule(vehicleId, date) {
        const dateStr = this.formatDate(date);
        const schedule = [];

        for (let hour = 8; hour < 20; hour++) {
            const timeSlot = {
                hour: hour,
                time: `${hour}:00`,
                available: true,
                reservations: []
            };

            const slotReservations = this.reservations.filter(r => {
                if (r.vehicleId !== vehicleId || r.date !== dateStr) return false;
                const startHour = parseInt(r.startTime.split(':')[0]);
                const endHour = parseInt(r.endTime.split(':')[0]);
                const endMinute = parseInt(r.endTime.split(':')[1]);
                const actualEndHour = endMinute > 0 ? endHour + 1 : endHour;
                return hour >= startHour && hour < actualEndHour;
            });

            if (slotReservations.length > 0) {
                timeSlot.available = false;
                timeSlot.reservations = slotReservations;
            }

            schedule.push(timeSlot);
        }

        return schedule;
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

    getMonthDays(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        // 月初の曜日に合わせて前月の日付を追加
        const firstDayOfWeek = firstDay.getDay();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({ date: d, otherMonth: true });
        }

        // 当月の日付
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), otherMonth: false });
        }

        // 週末まで次月の日付を追加
        const remainingDays = 42 - days.length; // 6週間分
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: new Date(year, month + 1, i), otherMonth: true });
        }

        return days;
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
        this.monthCalendar = document.getElementById('monthCalendar');
        this.currentMonth = document.getElementById('currentMonth');
        this.prevMonthBtn = document.getElementById('prevMonth');
        this.nextMonthBtn = document.getElementById('nextMonth');
        this.dailySchedule = document.getElementById('dailySchedule');
        this.selectedDateEl = document.getElementById('selectedDate');
        this.dailyTimeSlots = document.getElementById('dailyTimeSlots');
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
        this.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        this.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
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
        this.updateMonthCalendar();
        this.updateReservationList();
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

    updateMonthCalendar() {
        const year = this.system.currentDate.getFullYear();
        const month = this.system.currentDate.getMonth();
        
        // 月表示を更新
        this.currentMonth.textContent = `${year}年${month + 1}月`;

        if (!this.system.selectedVehicle) {
            this.monthCalendar.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #718096;">車両を選択してください</p>';
            return;
        }

        this.monthCalendar.innerHTML = '';

        // 曜日ヘッダー
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        weekdays.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-weekday';
            header.textContent = day;
            this.monthCalendar.appendChild(header);
        });

        // 日付セル
        const days = this.system.getMonthDays(this.system.currentDate);
        days.forEach(dayInfo => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            if (dayInfo.otherMonth) {
                dayDiv.classList.add('other-month');
            }

            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = dayInfo.date.getDate();

            const statusDiv = document.createElement('div');
            statusDiv.className = 'day-status';

            // 予約状況を取得して表示
            const status = this.system.getDayStatus(parseInt(this.system.selectedVehicle), dayInfo.date);
            switch (status) {
                case 'available':
                    statusDiv.textContent = '○';
                    statusDiv.style.color = '#48bb78';
                    break;
                case 'partial':
                    statusDiv.textContent = '△';
                    statusDiv.style.color = '#ed8936';
                    break;
                case 'full':
                    statusDiv.textContent = '×';
                    statusDiv.style.color = '#f56565';
                    break;
            }

            dayDiv.appendChild(dayNumber);
            dayDiv.appendChild(statusDiv);

            // クリックイベント
            dayDiv.addEventListener('click', () => {
                if (!dayInfo.otherMonth) {
                    this.showDaySchedule(dayInfo.date);
                }
            });

            this.monthCalendar.appendChild(dayDiv);
        });
    }

    showDaySchedule(date) {
        this.system.selectedDate = date;
        
        // 選択された日付を表示
        const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        this.selectedDateEl.textContent = `${dateStr}（${weekday}）`;

        // 時間別スケジュールを表示
        const schedule = this.system.getDaySchedule(parseInt(this.system.selectedVehicle), date);
        this.dailyTimeSlots.innerHTML = '';

        schedule.forEach(slot => {
            const slotDiv = document.createElement('div');
            slotDiv.className = `time-slot ${slot.available ? 'available' : 'reserved'}`;

            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = `${slot.time} - ${slot.hour + 1}:00`;

            const statusDiv = document.createElement('div');
            if (slot.available) {
                statusDiv.className = 'slot-status';
                statusDiv.textContent = '空き';
            } else {
                statusDiv.className = 'slot-status reserved';
                const reservationInfo = document.createElement('div');
                reservationInfo.className = 'reservation-info';
                slot.reservations.forEach(res => {
                    const info = document.createElement('div');
                    info.innerHTML = `
                        <strong>${res.userName}</strong> (${res.department})<br>
                        ${res.startTime} - ${res.endTime}<br>
                        目的: ${res.purpose || '未記入'}
                    `;
                    reservationInfo.appendChild(info);
                });
                statusDiv.appendChild(reservationInfo);
            }

            slotDiv.appendChild(timeLabel);
            slotDiv.appendChild(statusDiv);
            this.dailyTimeSlots.appendChild(slotDiv);
        });

        // 日別詳細セクションを表示
        this.dailySchedule.style.display = 'block';

        // カレンダーの選択状態を更新
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        event.target.closest('.calendar-day').classList.add('selected');

        // 予約フォームの日付を更新
        this.reservationDate.value = this.system.formatDate(date);
    }

    changeMonth(direction) {
        const newDate = new Date(this.system.currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        this.system.currentDate = newDate;
        this.updateMonthCalendar();
    }

    onVehicleChange() {
        this.system.selectedVehicle = this.vehicleSelect.value;
        this.updateMonthCalendar();
        this.updateReservationList();
        this.dailySchedule.style.display = 'none';
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