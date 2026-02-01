class LifeTimeline {
    constructor() {
        this.events = [];
        this.chartType = 'line';
        this.selectionRange = { start: 0, end: 100 };
        this.extendYears = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupThumbnailInteraction();
        this.setupMainChartInteraction();
        this.loadSampleData();
        this.addDefaultBirthEvent();
        this.render();
    }

    setupEventListeners() {
        document.getElementById('addEventBtn').addEventListener('click', () => this.openAddEventModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.openExportModal());
        document.getElementById('closeAddModal').addEventListener('click', () => this.closeAddEventModal());
        document.getElementById('cancelAddEvent').addEventListener('click', () => this.closeAddEventModal());
        document.getElementById('confirmAddEvent').addEventListener('click', () => this.addEvent());
        document.getElementById('closeExportModal').addEventListener('click', () => this.closeExportModal());
        document.getElementById('cancelExport').addEventListener('click', () => this.closeExportModal());
        document.getElementById('confirmExport').addEventListener('click', () => this.exportChart());
        document.getElementById('exportLineBtn').addEventListener('click', (e) => {
            document.querySelectorAll('#exportModal .chart-type-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
        document.getElementById('exportBarBtn').addEventListener('click', (e) => {
            document.querySelectorAll('#exportModal .chart-type-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });

        const extendYearsSlider = document.getElementById('extendYears');
        const extendYearsValue = document.getElementById('extendYearsValue');
        
        if (extendYearsSlider && extendYearsValue) {
            extendYearsSlider.addEventListener('input', (e) => {
                this.extendYears = parseInt(e.target.value);
                extendYearsValue.textContent = this.extendYears;
                this.render();
            });
        }

        document.getElementById('exportDataBtn').addEventListener('click', () => this.openExportDataModal());
        document.getElementById('importDataBtn').addEventListener('click', () => this.openImportDataModal());
        
        document.getElementById('closeExportDataModal').addEventListener('click', () => this.closeExportDataModal());
        document.getElementById('cancelExportData').addEventListener('click', () => this.closeExportDataModal());
        document.getElementById('confirmExportData').addEventListener('click', () => this.exportData());
        
        document.getElementById('closeImportDataModal').addEventListener('click', () => this.closeImportDataModal());
        document.getElementById('cancelImportData').addEventListener('click', () => this.closeImportDataModal());
        document.getElementById('confirmImportData').addEventListener('click', () => this.importData());

        document.getElementById('useGradient').addEventListener('change', (e) => {
            const gradientColors = document.getElementById('gradientColors');
            if (e.target.checked) {
                gradientColors.classList.add('active');
            } else {
                gradientColors.classList.remove('active');
            }
        });

        document.getElementById('eventImportance').addEventListener('input', (e) => {
            document.getElementById('importanceValue').textContent = e.target.value;
        });

        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.chartType = e.target.dataset.type;
                this.render();
            });
        });

        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
    }

    selectAll() {
        const selectionBox = document.getElementById('selectionBox');
        const thumbnailCanvas = document.getElementById('thumbnailCanvas');
        
        selectionBox.style.left = '0';
        selectionBox.style.top = '0';
        selectionBox.style.width = thumbnailCanvas.offsetWidth + 'px';
        selectionBox.style.height = thumbnailCanvas.offsetHeight + 'px';
        selectionBox.classList.add('active');
        
        this.selectionRange = { start: 0, end: 100 };
        this.renderMainChart();
    }

    setupThumbnailInteraction() {
        const selectionBox = document.getElementById('selectionBox');
        const thumbnailCanvas = document.getElementById('thumbnailCanvas');
        let isDrawing = false;
        let startX, startY;

        thumbnailCanvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            const rect = thumbnailCanvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            
            selectionBox.style.left = startX + 'px';
            selectionBox.style.top = startY + 'px';
            selectionBox.style.width = '0';
            selectionBox.style.height = '0';
            selectionBox.classList.add('active');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            
            const rect = thumbnailCanvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            const width = currentX - startX;
            const height = currentY - startY;
            
            selectionBox.style.left = (width > 0 ? startX : currentX) + 'px';
            selectionBox.style.top = (height > 0 ? startY : currentY) + 'px';
            selectionBox.style.width = Math.abs(width) + 'px';
            selectionBox.style.height = Math.abs(height) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDrawing) {
                isDrawing = false;
                this.updateSelectionRange();
                this.renderMainChart();
            }
        });

        // 移除点击空白处取消选择的功能，保持高亮直到下次选择
    }

    setupMainChartInteraction() {
        const mainChart = document.getElementById('mainChart');
        const tooltip = document.getElementById('tooltip');
        let tooltipTimeout = null;
        let currentEvent = null;
        let isTooltipFixed = false;

        const showTooltip = (event, mouseX, mouseY) => {
            clearTimeout(tooltipTimeout);
            
            tooltip.innerHTML = `
                <div class="tooltip-date">${this.formatDate(event.date)}</div>
                <div class="tooltip-name">${event.name}</div>
                <div class="tooltip-description">${event.description || '无描述'}</div>
                <div class="tooltip-importance">重要程度: ${event.importance}</div>
                <div class="tooltip-actions">
                    <button class="tooltip-btn tooltip-btn-edit" data-event-id="${event.id}">修改</button>
                    <button class="tooltip-btn tooltip-btn-delete" data-event-id="${event.id}">删除</button>
                </div>
                <div class="tooltip-hint">双击事件可固定此弹窗</div>
            `;
            
            setTimeout(() => {
                const editBtn = tooltip.querySelector('.tooltip-btn-edit');
                const deleteBtn = tooltip.querySelector('.tooltip-btn-delete');
                
                if (editBtn) {
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.editEvent(event.id);
                    });
                }
                
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteEvent(event.id);
                    });
                }
            }, 0);
            
            tooltip.style.display = 'block';
            
            const rect = mainChart.getBoundingClientRect();
            const tooltipWidth = tooltip.offsetWidth;
            const tooltipHeight = tooltip.offsetHeight;
            const chartWidth = rect.width;
            const chartHeight = rect.height;
            
            let left = mouseX + 10;
            let top = mouseY + 10;
            
            if (left + tooltipWidth > chartWidth) {
                left = mouseX - tooltipWidth - 10;
            }
            
            if (top + tooltipHeight > chartHeight) {
                top = mouseY - tooltipHeight - 10;
            }
            
            left = Math.max(0, left);
            top = Math.max(0, top);
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        };

        const hideTooltip = () => {
            if (!isTooltipFixed) {
                tooltipTimeout = setTimeout(() => {
                    tooltip.style.display = 'none';
                    currentEvent = null;
                }, 2000);
            }
        };

        const fixTooltip = () => {
            isTooltipFixed = true;
            clearTimeout(tooltipTimeout);
            tooltip.classList.add('fixed');
        };

        const unfixTooltip = () => {
            isTooltipFixed = false;
            tooltip.classList.remove('fixed');
            hideTooltip();
        };

        mainChart.addEventListener('mousemove', (e) => {
            const rect = mainChart.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const event = this.findEventAtPosition(mouseX, mouseY);
            
            if (event) {
                currentEvent = event;
                showTooltip(event, mouseX, mouseY);
            } else if (currentEvent && !isTooltipFixed) {
                hideTooltip();
            }
        });

        mainChart.addEventListener('dblclick', (e) => {
            const rect = mainChart.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const event = this.findEventAtPosition(mouseX, mouseY);
            
            if (event) {
                if (isTooltipFixed) {
                    unfixTooltip();
                } else {
                    fixTooltip();
                }
            }
        });

        const xAxisArea = document.getElementById('xAxisArea');
        
        const handleXAxisClick = (e) => {
            const rect = mainChart.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const clickedDate = this.getDateFromXPosition(mouseX);
            if (clickedDate) {
                this.openAddEventModalWithDate(clickedDate);
            }
        };

        mainChart.addEventListener('click', (e) => {
            const rect = mainChart.getBoundingClientRect();
            const mouseY = e.clientY - rect.top;
            
            const padding = 60;
            const chartHeight = rect.height - padding * 2;
            const centerY = rect.height / 2;
            
            const xAxisTop = centerY + chartHeight / 2 + 10;
            const xAxisBottom = rect.height - padding + 20;
            
            if (mouseY >= xAxisTop && mouseY <= xAxisBottom) {
                handleXAxisClick(e);
            }
        });

        if (xAxisArea) {
            xAxisArea.addEventListener('click', handleXAxisClick);
        }

        mainChart.addEventListener('mouseleave', () => {
            if (!isTooltipFixed) {
                hideTooltip();
            }
        });

        tooltip.addEventListener('mouseenter', () => {
            clearTimeout(tooltipTimeout);
        });

        tooltip.addEventListener('mouseleave', () => {
            if (isTooltipFixed) {
                tooltipTimeout = setTimeout(() => {
                    unfixTooltip();
                }, 2000);
            } else {
                hideTooltip();
            }
        });
    }

    getDateFromXPosition(x) {
        const filteredEvents = this.getFilteredEvents();
        if (filteredEvents.length === 0) return null;
        
        const canvas = document.getElementById('mainChart');
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        
        const padding = 60;
        const chartWidth = width - padding * 2;
        const centerX = width / 2;
        
        const relativeX = (x - centerX) / chartWidth + 0.5;
        
        const minDate = filteredEvents[0].date.getTime();
        const baseMaxDate = filteredEvents.length > 0 ? filteredEvents[filteredEvents.length - 1].date.getTime() : new Date().getTime();
        const extendedMaxDate = this.getExtendedMaxDate();
        const maxDate = Math.max(baseMaxDate, extendedMaxDate);
        const timeRange = maxDate - minDate;
        
        const targetTime = minDate + relativeX * timeRange;
        
        return new Date(Math.max(minDate, Math.min(maxDate, targetTime)));
    }

    openAddEventModalWithDate(date) {
        document.getElementById('eventDate').value = date.toISOString().slice(0, 16);
        document.getElementById('eventName').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventColor').value = '#3498db';
        document.getElementById('eventImportance').value = '50';
        document.getElementById('importanceValue').textContent = '50';
        document.getElementById('useGradient').checked = false;
        document.getElementById('gradientColors').classList.remove('active');
        
        document.getElementById('addEventModal').classList.add('active');
    }

    updateSelectionRange() {
        const selectionBox = document.getElementById('selectionBox');
        const thumbnailCanvas = document.getElementById('thumbnailCanvas');
        
        if (!selectionBox.classList.contains('active')) {
            this.selectionRange = { start: 0, end: 100 };
            return;
        }
        
        const left = parseInt(selectionBox.style.left) || 0;
        const width = parseInt(selectionBox.style.width) || 0;
        const canvasWidth = thumbnailCanvas.offsetWidth;
        
        this.selectionRange.start = (left / canvasWidth) * 100;
        this.selectionRange.end = ((left + width) / canvasWidth) * 100;
    }

    findEventAtPosition(mouseX, mouseY) {
        const canvas = document.getElementById('mainChart');
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const filteredEvents = this.getFilteredEvents();
        if (filteredEvents.length === 0) return null;

        const padding = 60;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const centerX = width / 2;
        const centerY = height / 2;

        for (const event of filteredEvents) {
            const eventX = centerX + (this.getTimeIndex(event.date) - 0.5) * chartWidth;
            const eventY = centerY - (event.importance / 100) * (chartHeight / 2);
            
            const distance = Math.sqrt(Math.pow(mouseX - eventX, 2) + Math.pow(mouseY - eventY, 2));
            if (distance < 15) {
                return event;
            }
        }
        return null;
    }

    openAddEventModal() {
        document.getElementById('addEventModal').classList.add('active');
        const now = new Date();
        document.getElementById('eventDate').value = now.toISOString().slice(0, 16);
    }

    closeAddEventModal() {
        document.getElementById('addEventModal').classList.remove('active');
        this.resetAddEventForm();
    }

    resetAddEventForm() {
        document.getElementById('eventName').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventColor').value = '#3498db';
        document.getElementById('eventImportance').value = '50';
        document.getElementById('importanceValue').textContent = '50';
        document.getElementById('useGradient').checked = false;
        document.getElementById('gradientColors').classList.remove('active');
    }

    addEvent() {
        const date = document.getElementById('eventDate').value;
        const name = document.getElementById('eventName').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const color = document.getElementById('eventColor').value;
        const useGradient = document.getElementById('useGradient').checked;
        const color2 = document.getElementById('eventColor2').value;
        const color3 = document.getElementById('eventColor3').value;
        const importance = parseInt(document.getElementById('eventImportance').value);

        if (!date || !name) {
            alert('请填写事件时间和名称');
            return;
        }

        const event = {
            id: Date.now(),
            date: new Date(date),
            name,
            description,
            color: useGradient ? { start: color, middle: color2, end: color3 } : color,
            importance
        };

        this.events.push(event);
        this.events.sort((a, b) => a.date - b.date);
        this.render();
        this.closeAddEventModal();
    }

    openExportModal() {
        document.getElementById('exportModal').classList.add('active');
        const filteredEvents = this.getFilteredEvents();
        if (filteredEvents.length > 0) {
            const minDate = filteredEvents[0].date;
            const maxDate = filteredEvents[filteredEvents.length - 1].date;
            document.getElementById('exportStartDate').value = minDate.toISOString().slice(0, 10);
            document.getElementById('exportEndDate').value = maxDate.toISOString().slice(0, 10);
        }
    }

    closeExportModal() {
        document.getElementById('exportModal').classList.remove('active');
    }

    exportChart() {
        const startDate = document.getElementById('exportStartDate').value;
        const endDate = document.getElementById('exportEndDate').value;
        const chartType = document.querySelector('#exportModal .chart-type-btn.active').dataset.type;

        if (!startDate || !endDate) {
            alert('请选择时间范围');
            return;
        }

        const canvas = document.getElementById('mainChart');
        const link = document.createElement('a');
        link.download = `life-timeline-${startDate}-${endDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        this.closeExportModal();
    }

    openExportDataModal() {
        document.getElementById('exportDataModal').classList.add('active');
        const filteredEvents = this.getFilteredEvents();
        if (filteredEvents.length > 0) {
            const minDate = filteredEvents[0].date;
            const maxDate = filteredEvents[filteredEvents.length - 1].date;
            document.getElementById('exportDataStartDate').value = minDate.toISOString().slice(0, 10);
            document.getElementById('exportDataEndDate').value = maxDate.toISOString().slice(0, 10);
        }
    }

    closeExportDataModal() {
        document.getElementById('exportDataModal').classList.remove('active');
    }

    exportData() {
        const startDate = document.getElementById('exportDataStartDate').value;
        const endDate = document.getElementById('exportDataEndDate').value;
        const format = document.getElementById('exportFormat').value;

        if (!startDate || !endDate) {
            alert('请选择时间范围');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredEvents = this.events.filter(event => {
            const eventDate = event.date;
            return eventDate >= start && eventDate <= end;
        });

        let data, filename, mimeType;

        if (format === 'json') {
            data = JSON.stringify(filteredEvents, null, 2);
            filename = `life-timeline-data-${startDate}-${endDate}.json`;
            mimeType = 'application/json';
        } else {
            data = this.convertToCSV(filteredEvents);
            filename = `life-timeline-data-${startDate}-${endDate}.csv`;
            mimeType = 'text/csv';
        }

        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        this.closeExportDataModal();
    }

    convertToCSV(events) {
        const headers = ['时间', '事件名称', '事件描述', '颜色', '重要程度'];
        const rows = events.map(event => {
            const date = event.date.toISOString();
            const name = event.name;
            const description = event.description || '';
            const color = typeof event.color === 'object' ? JSON.stringify(event.color) : event.color;
            const importance = event.importance;
            return [date, name, description, color, importance];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    openImportDataModal() {
        document.getElementById('importDataModal').classList.add('active');
    }

    closeImportDataModal() {
        document.getElementById('importDataModal').classList.remove('active');
        document.getElementById('importDataFile').value = '';
        document.getElementById('overwriteData').checked = false;
    }

    importData() {
        const fileInput = document.getElementById('importDataFile');
        const overwrite = document.getElementById('overwriteData').checked;

        if (!fileInput.files || fileInput.files.length === 0) {
            alert('请选择要导入的文件');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                let importedEvents;

                if (file.name.endsWith('.json')) {
                    importedEvents = JSON.parse(e.target.result);
                    importedEvents = importedEvents.map(event => {
                        return {
                            ...event,
                            date: new Date(event.date)
                        };
                    });
                } else if (file.name.endsWith('.csv')) {
                    importedEvents = this.parseCSV(e.target.result);
                } else {
                    alert('不支持的文件格式');
                    return;
                }

                if (overwrite) {
                    this.events = importedEvents;
                } else {
                    this.events = [...this.events, ...importedEvents];
                }

                this.events.sort((a, b) => a.date - b.date);
                this.render();
                this.closeImportDataModal();
                alert('数据导入成功');
            } catch (error) {
                alert('导入失败：' + error.message);
            }
        };

        reader.onerror = () => {
            alert('文件读取失败');
        };

        reader.readAsText(file);
    }

    parseCSV(csvContent) {
        const lines = csvContent.split('\n');
        const events = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells = line.match(/"([^"]*)"/g).map(cell => cell.slice(1, -1));
            if (cells.length >= 5) {
                const date = new Date(cells[0]);
                const name = cells[1];
                const description = cells[2];
                let color;
                try {
                    color = JSON.parse(cells[3]);
                } catch {
                    color = cells[3];
                }
                const importance = parseInt(cells[4]);

                events.push({
                    id: Date.now() + i,
                    date,
                    name,
                    description,
                    color,
                    importance
                });
            }
        }

        return events;
    }

    loadSampleData() {
        const sampleEvents = [
            { id: 1, date: new Date('1990-01-01'), name: '出生', description: '来到这个世界', color: '#3498db', importance: 100 },
            { id: 2, date: new Date('2008-09-01'), name: '上大学', description: '开始大学生活', color: '#2ecc71', importance: 80 },
            { id: 3, date: new Date('2012-06-30'), name: '毕业', description: '大学毕业', color: '#f39c12', importance: 70 },
            { id: 4, date: new Date('2012-07-15'), name: '第一份工作', description: '开始职业生涯', color: '#9b59b6', importance: 85 },
            { id: 5, date: new Date('2015-10-01'), name: '结婚', description: '人生大事', color: '#e74c3c', importance: 95 },
            { id: 6, date: new Date('2018-05-20'), name: '升职', description: '职业发展', color: '#1abc9c', importance: 60 },
            { id: 7, date: new Date('2020-03-15'), name: '买房', description: '有了自己的家', color: '#34495e', importance: 75 },
            { id: 8, date: new Date('2023-01-01'), name: '创业', description: '开始创业之旅', color: '#e67e22', importance: 90 }
        ];
        this.events = sampleEvents;
    }

    addDefaultBirthEvent() {
        const birthEvent = {
            id: 0,
            date: new Date('1990-01-01'),
            name: '出生',
            description: '人生的起点',
            color: '#3498db',
            importance: 100
        };
        
        if (!this.events.some(event => event.name === '出生')) {
            this.events.unshift(birthEvent);
            this.events.sort((a, b) => a.date - b.date);
        }
    }

    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        document.getElementById('eventDate').value = event.date.toISOString().slice(0, 16);
        document.getElementById('eventName').value = event.name;
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventColor').value = typeof event.color === 'object' ? event.color.start : event.color;
        document.getElementById('eventImportance').value = event.importance;
        document.getElementById('importanceValue').textContent = event.importance;
        
        if (typeof event.color === 'object') {
            document.getElementById('useGradient').checked = true;
            document.getElementById('gradientColors').classList.add('active');
            document.getElementById('eventColor2').value = event.color.middle || event.color.start;
            document.getElementById('eventColor3').value = event.color.end || event.color.start;
        } else {
            document.getElementById('useGradient').checked = false;
            document.getElementById('gradientColors').classList.remove('active');
        }
        
        document.getElementById('addEventModal').classList.add('active');
        
        const confirmBtn = document.getElementById('confirmAddEvent');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = '更新事件';
        
        const updateEvent = () => {
            const index = this.events.findIndex(e => e.id === eventId);
            if (index === -1) return;
            
            const date = document.getElementById('eventDate').value;
            const name = document.getElementById('eventName').value.trim();
            const description = document.getElementById('eventDescription').value.trim();
            const color = document.getElementById('eventColor').value;
            const useGradient = document.getElementById('useGradient').checked;
            const color2 = document.getElementById('eventColor2').value;
            const color3 = document.getElementById('eventColor3').value;
            const importance = parseInt(document.getElementById('eventImportance').value);

            if (!date || !name) {
                alert('请填写事件时间和名称');
                return;
            }

            this.events[index] = {
                ...this.events[index],
                date: new Date(date),
                name,
                description,
                color: useGradient ? { start: color, middle: color2, end: color3 } : color,
                importance
            };

            this.events.sort((a, b) => a.date - b.date);
            this.render();
            this.closeAddEventModal();
            
            confirmBtn.textContent = originalText;
            confirmBtn.removeEventListener('click', updateEvent);
        };
        
        confirmBtn.removeEventListener('click', this.addEvent.bind(this));
        confirmBtn.addEventListener('click', updateEvent);
    }

    deleteEvent(eventId) {
        if (confirm('确定要删除这个事件吗？')) {
            this.events = this.events.filter(e => e.id !== eventId);
            this.render();
        }
    }

    getFilteredEvents() {
        if (this.events.length === 0) return [];
        
        const minDate = this.events[0].date.getTime();
        const maxDate = this.events[this.events.length - 1].date.getTime();
        const timeRange = maxDate - minDate;
        
        const startTime = minDate + (this.selectionRange.start / 100) * timeRange;
        const endTime = minDate + (this.selectionRange.end / 100) * timeRange;

        return this.events.filter(event => {
            const eventTime = event.date.getTime();
            return eventTime >= startTime && eventTime <= endTime;
        });
    }

    getExtendedMaxDate() {
        if (this.events.length === 0) return new Date().getTime();
        
        const maxDate = this.events[this.events.length - 1].date.getTime();
        const extendedDate = new Date(maxDate);
        extendedDate.setFullYear(extendedDate.getFullYear() + this.extendYears);
        
        return extendedDate.getTime();
    }

    getTimeIndex(date) {
        const filteredEvents = this.getFilteredEvents();
        if (filteredEvents.length === 0) return 0.5;

        const minDate = filteredEvents[0].date.getTime();
        const baseMaxDate = filteredEvents.length > 0 ? filteredEvents[filteredEvents.length - 1].date.getTime() : new Date().getTime();
        const extendedMaxDate = this.getExtendedMaxDate();
        const maxDate = Math.max(baseMaxDate, extendedMaxDate);
        const timeRange = maxDate - minDate;
        
        if (timeRange === 0) return 0.5;
        return (date.getTime() - minDate) / timeRange;
    }

    formatDate(date) {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    getColor(event) {
        if (typeof event.color === 'object') {
            return event.color;
        }
        return event.color;
    }

    render() {
        this.renderThumbnail();
        this.renderMainChart();
    }

    renderThumbnail() {
        const canvas = document.getElementById('thumbnailChart');
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.events.length === 0) return;

        const padding = 10;
        const width = canvas.width - padding * 2;
        const height = canvas.height - padding * 2;

        const minDate = this.events[0].date.getTime();
        const maxDate = this.events[this.events.length - 1].date.getTime();
        const timeRange = maxDate - minDate || 1;

        this.events.forEach((event, index) => {
            const timeIndex = (event.date.getTime() - minDate) / timeRange;
            const x = padding + timeIndex * width;
            const y = padding + height / 2 - (event.importance / 100) * (height / 2);

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = typeof event.color === 'object' ? event.color.start : event.color;
            ctx.fill();
        });

        if (this.events.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            
            this.events.forEach((event, index) => {
                const timeIndex = (event.date.getTime() - minDate) / timeRange;
                const x = padding + timeIndex * width;
                const y = padding + height / 2 - (event.importance / 100) * (height / 2);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }
    }

    renderMainChart() {
        const canvas = document.getElementById('mainChart');
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const filteredEvents = this.getFilteredEvents();
        if (filteredEvents.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('暂无事件数据', canvas.width / 2, canvas.height / 2);
            return;
        }

        const padding = 60;
        const width = canvas.width - padding * 2;
        const height = canvas.height - padding * 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.beginPath();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.moveTo(padding, centerY);
        ctx.lineTo(canvas.width - padding, centerY);
        ctx.stroke();

        if (this.chartType === 'line') {
            this.renderLineChart(ctx, filteredEvents, padding, width, height, centerX, centerY);
        } else {
            this.renderBarChart(ctx, filteredEvents, padding, width, height, centerX, centerY);
        }

        this.renderAxes(ctx, filteredEvents, padding, width, height, centerX, centerY);
    }

    renderLineChart(ctx, events, padding, width, height, centerX, centerY) {
        if (events.length === 0) return;

        ctx.beginPath();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;

        events.forEach((event, index) => {
            const x = centerX + (this.getTimeIndex(event.date) - 0.5) * width;
            const y = centerY - (event.importance / 100) * (height / 2);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        events.forEach((event, index) => {
            const x = centerX + (this.getTimeIndex(event.date) - 0.5) * width;
            const y = centerY - (event.importance / 100) * (height / 2);

            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            
            const color = this.getColor(event);
            if (typeof color === 'object') {
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
                gradient.addColorStop(0, color.start);
                gradient.addColorStop(0.5, color.middle);
                gradient.addColorStop(1, color.end);
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = color;
            }
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    renderBarChart(ctx, events, padding, width, height, centerX, centerY) {
        const barWidth = Math.min(40, width / (events.length || 1) * 0.6);

        events.forEach((event, index) => {
            const x = centerX + (this.getTimeIndex(event.date) - 0.5) * width - barWidth / 2;
            const barHeight = Math.abs(event.importance / 100) * (height / 2);
            const y = event.importance >= 0 ? centerY - barHeight : centerY;

            ctx.beginPath();
            
            const color = this.getColor(event);
            if (typeof color === 'object') {
                const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
                gradient.addColorStop(0, color.start);
                gradient.addColorStop(0.5, color.middle);
                gradient.addColorStop(1, color.end);
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = color;
            }
            
            ctx.roundRect(x, y, barWidth, barHeight, 4);
            ctx.fill();
        });
    }

    renderAxes(ctx, events, padding, width, height, centerX, centerY) {
        const canvas = document.getElementById('mainChart');
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        events.forEach((event, index) => {
            const x = centerX + (this.getTimeIndex(event.date) - 0.5) * width;
            const y = centerY - (event.importance / 100) * (height / 2);
            const labelY = event.importance >= 0 ? y - 20 : y + 30;

            ctx.fillText(this.formatDate(event.date), x, canvas.height - 20);
            
            ctx.font = 'bold 12px Arial';
            ctx.fillText(event.name, x, labelY);
            ctx.font = '12px Arial';
        });

        if (events.length > 0) {
            const extendedMaxDate = this.getExtendedMaxDate();
            const extendedDate = new Date(extendedMaxDate);
            const extendedX = canvas.width - padding;
            
            ctx.fillStyle = '#999';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.formatDate(extendedDate), extendedX, canvas.height - 20);
            
            ctx.beginPath();
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(extendedX, padding);
            ctx.lineTo(extendedX, canvas.height - padding);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.fillStyle = '#999';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('重要程度', padding - 10, centerY);
        ctx.fillText('+100', padding - 10, padding);
        ctx.fillText('0', padding - 10, centerY);
        ctx.fillText('-100', padding - 10, canvas.height - padding);
    }
}

const app = new LifeTimeline();

window.addEventListener('resize', () => {
    app.render();
});