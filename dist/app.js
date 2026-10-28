"use strict";

const els = {
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  fileStatus: document.querySelector("#fileStatus"),
  fileName: document.querySelector("#fileName"),
  fileMeta: document.querySelector("#fileMeta"),
  replaceFile: document.querySelector("#replaceFile"),
  errorMessage: document.querySelector("#errorMessage"),
  personPanel: document.querySelector("#personPanel"),
  personSearch: document.querySelector("#personSearch"),
  personList: document.querySelector("#personList"),
  personHint: document.querySelector("#personHint"),
  togglePeople: document.querySelector("#togglePeople"),
  results: document.querySelector("#results"),
  selectedName: document.querySelector("#selectedName"),
  dateCount: document.querySelector("#dateCount"),
  redCount: document.querySelector("#redCount"),
  orangeCount: document.querySelector("#orangeCount"),
  monthLabel: document.querySelector("#monthLabel"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  calendarGrid: document.querySelector("#calendarGrid"),
  dayTitle: document.querySelector("#dayTitle"),
  daySubtitle: document.querySelector("#daySubtitle"),
  dayDetails: document.querySelector("#dayDetails"),
  entryTime: document.querySelector("#entryTime"),
  exitTime: document.querySelector("#exitTime"),
  entryBadge: document.querySelector("#entryBadge"),
  exitBadge: document.querySelector("#exitBadge"),
  dayMessage: document.querySelector("#dayMessage"),
};

const state = {
  people: [],
  recordsByPerson: new Map(),
  selectedPerson: null,
  selectedDate: null,
  currentMonth: null,
  activeOption: -1,
  filteredPeople: [],
};

const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const collator = new Intl.Collator("es-MX", { sensitivity: "base" });

els.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadWorkbook(file);
});

els.replaceFile.addEventListener("click", () => {
  els.fileInput.value = "";
  els.fileInput.click();
});

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("is-dragging");
  });
});

els.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) loadWorkbook(file);
});

els.personSearch.addEventListener("focus", () => openPeopleList());
els.personSearch.addEventListener("input", () => {
  state.selectedPerson = null;
  filterPeople(els.personSearch.value);
  openPeopleList();
});

els.togglePeople.addEventListener("click", () => {
  if (els.personList.hidden) {
    els.personSearch.focus();
    filterPeople(els.personSearch.value);
    openPeopleList();
  } else {
    closePeopleList();
  }
});

els.personSearch.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (els.personList.hidden) openPeopleList();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    state.activeOption = Math.max(0, Math.min(state.filteredPeople.length - 1, state.activeOption + direction));
    renderPeopleList();
  } else if (event.key === "Enter" && !els.personList.hidden && state.filteredPeople.length) {
    event.preventDefault();
    selectPerson(state.filteredPeople[Math.max(0, state.activeOption)]);
  } else if (event.key === "Escape") {
    closePeopleList();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#combobox")) closePeopleList();
});

els.prevMonth.addEventListener("click", () => changeMonth(-1));
els.nextMonth.addEventListener("click", () => changeMonth(1));

async function loadWorkbook(file) {
  clearError();
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    showError("Selecciona un archivo de Excel con extensión .xlsx o .xls.");
    return;
  }
  if (typeof XLSX === "undefined") {
    showError("No se pudo iniciar el lector de Excel. Recarga la página e inténtalo de nuevo.");
    return;
  }

  els.dropZone.querySelector("strong").textContent = "Leyendo archivo…";
  try {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: true,
      cellStyles: true,
      cellText: true,
    });
    const records = extractRecords(workbook);
    if (!records.length) {
      throw new Error("No encontré filas con Nombre, Fecha, Entrada y Salida. Revisa los encabezados del archivo.");
    }
    hydrateData(records);
    showLoadedFile(file, records.length);
  } catch (error) {
    console.error(error);
    showError(error.message || "No pude leer este archivo. Verifica que sea un XLSX válido.");
  } finally {
    els.dropZone.querySelector("strong").textContent = "Arrastra tu archivo aquí";
  }
}

function extractRecords(workbook) {
  const allRecords = [];
  const required = ["nombre", "fecha", "entrada", "salida"];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) return;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const header = findHeaderRow(sheet, range, required);
    if (!header) return;

    let currentName = "";
    for (let row = header.row + 1; row <= range.e.r; row += 1) {
      const nameCell = getCell(sheet, row, header.columns.nombre);
      const dateCell = getCell(sheet, row, header.columns.fecha);
      const entryCell = getCell(sheet, row, header.columns.entrada);
      const exitCell = getCell(sheet, row, header.columns.salida);

      const nameText = cellText(nameCell);
      if (nameText) currentName = cleanSpaces(nameText);
      if (!currentName) continue;

      const date = parseSpreadsheetDate(dateCell);
      if (!date) continue;

      allRecords.push({
        nameKey: normalizeText(currentName),
        name: displayName(currentName),
        date,
        dateKey: toDateKey(date),
        entry: timeText(entryCell),
        exit: timeText(exitCell),
        entryAlert: classifyFill(entryCell) === "red",
        exitAlert: classifyFill(exitCell) === "orange",
        sheetName,
      });
    }
  });

  return allRecords;
}

function findHeaderRow(sheet, range, required) {
  const lastCandidateRow = Math.min(range.e.r, range.s.r + 30);
  const lastCandidateCol = Math.min(range.e.c, range.s.c + 40);
  for (let row = range.s.r; row <= lastCandidateRow; row += 1) {
    const columns = {};
    for (let col = range.s.c; col <= lastCandidateCol; col += 1) {
      const headerName = normalizeText(cellText(getCell(sheet, row, col)));
      if (required.includes(headerName) && columns[headerName] === undefined) columns[headerName] = col;
    }
    if (required.every((name) => columns[name] !== undefined)) return { row, columns };
  }
  return null;
}

function getCell(sheet, row, col) {
  return sheet[XLSX.utils.encode_cell({ r: row, c: col })];
}

function cellText(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return "";
  if (typeof cell.v === "string") return cell.v.trim();
  return String(cell.w ?? cell.v).trim();
}

function parseSpreadsheetDate(cell) {
  if (!cell || cell.v === null || cell.v === undefined || cell.v === "") return null;
  const value = cell.v;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const text = String(value).trim();
  let match = text.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (match) return safeDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = text.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
  if (match) return safeDate(Number(match[3]), Number(match[2]), Number(match[1]));
  const fallback = new Date(text);
  if (!Number.isNaN(fallback.valueOf())) return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  return null;
}

function safeDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function timeText(cell) {
  if (!cell || cell.v === null || cell.v === undefined || cell.v === "") return "Sin registro";
  if (cell.v instanceof Date && !Number.isNaN(cell.v.valueOf())) {
    return `${String(cell.v.getHours()).padStart(2, "0")}:${String(cell.v.getMinutes()).padStart(2, "0")}`;
  }
  if (typeof cell.v === "number" && cell.v >= 0 && cell.v < 1) {
    const minutes = Math.round(cell.v * 24 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  const text = String(cell.w ?? cell.v).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : text || "Sin registro";
}

function classifyFill(cell) {
  const style = cell?.s || {};
  const raw = style.fgColor?.rgb || style.fill?.fgColor?.rgb || style.patternFill?.fgColor?.rgb;
  if (!raw) return null;
  const hex = String(raw).replace("#", "").slice(-6).toUpperCase();
  if (hex === "FF6666") return "red";
  if (hex === "FFB347") return "orange";
  if (!/^[0-9A-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const { hue, saturation } = rgbToHsl(r, g, b);
  if (saturation > 0.35 && (hue <= 18 || hue >= 342)) return "red";
  if (saturation > 0.35 && hue > 18 && hue <= 55) return "orange";
  return null;
}

function rgbToHsl(r, g, b) {
  const values = [r / 255, g / 255, b / 255];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === values[0]) hue = 60 * (((values[1] - values[2]) / delta) % 6);
    else if (max === values[1]) hue = 60 * ((values[2] - values[0]) / delta + 2);
    else hue = 60 * ((values[0] - values[1]) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  return { hue, saturation, lightness };
}

function hydrateData(records) {
  state.recordsByPerson.clear();
  records.forEach((record) => {
    if (!state.recordsByPerson.has(record.nameKey)) {
      state.recordsByPerson.set(record.nameKey, { key: record.nameKey, name: record.name, records: [] });
    }
    state.recordsByPerson.get(record.nameKey).records.push(record);
  });
  state.people = [...state.recordsByPerson.values()].sort((a, b) => collator.compare(a.name, b.name));
  state.people.forEach((person) => person.records.sort((a, b) => a.date - b.date));
  state.filteredPeople = [...state.people];
  state.selectedPerson = null;
  state.selectedDate = null;
  state.currentMonth = null;
  state.activeOption = 0;

  els.personPanel.classList.remove("is-disabled");
  els.personPanel.removeAttribute("aria-disabled");
  els.personSearch.disabled = false;
  els.togglePeople.disabled = false;
  els.personSearch.value = "";
  els.personHint.textContent = `${state.people.length} ${state.people.length === 1 ? "persona disponible" : "personas disponibles"}.`;
  els.results.hidden = true;
  filterPeople("");
  setTimeout(() => els.personSearch.focus(), 0);
}

function showLoadedFile(file, recordCount) {
  els.fileName.textContent = file.name;
  els.fileMeta.textContent = `${formatBytes(file.size)} · ${recordCount} fechas leídas`;
  els.fileStatus.hidden = false;
  els.dropZone.hidden = true;
}

function filterPeople(query) {
  const normalizedQuery = normalizeText(query);
  state.filteredPeople = state.people.filter((person) => person.key.includes(normalizedQuery));
  state.activeOption = state.filteredPeople.length ? 0 : -1;
  renderPeopleList();
}

function renderPeopleList() {
  els.personList.replaceChildren();
  if (!state.filteredPeople.length) {
    const empty = document.createElement("div");
    empty.className = "empty-option";
    empty.textContent = "No encontré nombres con esa búsqueda.";
    els.personList.append(empty);
    return;
  }
  state.filteredPeople.forEach((person, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `person-option${index === state.activeOption ? " is-active" : ""}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(person.key === state.selectedPerson?.key));
    option.textContent = person.name;
    option.addEventListener("mouseenter", () => {
      state.activeOption = index;
      renderPeopleList();
    });
    option.addEventListener("click", () => selectPerson(person));
    els.personList.append(option);
  });
  els.personList.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
}

function openPeopleList() {
  if (els.personSearch.disabled) return;
  els.personList.hidden = false;
  els.personSearch.setAttribute("aria-expanded", "true");
}

function closePeopleList() {
  els.personList.hidden = true;
  els.personSearch.setAttribute("aria-expanded", "false");
}

function selectPerson(person) {
  if (!person) return;
  state.selectedPerson = person;
  els.personSearch.value = person.name;
  closePeopleList();
  const firstDate = person.records[0].date;
  state.currentMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const firstAlert = person.records.find((record) => record.entryAlert || record.exitAlert) || person.records[0];
  state.selectedDate = firstAlert.dateKey;
  renderResults();
  els.results.hidden = false;
  els.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderResults() {
  const person = state.selectedPerson;
  if (!person) return;
  els.selectedName.textContent = person.name;
  els.dateCount.textContent = person.records.length;
  els.redCount.textContent = person.records.filter((record) => record.entryAlert).length;
  els.orangeCount.textContent = person.records.filter((record) => record.exitAlert).length;
  renderCalendar();
  renderDayDetails(state.selectedDate);
}

function renderCalendar() {
  const person = state.selectedPerson;
  if (!person || !state.currentMonth) return;
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  els.monthLabel.textContent = capitalizeSentence(monthFormatter.format(state.currentMonth));

  const recordsByDate = groupRecordsByDate(person.records);
  const firstWeekdayMonday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekdayMonday + daysInMonth) / 7) * 7;
  els.calendarGrid.replaceChildren();

  for (let index = 0; index < totalCells; index += 1) {
    const day = index - firstWeekdayMonday + 1;
    if (day < 1 || day > daysInMonth) {
      const empty = document.createElement("span");
      empty.className = "day-cell is-outside";
      els.calendarGrid.append(empty);
      continue;
    }

    const date = new Date(year, month, day);
    const key = toDateKey(date);
    const dayRecords = recordsByDate.get(key) || [];
    const hasRed = dayRecords.some((record) => record.entryAlert);
    const hasOrange = dayRecords.some((record) => record.exitAlert);
    const cell = document.createElement(dayRecords.length ? "button" : "span");
    if (dayRecords.length) cell.type = "button";
    cell.className = [
      "day-cell",
      date.getDay() === 0 || date.getDay() === 6 ? "is-weekend" : "",
      dayRecords.length ? "has-record" : "",
      hasRed ? "has-red" : "",
      hasOrange ? "has-orange" : "",
      state.selectedDate === key ? "is-selected" : "",
    ].filter(Boolean).join(" ");
    cell.innerHTML = `<span class="day-number">${day}</span>${dayRecords.length ? '<span class="record-dot"></span>' : ""}`;
    if (dayRecords.length) {
      const alerts = [hasRed ? "entrada en rojo" : "", hasOrange ? "salida en naranja" : ""].filter(Boolean).join(" y ");
      cell.setAttribute("aria-label", `${fullDateFormatter.format(date)}${alerts ? `, ${alerts}` : ", con registro"}`);
      cell.addEventListener("click", () => {
        state.selectedDate = key;
        renderCalendar();
        renderDayDetails(key);
      });
    }
    els.calendarGrid.append(cell);
  }

  const months = availableMonths(person.records);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthIndex = months.indexOf(monthKey);
  els.prevMonth.disabled = monthIndex <= 0;
  els.nextMonth.disabled = monthIndex < 0 || monthIndex >= months.length - 1;
}

function renderDayDetails(dateKey) {
  const person = state.selectedPerson;
  if (!person || !dateKey) return;
  const records = person.records.filter((record) => record.dateKey === dateKey);
  if (!records.length) {
    els.dayDetails.hidden = true;
    els.dayTitle.textContent = "Selecciona una fecha";
    els.daySubtitle.textContent = "Haz clic en un día del calendario para ver sus registros.";
    return;
  }
  const primary = records[0];
  const date = primary.date;
  els.dayTitle.textContent = `${date.getDate()} de ${monthFormatter.format(new Date(date.getFullYear(), date.getMonth(), 1)).replace(/ de \d{4}$/, "")}`;
  els.daySubtitle.textContent = fullDateFormatter.format(date);
  els.dayDetails.hidden = false;
  els.entryTime.textContent = primary.entry;
  els.exitTime.textContent = primary.exit;
  els.entryBadge.hidden = !records.some((record) => record.entryAlert);
  els.exitBadge.hidden = !records.some((record) => record.exitAlert);
  const messages = [];
  if (!els.entryBadge.hidden) messages.push("La entrada está marcada en rojo en el archivo.");
  if (!els.exitBadge.hidden) messages.push("La salida está marcada en naranja en el archivo.");
  if (!messages.length) messages.push("Este día no tiene alertas de color.");
  if (records.length > 1) messages.push(`Hay ${records.length} registros para esta fecha; se muestra el primero.`);
  els.dayMessage.textContent = messages.join(" ");
}

function changeMonth(direction) {
  const months = availableMonths(state.selectedPerson.records);
  const currentKey = `${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const currentIndex = months.indexOf(currentKey);
  const nextKey = months[currentIndex + direction];
  if (!nextKey) return;
  const [year, month] = nextKey.split("-").map(Number);
  state.currentMonth = new Date(year, month - 1, 1);
  const monthRecord = state.selectedPerson.records.find((record) => record.date.getFullYear() === year && record.date.getMonth() === month - 1);
  state.selectedDate = monthRecord?.dateKey || null;
  renderCalendar();
  renderDayDetails(state.selectedDate);
}

function groupRecordsByDate(records) {
  const grouped = new Map();
  records.forEach((record) => {
    if (!grouped.has(record.dateKey)) grouped.set(record.dateKey, []);
    grouped.get(record.dateKey).push(record);
  });
  return grouped;
}

function availableMonths(records) {
  return [...new Set(records.map((record) => record.dateKey.slice(0, 7)))].sort();
}

function normalizeText(value) {
  return cleanSpaces(String(value || ""))
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function displayName(value) {
  const lowercaseWords = new Set(["de", "del", "la", "las", "los", "y"]);
  return cleanSpaces(value).toLocaleLowerCase("es-MX").split(" ").map((word, index) => {
    if (index > 0 && lowercaseWords.has(word)) return word;
    return word.charAt(0).toLocaleUpperCase("es-MX") + word.slice(1);
  }).join(" ");
}

function cleanSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function capitalizeSentence(value) {
  return value ? value.charAt(0).toLocaleUpperCase("es-MX") + value.slice(1) : "";
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showError(message) {
  els.errorMessage.textContent = message;
  els.errorMessage.hidden = false;
}

function clearError() {
  els.errorMessage.textContent = "";
  els.errorMessage.hidden = true;
}
