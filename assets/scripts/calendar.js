// Calendar functionality
let calendar;
let allCalendarEvents = [];
let activeCategory = 'all';

// Convert events to FullCalendar format
function convertEventsToCalendar() {
    const calendarEvents = [];

    // Add press articles
    pressData.forEach(article => {
        if (article.date) {
            calendarEvents.push({
                title: article.title || 'Untitled',
                start: article.date,
                allDay: true,
                extendedProps: {
                    type: 'press',
                    id: article.id,
                    category: article.category,
                    writer: article.writer,
                    desc: article.desc,
                    link_kr: article.link_kr,
                    link_en: article.link_en,
                    image: article.image,
                    keywords: article.keyword || []
                },
                className: 'fc-event-press',
                url: article.link_kr || article.link_en || null
            });
        }
    });

    // Add events
    eventsData.forEach(event => {
        if (event.start) {
            // Determine className based on category
            let eventClassName = 'fc-event-event'; // default fallback
            if (event.category) {
                eventClassName = `fc-event-${event.category}`;
            }

            const eventObj = {
                title: event.title || 'Event',
                start: event.start,
                allDay: true,
                extendedProps: {
                    type: 'event',
                    id: event.id,
                    category: event.category,
                    place: event.place,
                    participants: event.participants,
                    keywords: event.keywords,
                    desc: event.desc,
                    photos: event.photos || [],
                    speaker: event.speaker,
                    award: event.award,
                    links: event.links || []
                },
                className: eventClassName,
            };

            // Add end date if it exists and is different from start
            if (event.end && event.end !== event.start) {
                eventObj.end = event.end;
            }

            calendarEvents.push(eventObj);
        }
    });

    return calendarEvents;
}

// Show event tooltip
function showEventTooltip(event, eventElement) {
    const tooltip = document.getElementById('event-tooltip');
    const props = event.extendedProps;

    let content = '';
    content += `<div class="event-tooltip-title">${event.title}</div>`;
    if (props.type === 'press') {
        content += `<span class="event-tooltip-type press">Press Article</span>`;
    } else {
        const category = props.category || 'others';
        const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
        content += `<span class="event-tooltip-type ${category}">${categoryLabel}</span>`;
    }

    if (props.type === 'press') {
        if (props.writer) content += `<div class="text-xs text-slate-500 mb-2">By ${props.writer}</div>`;
        if (props.category) content += `<div class="text-xs text-slate-500 mb-2">Category: ${props.category}</div>`;
        if (props.desc) {
            const shortDesc = props.desc.split('\n')[0].substring(0, 150);
            content += `<div class="event-tooltip-desc">${shortDesc}${props.desc.length > 150 ? '...' : ''}</div>`;
        }
    } else {
        if (props.category) content += `<div class="text-xs text-slate-500 mb-2">📁 ${props.category.charAt(0).toUpperCase() + props.category.slice(1)}</div>`;
        if (props.place) content += `<div class="text-xs text-slate-500 mb-2">📍 ${props.place}</div>`;
        if (props.speaker) content += `<div class="text-xs text-slate-500 mb-2">🎤 Speaker: ${props.speaker}</div>`;
        if (props.participants) content += `<div class="text-xs text-slate-500 mb-2">👥 ${props.participants}</div>`;
        if (props.award) content += `<div class="text-xs font-semibold text-blue-600 mb-2">🏆 ${props.award}</div>`;
        if (props.desc) {
            const shortDesc = props.desc.split('\n')[0].substring(0, 150);
            content += `<div class="event-tooltip-desc">${shortDesc}${props.desc.length > 150 ? '...' : ''}</div>`;
        }
        if (props.links && props.links.length > 0) {
            content += `<div class="mt-2 pt-2 border-t border-slate-200">`;
            props.links.forEach(link => {
                content += `<a href="${link.url}" target="_blank" rel="noopener" class="text-xs text-blue-600 hover:underline block mb-1">🔗 ${link.label}</a>`;
            });
            content += `</div>`;
        }
    }

    tooltip.innerHTML = content;
    tooltip.classList.add('show');

    // Position tooltip relative to event element, not mouse
    const eventRect = eventElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 15; // Gap between event and tooltip

    // Default: position to the right
    let left = eventRect.right + gap;
    let top = eventRect.top;

    // If tooltip would go off screen to the right, position to the left
    if (left + tooltipRect.width > window.innerWidth - 20) {
        left = eventRect.left - tooltipRect.width - gap;
    }

    // If tooltip would go off screen to the left, position above
    if (left < 20) {
        left = eventRect.left + (eventRect.width / 2) - (tooltipRect.width / 2);
        top = eventRect.top - tooltipRect.height - gap;

        // If tooltip would go off screen at top, position below
        if (top < 20) {
            top = eventRect.bottom + gap;
        }
    }

    // Ensure tooltip stays within viewport
    if (top + tooltipRect.height > window.innerHeight - 20) {
        top = window.innerHeight - tooltipRect.height - 20;
    }
    if (left < 20) {
        left = 20;
    }
    if (left + tooltipRect.width > window.innerWidth - 20) {
        left = window.innerWidth - tooltipRect.width - 20;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideEventTooltip() {
    const tooltip = document.getElementById('event-tooltip');
    tooltip.classList.remove('show');
}

// Filter events by category
function filterEventsByCategory(category) {
    if (category === 'all') {
        return allCalendarEvents;
    }

    return allCalendarEvents.filter(event => {
        const props = event.extendedProps;
        if (category === 'press') {
            return props.type === 'press';
        } else if (category === 'others') {
            // Group exhibition, award, hackathon as "others"
            return props.type === 'event' &&
                (props.category === 'exhibition' ||
                    props.category === 'award' ||
                    props.category === 'hackathon');
        } else {
            return props.type === 'event' && props.category === category;
        }
    });
}

// Update calendar with filtered events
function updateCalendarEvents() {
    const filteredEvents = filterEventsByCategory(activeCategory);
    calendar.removeAllEvents();
    calendar.addEventSource(filteredEvents);
}

// Initialize calendar
async function initCalendar() {
    // eventsData should already be loaded in init(), but load it here if not
    if (!eventsData || eventsData.length === 0) {
        eventsData = await loadEventsData();
    }

    // Convert to calendar events and store all
    allCalendarEvents = convertEventsToCalendar();

    // Initialize FullCalendar
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        timeZone: 'UTC',
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'multiMonthYear,dayGridMonth',
        
        },
        titleFormat: {month: 'short', year: 'numeric'},
        views: {
            multiMonthYear: {
                buttonText: 'half-year',
                type: 'multiMonth',
                multiMonthMaxColumns: 3,
                multiMonthMinWidth: 250,
                eventDisplay: 'list-item', // Show as bars/blocks
                // dayHeaderFormat: { month: 'short' },
                dayHeaderContent: function(arg) {
                    return arg.text[0]
                },
                
                duration: { months: 6 }
            }
        },
        initialDate: new Date(),
        navLinks: true,
        editable: false,
        dayMaxEvents: 3,
        moreLinkClick: 'popover',
        events: allCalendarEvents,
        eventContent: function (arg) {
            // For yearly view, return empty to show bars without text
            // if (arg.view.type === 'multiMonthYear') {
            //     return { html: '' };
            // }
            // For other views, show normal event title
            return {
                html: `<div class="fc-event-title">${arg.event.title}</div>`
            };
        },
        eventDidMount: function (arg) {
            let tooltipTimeout;
            let isHovering = false;

            // Add hover tooltip with delay to prevent flickering
            arg.el.addEventListener('mouseenter', (e) => {
                isHovering = true;
                clearTimeout(tooltipTimeout);

                // Small delay to prevent rapid show/hide flickering
                tooltipTimeout = setTimeout(() => {
                    if (isHovering) {
                        showEventTooltip(arg.event, arg.el);
                    }
                }, 200);
            });

            arg.el.addEventListener('mouseleave', () => {
                isHovering = false;
                clearTimeout(tooltipTimeout);
                // Small delay before hiding to allow smooth transition
                tooltipTimeout = setTimeout(() => {
                    if (!isHovering) {
                        hideEventTooltip();
                    }
                }, 100);
            });
        },
        eventClick: function (arg) {
            arg.jsEvent.preventDefault();
            const props = arg.event.extendedProps;

            if (props.type === 'press') {
                // Navigate to press detail page
                if (props.id) {
                    window.location.href = `press-detail.html?id=${props.id}`;
                }
            } else if (props.type === 'event') {
                // Navigate to events detail page
                if (props.id) {
                    window.location.href = `events-detail.html?id=${props.id}`;
                }
            } else {
                // Build detailed event info with new fields
                let info = `Event: ${arg.event.title}\n\n`;
                if (props.category) info += `Category: ${props.category.charAt(0).toUpperCase() + props.category.slice(1)}\n`;
                if (props.place) info += `Place: ${props.place}\n`;
                if (props.speaker) info += `Speaker: ${props.speaker}\n`;
                if (props.participants) info += `Participants: ${props.participants}\n`;
                if (props.award) info += `Award: ${props.award}\n`;
                if (props.desc) info += `\n${props.desc}\n`;
                if (props.links && props.links.length > 0) {
                    info += `\nLinks:\n`;
                    props.links.forEach(link => {
                        info += `- ${link.label}: ${link.url}\n`;
                    });
                }
                alert(info);
            }
        },
        datesSet: function (arg) {
            // Update viewport summary when calendar view changes
            updateViewportSummary(arg);
        }
    });

    calendar.render();

    // Setup category filter buttons
    setupCategoryFilters();

    // Initial viewport summary
    setTimeout(() => {
        const view = calendar.view;
        updateViewportSummary({
            start: view.activeStart,
            end: view.activeEnd,
            view: view
        });
    }, 100);

    // Setup expand all button
    setupExpandAllButton();
}

// Setup expand all button functionality
function setupExpandAllButton() {
    const expandAllBtn = document.getElementById('expand-all-btn');
    if (!expandAllBtn) return;

    expandAllBtn.addEventListener('click', () => {
        const allMonthItems = document.querySelectorAll('.month-summary-item');
        const allExpanded = Array.from(allMonthItems).every(item => item.classList.contains('expanded'));

        allMonthItems.forEach(monthEl => {
            const detailsEl = monthEl.querySelector('.event-details');

            if (allExpanded) {
                // Collapse all
                monthEl.classList.remove('expanded');
                if (detailsEl) detailsEl.classList.add('hidden');
            } else {
                // Expand all
                monthEl.classList.add('expanded');
                if (detailsEl) detailsEl.classList.remove('hidden');
            }
        });

        updateExpandAllButton();
    });
}

// Update expand all button text
function updateExpandAllButton() {
    const expandAllBtn = document.getElementById('expand-all-btn');
    if (!expandAllBtn) return;

    const allMonthItems = document.querySelectorAll('.month-summary-item');
    if (allMonthItems.length === 0) return;

    const allExpanded = Array.from(allMonthItems).every(item => item.classList.contains('expanded'));
    expandAllBtn.textContent = allExpanded ? 'Collapse All' : 'Expand All';
}

// Update viewport summary based on current calendar view
function updateViewportSummary(arg) {
    const summaryContainer = document.getElementById('viewport-summary');
    const dateRangeEl = document.getElementById('viewport-date-range');
    if (!summaryContainer || !dateRangeEl) return;

    const start = arg.start;
    const end = arg.end;
    const view = arg.view;

    // Update date range display
    const startDate = new Date(start);
    const endDate = new Date(end);

    let dateRangeText = '';
    if (view.type === 'dayGridMonth' || view.type === 'multiMonth') {
        dateRangeText = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (view.type === 'multiMonthYear') {
        dateRangeText = `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } else {
        dateRangeText = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    dateRangeEl.textContent = dateRangeText;

    // Get events in the current viewport
    const viewportEvents = calendar.getEvents().filter(event => {
        const eventStart = event.start;
        return eventStart >= start && eventStart < end;
    });

    // Sort by date
    viewportEvents.sort((a, b) => {
        const aStart = a.start || new Date(0);
        const bStart = b.start || new Date(0);
        return aStart - bStart;
    });

    summaryContainer.innerHTML = '';

    if (viewportEvents.length === 0) {
        summaryContainer.innerHTML = '<p class="text-sm text-slate-500">No events in this view</p>';
        return;
    }

    // Check if yearly view - group by month
    const isYearlyView = view.type === 'multiMonthYear';

    if (isYearlyView) {
        // Group by month for yearly view
        const eventsByMonth = {};
        viewportEvents.forEach(event => {
            const eventDate = event.start;
            if (!eventDate) return;

            const date = new Date(eventDate);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!eventsByMonth[monthKey]) {
                eventsByMonth[monthKey] = {
                    month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    items: [],
                    categories: {}
                };
            }
            eventsByMonth[monthKey].items.push(event);
            const cat = event.extendedProps.category || (event.extendedProps.type === 'press' ? 'Press' : 'Event');
            eventsByMonth[monthKey].categories[cat] = (eventsByMonth[monthKey].categories[cat] || 0) + 1;
        });

        // Sort months (newest first)
        const sortedMonths = Object.entries(eventsByMonth).sort((a, b) => b[0].localeCompare(a[0]));

        sortedMonths.forEach(([key, monthData]) => {
            const monthEl = document.createElement('div');
            monthEl.className = 'pb-3 border-b border-slate-200 last:border-0 last:pb-0 mb-3 last:mb-0 month-summary-item';
            monthEl.dataset.monthKey = key;

            // Sort items within month by date (newest first)
            const sortedItems = [...monthData.items].sort((a, b) => {
                const aStart = a.start || new Date(0);
                const bStart = b.start || new Date(0);
                return bStart - aStart;
            });

            // Category breakdown - wrap-friendly (no comma, flex-wrap handles spacing)
            const categoryList = Object.entries(monthData.categories)
                .map(([cat, count]) => {
                    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
                    return `<span class="text-xs text-slate-600">${catLabel}: ${count}</span>`;
                })
                .join('');

            // Event list (hidden by default)
            const eventList = sortedItems.map(event => {
                const props = event.extendedProps;
                const date = new Date(event.start);
                const day = date.getDate();
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                // Category color
                let categoryColor = 'bg-slate-500';
                if (props.type === 'press') {
                    categoryColor = 'bg-blue-900';
                } else if (props.category === 'presentation') {
                    categoryColor = 'bg-green-600';
                } else if (props.category === 'conference') {
                    categoryColor = 'bg-purple-600';
                } else if (props.category === 'workshop') {
                    categoryColor = 'bg-orange-600';
                } else if (props.category === 'seminar') {
                    categoryColor = 'bg-teal-600';
                } else if (props.category === 'meeting') {
                    categoryColor = 'bg-indigo-600';
                } else if (props.category === 'exhibition' || props.category === 'award' || props.category === 'hackathon') {
                    categoryColor = 'bg-slate-600';
                }

                const categoryLabel = props.category ? props.category.charAt(0).toUpperCase() + props.category.slice(1) : (props.type === 'press' ? 'Press' : 'Event');

                const clickHandler = props.type === 'press'
                    ? `window.location.href='press-detail.html?id=${props.id}'`
                    : props.type === 'event'
                        ? `window.location.href='events-detail.html?id=${props.id}'`
                        : `document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' })`;

                return `
                            <div onclick="${clickHandler}" class="flex items-start gap-2 py-1.5 hover:bg-slate-50 rounded px-1 -mx-1 transition-colors cursor-pointer group">
                                <div class="flex items-center gap-2 min-w-[60px]">
                                    <span class="text-xs font-bold text-slate-600">${day}</span>
                                    <span class="text-xs text-slate-400">${dayName}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-1.5 mb-0.5">
                                        <span class="w-1.5 h-1.5 rounded-full ${categoryColor}"></span>
                                        <span class="text-xs font-medium text-slate-500">${categoryLabel}</span>
                                    </div>
                                    <div class="text-xs font-medium text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">${event.title}</div>
                                    ${props.place ? `<div class="text-xs text-slate-400 mt-0.5 line-clamp-1">${props.place}</div>` : ''}
                                </div>
                            </div>
                        `;
            }).join('');

            monthEl.innerHTML = `
                        <div class="flex items-center justify-between mb-2 month-header">
                            <h4 class="text-sm font-bold text-slate-900">${monthData.month}</h4>
                            <span class="text-sm font-bold text-blue-600">${monthData.items.length} ${monthData.items.length === 1 ? 'event' : 'events'}</span>
                        </div>
                        <div class="category-summary text-xs text-slate-600 mb-2">
                            ${categoryList || '<span class="text-slate-400">No categories</span>'}
                        </div>
                        <div class="event-details hidden space-y-0.5 overflow-y-auto">
                            ${eventList || '<p class="text-xs text-slate-400">No events</p>'}
                        </div>
                    `;

            // Add hover handlers only (no click handlers)
            const detailsEl = monthEl.querySelector('.event-details');

            monthEl.addEventListener('mouseenter', () => {
                if (detailsEl && !monthEl.classList.contains('expanded')) {
                    detailsEl.classList.remove('hidden');
                }
            });

            monthEl.addEventListener('mouseleave', () => {
                if (detailsEl && !monthEl.classList.contains('expanded')) {
                    detailsEl.classList.add('hidden');
                }
            });

            summaryContainer.appendChild(monthEl);
        });
    } else {
        // Group by date for monthly view
        const eventsByDate = {};
        viewportEvents.forEach(event => {
            const eventDate = event.start;
            if (!eventDate) return;

            const dateKey = eventDate.toISOString().split('T')[0];
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push(event);
        });

        // Sort dates
        const sortedDates = Object.keys(eventsByDate).sort();

        sortedDates.forEach(dateKey => {
            const date = new Date(dateKey);
            const events = eventsByDate[dateKey];

            const dateEl = document.createElement('div');
            dateEl.className = 'pb-3 border-b border-slate-200 last:border-0 last:pb-0 mb-3 last:mb-0';

            const day = date.getDate();
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });

            const eventList = events.map(event => {
                const props = event.extendedProps;

                // Category color
                let categoryColor = 'bg-slate-500';
                if (props.type === 'press') {
                    categoryColor = 'bg-blue-900';
                } else if (props.category === 'presentation') {
                    categoryColor = 'bg-green-600';
                } else if (props.category === 'conference') {
                    categoryColor = 'bg-purple-600';
                } else if (props.category === 'workshop') {
                    categoryColor = 'bg-orange-600';
                } else if (props.category === 'seminar') {
                    categoryColor = 'bg-teal-600';
                } else if (props.category === 'meeting') {
                    categoryColor = 'bg-indigo-600';
                } else if (props.category === 'exhibition' || props.category === 'award' || props.category === 'hackathon') {
                    categoryColor = 'bg-slate-600';
                }

                const categoryLabel = props.category ? props.category.charAt(0).toUpperCase() + props.category.slice(1) : (props.type === 'press' ? 'Press' : 'Event');

                const clickHandler = props.type === 'press'
                    ? `window.location.href='press-detail.html?id=${props.id}'`
                    : props.type === 'event'
                        ? `window.location.href='events-detail.html?id=${props.id}'`
                        : console.log(props.type)
                // `document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' })`;

                return `
                            <div onclick="${clickHandler}" class="flex items-start gap-2 py-1.5 hover:bg-slate-50 rounded px-1 -mx-1 transition-colors cursor-pointer group">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-1.5 mb-0.5">
                                        <span class="w-1.5 h-1.5 rounded-full ${categoryColor}"></span>
                                        <span class="text-xs font-medium text-slate-500">${categoryLabel}</span>
                                    </div>
                                    <div class="text-xs font-medium text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">${event.title}</div>
                                    ${props.place ? `<div class="text-xs text-slate-400 mt-0.5 line-clamp-1">${props.place}</div>` : ''}
                                </div>
                            </div>
                        `;
            }).join('');

            dateEl.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-bold text-slate-900">${day}</span>
                                <span class="text-xs text-slate-500">${dayName}</span>
                                <span class="text-xs text-slate-400">${monthName}</span>
                            </div>
                            <span class="text-xs font-semibold text-blue-600">${events.length}</span>
                        </div>
                        <div class="space-y-1">
                            ${eventList}
                        </div>
                    `;

            summaryContainer.appendChild(dateEl);
        });
    }
}

// Setup category filter event listeners
function setupCategoryFilters() {
    const filterButtons = document.querySelectorAll('.category-filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                const cat = btn.dataset.category;
                // Reset to inactive styles
                if (cat === 'all') {
                    btn.className = 'category-filter px-3 py-1.5 rounded text-xs font-medium transition-colors border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400';
                } else if (cat === 'press') {
                    btn.className = 'category-filter px-3 py-1.5 rounded text-xs font-medium transition-colors border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400';
                } else if (cat === 'presentation') {
                    btn.className = 'category-filter px-3 py-1.5 rounded text-xs font-medium transition-colors border border-green-500 bg-white text-green-700 hover:bg-green-50 hover:border-green-600';
                } else if (cat === 'conference') {
                    btn.className = 'category-filter px-3 py-1.5 rounded text-xs font-medium transition-colors border border-purple-500 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-600';
                } else if (cat === 'workshop') {
                    btn.className = 'category-filter px-3 py-1.5 rounded text-xs font-medium transition-colors border border-orange-500 bg-white text-orange-700 hover:bg-orange-50 hover:border-orange-600';
                } else if (cat === 'seminar') {
                    btn.className = 'category-filter px-3 py-1.5 rounded text-xs font-medium transition-colors border border-teal-500 bg-white text-teal-700 hover:bg-teal-50 hover:border-teal-600';
                } else if (cat === 'meeting') {
                    btn.className = 'category-filter px-3 py-1.5 rounded text-xs font-medium transition-colors border border-indigo-500 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-600';
                } else if (cat === 'others') {
                    btn.className = 'category-filter px-3 py-1.5 rounded text-xs font-medium transition-colors border border-slate-400 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-500';
                }
            });

            button.classList.add('active');
            const category = button.dataset.category;

            // Update button styles based on category (active state)
            if (category === 'all') {
                button.className = 'category-filter active px-3 py-1.5 rounded text-xs font-semibold transition-colors border border-blue-900 bg-blue-900 text-white hover:bg-blue-800';
            } else if (category === 'press') {
                button.className = 'category-filter active px-3 py-1.5 rounded text-xs font-semibold transition-colors border border-blue-900 bg-blue-900 text-white hover:bg-blue-800';
            } else if (category === 'presentation') {
                button.className = 'category-filter active px-3 py-1.5 rounded text-xs font-semibold transition-colors border border-green-600 bg-green-600 text-white hover:bg-green-700';
            } else if (category === 'conference') {
                button.className = 'category-filter active px-3 py-1.5 rounded text-xs font-semibold transition-colors border border-purple-600 bg-purple-600 text-white hover:bg-purple-700';
            } else if (category === 'workshop') {
                button.className = 'category-filter active px-3 py-1.5 rounded text-xs font-semibold transition-colors border border-orange-600 bg-orange-600 text-white hover:bg-orange-700';
            } else if (category === 'seminar') {
                button.className = 'category-filter active px-3 py-1.5 rounded text-xs font-semibold transition-colors border border-teal-600 bg-teal-600 text-white hover:bg-teal-700';
            } else if (category === 'meeting') {
                button.className = 'category-filter active px-3 py-1.5 rounded text-xs font-semibold transition-colors border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700';
            } else if (category === 'others') {
                button.className = 'category-filter active px-3 py-1.5 rounded text-xs font-semibold transition-colors border border-slate-600 bg-slate-600 text-white hover:bg-slate-700';
            }

            // Update active category and filter events
            activeCategory = category;
            updateCalendarEvents();
        });
    });
}

// Render recent events list (left section)
function renderRecentEvents() {
    const recentList = document.getElementById('recent-events-list');
    if (!recentList) return;

    // Combine press and events, sort by date (newest first)
    const allItems = [];

    // Add press articles
    pressData.forEach(article => {
        if (article.date) {
            allItems.push({
                date: article.date,
                title: article.title,
                type: 'press',
                id: article.id,
                category: article.category || 'Press'
            });
        }
    });

    // Add events
    eventsData.forEach(event => {
        if (event.start) {
            allItems.push({
                date: event.start,
                title: event.title,
                type: 'event',
                id: event.id,
                category: event.category || 'Event'
            });
        }
    });

    // Sort by date (newest first) and take top 5
    const sorted = allItems.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    recentList.innerHTML = '';

    if (sorted.length === 0) {
        recentList.innerHTML = '<p class="text-sm text-slate-500">No recent events</p>';
        return;
    }

    sorted.forEach(item => {
        const date = new Date(item.date);
        const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const day = date.getDate();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        const itemEl = document.createElement('div');
        itemEl.className = 'flex items-start gap-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded px-2 -mx-2 transition-colors cursor-pointer';

        // Determine category color
        let categoryColor = 'bg-slate-500';
        if (item.type === 'press') {
            categoryColor = 'bg-blue-900';
        } else if (item.category === 'presentation') {
            categoryColor = 'bg-green-600';
        } else if (item.category === 'conference') {
            categoryColor = 'bg-purple-600';
        } else if (item.category === 'workshop') {
            categoryColor = 'bg-orange-600';
        } else if (item.category === 'seminar') {
            categoryColor = 'bg-teal-600';
        } else if (item.category === 'meeting') {
            categoryColor = 'bg-indigo-600';
        }

        itemEl.innerHTML = `
                    <div class="flex flex-col items-center min-w-[50px]">
                        <span class="text-xs font-bold text-slate-600">${month}</span>
                        <span class="text-lg font-bold text-slate-900">${day}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-1.5 h-1.5 rounded-full ${categoryColor}"></span>
                            <span class="text-xs font-medium text-slate-500">${item.type} - ${item.category}</span>
                        </div>
                        <div class="text-sm font-medium text-slate-900 truncate">${item.title}</div>
                    </div>
                `;

        // Add click handler
        itemEl.addEventListener('click', () => {
            if (item.type === 'press') {
                window.location.href = `press-detail.html?id=${item.id}`;
            } else if (item.type === 'event') {
                window.location.href = `events-detail.html?id=${item.id}`;
            } else {
                // Scroll to calendar or show event details
                document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' });
            }
        });

        recentList.appendChild(itemEl);
    });
}

// ------------------------------------------------------------
// Render detailed monthly summary (right section)
// ------------------------------------------------------------
function renderMonthlySummary() {
    const summaryContainer = document.getElementById('monthly-summary');
    if (!summaryContainer) return;

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all events and press with full details
    const allItems = [];

    // Add press articles
    pressData.forEach(article => {
        if (article.date) {
            const articleDate = new Date(article.date);
            allItems.push({
                date: article.date,
                dateObj: articleDate,
                title: article.title,
                type: 'press',
                category: 'Press',
                id: article.id
            });
        }
    });

    // Add events
    eventsData.forEach(event => {
        if (event.start) {
            const eventDate = new Date(event.start);
            allItems.push({
                date: event.start,
                dateObj: eventDate,
                title: event.title,
                type: 'event',
                category: event.category || 'Event',
                id: event.id,
                place: event.place
            });
        }
    });

    // Group by month with full details
    const monthlyData = {};
    allItems.forEach(item => {
        const date = item.dateObj;
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                monthKey: monthKey,
                items: [],
                count: 0,
                categories: {}
            };
        }
        monthlyData[monthKey].items.push(item);
        monthlyData[monthKey].count++;
        const cat = item.category || 'Other';
        monthlyData[monthKey].categories[cat] = (monthlyData[monthKey].categories[cat] || 0) + 1;
    });

    // Get current month key
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

    // Find months with events, sorted by date (newest first)
    const monthsWithEvents = Object.entries(monthlyData)
        .filter(([key, data]) => data.count > 0)
        .sort((a, b) => b[0].localeCompare(a[0]));

    // Get: current month (if has events) + 2 most recent months with events
    const monthsToShow = [];

    // Always include current month if it has events
    const currentMonthData = monthlyData[currentMonthKey];
    if (currentMonthData && currentMonthData.count > 0) {
        monthsToShow.push([currentMonthKey, currentMonthData]);
    }

    // Add up to 2 most recent months with events (excluding current if already added)
    let addedCount = 0;
    for (const [key, data] of monthsWithEvents) {
        if (key !== currentMonthKey && addedCount < 2) {
            monthsToShow.push([key, data]);
            addedCount++;
        }
    }

    // Sort by date (newest first)
    monthsToShow.sort((a, b) => b[0].localeCompare(a[0]));

    summaryContainer.innerHTML = '';

    if (monthsToShow.length === 0) {
        summaryContainer.innerHTML = '<p class="text-sm text-slate-500">No events in recent months</p>';
        return;
    }

    monthsToShow.forEach(([key, data]) => {
        const monthEl = document.createElement('div');
        monthEl.className = 'pb-4 border-b border-slate-200 last:border-0 last:pb-0 mb-4 last:mb-0';

        // Sort items within month by date (newest first)
        const sortedItems = [...data.items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

        // Category breakdown
        const categoryList = Object.entries(data.categories)
            .map(([cat, count]) => {
                const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
                return `<span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 mr-1 mb-1">${catLabel}: ${count}</span>`;
            })
            .join('');

        // Event list
        const eventList = sortedItems.map(item => {
            const date = item.dateObj;
            const day = date.getDate();
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            // Category color
            let categoryColor = 'bg-slate-500';
            if (item.type === 'press') {
                categoryColor = 'bg-blue-900';
            } else if (item.category === 'presentation') {
                categoryColor = 'bg-green-600';
            } else if (item.category === 'conference') {
                categoryColor = 'bg-purple-600';
            } else if (item.category === 'workshop') {
                categoryColor = 'bg-orange-600';
            } else if (item.category === 'seminar') {
                categoryColor = 'bg-teal-600';
            } else if (item.category === 'meeting') {
                categoryColor = 'bg-indigo-600';
            }

            const clickHandler = item.type === 'press'
                ? `window.location.href='press-detail.html?id=${item.id}'`
                : item.type === 'event'
                    ? `window.location.href='events-detail.html?id=${item.id}'`
                    : `document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' })`;

            return `
                        <div onclick="${clickHandler}" class="flex items-start gap-2 py-1.5 hover:bg-slate-50 rounded px-1 -mx-1 transition-colors cursor-pointer group">
                            <div class="flex items-center gap-2 min-w-[60px]">
                                <span class="text-xs font-bold text-slate-600">${day}</span>
                                <span class="text-xs text-slate-400">${dayName}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-1.5 mb-0.5">
                                    <span class="w-1.5 h-1.5 rounded-full ${categoryColor}"></span>
                                    <span class="text-xs font-medium text-slate-500">${item.category}</span>
                                </div>
                                <div class="text-xs font-medium text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">${item.title}</div>
                                ${item.place ? `<div class="text-xs text-slate-400 mt-0.5 line-clamp-1">${item.place}</div>` : ''}
                            </div>
                        </div>
                    `;
        }).join('');

        const isCurrentMonth = key === currentMonthKey;

        monthEl.innerHTML = `
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-sm font-bold text-slate-900">${data.month}${isCurrentMonth ? ' <span class="text-xs font-normal text-blue-600">(Current)</span>' : ''}</h4>
                        <span class="text-sm font-bold text-blue-600">${data.count} ${data.count === 1 ? 'event' : 'events'}</span>
                    </div>
                    <div class="mb-3 flex flex-wrap gap-1">
                        ${categoryList || '<span class="text-xs text-slate-400">No categories</span>'}
                    </div>
                    <div class="space-y-1 max-h-64 overflow-y-auto">
                        ${eventList || '<p class="text-xs text-slate-400">No events</p>'}
                        ${data.count > 5 ? `<p class="text-xs text-slate-400 pt-1">+ ${data.count - 5} more events</p>` : ''}
                    </div>
                `;

        summaryContainer.appendChild(monthEl);
    });
}
