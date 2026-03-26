// ========== DOM Helpers ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ========== Utility Functions ==========
function toLocalDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getTodayStr() {
  return toLocalDateStr(new Date());
}

function getTodayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ========== US Holidays ==========
function getUSHolidays(year) {
  const holidays = [];
  holidays.push({ date: `${year}-01-01`, name: "New Year's Day" });
  holidays.push({ date: `${year}-06-19`, name: 'Juneteenth' });
  holidays.push({ date: `${year}-07-04`, name: 'Independence Day' });
  holidays.push({ date: `${year}-11-11`, name: "Veterans Day" });
  holidays.push({ date: `${year}-12-25`, name: 'Christmas Day' });
  holidays.push({ date: getNthWeekday(year, 0, 1, 3), name: 'MLK Day' });
  holidays.push({ date: getNthWeekday(year, 1, 1, 3), name: "Presidents' Day" });
  holidays.push({ date: getLastWeekday(year, 4, 1), name: 'Memorial Day' });
  holidays.push({ date: getNthWeekday(year, 8, 1, 1), name: 'Labor Day' });
  holidays.push({ date: getNthWeekday(year, 9, 1, 2), name: 'Columbus Day' });
  holidays.push({ date: getNthWeekday(year, 10, 4, 4), name: 'Thanksgiving' });
  return holidays;
}

function getNthWeekday(year, month, weekday, n) {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === weekday) {
      count++;
      if (count === n) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function getLastWeekday(year, month, weekday) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = daysInMonth; d >= 1; d--) {
    const date = new Date(year, month, d);
    if (date.getDay() === weekday) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}
