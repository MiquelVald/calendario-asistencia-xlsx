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
  redLabel: document.querySelector("#redLabel"),
  orangeCount: document.querySelector("#orangeCount"),
  orangeLabel: document.querySelector("#orangeLabel"),
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
  selectionMode: document.querySelector("#selectionMode"),
  selectionSummary: document.querySelector("#selectionSummary"),
  justificationNotes: document.querySelector("#justificationNotes"),
  quickGenerateButton: document.querySelector("#quickGenerateButton"),
  quickGenerateNote: document.querySelector("#quickGenerateNote"),
  quickMessage: document.querySelector("#quickMessage"),
  templateInput: document.querySelector("#templateInput"),
  templateButton: document.querySelector("#templateButton"),
  employeeResolver: document.querySelector("#employeeResolver"),
  employeeSelect: document.querySelector("#employeeSelect"),
};

const state = {
  people: [],
  recordsByPerson: new Map(),
  selectedPerson: null,
  selectedDate: null,
  currentMonth: null,
  activeOption: -1,
  filteredPeople: [],
  templateBytes: null,
  templateFileName: "",
  employees: [],
  selectedEmployee: null,
  incidents: [],
  selectedIncidentKeys: new Set(),
  selectionMode: false,
};

const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const collator = new Intl.Collator("es-MX", { sensitivity: "base" });
const templateStorage = {
  database: "calendario-asistencia-local",
  version: 1,
  store: "archivos",
  key: "formato-justificaciones",
};

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

els.personList.addEventListener("mousedown", (event) => {
  const option = event.target.closest?.(".person-option");
  if (!option) return;
  event.preventDefault();
  selectPerson(state.filteredPeople[Number(option.dataset.index)]);
});

els.personList.addEventListener("click", (event) => {
  const option = event.target.closest?.(".person-option");
  if (!option) return;
  const person = state.filteredPeople[Number(option.dataset.index)];
  if (person && state.selectedPerson?.key !== person.key) selectPerson(person);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#combobox")) closePeopleList();
});

els.prevMonth.addEventListener("click", () => changeMonth(-1));
els.nextMonth.addEventListener("click", () => changeMonth(1));

els.templateButton.addEventListener("click", () => {
  els.templateInput.value = "";
  els.templateInput.click();
});

els.templateInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadTemplateWorkbook(file);
});

els.employeeSelect.addEventListener("change", () => {
  state.selectedEmployee = state.employees.find((employee) => String(employee.code) === els.employeeSelect.value) || null;
  renderEmployeeMatch(Boolean(state.selectedEmployee));
  updateGeneratorAvailability();
});

els.selectionMode.addEventListener("change", () => {
  state.selectionMode = els.selectionMode.checked;
  setGeneratorMessage(state.selectionMode ? "Marca o desmarca los días directamente en el calendario." : "");
  renderCalendar();
});

els.quickGenerateButton.addEventListener("click", () => {
  if (!state.templateBytes) {
    setGeneratorMessage("Selecciona el formato base. Quedará guardado en este navegador para las próximas visitas.");
    els.templateInput.value = "";
    els.templateInput.click();
    return;
  }
  if (!state.selectedEmployee) {
    setGeneratorMessage("Confirma qué empleado corresponde a la persona seleccionada.", "error");
    els.employeeResolver.hidden = false;
    setTimeout(() => els.employeeSelect.focus(), 0);
    return;
  }
  generateJustificationFile();
});

restoreStoredTemplate();

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
        hasEntry: cellHasValue(entryCell),
        hasExit: cellHasValue(exitCell),
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

// Descansos obligatorios federales del artículo 74 de la LFT.
// Las jornadas electorales no se calculan aquí porque dependen de la elección federal o local aplicable.
function mexicoMandatoryHoliday(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const fixedHolidays = new Map([
    ["0-1", "Año Nuevo"],
    ["4-1", "Día del Trabajo"],
    ["8-16", "Día de la Independencia"],
    ["11-25", "Navidad"],
  ]);
  const fixedHoliday = fixedHolidays.get(`${month}-${day}`);
  if (fixedHoliday) return fixedHoliday;
  if (month === 1 && day === nthWeekdayOfMonth(year, month, 1, 1)) return "Día de la Constitución";
  if (month === 2 && day === nthWeekdayOfMonth(year, month, 1, 3)) return "Natalicio de Benito Juárez";
  if (month === 10 && day === nthWeekdayOfMonth(year, month, 1, 3)) return "Día de la Revolución";
  if (year >= 2024 && (year - 2024) % 6 === 0 && month === 9 && day === 1) {
    return "Transmisión del Poder Ejecutivo Federal";
  }
  return null;
}

function nthWeekdayOfMonth(year, month, weekday, occurrence) {
  const firstWeekday = new Date(year, month, 1).getDay();
  return 1 + ((weekday - firstWeekday + 7) % 7) + (occurrence - 1) * 7;
}

function nonWorkingDay(date) {
  const holiday = mexicoMandatoryHoliday(date);
  if (holiday) return { label: holiday, type: "holiday" };
  if (date.getDay() === 6) return { label: "Sábado", type: "weekend" };
  if (date.getDay() === 0) return { label: "Domingo", type: "weekend" };
  return null;
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

function cellHasValue(cell) {
  return Boolean(cell && cell.v !== null && cell.v !== undefined && String(cell.v).trim() !== "");
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
  state.incidents = [];
  state.selectedIncidentKeys = new Set();
  state.selectionMode = false;
  els.selectionMode.checked = false;
  els.justificationNotes.value = "";

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
    option.dataset.index = String(index);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(person.key === state.selectedPerson?.key));
    option.textContent = person.name;
    option.addEventListener("mouseenter", () => {
      state.activeOption = index;
      els.personList.querySelector(".is-active")?.classList.remove("is-active");
      option.classList.add("is-active");
    });
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
  const firstAlert = person.records.find((record) => !nonWorkingDay(record.date) && (record.entryAlert || record.exitAlert)) || person.records[0];
  state.selectedDate = firstAlert.dateKey;
  renderGenerator();
  renderResults();
  els.results.hidden = false;
  els.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderResults() {
  const person = state.selectedPerson;
  if (!person) return;
  const workingRecords = person.records.filter((record) => !nonWorkingDay(record.date));
  const lateCount = workingRecords.filter((record) => record.entryAlert).length;
  const earlyCount = workingRecords.filter((record) => record.exitAlert).length;
  els.selectedName.textContent = person.name;
  els.dateCount.textContent = person.records.length;
  els.redCount.textContent = lateCount;
  els.redLabel.textContent = lateCount === 1 ? "llegada tardía" : "llegadas tardías";
  els.orangeCount.textContent = earlyCount;
  els.orangeLabel.textContent = earlyCount === 1 ? "salida temprana" : "salidas tempranas";
  renderCalendar();
  renderDayDetails(state.selectedDate);
}

async function loadTemplateWorkbook(file) {
  setGeneratorMessage("");
  if (!/\.xlsx$/i.test(file.name)) {
    setGeneratorMessage("Selecciona el formato base con extensión .xlsx.", "error");
    return;
  }
  if (typeof XLSX === "undefined") {
    setGeneratorMessage("No se pudo iniciar el lector de Excel. Recarga la página.", "error");
    return;
  }

  els.templateButton.disabled = true;
  els.templateButton.textContent = "Leyendo formato…";
  const hadTemplate = Boolean(state.templateBytes);
  try {
    const bytes = await file.arrayBuffer();
    applyTemplateWorkbook(bytes, file.name);
    try {
      await saveStoredTemplate(bytes, file.name);
    } catch (storageError) {
      console.warn("El formato solo estará disponible durante esta sesión.", storageError);
    }
    setGeneratorMessage(state.selectedEmployee ? "Formato listo para generar." : "Selecciona el empleado correspondiente en la lista.");
  } catch (error) {
    console.error(error);
    if (!hadTemplate) {
      state.templateBytes = null;
      state.templateFileName = "";
      state.employees = [];
      state.selectedEmployee = null;
      renderEmployeeMatch(false);
    }
    setGeneratorMessage(error.message || "No pude leer el formato base.", "error");
  } finally {
    els.templateButton.disabled = false;
    els.templateButton.textContent = "Cambiar formato";
    els.templateButton.hidden = !state.templateBytes;
    updateGeneratorAvailability();
  }
}

function applyTemplateWorkbook(bytes, fileName) {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true, cellText: true });
  if (!workbook.Sheets.FORMATO || !workbook.Sheets.EMPLEADOS) {
    throw new Error("El archivo debe contener las hojas FORMATO y EMPLEADOS.");
  }
  const employees = extractEmployees(workbook.Sheets.EMPLEADOS);
  if (!employees.length) throw new Error("No encontré empleados en el formato base.");

  state.templateBytes = bytes.slice(0);
  state.templateFileName = fileName;
  state.employees = employees;
  state.selectedEmployee = findEmployeeForPerson(state.selectedPerson?.name);
  populateEmployeeSelect();
  renderEmployeeMatch(Boolean(state.selectedEmployee));
  els.templateButton.hidden = false;
  updateGeneratorAvailability();
  return employees;
}

async function restoreStoredTemplate() {
  if (typeof indexedDB === "undefined" || typeof XLSX === "undefined") return;
  try {
    const stored = await readStoredTemplate();
    if (!stored?.bytes) return;
    applyTemplateWorkbook(stored.bytes, stored.name || "Formato base guardado.xlsx");
    els.templateButton.textContent = "Cambiar formato";
    els.templateButton.hidden = false;
  } catch (error) {
    console.error("No se pudo restaurar el formato guardado.", error);
  }
}

function openTemplateDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(templateStorage.database, templateStorage.version);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(templateStorage.store)) {
        request.result.createObjectStore(templateStorage.store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se pudo abrir el almacenamiento local."));
  });
}

async function saveStoredTemplate(bytes, name) {
  if (typeof indexedDB === "undefined") return;
  const database = await openTemplateDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(templateStorage.store, "readwrite");
    transaction.objectStore(templateStorage.store).put({ name, bytes: bytes.slice(0), savedAt: Date.now() }, templateStorage.key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("No se pudo guardar el formato base."));
    transaction.onabort = () => reject(transaction.error || new Error("Se canceló el guardado del formato base."));
  });
  database.close();
  navigator.storage?.persist?.().catch(() => false);
}

async function readStoredTemplate() {
  const database = await openTemplateDatabase();
  const value = await new Promise((resolve, reject) => {
    const transaction = database.transaction(templateStorage.store, "readonly");
    const request = transaction.objectStore(templateStorage.store).get(templateStorage.key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("No se pudo leer el formato guardado."));
  });
  database.close();
  return value;
}

function extractEmployees(sheet) {
  if (!sheet?.["!ref"]) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const employees = [];
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const code = cellText(getCell(sheet, row, 0));
    const name = cellText(getCell(sheet, row, 1));
    if (!code || !name) continue;
    employees.push({
      code,
      name: cleanSpaces(name),
      position: cleanSpaces(cellText(getCell(sheet, row, 2))),
      unit: cleanSpaces(cellText(getCell(sheet, row, 3))),
      manager: cleanSpaces(cellText(getCell(sheet, row, 4))),
      departmentHead: cleanSpaces(cellText(getCell(sheet, row, 5))),
      subdirector: cleanSpaces(cellText(getCell(sheet, row, 6))),
      director: cleanSpaces(cellText(getCell(sheet, row, 7))),
      matchKey: personMatchKey(name),
    });
  }
  return employees.sort((a, b) => collator.compare(a.name, b.name));
}

function personMatchKey(value) {
  let text = normalizeText(value).replace(/[^a-z0-9]+/g, " ");
  text = cleanSpaces(text).replace(/^c p\s+/, "cp ").replace(/^m i c\s+/, "mic ");
  const prefixes = new Set(["arq", "arqta", "c", "cp", "cpc", "dr", "dra", "ing", "isc", "lae", "lcp", "lic", "mdu", "mic", "ms", "mti", "mtra", "mtro"]);
  const tokens = text.split(" ").filter(Boolean);
  while (tokens.length && prefixes.has(tokens[0])) tokens.shift();
  return tokens.sort().join(" ");
}

function findEmployeeForPerson(name) {
  if (!name || !state.employees.length) return null;
  const key = personMatchKey(name);
  return state.employees.find((employee) => employee.matchKey === key) || null;
}

function populateEmployeeSelect() {
  els.employeeSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecciona una persona";
  els.employeeSelect.append(placeholder);
  state.employees.forEach((employee) => {
    const option = document.createElement("option");
    option.value = String(employee.code);
    option.textContent = `${employee.code} · ${employee.name}`;
    els.employeeSelect.append(option);
  });
  els.employeeSelect.value = state.selectedEmployee ? String(state.selectedEmployee.code) : "";
}

function renderGenerator() {
  if (!state.selectedPerson) return;
  state.incidents = justificationIncidents(state.selectedPerson.records);
  state.selectedIncidentKeys = new Set(state.incidents.slice(0, 10).map((incident) => incident.dateKey));
  state.selectionMode = false;
  els.selectionMode.checked = false;
  els.justificationNotes.value = "";
  if (state.employees.length) {
    state.selectedEmployee = findEmployeeForPerson(state.selectedPerson.name);
    populateEmployeeSelect();
    renderEmployeeMatch(Boolean(state.selectedEmployee));
  } else {
    renderEmployeeMatch(false);
  }
  setGeneratorMessage("");
  updateGeneratorAvailability();
}

function justificationIncidents(records) {
  const grouped = groupRecordsByDate(records);
  return [...grouped.entries()].map(([dateKey, dateRecords]) => {
    const hasNoCheck = dateRecords.every((record) => !record.hasEntry && !record.hasExit);
    return {
      dateKey,
      date: dateRecords[0].date,
      entry: dateRecords[0].entry,
      exit: dateRecords[0].exit,
      entryAlert: dateRecords.some((record) => record.entryAlert),
      exitAlert: dateRecords.some((record) => record.exitAlert),
      hasNoCheck,
    };
  }).filter((incident) => !nonWorkingDay(incident.date) && (incident.entryAlert || incident.exitAlert || incident.hasNoCheck)).sort((a, b) => a.date - b.date);
}

function renderEmployeeMatch(hasMatch) {
  if (!hasMatch || !state.selectedEmployee) {
    els.employeeResolver.hidden = !state.employees.length;
    if (state.employees.length) els.employeeSelect.value = "";
    return;
  }
  els.employeeResolver.hidden = true;
  els.employeeSelect.value = String(state.selectedEmployee.code);
}

function selectedIncidents() {
  return state.incidents.filter((incident) => state.selectedIncidentKeys.has(incident.dateKey));
}

function updateGeneratorAvailability() {
  const count = selectedIncidents().length;
  els.selectionSummary.textContent = `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`;
  els.quickGenerateButton.disabled = Boolean(state.templateBytes && state.selectedEmployee && (count < 1 || count > 10));
  if (!state.templateBytes) {
    els.quickGenerateButton.textContent = "Configurar formato";
    els.quickGenerateNote.textContent = "Carga el formato base una sola vez en este navegador.";
  } else if (!state.selectedEmployee) {
    els.quickGenerateButton.textContent = "Revisar empleado";
    els.quickGenerateNote.textContent = "El formato está guardado; falta confirmar la persona del directorio.";
  } else if (!count) {
    els.quickGenerateButton.textContent = "Sin días seleccionados";
    els.quickGenerateNote.textContent = "Activa las casillas del calendario y elige al menos un día.";
  } else {
    els.quickGenerateButton.textContent = "Generar Excel";
    els.quickGenerateNote.textContent = `${count} ${count === 1 ? "día se incluirá" : "días se incluirán"} en el formato.`;
  }
}

function setGeneratorMessage(message, type = "") {
  els.quickMessage.textContent = message;
  els.quickMessage.className = `quick-message${type ? ` is-${type}` : ""}`;
}

async function generateJustificationFile() {
  const incidents = selectedIncidents();
  if (!state.templateBytes || !state.selectedEmployee || !incidents.length) {
    setGeneratorMessage("Carga el formato, confirma el empleado y selecciona al menos una incidencia.", "error");
    return;
  }
  if (typeof JSZip === "undefined") {
    setGeneratorMessage("No se pudo iniciar el generador de archivos. Recarga la página.", "error");
    return;
  }

  els.quickGenerateButton.disabled = true;
  els.quickGenerateButton.textContent = "Generando…";
  setGeneratorMessage("Preparando la copia del formato…");
  try {
    const zip = await JSZip.loadAsync(state.templateBytes);
    const sheetPath = await worksheetPath(zip, "FORMATO");
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) throw new Error("No encontré la hoja FORMATO dentro del archivo.");
    const sheetDocument = parseXml(await sheetFile.async("string"), "la hoja FORMATO");
    fillJustificationSheet(sheetDocument, state.selectedEmployee, incidents, els.justificationNotes.value);
    zip.file(sheetPath, new XMLSerializer().serializeToString(sheetDocument));
    await enableFullCalculation(zip);

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const reportDate = latestDate(state.selectedPerson.records);
    const month = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`;
    const fileName = `Justificacion_${safeFileName(state.selectedPerson.name)}_${month}.xlsx`;
    downloadBlob(blob, fileName);
    setGeneratorMessage(`Archivo generado: ${fileName}`, "success");
  } catch (error) {
    console.error(error);
    setGeneratorMessage(error.message || "No pude generar el formato.", "error");
  } finally {
    updateGeneratorAvailability();
  }
}

function fillJustificationSheet(document, employee, incidents, comments) {
  const reportDate = latestDate(state.selectedPerson.records);
  setNumericCell(document, "A6", Number(employee.code));
  setNumericCell(document, "H2", excelDateSerial(reportDate));
  setFormulaCache(document, "B6", employee.name);
  setFormulaCache(document, "G6", employee.position);
  setFormulaCache(document, "H6", employee.unit);
  setFormulaCache(document, "A54", employee.name);
  setFormulaCache(document, "C54", employee.manager);
  setFormulaCache(document, "G54", employee.departmentHead);
  setFormulaCache(document, "A58", employee.subdirector);

  const rows = [22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
  rows.forEach((row) => ["C", "D", "E", "F"].forEach((column) => clearCell(document, `${column}${row}`)));
  incidents.slice(0, 10).forEach((incident, index) => {
    const row = rows[index];
    const entryTime = timeFraction(incident.entry);
    const exitTime = timeFraction(incident.exit);
    if (incident.hasNoCheck) {
      setNumericCell(document, `C${row}`, excelDateSerial(incident.date));
      setNumericCell(document, `E${row}`, excelDateSerial(incident.date));
    }
    if (entryTime !== null) {
      setNumericCell(document, `C${row}`, excelDateSerial(incident.date));
      setNumericCell(document, `D${row}`, entryTime);
    }
    if (exitTime !== null) {
      setNumericCell(document, `E${row}`, excelDateSerial(incident.date));
      setNumericCell(document, `F${row}`, exitTime);
    }
  });
  setInlineTextCell(document, "A49", normalizeNotes(comments));
}

function normalizeNotes(value) {
  return String(value || "").replace(/\r\n?/g, "\n").split("\n").map(cleanSpaces).join("\n").trim();
}

async function worksheetPath(zip, sheetName) {
  const workbookDocument = parseXml(await zip.file("xl/workbook.xml").async("string"), "el libro de Excel");
  const relationshipsDocument = parseXml(await zip.file("xl/_rels/workbook.xml.rels").async("string"), "las relaciones del libro");
  const sheet = [...workbookDocument.getElementsByTagNameNS("*", "sheet")].find((item) => item.getAttribute("name") === sheetName);
  if (!sheet) throw new Error(`No encontré la hoja ${sheetName}.`);
  const relationshipId = sheet.getAttribute("r:id") || sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  const relationship = [...relationshipsDocument.getElementsByTagNameNS("*", "Relationship")].find((item) => item.getAttribute("Id") === relationshipId);
  if (!relationship) throw new Error(`No pude localizar el archivo interno de ${sheetName}.`);
  return resolveZipPath("xl/workbook.xml", relationship.getAttribute("Target"));
}

function resolveZipPath(basePath, targetPath) {
  if (targetPath.startsWith("/")) return targetPath.slice(1);
  const parts = basePath.split("/");
  parts.pop();
  targetPath.split("/").forEach((part) => {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  });
  return parts.join("/");
}

function parseXml(source, label) {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error(`No pude interpretar ${label}.`);
  return document;
}

function findCellElement(document, reference) {
  return [...document.getElementsByTagNameNS("*", "c")].find((cell) => cell.getAttribute("r") === reference) || null;
}

function cellValueElement(document, cell) {
  let value = [...cell.children].find((child) => child.localName === "v");
  if (!value) {
    value = document.createElementNS(document.documentElement.namespaceURI, "v");
    cell.append(value);
  }
  return value;
}

function removeCellChildren(cell, localNames) {
  [...cell.children].forEach((child) => {
    if (localNames.includes(child.localName)) child.remove();
  });
}

function setNumericCell(document, reference, value) {
  const cell = findCellElement(document, reference);
  if (!cell) throw new Error(`El formato no contiene la celda ${reference}.`);
  cell.removeAttribute("t");
  removeCellChildren(cell, ["f", "is"]);
  cellValueElement(document, cell).textContent = String(value);
}

function setFormulaCache(document, reference, value) {
  const cell = findCellElement(document, reference);
  if (!cell) throw new Error(`El formato no contiene la celda ${reference}.`);
  cell.setAttribute("t", "str");
  removeCellChildren(cell, ["is"]);
  cellValueElement(document, cell).textContent = value || "";
}

function setInlineTextCell(document, reference, value) {
  const cell = findCellElement(document, reference);
  if (!cell) throw new Error(`El formato no contiene la celda ${reference}.`);
  cell.setAttribute("t", "inlineStr");
  removeCellChildren(cell, ["f", "v", "is"]);
  const inlineString = document.createElementNS(document.documentElement.namespaceURI, "is");
  const text = document.createElementNS(document.documentElement.namespaceURI, "t");
  if (/^\s|\s$/.test(value)) text.setAttribute("xml:space", "preserve");
  text.textContent = value;
  inlineString.append(text);
  cell.append(inlineString);
}

function clearCell(document, reference) {
  const cell = findCellElement(document, reference);
  if (!cell) throw new Error(`El formato no contiene la celda ${reference}.`);
  cell.removeAttribute("t");
  removeCellChildren(cell, ["f", "v", "is"]);
}

async function enableFullCalculation(zip) {
  const path = "xl/workbook.xml";
  const document = parseXml(await zip.file(path).async("string"), "el libro de Excel");
  let calculation = [...document.documentElement.children].find((child) => child.localName === "calcPr");
  if (!calculation) {
    calculation = document.createElementNS(document.documentElement.namespaceURI, "calcPr");
    document.documentElement.append(calculation);
  }
  calculation.setAttribute("calcMode", "auto");
  calculation.setAttribute("fullCalcOnLoad", "1");
  calculation.setAttribute("forceFullCalc", "1");
  zip.file(path, new XMLSerializer().serializeToString(document));
}

function excelDateSerial(date) {
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
}

function timeFraction(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2])) / 1440;
}

function latestDate(records) {
  return records.reduce((latest, record) => record.date > latest ? record.date : latest, records[0].date);
}

function safeFileName(value) {
  return cleanSpaces(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  els.calendarGrid.classList.toggle("is-selecting", state.selectionMode);
  const incidentsByDate = new Map(state.incidents.map((incident) => [incident.dateKey, incident]));

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
    const nonWorking = nonWorkingDay(date);
    const hasRed = !nonWorking && dayRecords.some((record) => record.entryAlert);
    const hasOrange = !nonWorking && dayRecords.some((record) => record.exitAlert);
    const hasNoCheck = !nonWorking && dayRecords.length > 0 && dayRecords.every((record) => !record.hasEntry && !record.hasExit);
    const justificationIncident = incidentsByDate.get(key);
    const isJustificationSelected = state.selectedIncidentKeys.has(key);
    const cell = document.createElement(dayRecords.length ? "button" : "span");
    if (dayRecords.length) cell.type = "button";
    cell.className = [
      "day-cell",
      date.getDay() === 0 || date.getDay() === 6 ? "is-weekend" : "",
      dayRecords.length ? "has-record" : "",
      hasRed ? "has-red" : "",
      hasOrange ? "has-orange" : "",
      hasNoCheck ? "has-no-check" : "",
      nonWorking ? "is-non-working" : "",
      justificationIncident ? "is-justification-candidate" : "",
      isJustificationSelected ? "is-justification-selected" : "",
      state.selectedDate === key ? "is-selected" : "",
    ].filter(Boolean).join(" ");
    cell.innerHTML = `<span class="day-number">${day}</span>${justificationIncident ? '<span class="calendar-checkbox" aria-hidden="true"></span>' : ""}${dayRecords.length ? '<span class="record-dot"></span>' : ""}`;
    if (dayRecords.length) {
      const alerts = [
        hasRed ? "llegada tardía" : "",
        hasOrange ? "salida temprana" : "",
        hasNoCheck ? "sin entrada ni salida" : "",
        nonWorking ? `día no laborable: ${nonWorking.label}` : "",
      ].filter(Boolean).join(" y ");
      const selectionLabel = justificationIncident ? `, ${isJustificationSelected ? "seleccionado" : "no seleccionado"} para justificar` : "";
      cell.setAttribute("aria-label", `${fullDateFormatter.format(date)}${alerts ? `, ${alerts}` : ", con registro"}${selectionLabel}`);
      if (justificationIncident) cell.setAttribute("aria-pressed", String(isJustificationSelected));
      cell.addEventListener("click", () => {
        state.selectedDate = key;
        if (state.selectionMode && justificationIncident) {
          if (state.selectedIncidentKeys.has(key)) {
            state.selectedIncidentKeys.delete(key);
            setGeneratorMessage("");
          } else if (state.selectedIncidentKeys.size >= 10) {
            setGeneratorMessage("El formato admite como máximo 10 días por archivo.", "error");
          } else {
            state.selectedIncidentKeys.add(key);
            setGeneratorMessage("");
          }
          updateGeneratorAvailability();
        }
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
  const nonWorking = nonWorkingDay(date);
  els.entryBadge.hidden = Boolean(nonWorking) || !records.some((record) => record.entryAlert);
  els.exitBadge.hidden = Boolean(nonWorking) || !records.some((record) => record.exitAlert);
  const hasNoCheck = !nonWorking && records.every((record) => !record.hasEntry && !record.hasExit);
  const messages = [];
  if (nonWorking) messages.push(`Día no laborable: ${nonWorking.label}.`);
  else {
    if (!els.entryBadge.hidden) messages.push("Este día registra una llegada tardía.");
    if (!els.exitBadge.hidden) messages.push("Este día registra una salida temprana.");
    if (hasNoCheck) messages.push("No se registró entrada ni salida este día.");
  }
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
