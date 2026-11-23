"use strict";

const els = {
  workflowButtons: [...document.querySelectorAll("[data-workflow]")],
  vacationFlow: document.querySelector("#vacationFlow"),
  incidentFlow: document.querySelector("#incidentFlow"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  fileStatus: document.querySelector("#fileStatus"),
  fileName: document.querySelector("#fileName"),
  fileMeta: document.querySelector("#fileMeta"),
  replaceFile: document.querySelector("#replaceFile"),
  serverReportPicker: document.querySelector("#serverReportPicker"),
  reportMonthSelect: document.querySelector("#reportMonthSelect"),
  reportMonthMeta: document.querySelector("#reportMonthMeta"),
  manualUploadButton: document.querySelector("#manualUploadButton"),
  reportStepTitle: document.querySelector("#reportStepTitle"),
  reportStepCopy: document.querySelector("#reportStepCopy"),
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
  selectionBar: document.querySelector("#selectionBar"),
  selectionSummary: document.querySelector("#selectionSummary"),
  justificationNotes: document.querySelector("#justificationNotes"),
  quickGenerateButton: document.querySelector("#quickGenerateButton"),
  quickGenerateNote: document.querySelector("#quickGenerateNote"),
  quickGenerateMeta: document.querySelector("#quickGenerateMeta"),
  quickMessage: document.querySelector("#quickMessage"),
  templateInput: document.querySelector("#templateInput"),
  templateButton: document.querySelector("#templateButton"),
  employeeResolver: document.querySelector("#employeeResolver"),
  employeeSelect: document.querySelector("#employeeSelect"),
  vacationReportStatus: document.querySelector("#vacationReportStatus"),
  vacationEmployeeSelect: document.querySelector("#vacationEmployeeSelect"),
  vacationEmployeeHint: document.querySelector("#vacationEmployeeHint"),
  vacationReportInput: document.querySelector("#vacationReportInput"),
  vacationReportButton: document.querySelector("#vacationReportButton"),
  vacationBalance: document.querySelector("#vacationBalance"),
  vacationPeriod2025: document.querySelector("#vacationPeriod2025"),
  vacationPeriod2026: document.querySelector("#vacationPeriod2026"),
  vacationAvailable2025: document.querySelector("#vacationAvailable2025"),
  vacationExpiration2025: document.querySelector("#vacationExpiration2025"),
  vacationAvailable2026: document.querySelector("#vacationAvailable2026"),
  vacationExpiration2026: document.querySelector("#vacationExpiration2026"),
  vacationBalanceTotal: document.querySelector("#vacationBalanceTotal"),
  vacationTotalAvailable: document.querySelector("#vacationTotalAvailable"),
  vacationBalanceNote: document.querySelector("#vacationBalanceNote"),
  vacationStart: document.querySelector("#vacationStart"),
  vacationEnd: document.querySelector("#vacationEnd"),
  vacationRange2: document.querySelector("#vacationRange2"),
  vacationStart2: document.querySelector("#vacationStart2"),
  vacationEnd2: document.querySelector("#vacationEnd2"),
  vacationAddRangeButton: document.querySelector("#vacationAddRangeButton"),
  vacationRemoveRangeButton: document.querySelector("#vacationRemoveRangeButton"),
  vacationDayCount: document.querySelector("#vacationDayCount"),
  vacationReturnLabel: document.querySelector("#vacationReturnLabel"),
  vacationReturnDate: document.querySelector("#vacationReturnDate"),
  vacationNotes: document.querySelector("#vacationNotes"),
  vacationMessage: document.querySelector("#vacationMessage"),
  vacationGenerateButton: document.querySelector("#vacationGenerateButton"),
  vacationGenerateNote: document.querySelector("#vacationGenerateNote"),
  vacationTemplateButton: document.querySelector("#vacationTemplateButton"),
};

const state = {
  workflow: "vacations",
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
  serverReports: [],
  vacationEmployees: [],
  selectedVacationEmployee: null,
  vacationReportFileName: "",
};

const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
const collator = new Intl.Collator("es-MX", { sensitivity: "base" });
const standardEntryLatestAllowedMinutes = 8 * 60 + 45;
const mondayToThursdayExitCutoffMinutes = 15 * 60 + 30;
const fridayExitCutoffMinutes = 14 * 60;
const specialAttendanceSchedules = new Map([
  ["Mayra Yarlet Trejo Cervantes", { entryLatestAllowedMinutes: 8 * 60 + 15, mondayToThursdayExitCutoffMinutes: 15 * 60 }],
  ["María Isabel Castañeda Perea", { entryLatestAllowedMinutes: 8 * 60 + 15, mondayToThursdayExitCutoffMinutes: 15 * 60 }],
].map(([name, schedule]) => [normalizeText(name), schedule]));
const templateStorage = {
  database: "calendario-asistencia-local",
  version: 1,
  store: "archivos",
  key: "formato-justificaciones",
};

els.workflowButtons.forEach((button) => {
  button.addEventListener("click", () => setWorkflow(button.dataset.workflow));
});

els.vacationEmployeeSelect.addEventListener("change", () => {
  state.selectedVacationEmployee = state.vacationEmployees.find((employee) => String(employee.code) === els.vacationEmployeeSelect.value) || null;
  els.vacationStart.value = "";
  els.vacationEnd.value = "";
  resetSecondVacationRange();
  els.vacationNotes.value = "";
  renderVacationRequest();
});

[els.vacationStart, els.vacationEnd, els.vacationStart2, els.vacationEnd2].forEach((input) => {
  input.addEventListener("change", () => {
    updateVacationDateLimits();
    renderVacationRequest();
  });
  input.addEventListener("input", () => {
    updateVacationDateLimits();
    renderVacationRequest();
  });
});

els.vacationAddRangeButton.addEventListener("click", () => {
  els.vacationRange2.hidden = false;
  els.vacationStart2.value = "";
  els.vacationEnd2.value = "";
  updateVacationDateLimits();
  renderVacationRequest();
  els.vacationStart2.focus();
});

els.vacationRemoveRangeButton.addEventListener("click", () => {
  resetSecondVacationRange();
  renderVacationRequest();
});

els.vacationReportButton.addEventListener("click", () => {
  els.vacationReportInput.value = "";
  els.vacationReportInput.click();
});

els.vacationReportInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadVacationWorkbook(file);
});

els.vacationTemplateButton.addEventListener("click", () => {
  els.templateInput.value = "";
  els.templateInput.click();
});

els.vacationGenerateButton.addEventListener("click", generateVacationFile);

els.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadWorkbook(file);
});

els.replaceFile.addEventListener("click", () => {
  if (state.serverReports.length) {
    els.fileStatus.hidden = true;
    els.reportMonthSelect.value = "";
    els.reportMonthMeta.textContent = "Se utilizará el archivo más reciente de la carpeta seleccionada.";
    els.serverReportPicker.hidden = false;
    return;
  }
  els.fileInput.value = "";
  els.fileInput.click();
});

els.reportMonthSelect.addEventListener("change", async () => {
  const report = state.serverReports.find((item) => item.id === els.reportMonthSelect.value);
  els.reportMonthMeta.textContent = report
    ? `Se utilizará ${report.fileName}.`
    : "Se utilizará el archivo más reciente de la carpeta seleccionada.";
  if (report) await loadServerReport(report.id);
});

els.manualUploadButton.addEventListener("click", () => {
  showManualUpload();
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

setWorkflow("vacations");
updateVacationDateLimits();
initializeTemplate();
initializeVacationReport();
initializeServerReports();

function setWorkflow(workflow) {
  if (!['vacations', 'incidents'].includes(workflow)) return;
  state.workflow = workflow;
  els.workflowButtons.forEach((button) => {
    const active = button.dataset.workflow === workflow;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.vacationFlow.hidden = workflow !== "vacations";
  els.incidentFlow.hidden = workflow !== "incidents";
  els.results.hidden = workflow !== "incidents" || !state.selectedPerson;
  if (workflow === "vacations") renderVacationRequest();
}

async function initializeVacationReport() {
  if (typeof XLSX === "undefined") {
    setVacationReportMessage("No se pudo iniciar el lector de Excel.", "error");
    showVacationReportUpload();
    return;
  }
  try {
    const response = await fetch("./api/vacations", { cache: "no-store" });
    if (!response.ok) {
      showVacationReportUpload();
      return;
    }
    const bytes = await response.arrayBuffer();
    const fileName = decodeURIComponent(response.headers.get("X-Vacations-Name") || "Reporte de vacaciones.xlsx");
    await loadVacationWorkbook(new File([bytes], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }));
  } catch (error) {
    console.info("No se encontró el reporte de vacaciones del servidor; se permitirá la carga manual.", error);
    showVacationReportUpload();
  }
}

function showVacationReportUpload() {
  state.vacationEmployees = [];
  state.selectedVacationEmployee = null;
  els.vacationEmployeeSelect.disabled = true;
  els.vacationReportButton.hidden = false;
  setVacationReportMessage("El servidor no tiene un reporte de vacaciones configurado.", "warning");
  els.vacationEmployeeHint.textContent = "Carga el reporte para consultar los saldos.";
  renderVacationRequest();
}

async function loadVacationWorkbook(file) {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    setVacationReportMessage("Selecciona un reporte de Excel con extensión .xlsx o .xls.", "error");
    return false;
  }
  setVacationReportMessage("Leyendo el reporte de vacaciones…");
  try {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array", cellDates: true, cellText: true });
    const employees = extractVacationEmployees(workbook);
    if (!employees.length) {
      throw new Error("No encontré empleados con saldos 2025 y 2026 en el reporte.");
    }
    state.vacationEmployees = employees;
    state.selectedVacationEmployee = null;
    state.vacationReportFileName = file.name;
    populateVacationEmployeeSelect();
    els.vacationEmployeeSelect.disabled = false;
    els.vacationReportButton.hidden = true;
    els.vacationEmployeeHint.textContent = `${employees.length} ${employees.length === 1 ? "persona disponible" : "personas disponibles"}.`;
    setVacationReportMessage(`${file.name} · ${employees.length} empleados`, "success");
    renderVacationRequest();
    return true;
  } catch (error) {
    console.error(error);
    state.vacationEmployees = [];
    state.selectedVacationEmployee = null;
    els.vacationEmployeeSelect.disabled = true;
    els.vacationReportButton.hidden = false;
    setVacationReportMessage(error.message || "No pude leer el reporte de vacaciones.", "error");
    renderVacationRequest();
    return false;
  }
}

function extractVacationEmployees(workbook) {
  const employees = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet?.["!ref"]) return;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    let headerRow = -1;
    for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 12); row += 1) {
      const first = normalizeText(cellText(getCell(sheet, row, 0)));
      const second = normalizeText(cellText(getCell(sheet, row, 1)));
      if (first.includes("empleado") && second === "nombre") {
        headerRow = row;
        break;
      }
    }
    if (headerRow < 0) return;
    for (let row = headerRow + 1; row <= range.e.r; row += 1) {
      const code = cellText(getCell(sheet, row, 0));
      const name = cleanSpaces(cellText(getCell(sheet, row, 1)));
      if (!code || !name) continue;
      employees.push({
        code,
        name,
        available2025: vacationDayValue(getCell(sheet, row, 3)),
        expiration2025: parseSpreadsheetDate(getCell(sheet, row, 4)),
        available2026: vacationDayValue(getCell(sheet, row, 5)),
        expiration2026: parseSpreadsheetDate(getCell(sheet, row, 6)),
      });
    }
  });
  return employees.sort((a, b) => collator.compare(a.name, b.name));
}

function vacationDayValue(cell) {
  if (!cell || cell.v === null || cell.v === undefined || cell.v === "") return 0;
  const value = typeof cell.v === "number" ? cell.v : Number(String(cell.v).replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function populateVacationEmployeeSelect() {
  els.vacationEmployeeSelect.replaceChildren(new Option("Selecciona una persona", ""));
  state.vacationEmployees.forEach((employee) => {
    els.vacationEmployeeSelect.add(new Option(`${employee.code} · ${displayName(employee.name)}`, String(employee.code)));
  });
}

function vacationBalances(employee = state.selectedVacationEmployee) {
  const available2025 = employee?.available2025 || 0;
  const available2026 = employee?.available2026 || 0;
  return { available2025, available2026, total: available2025 + available2026 };
}

function workingDatesInRange(start, end) {
  const dates = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end) {
    if (!nonWorkingDay(cursor)) dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function configuredVacationRanges() {
  return [
    { number: 1, enabled: true, startValue: els.vacationStart.value, endValue: els.vacationEnd.value },
    { number: 2, enabled: !els.vacationRange2.hidden, startValue: els.vacationStart2.value, endValue: els.vacationEnd2.value },
  ].filter((range) => range.enabled);
}

function allocateVacationRanges(employee, ranges) {
  const balances = vacationBalances(employee);
  const remainingByPeriod = new Map([
    [2025, balances.available2025],
    [2026, balances.available2026],
  ]);
  const allocations = [];
  ranges.forEach((range) => {
    let dateIndex = 0;
    [2025, 2026].forEach((year) => {
      const remainingDates = range.workingDates.length - dateIndex;
      const available = remainingByPeriod.get(year) || 0;
      const days = Math.min(available, remainingDates);
      if (days <= 0) return;
      allocations.push({
        rangeNumber: range.number,
        year,
        days,
        start: range.workingDates[dateIndex],
        end: range.workingDates[dateIndex + days - 1],
      });
      remainingByPeriod.set(year, available - days);
      dateIndex += days;
    });
  });
  return allocations;
}

function vacationRequestDetails() {
  const employee = state.selectedVacationEmployee;
  const balances = vacationBalances(employee);
  const details = { employee, balances, start: null, end: null, days: 0, returnDate: null, ranges: [], allocations: [], error: "" };
  if (!employee || balances.total <= 0) return details;
  const today = todayDateOnly();
  const inputRanges = configuredVacationRanges();
  const hasAnyDate = inputRanges.some((range) => range.startValue || range.endValue);
  for (const inputRange of inputRanges) {
    if (!inputRange.startValue && !inputRange.endValue && !hasAnyDate) return details;
    if (!inputRange.startValue || !inputRange.endValue) {
      details.error = `Completa el inicio y el término del rango ${inputRange.number}.`;
      return details;
    }
    const start = parseDateInput(inputRange.startValue);
    const end = parseDateInput(inputRange.endValue);
    if (!start || !end) {
      details.error = `Las fechas del rango ${inputRange.number} no son válidas.`;
      return details;
    }
    if (start < today || end < today) {
      details.error = `El rango ${inputRange.number} contiene fechas anteriores a hoy.`;
      return details;
    }
    if (end < start) {
      details.error = `El término del rango ${inputRange.number} debe ser igual o posterior al inicio.`;
      return details;
    }
    if (nonWorkingDay(start) || nonWorkingDay(end)) {
      details.error = `El inicio y el término del rango ${inputRange.number} deben ser días laborables.`;
      return details;
    }
    const workingDates = workingDatesInRange(start, end);
    if (!workingDates.length) {
      details.error = `El rango ${inputRange.number} no contiene días laborables.`;
      return details;
    }
    details.ranges.push({
      number: inputRange.number,
      start,
      end,
      days: workingDates.length,
      workingDates,
      returnDate: nextWorkingDay(end),
    });
  }

  details.ranges.sort((a, b) => a.start - b.start);
  if (details.ranges.length > 1 && details.ranges.some((range, index) => index > 0 && range.start <= details.ranges[index - 1].end)) {
    details.error = "Los rangos de vacaciones no pueden traslaparse.";
    return details;
  }
  details.start = details.ranges[0]?.start || null;
  details.end = details.ranges.at(-1)?.end || null;
  details.days = details.ranges.reduce((total, range) => total + range.days, 0);
  details.returnDate = details.ranges.at(-1)?.returnDate || null;
  if (details.days > balances.total) {
    details.error = balances.available2025 > 0
      ? `El saldo total disponible es de ${formatVacationDays(balances.total)}: ${formatVacationDays(balances.available2025)} de 2025 y ${formatVacationDays(balances.available2026)} de 2026.`
      : `El saldo disponible del periodo 2026 es de ${formatVacationDays(balances.available2026)}.`;
    return details;
  }
  details.allocations = allocateVacationRanges(employee, details.ranges);
  return details;
}

function renderVacationRequest() {
  updateVacationDateLimits();
  updateVacationDateDisplays();
  const employee = state.selectedVacationEmployee;
  const balances = vacationBalances(employee);
  const details = vacationRequestDetails();
  const hasBalance = Boolean(employee && balances.total > 0);
  const has2025Balance = balances.available2025 > 0;
  els.vacationStart.disabled = !hasBalance;
  els.vacationEnd.disabled = !hasBalance;
  els.vacationStart2.disabled = !hasBalance;
  els.vacationEnd2.disabled = !hasBalance;
  els.vacationAddRangeButton.disabled = !hasBalance;
  els.vacationAddRangeButton.hidden = !els.vacationRange2.hidden;
  els.vacationRemoveRangeButton.disabled = !hasBalance;
  els.vacationBalance.hidden = !employee;
  els.vacationBalance.classList.toggle("is-empty", !employee);
  els.vacationPeriod2025.hidden = Boolean(employee && !has2025Balance);
  els.vacationPeriod2026.hidden = false;
  els.vacationBalanceTotal.hidden = Boolean(employee && !has2025Balance);
  els.vacationBalanceNote.hidden = Boolean(employee && !has2025Balance);

  if (employee) {
    els.vacationAvailable2025.textContent = formatVacationDays(balances.available2025);
    els.vacationAvailable2026.textContent = formatVacationDays(balances.available2026);
    els.vacationTotalAvailable.textContent = formatVacationDays(balances.total);
    els.vacationExpiration2025.textContent = balanceExpirationText(balances.available2025, employee.expiration2025);
    els.vacationExpiration2026.textContent = balanceExpirationText(balances.available2026, employee.expiration2026);
    els.vacationBalanceNote.textContent = balances.total > 0
      ? "Los días se aplican primero al saldo de 2025 y después al de 2026."
      : "Esta persona no tiene vacaciones disponibles de 2025 ni 2026.";
  } else {
    els.vacationAvailable2025.textContent = "—";
    els.vacationAvailable2026.textContent = "—";
    els.vacationTotalAvailable.textContent = "—";
    els.vacationExpiration2025.textContent = "Selecciona una persona para consultar su saldo.";
    els.vacationExpiration2026.textContent = "Selecciona una persona para consultar su saldo.";
    els.vacationBalanceNote.textContent = "Los días se aplican primero al saldo más antiguo.";
  }

  els.vacationDayCount.textContent = details.days ? formatVacationDays(details.days) : "—";
  els.vacationReturnLabel.textContent = details.ranges.length > 1 ? "Regresos al trabajo" : "Regreso al trabajo";
  els.vacationReturnDate.textContent = details.ranges.length ? rangeReturnSummary(details.ranges) : "—";

  const templateEmployee = employee ? findTemplateEmployeeByCode(employee.code) : null;
  const ready = Boolean(employee && hasBalance && details.ranges.length && details.days && details.allocations.length && !details.error && state.templateBytes && templateEmployee);
  els.vacationGenerateButton.disabled = !ready;
  els.vacationTemplateButton.textContent = state.templateBytes ? "Cambiar formato" : "Configurar formato";

  if (!employee) {
    els.vacationGenerateButton.textContent = "Selecciona una persona";
    els.vacationGenerateNote.textContent = state.templateBytes ? "El formato institucional está listo." : "Se requiere el formato institucional para generar el archivo.";
    setVacationMessage("");
  } else if (!hasBalance) {
    els.vacationGenerateButton.textContent = "Sin vacaciones disponibles";
    els.vacationGenerateNote.textContent = has2025Balance
      ? "No hay saldo disponible en los periodos 2025 o 2026."
      : "No hay saldo disponible en el periodo 2026.";
    setVacationMessage("");
  } else if (!state.templateBytes) {
    els.vacationGenerateButton.textContent = "Configura el formato";
    els.vacationGenerateNote.textContent = "Carga el formato institucional una sola vez en este navegador.";
    setVacationMessage("El saldo está listo; falta configurar el formato institucional.");
  } else if (!templateEmployee) {
    els.vacationGenerateButton.textContent = "Empleado no encontrado";
    els.vacationGenerateNote.textContent = "El número de empleado no aparece en la hoja EMPLEADOS del formato.";
    setVacationMessage(`No encontré el número ${employee.code} en el formato institucional.`, "error");
  } else if (details.error) {
    els.vacationGenerateButton.textContent = "Revisa las fechas";
    els.vacationGenerateNote.textContent = has2025Balance
      ? `Saldo total: ${formatVacationDays(balances.total)}.`
      : `Saldo 2026: ${formatVacationDays(balances.available2026)}.`;
    setVacationMessage(details.error, "error");
  } else if (!details.ranges.length) {
    els.vacationGenerateButton.textContent = "Selecciona las fechas";
    els.vacationGenerateNote.textContent = has2025Balance
      ? `Puedes solicitar hasta ${formatVacationDays(balances.total)} entre los periodos 2025 y 2026.`
      : `Puedes solicitar hasta ${formatVacationDays(balances.available2026)} del periodo 2026.`;
    setVacationMessage("");
  } else {
    els.vacationGenerateButton.textContent = `Generar solicitud · ${formatVacationDays(details.days)}`;
    const returnLabel = details.ranges.length > 1 ? "Regresos" : "Regreso";
    els.vacationGenerateNote.textContent = `Se aplicarán ${allocationSummary(details.allocations)}. ${returnLabel}: ${rangeReturnSummary(details.ranges, true)}.`;
    setVacationMessage("");
  }
}

function balanceExpirationText(available, expiration) {
  if (available <= 0) return "Sin días disponibles en este periodo.";
  return expiration ? `Vence el ${shortDateFormatter.format(expiration)}.` : "Sin fecha de vencimiento registrada.";
}

function allocationSummary(allocations) {
  const daysByYear = new Map();
  allocations.forEach((allocation) => daysByYear.set(allocation.year, (daysByYear.get(allocation.year) || 0) + allocation.days));
  return [...daysByYear].map(([year, days]) => `${formatVacationDays(days)} a ${year}`).join(" y ");
}

function rangeReturnSummary(ranges, compact = false) {
  if (ranges.length === 1) {
    return compact
      ? shortDateFormatter.format(ranges[0].returnDate)
      : capitalize(fullDateFormatter.format(ranges[0].returnDate));
  }
  return [...ranges]
    .sort((a, b) => a.number - b.number)
    .map((range) => `Rango ${range.number}: ${shortDateFormatter.format(range.returnDate)}`)
    .join(" · ");
}

function setVacationReportMessage(message, type = "") {
  els.vacationReportStatus.textContent = message;
  els.vacationReportStatus.className = `vacation-report-status${type ? ` is-${type}` : ""}`;
}

function setVacationMessage(message, type = "") {
  els.vacationMessage.textContent = message;
  els.vacationMessage.className = `quick-message${type ? ` is-${type}` : ""}`;
}

function findTemplateEmployeeByCode(code) {
  const normalized = String(code ?? "").trim().replace(/\.0+$/, "");
  return state.employees.find((employee) => String(employee.code).trim().replace(/\.0+$/, "") === normalized) || null;
}

function parseDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? safeDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

function updateVacationDateDisplays() {
  document.querySelectorAll("[data-date-display-for]").forEach((display) => {
    const input = document.getElementById(display.dataset.dateDisplayFor);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input?.value || "");
    display.textContent = match ? `${match[3]}/${match[2]}/${match[1]}` : "DD/MM/AAAA";
  });
}

function todayDateOnly() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function resetSecondVacationRange() {
  els.vacationStart2.value = "";
  els.vacationEnd2.value = "";
  els.vacationRange2.hidden = true;
}

function updateVacationDateLimits() {
  const todayKey = toDateKey(todayDateOnly());
  [
    [els.vacationStart, els.vacationEnd],
    [els.vacationStart2, els.vacationEnd2],
  ].forEach(([startInput, endInput]) => {
    startInput.min = todayKey;
    endInput.min = startInput.value && startInput.value > todayKey ? startInput.value : todayKey;
  });
}

function countWorkingDays(start, end) {
  let days = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end) {
    if (!nonWorkingDay(cursor)) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function nextWorkingDay(date) {
  const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  while (nonWorkingDay(candidate)) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

function formatVacationDays(value) {
  const formatted = Number.isInteger(value) ? String(value) : value.toLocaleString("es-MX", { maximumFractionDigits: 2 });
  return `${formatted} ${value === 1 ? "día" : "días"}`;
}

function capitalize(value) {
  return value ? value.charAt(0).toLocaleUpperCase("es-MX") + value.slice(1) : value;
}

async function loadWorkbook(file) {
  clearError();
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    showError("Selecciona un archivo de Excel con extensión .xlsx o .xls.");
    return false;
  }
  if (typeof XLSX === "undefined") {
    showError("No se pudo iniciar el lector de Excel. Recarga la página e inténtalo de nuevo.");
    return false;
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
    return true;
  } catch (error) {
    console.error(error);
    showError(error.message || "No pude leer este archivo. Verifica que sea un XLSX válido.");
    return false;
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
      const attendanceSchedule = specialAttendanceSchedules.get(normalizeText(currentName));

      allRecords.push({
        nameKey: normalizeText(currentName),
        name: displayName(currentName),
        date,
        dateKey: toDateKey(date),
        entry: timeText(entryCell),
        exit: timeText(exitCell),
        hasEntry: cellHasValue(entryCell),
        hasExit: cellHasValue(exitCell),
        entryAlert: isEntryAfterCutoff(
          entryCell,
          attendanceSchedule?.entryLatestAllowedMinutes ?? standardEntryLatestAllowedMinutes,
        ),
        exitAlert: !nonWorkingDay(date) && (attendanceSchedule
          ? isExitBeforeCutoff(exitCell, date, attendanceSchedule)
          : classifyFill(exitCell) === "orange" || isExitBeforeCutoff(exitCell, date)),
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
    return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
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
  const institutionalHoliday = date.getMonth() === 11 && date.getDate() === 24
    ? "Día inhábil institucional"
    : null;
  const holiday = institutionalHoliday || mexicoMandatoryHoliday(date);
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

function isEntryAfterCutoff(cell, cutoffMinutes) {
  const minutes = spreadsheetTimeMinutes(cell);
  return minutes !== null && Math.floor(minutes) > cutoffMinutes;
}

function isExitBeforeCutoff(cell, date, attendanceSchedule = null) {
  const minutes = spreadsheetTimeMinutes(cell);
  const cutoffMinutes = date.getDay() === 5
    ? fridayExitCutoffMinutes
    : attendanceSchedule?.mondayToThursdayExitCutoffMinutes ?? mondayToThursdayExitCutoffMinutes;
  return minutes !== null && minutes < cutoffMinutes;
}

function spreadsheetTimeMinutes(cell) {
  if (!cell || cell.v === null || cell.v === undefined || cell.v === "") return null;
  const value = cell.v;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.getHours() * 60 + value.getMinutes() + value.getSeconds() / 60;
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    const fraction = value % 1;
    return fraction * 24 * 60;
  }

  const text = String(cell.w ?? value).trim().toLocaleLowerCase("es-MX").replace(/\./g, "").replace(/\s+/g, "");
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?([ap]m)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const meridiem = match[4] || "";
  if (minute > 59 || second > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (meridiem === "am") hour %= 12;
  if (meridiem === "pm") hour = hour % 12 + 12;
  return hour * 60 + minute + second / 60;
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
    renderVacationRequest();
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
  renderVacationRequest();
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

async function initializeTemplate() {
  if (typeof XLSX === "undefined") return;
  try {
    const response = await fetch("./api/template", { cache: "no-store" });
    if (response.ok) {
      const bytes = await response.arrayBuffer();
      const fileName = decodeURIComponent(response.headers.get("X-Template-Name") || "Formato base del servidor.xlsx");
      applyTemplateWorkbook(bytes, fileName);
      els.templateButton.hidden = true;
      return;
    }
  } catch (error) {
    console.info("El servidor no ofrece un formato base; se usará el guardado en este navegador.", error);
  }
  await restoreStoredTemplate();
}

async function initializeServerReports() {
  try {
    const response = await fetch("./api/reports", { cache: "no-store" });
    if (!response.ok) {
      showManualUpload();
      return;
    }
    const payload = await response.json();
    if (!Array.isArray(payload.months) || !payload.months.length) {
      showManualUpload();
      return;
    }
    state.serverReports = payload.months;
    els.reportStepTitle.textContent = "Selecciona el mes";
    els.reportStepCopy.textContent = "Usaremos el archivo más reciente disponible para el periodo que elijas.";
    els.reportMonthSelect.replaceChildren(new Option("Elige un mes", ""));
    state.serverReports.forEach((report) => {
      els.reportMonthSelect.add(new Option(report.label, report.id));
    });
    els.dropZone.hidden = true;
    els.serverReportPicker.hidden = false;
  } catch (error) {
    console.info("No se encontró el catálogo de reportes del servidor; se conservará la carga manual.", error);
    showManualUpload();
  }
}

function showManualUpload() {
  els.serverReportPicker.hidden = true;
  els.dropZone.hidden = false;
  els.reportStepTitle.textContent = "Carga el archivo";
  els.reportStepCopy.textContent = "Usa un XLSX con las columnas Nombre, Fecha, Entrada y Salida.";
}

async function loadServerReport(monthId) {
  const report = state.serverReports.find((item) => item.id === monthId);
  if (!report) return;
  clearError();
  els.reportMonthSelect.disabled = true;
  els.reportMonthMeta.textContent = `Abriendo ${report.fileName}…`;
  let loaded = false;
  try {
    const response = await fetch(`./api/reports/${encodeURIComponent(report.id)}/latest`, { cache: "no-store" });
    if (!response.ok) throw new Error("El servidor no pudo abrir el reporte seleccionado.");
    const bytes = await response.arrayBuffer();
    const fileName = decodeURIComponent(response.headers.get("X-Report-Name") || report.fileName);
    loaded = await loadWorkbook(new File([bytes], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }));
    if (loaded) els.serverReportPicker.hidden = true;
  } catch (error) {
    console.error(error);
    showError(error.message || "No pude cargar el reporte del servidor.");
  } finally {
    els.reportMonthSelect.disabled = false;
    if (!loaded) els.reportMonthMeta.textContent = `Se utilizará ${report.fileName}.`;
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
  els.selectionBar.classList.toggle("has-selection", count > 0);
  els.quickGenerateMeta.classList.toggle("has-selection", count > 0);
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
    els.quickGenerateButton.textContent = `Generar Excel · ${count} ${count === 1 ? "día" : "días"}`;
    els.quickGenerateNote.textContent = `El Excel incluirá ${count} ${count === 1 ? "día seleccionado" : "días seleccionados"}.`;
  }
}

function setGeneratorMessage(message, type = "") {
  els.quickMessage.textContent = message;
  els.quickMessage.className = `quick-message${type ? ` is-${type}` : ""}`;
}

async function generateVacationFile() {
  const request = vacationRequestDetails();
  const employee = request.employee ? findTemplateEmployeeByCode(request.employee.code) : null;
  if (!state.templateBytes || !employee || !request.start || !request.end || !request.days || !request.allocations.length || request.error) {
    setVacationMessage(request.error || "Selecciona una persona, fechas válidas y un formato institucional.", "error");
    return;
  }
  if (typeof JSZip === "undefined") {
    setVacationMessage("No se pudo iniciar el generador de archivos. Recarga la página.", "error");
    return;
  }

  els.vacationGenerateButton.disabled = true;
  els.vacationGenerateButton.textContent = "Generando…";
  setVacationMessage("Preparando la solicitud de vacaciones…");
  let generatedFileName = "";
  try {
    const zip = await JSZip.loadAsync(state.templateBytes);
    const sheetPath = await worksheetPath(zip, "FORMATO");
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) throw new Error("No encontré la hoja FORMATO dentro del archivo.");
    const sheetDocument = parseXml(await sheetFile.async("string"), "la hoja FORMATO");
    fillVacationSheet(sheetDocument, employee, request, els.vacationNotes.value);
    zip.file(sheetPath, new XMLSerializer().serializeToString(sheetDocument));
    await enableFullCalculation(zip);

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    generatedFileName = `Vacaciones_${safeFileName(request.employee.name)}_${toDateKey(request.start)}_${toDateKey(request.end)}.xlsx`;
    downloadBlob(blob, generatedFileName);
  } catch (error) {
    console.error(error);
    setVacationMessage(error.message || "No pude generar la solicitud de vacaciones.", "error");
  } finally {
    renderVacationRequest();
    if (generatedFileName) setVacationMessage(`Archivo generado: ${generatedFileName}`, "success");
  }
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
  const formatDate = lastWorkingDayOfMonth(reportDate);
  fillEmployeeFields(document, employee, formatDate);
  clearVacationRows(document);
  clearIncidentRows(document);
  incidents.slice(0, 10).forEach((incident, index) => {
    const row = incidentRows[index];
    const entryTime = timeFraction(incident.entry);
    const exitTime = timeFraction(incident.exit);
    const { includeEntry, includeExit } = incidentExportSides(incident);
    if (includeEntry && entryTime !== null) {
      setNumericCell(document, `C${row}`, excelDateSerial(incident.date));
      setNumericCell(document, `D${row}`, entryTime);
    }
    if (includeExit) {
      setNumericCell(document, `E${row}`, excelDateSerial(incident.date));
      if (exitTime !== null) setNumericCell(document, `F${row}`, exitTime);
    }
  });
  setInlineTextCell(document, "A49", normalizeNotes(comments));
}

const incidentRows = [22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
const vacationRows = [42, 43, 44, 45, 46];

function fillEmployeeFields(document, employee, formatDate) {
  setNumericCell(document, "A6", Number(employee.code));
  setNumericCell(document, "H2", excelDateSerial(formatDate));
  setFormulaCache(document, "B6", employee.name);
  setFormulaCache(document, "G6", employee.position);
  setFormulaCache(document, "H6", employee.unit);
  setFormulaCache(document, "A54", employee.name);
  setFormulaCache(document, "C54", employee.manager);
  setFormulaCache(document, "G54", employee.departmentHead);
  setFormulaCache(document, "A58", employee.subdirector);
}

function clearIncidentRows(document) {
  incidentRows.forEach((row) => ["C", "D", "E", "F"].forEach((column) => clearCell(document, `${column}${row}`)));
}

function clearVacationRows(document) {
  vacationRows.forEach((row) => ["C", "E", "G", "H"].forEach((column) => clearCell(document, `${column}${row}`)));
}

function fillVacationSheet(document, employee, request, comments) {
  fillEmployeeFields(document, employee, new Date());
  clearIncidentRows(document);
  clearVacationRows(document);
  const rows = [43, 44, 45, 46];
  if (request.allocations.length > rows.length) throw new Error("El formato no tiene filas suficientes para todos los rangos seleccionados.");
  request.allocations.forEach((allocation, index) => {
    const row = rows[index];
    setNumericCell(document, `C${row}`, excelDateSerial(allocation.start));
    setNumericCell(document, `E${row}`, excelDateSerial(allocation.end));
    setNumericCell(document, `G${row}`, allocation.year);
    setNumericCell(document, `H${row}`, allocation.days);
  });
  const daysByYear = new Map();
  request.allocations.forEach((allocation) => daysByYear.set(allocation.year, (daysByYear.get(allocation.year) || 0) + allocation.days));
  const automaticComment = `${[...daysByYear].map(([year, days]) => `${days} ${days === 1 ? "Día" : "Días"} de vacaciones correspondientes al periodo ${year}`).join(" y ")}.`;
  const additionalComment = normalizeNotes(comments);
  setInlineTextCell(document, "A49", additionalComment ? `${automaticComment}\n${additionalComment}` : automaticComment);
}

function incidentExportSides(incident) {
  return {
    includeEntry: Boolean(incident.entryAlert),
    includeExit: Boolean(incident.exitAlert || incident.hasNoCheck),
  };
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

function lastWorkingDayOfMonth(date) {
  const candidate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  while (nonWorkingDay(candidate)) candidate.setDate(candidate.getDate() - 1);
  return candidate;
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
    if (nonWorking) {
      cell.dataset.tooltip = "Día inhábil";
      cell.title = "Día inhábil";
    }
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
