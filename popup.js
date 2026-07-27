/**
 * FastExclude for Senler - Caldera Style & Popup Script (v2.0)
 */

const STORAGE_KEY = 'senler_presets';
const MAILING_STATE_KEY = 'senler_mailing_draft';

// State
let currentPresets = [];
let selectedPresetForApply = null;
let lastExecutionResults = null;
let activeMode = 'exclusions'; // 'exclusions' | 'mailings'

// DOM Elements - Navigation Tabs
const tabExclusions = document.getElementById('tabExclusions');
const tabMailings = document.getElementById('tabMailings');
const exclusionsView = document.getElementById('exclusionsView');
const mailingsView = document.getElementById('mailingsView');

// Exclusions View Elements
const presetsList = document.getElementById('presetsList');
const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const btnOpenCreate = document.getElementById('btnOpenCreate');

// Stats Bar
const statPresetsCount = document.getElementById('statPresetsCount');
const statGroupsCount = document.getElementById('statGroupsCount');
const statStatus = document.getElementById('statStatus');

// Mailings View Elements
const mailTitle = document.getElementById('mailTitle');
const mailMessage = document.getElementById('mailMessage');
const mailDateTime = document.getElementById('mailDateTime');
const mailPresetSelect = document.getElementById('mailPresetSelect');
const btnApplyMailingCurrent = document.getElementById('btnApplyMailingCurrent');
const btnApplyMailingAll = document.getElementById('btnApplyMailingAll');
const chkCopyAttachments = document.getElementById('chkCopyAttachments');

// Apply Choice Target Modal
const applyTargetModal = document.getElementById('applyTargetModal');
const btnCloseApplyTarget = document.getElementById('btnCloseApplyTarget');
const targetPresetNameName = document.getElementById('targetPresetNameName');
const lblSenlerTabsCount = document.getElementById('lblSenlerTabsCount');
const btnApplyCurrentTabOnly = document.getElementById('btnApplyCurrentTabOnly');
const btnApplyAllTabs = document.getElementById('btnApplyAllTabs');

// Create/Edit Preset Form Modal
const formModal = document.getElementById('formModal');
const formTitle = document.getElementById('formTitle');
const presetIdInput = document.getElementById('presetId');
const presetNameInput = document.getElementById('presetName');
const presetGroupsInput = document.getElementById('presetGroups');
const groupCounter = document.getElementById('groupCounter');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelForm = document.getElementById('btnCancelForm');
const btnSavePreset = document.getElementById('btnSavePreset');

// Results Report Modal
const resultsModal = document.getElementById('resultsModal');
const btnCloseResults = document.getElementById('btnCloseResults');
const btnDoneResults = document.getElementById('btnDoneResults');
const btnCopyMissing = document.getElementById('btnCopyMissing');
const resultsSummary = document.getElementById('resultsSummary');
const resultsTableBody = document.getElementById('resultsTableBody');

// Import / Export Modal
const importExportModal = document.getElementById('importExportModal');
const btnExportImport = document.getElementById('btnExportImport');
const btnCloseImportExport = document.getElementById('btnCloseImportExport');
const btnExportJSON = document.getElementById('btnExportJSON');
const importFileInput = document.getElementById('importFileInput');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadPresets(() => {
    loadMailingDraft();
  });

  // Mode Tabs Switching
  tabExclusions.addEventListener('click', () => switchMode('exclusions'));
  tabMailings.addEventListener('click', () => switchMode('mailings'));

  // Search & Filter
  searchInput.addEventListener('input', handleSearch);
  btnClearSearch.addEventListener('click', clearSearch);

  // Exclusions Preset Form Modal
  btnOpenCreate.addEventListener('click', () => openFormModal());
  btnCloseModal.addEventListener('click', closeFormModal);
  btnCancelForm.addEventListener('click', closeFormModal);
  btnSavePreset.addEventListener('click', handleSavePreset);
  presetGroupsInput.addEventListener('input', updateGroupCounter);

  // Apply Target Choice Modal
  btnCloseApplyTarget.addEventListener('click', closeApplyTargetModal);
  btnApplyCurrentTabOnly.addEventListener('click', handleApplyToCurrentTabOnly);
  btnApplyAllTabs.addEventListener('click', handleApplyToAllTabs);

  // Mailing Creator Events
  btnApplyMailingCurrent.addEventListener('click', handleApplyMailingCurrent);
  btnApplyMailingAll.addEventListener('click', handleApplyMailingAll);
  mailTitle.addEventListener('input', saveMailingDraft);
  mailMessage.addEventListener('input', saveMailingDraft);
  mailDateTime.addEventListener('change', saveMailingDraft);
  mailPresetSelect.addEventListener('change', saveMailingDraft);

  // Formatting Toolbar Listeners
  document.querySelectorAll('#fmtToolbar .btn-fmt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const fmt = btn.getAttribute('data-fmt');
      if (fmt) applyFormatToMessage(fmt);
    });
  });

  // Keyboard Shortcuts for Formatting (Ctrl+B, Ctrl+I, Ctrl+U)
  mailMessage.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b' || key === 'и') {
        e.preventDefault();
        applyFormatToMessage('bold');
      } else if (key === 'i' || key === 'ш') {
        e.preventDefault();
        applyFormatToMessage('italic');
      } else if (key === 'u' || key === 'г') {
        e.preventDefault();
        applyFormatToMessage('underline');
      }
    }
  });

  // Results Modal
  btnCloseResults.addEventListener('click', closeResultsModal);
  btnDoneResults.addEventListener('click', closeResultsModal);
  btnCopyMissing.addEventListener('click', copyMissingGroups);

  // Import / Export
  btnExportImport.addEventListener('click', () => importExportModal.classList.remove('hidden'));
  btnCloseImportExport.addEventListener('click', () => importExportModal.classList.add('hidden'));
  btnExportJSON.addEventListener('click', exportPresetsJSON);
  importFileInput.addEventListener('change', importPresetsJSON);
});

// Mode Switcher (Exclusions vs Mailings)
function switchMode(mode) {
  activeMode = mode;
  if (mode === 'exclusions') {
    tabExclusions.classList.add('active');
    tabMailings.classList.remove('active');
    exclusionsView.classList.remove('hidden');
    mailingsView.classList.add('hidden');
  } else {
    tabMailings.classList.add('active');
    tabExclusions.classList.remove('active');
    mailingsView.classList.remove('hidden');
    exclusionsView.classList.add('hidden');
  }
}

// Load presets from chrome.storage.local
function loadPresets(callback) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    currentPresets = result[STORAGE_KEY] || [];
    renderPresets();
    updateStats();
    populateMailingPresetDropdown();
    if (typeof callback === 'function') callback();
  });
}

// Render Presets List
function renderPresets(filterText = '') {
  presetsList.innerHTML = '';

  const normalizedFilter = filterText.toLowerCase().trim();
  const filtered = currentPresets.filter(p => p.name.toLowerCase().includes(normalizedFilter));

  if (filtered.length === 0) {
    if (currentPresets.length === 0) {
      presetsList.innerHTML = `
        <div class="empty-state">
          <h3>НЕТ ПРЕСЕТОВ</h3>
          <p>Нажмите "+", чтобы создать первую подборку исключений.</p>
        </div>
      `;
    } else {
      presetsList.innerHTML = `
        <div class="empty-state">
          <h3>НЕ НАЙДЕНО</h3>
          <p>По запросу "${escapeHtml(filterText)}" нет совпадений.</p>
        </div>
      `;
    }
    return;
  }

  filtered.forEach((preset) => {
    const card = document.createElement('div');
    card.className = 'preset-card';

    const groups = preset.groups || [];
    const groupCount = groups.length;

    const previewTags = groups.slice(0, 3).map(g => `<span class="group-tag" title="${escapeHtml(g)}">${escapeHtml(g)}</span>`).join('');
    const moreTag = groupCount > 3 ? `<span class="group-tag-more">+еще ${groupCount - 3}</span>` : '';

    card.innerHTML = `
      <div class="preset-card-header">
        <span class="preset-card-title">${escapeHtml(preset.name)}</span>
        <span class="sulfur-tag">${groupCount} ${getGroupNoun(groupCount)}</span>
      </div>
      
      <div class="groups-preview">
        ${previewTags}
        ${moreTag}
      </div>

      <div class="preset-card-actions">
        <button class="btn-ember-pill btn-apply-action">
          Применить
        </button>
        <button class="icon-action-btn btn-duplicate-action" title="Дублировать пресет">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="icon-action-btn btn-edit-action" title="Редактировать">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="icon-action-btn danger btn-delete-action" title="Удалить пресет">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;

    card.querySelector('.btn-apply-action').addEventListener('click', () => openApplyTargetModal(preset));
    card.querySelector('.btn-duplicate-action').addEventListener('click', () => duplicatePreset(preset));
    card.querySelector('.btn-edit-action').addEventListener('click', () => openFormModal(preset));
    card.querySelector('.btn-delete-action').addEventListener('click', () => deletePreset(preset.id));

    presetsList.appendChild(card);
  });
}

// Update Stats Dashboard
function updateStats() {
  const totalPresets = currentPresets.length;
  const totalGroups = currentPresets.reduce((sum, p) => sum + (p.groups ? p.groups.length : 0), 0);

  if (statPresetsCount) statPresetsCount.textContent = totalPresets;
  if (statGroupsCount) statGroupsCount.textContent = totalGroups;
}

// Populate Preset Dropdown in Mailing Creator
function populateMailingPresetDropdown(preserveId = null) {
  if (!mailPresetSelect) return;
  const currentVal = preserveId || mailPresetSelect.value;
  mailPresetSelect.innerHTML = '<option value="">Без пресета исключений</option>';
  currentPresets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.groups ? p.groups.length : 0} групп)`;
    mailPresetSelect.appendChild(opt);
  });
  if (currentVal && currentPresets.some(p => p.id === currentVal)) {
    mailPresetSelect.value = currentVal;
  }
}

// Save & Load Mailing Draft Form
function saveMailingDraft() {
  if (!mailPresetSelect) return;
  const draft = {
    title: mailTitle.value,
    message: mailMessage.value,
    datetime: mailDateTime.value,
    presetId: mailPresetSelect.value
  };
  chrome.storage.local.set({ [MAILING_STATE_KEY]: draft });
}

function loadMailingDraft() {
  chrome.storage.local.get([MAILING_STATE_KEY], (res) => {
    const draft = res[MAILING_STATE_KEY];
    if (draft) {
      if (mailTitle) mailTitle.value = draft.title || '';
      if (mailMessage) mailMessage.value = draft.message || '';
      if (mailDateTime) mailDateTime.value = draft.datetime || '';
      if (draft.presetId && mailPresetSelect && currentPresets.some(p => p.id === draft.presetId)) {
        mailPresetSelect.value = draft.presetId;
      }
    }
  });
}

// Apply Formatting Tags to Textarea Selection
function applyFormatToMessage(formatType) {
  const start = mailMessage.selectionStart;
  const end = mailMessage.selectionEnd;
  const text = mailMessage.value;
  const selectedText = text.substring(start, end);

  let prefix = '';
  let suffix = '';
  let defaultPlaceholder = '';

  switch (formatType) {
    case 'bold':
      prefix = '**';
      suffix = '**';
      defaultPlaceholder = 'жирный текст';
      break;
    case 'italic':
      prefix = '*';
      suffix = '*';
      defaultPlaceholder = 'курсив';
      break;
    case 'underline':
      prefix = '<u>';
      suffix = '</u>';
      defaultPlaceholder = 'подчеркнутый текст';
      break;
    case 'strike':
      prefix = '~';
      suffix = '~';
      defaultPlaceholder = 'зачеркнутый текст';
      break;
    case 'link': {
      const url = prompt('Введите URL ссылки:', 'https://');
      if (!url) return;
      prefix = '[';
      suffix = `](${url})`;
      defaultPlaceholder = 'текст ссылки';
      break;
    }
  }

  const content = selectedText || defaultPlaceholder;
  const replacement = prefix + content + suffix;

  mailMessage.value = text.substring(0, start) + replacement + text.substring(end);
  mailMessage.focus();

  const newSelectionStart = start + prefix.length;
  const newSelectionEnd = newSelectionStart + content.length;
  mailMessage.setSelectionRange(newSelectionStart, newSelectionEnd);

  saveMailingDraft();
}

// Search Handling
function handleSearch(e) {
  const val = e.target.value;
  if (val) {
    btnClearSearch.classList.remove('hidden');
  } else {
    btnClearSearch.classList.add('hidden');
  }
  renderPresets(val);
}

function clearSearch() {
  searchInput.value = '';
  btnClearSearch.classList.add('hidden');
  renderPresets('');
}

// Open Apply Target Choice Modal
function openApplyTargetModal(preset) {
  selectedPresetForApply = preset;
  targetPresetNameName.textContent = preset.name;

  // Query open Senler tabs
  chrome.tabs.query({ url: "*://*.senler.ru/*" }, (tabs) => {
    const count = tabs ? tabs.length : 0;
    if (count > 0) {
      lblSenlerTabsCount.textContent = `Параллельно выполнит во всех ${count} открытых вкладках Senler`;
    } else {
      lblSenlerTabsCount.textContent = `Открытых вкладок Senler не найдено`;
    }
    applyTargetModal.classList.remove('hidden');
  });
}

function closeApplyTargetModal() {
  applyTargetModal.classList.add('hidden');
  selectedPresetForApply = null;
}

// Apply Preset to Single Current Active Tab
function handleApplyToCurrentTabOnly() {
  if (!selectedPresetForApply) return;
  const preset = selectedPresetForApply;
  closeApplyTargetModal();

  if (statStatus) statStatus.textContent = 'RUNNING';
  showToast('Выполнение алгоритма на текущей странице...', 'info');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      if (statStatus) statStatus.textContent = 'ERROR';
      showToast('Не найдена активная вкладка браузера', 'error');
      return;
    }

    const tab = tabs[0];
    if (!tab.url || !tab.url.includes('senler.ru')) {
      if (statStatus) statStatus.textContent = 'READY';
      showToast('Откройте страницу Senler для применения пресета', 'error');
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        world: 'MAIN',
        func: runExclusionAutomation,
        args: [preset.groups, preset.name]
      },
      (results) => {
        if (statStatus) statStatus.textContent = 'READY';
        if (chrome.runtime.lastError) {
          showToast('Ошибка: ' + chrome.runtime.lastError.message, 'error');
          return;
        }

        if (results && results[0] && results[0].result) {
          const res = results[0].result;
          if (res.success) {
            lastExecutionResults = res;
            openResultsModal(res);
            showToast(`Успешно добавлено ${res.addedCount} из ${res.totalTarget} групп`, 'success');
          } else {
            showToast(`Ошибка Senler: ${res.message}`, 'error');
          }
        }
      }
    );
  });
}

// Apply Preset to ALL Open Senler Tabs
function handleApplyToAllTabs() {
  if (!selectedPresetForApply) return;
  const preset = selectedPresetForApply;
  closeApplyTargetModal();

  chrome.tabs.query({ url: "*://*.senler.ru/*" }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      showToast('Открытых вкладок Senler не найдено', 'error');
      return;
    }

    if (statStatus) statStatus.textContent = 'RUNNING';
    showToast(`Обработка ${tabs.length} вкладок Senler...`, 'info');

    let completed = 0;
    let totalAdded = 0;

    tabs.forEach(tab => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          world: 'MAIN',
          func: runExclusionAutomation,
          args: [preset.groups, preset.name]
        },
        (results) => {
          completed++;
          if (results && results[0] && results[0].result && results[0].result.success) {
            totalAdded += results[0].result.addedCount;
          }

          if (completed === tabs.length) {
            if (statStatus) statStatus.textContent = 'READY';
            showToast(`Успешно обработано ${completed} вкладок Senler!`, 'success');
          }
        }
      );
    });
  });
}

// Mailing Creator: Fill Current Tab
function handleApplyMailingCurrent() {
  const mailData = getMailingFormData();
  if (!mailData.title && !mailData.message) {
    showToast('Заполните название или текст рассылки', 'error');
    return;
  }

  showToast('Заполнение формы рассылки...', 'info');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].url.includes('senler.ru')) {
      showToast('Откройте страницу Senler для заполнения', 'error');
      return;
    }

    const tab = tabs[0];

    const runFill = (attachmentsData = null) => {
      if (attachmentsData) {
        mailData.attachments = attachmentsData;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          world: 'MAIN',
          func: runMailingAutomation,
          args: [mailData]
        },
        (results) => {
          if (results && results[0] && results[0].result && results[0].result.success) {
            showToast('Форма рассылки успешно заполнена!', 'success');
          } else {
            showToast('Ошибка заполнения формы рассылки', 'error');
          }
        }
      );
    };

    if (chkCopyAttachments && chkCopyAttachments.checked) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          world: 'MAIN',
          func: () => {
            const $ = window.jQuery || window.$;
            if (!$) return null;
            const $field = $('.js-messageField').first();
            if (!$field.length) return null;
            return {
              dataItems: $field.attr('data-items') || '',
              html: $field.html() || ''
            };
          }
        },
        (results) => {
          const atts = results && results[0] && results[0].result;
          runFill(atts);
        }
      );
    } else {
      runFill();
    }
  });
}

// Mailing Creator: Fill All Open Senler Tabs
function handleApplyMailingAll() {
  const mailData = getMailingFormData();
  if (!mailData.title && !mailData.message) {
    showToast('Заполните название или текст рассылки', 'error');
    return;
  }

  chrome.tabs.query({ url: "*://*.senler.ru/*" }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      showToast('Открытых вкладок Senler не найдено', 'error');
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      const activeTab = activeTabs[0];

      const runFillAll = (attachmentsData = null) => {
        if (attachmentsData) {
          mailData.attachments = attachmentsData;
        }
        showToast(`Заполнение рассылки во всех ${tabs.length} вкладках...`, 'info');
        let completed = 0;

        tabs.forEach(tab => {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              world: 'MAIN',
              func: runMailingAutomation,
              args: [mailData]
            },
            () => {
              completed++;
              if (completed === tabs.length) {
                showToast(`Форма рассылки заполнена во всех ${completed} вкладках!`, 'success');
              }
            }
          );
        });
      };

      if (activeTab && activeTab.url.includes('senler.ru') && chkCopyAttachments && chkCopyAttachments.checked) {
        chrome.scripting.executeScript(
          {
            target: { tabId: activeTab.id },
            world: 'MAIN',
            func: () => {
              const $ = window.jQuery || window.$;
              if (!$) return null;
              const $field = $('.js-messageField').first();
              if (!$field.length) return null;
              return {
                dataItems: $field.attr('data-items') || '',
                html: $field.html() || ''
              };
            }
          },
          (results) => {
            const atts = results && results[0] && results[0].result;
            runFillAll(atts);
          }
        );
      } else {
        runFillAll();
      }
    });
  });
}

function getMailingFormData() {
  const selectedPreset = currentPresets.find(p => p.id === mailPresetSelect.value);
  return {
    title: mailTitle.value.trim(),
    message: mailMessage.value.trim(),
    datetime: mailDateTime.value,
    presetGroups: selectedPreset ? selectedPreset.groups : [],
    presetName: selectedPreset ? selectedPreset.name : ''
  };
}

// Form Modal Open/Close
function openFormModal(preset = null) {
  if (preset) {
    formTitle.textContent = 'РЕДАКТИРОВАТЬ ПРЕСЕТ';
    presetIdInput.value = preset.id;
    presetNameInput.value = preset.name;
    presetGroupsInput.value = (preset.groups || []).join('\n');
  } else {
    formTitle.textContent = 'НОВЫЙ ПРЕСЕТ';
    presetIdInput.value = '';
    presetNameInput.value = '';
    presetGroupsInput.value = '';
  }

  updateGroupCounter();
  formModal.classList.remove('hidden');
}

function closeFormModal() {
  formModal.classList.add('hidden');
}

function updateGroupCounter() {
  const lines = presetGroupsInput.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  groupCounter.textContent = `${lines.length} ${getGroupNoun(lines.length)}`;
}

// Save Preset
function handleSavePreset() {
  const name = presetNameInput.value.trim();
  const groupsText = presetGroupsInput.value;
  const id = presetIdInput.value;

  if (!name) {
    showToast('Введите название пресета', 'error');
    return;
  }

  const groups = groupsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (groups.length === 0) {
    showToast('Добавьте хотя бы одно название группы', 'error');
    return;
  }

  if (id) {
    currentPresets = currentPresets.map(p => p.id === id ? { ...p, name, groups } : p);
    showToast('Пресет успешно обновлен', 'success');
  } else {
    currentPresets.push({
      id: 'preset_' + Date.now(),
      name,
      groups
    });
    showToast('Новый пресет сохранен', 'success');
  }

  savePresetsToStorage();
  closeFormModal();
}

// Duplicate Preset
function duplicatePreset(preset) {
  const newPreset = {
    id: 'preset_' + Date.now(),
    name: `${preset.name} (копия)`,
    groups: [...preset.groups]
  };

  currentPresets.push(newPreset);
  savePresetsToStorage();
  showToast(`Пресет "${preset.name}" продублирован`, 'success');
}

// Delete Preset
function deletePreset(id) {
  if (!confirm('Вы действительно хотите удалить этот пресет?')) return;

  currentPresets = currentPresets.filter(p => p.id !== id);
  savePresetsToStorage();
  showToast('Пресет удален', 'info');
}

function savePresetsToStorage() {
  chrome.storage.local.set({ [STORAGE_KEY]: currentPresets }, () => {
    renderPresets(searchInput.value);
    updateStats();
    populateMailingPresetDropdown();
  });
}

// Results Modal
function openResultsModal(res) {
  const added = res.resultsTable.filter(r => r.Статус !== '❌ Не найдена');
  const missing = res.resultsTable.filter(r => r.Статус === '❌ Не найдена');

  resultsSummary.innerHTML = `
    <div class="summary-card added">
      <span class="summary-num">${added.length}</span>
      <span class="summary-lbl">ДОБАВЛЕНО</span>
    </div>
    <div class="summary-card missing">
      <span class="summary-num">${missing.length}</span>
      <span class="summary-lbl">НЕ НАЙДЕНО</span>
    </div>
  `;

  resultsTableBody.innerHTML = '';
  res.resultsTable.forEach(row => {
    const tr = document.createElement('tr');
    const isSuccess = row.Статус !== '❌ Не найдена';

    tr.innerHTML = `
      <td>${escapeHtml(row['Пресет (Запрос)'])}</td>
      <td>
        <span class="${isSuccess ? 'badge-added' : 'badge-missing'}">
          ${isSuccess ? '✓ ' + row.Статус : '❌ Не найдена'}
        </span>
      </td>
      <td>${escapeHtml(row['Найдено в Senler'])}</td>
    `;
    resultsTableBody.appendChild(tr);
  });

  if (missing.length > 0) {
    btnCopyMissing.classList.remove('hidden');
  } else {
    btnCopyMissing.classList.add('hidden');
  }

  resultsModal.classList.remove('hidden');
}

function closeResultsModal() {
  resultsModal.classList.add('hidden');
}

function copyMissingGroups() {
  if (!lastExecutionResults) return;
  const missing = lastExecutionResults.resultsTable
    .filter(r => r.Статус === '❌ Не найдена')
    .map(r => r['Пресет (Запрос)'])
    .join('\n');

  navigator.clipboard.writeText(missing).then(() => {
    showToast('Ненайденные группы скопированы в буфер обмена', 'success');
  });
}

// Export / Import
function exportPresetsJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentPresets, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `FastExclude_Presets_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Экспорт скачан', 'success');
}

function importPresetsJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        currentPresets = imported;
        savePresetsToStorage();
        importExportModal.classList.add('hidden');
        showToast(`Успешно импортировано ${imported.length} пресетов`, 'success');
      } else {
        showToast('Неверный формат файла JSON', 'error');
      }
    } catch (err) {
      showToast('Ошибка чтения JSON файла', 'error');
    }
  };
  reader.readAsText(file);
}

// Toast Notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

function getGroupNoun(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'групп';
  if (mod10 === 1) return 'группа';
  if (mod10 >= 2 && mod10 <= 4) return 'группы';
  return 'групп';
}


/**
 * Script injected into page context via chrome.scripting.executeScript for Exclusions
 */
async function runExclusionAutomation(targetGroupNames, presetName) {
  console.log(`[FastExclude] Старт обработки пресета: "${presetName}"`, targetGroupNames);

  try {
    const $ = window.jQuery || window.$;
    if (!$) {
      console.error('[FastExclude] Ошибка: jQuery ($) не найден в window!');
      return { success: false, message: 'jQuery ($) не найден на странице' };
    }

    let $target = null;
    let detectionMethod = '';

    // 1. Ищем выпадающий список исключений
    $('select').each(function() {
      const url = String($(this).attr('data-ajax--url') || $(this).data('ajax--url') || '');
      const name = String($(this).attr('name') || $(this).attr('id') || '');
      if ((url.includes('subscriptions') || url.includes('subscription')) && (name.includes('ignore') || name.includes('exclude'))) {
        $target = $(this);
        detectionMethod = `Приоритет 1 (${name || url})`;
        return false;
      }
    });

    // Резервный поиск по тексту метки
    if (!$target || !$target.length) {
      $('label, span, div, h4, h5, legend').each(function() {
        const text = $(this).text().trim();
        if (text.includes('За исключением') || text.includes('Исключить') || text.includes('Кроме')) {
          const $foundSelect = $(this).closest('.form-group, .control-group, .row, .col, .form-item, div, fieldset').find('select');
          if ($foundSelect.length > 0) {
            $target = $foundSelect.first();
            detectionMethod = 'Приоритет 2 (текстовый контейнер)';
            return false;
          }
        }
      });
    }

    // Запасной поиск по статичным именам
    if (!$target || !$target.length) {
      const $fallback = $('select[name="filterignore_subscription_id"], select[selectname="filterignore_subscription_id"], select[name="filterignore_subscription_id[]"]').first();
      if ($fallback.length > 0) {
        $target = $fallback;
        detectionMethod = 'Приоритет 3 (fallback name)';
      }
    }

    if (!$target || !$target.length) {
      console.error('[FastExclude] Ошибка: Не удалось найти селектор групп-исключений!');
      return { success: false, message: 'Не найден селектор исключений на странице. Разверните фильтры.' };
    }

    console.log(`[FastExclude] Найден целевой селектор [${detectionMethod}]:`, $target[0]);

    // Получаем URL API из конфигурации Select2 или атрибутов
    const s2Instance = $target.data("select2");
    const ajaxConfig = s2Instance?.options?.get("ajax") || s2Instance?.options?.options?.ajax;
    let ajaxUrl = String(ajaxConfig?.url || $target.attr("data-ajax--url") || $target.data("ajax--url") || "").trim();

    if (ajaxUrl && ajaxUrl.startsWith('/')) ajaxUrl = window.location.origin + ajaxUrl;
    if (!ajaxUrl) {
      return { success: false, message: 'Не найден URL для загрузки списка групп с сервера.' };
    }

    // Утилиты для нормализации текста при поиске
    const clean = v => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();
    const simplify = v => clean(v)
      .replace(/ё/g, "е")
      .replace(/[«»"'`]/g, "")
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015-]/g, " ")
      .replace(/[(){}\[\],.;:+!?\\/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    console.log("[FastExclude] Загрузка полной базы групп через API...", ajaxUrl);

    // Выгружаем доступные группы (до 10 страниц с параметрами Select2 query)
    const allGroups = [];
    const fetchedIds = new Set();

    for (let page = 1; page <= 10; page++) {
      try {
        const response = await $.ajax({
          url: ajaxUrl,
          data: { page, q: '', term: '', _type: 'query' },
          dataType: 'json'
        });

        const items = response.results || response.items || response.data || [];
        if (!items || !items.length) break;

        let addedInPage = 0;
        for (const item of items) {
          const id = String(item.id || item.value || '');
          if (id && !fetchedIds.has(id)) {
            fetchedIds.add(id);
            allGroups.push(item);
            addedInPage++;
          }
        }
        if (addedInPage === 0) break;
      } catch (e) {
        console.warn(`[FastExclude] Ошибка запроса страницы ${page}:`, e);
        break;
      }
    }

    // Дополняем уже имеющимися в DOM option
    $target.find("option").each(function() {
      const id = String(this.value || '');
      const text = String($(this).text() || '');
      if (id && !fetchedIds.has(id)) {
        fetchedIds.add(id);
        allGroups.push({ id, text });
      }
    });

    console.log(`[FastExclude] Загружено доступных групп из Senler: ${allGroups.length}`);

    if (!allGroups.length) {
      return { success: false, message: 'База групп пуста или сервер отклонил запрос.' };
    }

    const resultsTable = [];
    const selectedMap = new Map($target.find("option").map(function() { return [[String(this.value), this]]; }).get());
    let addedCount = 0;

    // Сопоставляем группы из массива с базой Senler
    for (const name of targetGroupNames) {
      if (!name || !name.trim()) continue;

      const targetSimple = simplify(name);

      // 1. Точное совпадение по упрощенной строке
      let match = allGroups.find(g => simplify(g.text || g.name || g.title) === targetSimple);

      // 2. Вспомогательное совпадение по подстроке (если точного нет)
      if (!match) {
        match = allGroups.find(g => {
          const gSimple = simplify(g.text || g.name || g.title);
          return gSimple.includes(targetSimple) || targetSimple.includes(gSimple);
        });
      }

      if (!match) {
        resultsTable.push({
          'Пресет (Запрос)': name,
          'Статус': '❌ Не найдена',
          'Найдено в Senler': '-',
          'ID Группы': '-'
        });
        continue;
      }

      const id = String(match.id || match.value);
      const text = String(match.text || match.name || match.title);

      if (selectedMap.has(id)) {
        resultsTable.push({
          'Пресет (Запрос)': name,
          'Статус': 'Уже выбрана',
          'Найдено в Senler': text,
          'ID Группы': id
        });
      } else {
        const newOpt = new Option(text, id, true, true);
        $target.append(newOpt);
        selectedMap.set(id, newOpt);
        addedCount++;
        resultsTable.push({
          'Пресет (Запрос)': name,
          'Статус': 'Добавлена',
          'Найдено в Senler': text,
          'ID Группы': id
        });
      }
    }

    // Обновляем визуальное отображение Select2
    $target.trigger("change").trigger("change.select2");
    if ($target[0]) {
      $target[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    console.log(`[FastExclude] Итоги обработки пресета "${presetName}":`);
    console.table(resultsTable);

    return {
      success: true,
      addedCount: addedCount,
      totalTarget: targetGroupNames.length,
      resultsTable: resultsTable
    };

  } catch (criticalErr) {
    console.error('[FastExclude] Критическая ошибка:', criticalErr);
    return {
      success: false,
      message: criticalErr.message || 'Ошибка исполнения на странице'
    };
  }
}

/**
 * Injected script for Filling Text Mailing Creator form in Senler page
 */
async function runMailingAutomation(mailData) {
  console.log('[FastExclude] Автоматизация формы рассылки:', mailData);
  const $ = window.jQuery || window.$;
  if (!$) return { success: false, message: 'jQuery не найден на странице' };

  // 1. Ввод названия рассылки
  try {
    if (mailData.title) {
      // Исключаем элементы шапки, сайдбара, виджетов, выпадающих меню и блоков фильтров
      const $formInputs = $('input').not('[name*="filter"], [id*="filter"], [class*="filter"], #main-header *, .header-new *, #sidebar *, .carrotquest *, .notifications-block *, .dropdown-menu *, #vk_api_transport *');
      let $titleInput = $formInputs.filter('[placeholder*="название рассылки"], [placeholder*="Название рассылки"], [placeholder*="Введите название"]').first();

      if (!$titleInput.length) {
        $titleInput = $formInputs.filter('[name="name"], [name="title"], [name="name_user"], [name*="name"], [name*="title"], #name, #title').first();
      }

      if (!$titleInput.length) {
        $('label, span, div, h4, h5, td, th').each(function() {
          const txt = $(this).text().trim();
          if (txt === 'Название' || txt === 'Название рассылки' || txt.startsWith('Название')) {
            // Проверяем, что подпись не внутри блока фильтрации
            if ($(this).closest('[class*="filter"], [id*="filter"]').length === 0) {
              const $found = $(this).parent().closest('.form-group, .control-group, .row, .col, .form-item, tr, td, div')
                .find('input[type="text"], input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')
                .not('[name*="filter"], [id*="filter"], [class*="filter"], #main-header *, .header-new *, #sidebar *, .carrotquest *');
              if ($found.length) {
                $titleInput = $found.first();
                return false;
              }
            }
          }
        });
      }

      console.log('[FastExclude Debug] Найдено поле названия:', $titleInput.length, $titleInput[0]);

      if ($titleInput.length) {
        $titleInput.val(mailData.title);
        $titleInput.trigger('focus').trigger('input').trigger('change').trigger('blur');
        if ($titleInput[0]) {
          $titleInput[0].dispatchEvent(new Event('focus', { bubbles: true }));
          $titleInput[0].dispatchEvent(new Event('input', { bubbles: true }));
          $titleInput[0].dispatchEvent(new Event('change', { bubbles: true }));
          $titleInput[0].dispatchEvent(new Event('blur', { bubbles: true }));
        }

        // Поддержка плагина Polymer Form
        if (typeof $.fn.polymerForm === 'function') {
          try {
            $titleInput.polymerForm('val', mailData.title);
          } catch (e) {}
        }
        console.log('[FastExclude] Название рассылки успешно установлено:', mailData.title);
      } else {
        console.warn('[FastExclude] Поле "Название" не найдено на странице.');
      }
    }
  } catch (errTitle) {
    console.warn('[FastExclude] Ошибка при установке Названия:', errTitle);
  }

  // Функция преобразования Markdown и HTML разметки в HTML-параграфы для Quill
  function formatMessageToHtml(rawText) {
    if (!rawText) return '';
    let text = rawText;

    // Поддержка Markdown ссылок [текст](https://url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Жирный текст **текст** или __текст__
    text = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    text = text.replace(/__([^_]+)__/g, '<b>$1</b>');

    // Курсив *текст* или _текст_
    text = text.replace(/\*([^*]+)\*/g, '<i>$1</i>');
    text = text.replace(/_([^_]+)_/g, '<i>$1</i>');

    // Зачеркнутый ~~текст~~ или ~текст~
    text = text.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    text = text.replace(/~([^~]+)~/g, '<s>$1</s>');

    // Преобразуем переносы строк в параграфы Quill (<p>...</p>)
    const lines = text.split('\n');
    return lines.map(line => {
      const trimmed = line.trim();
      return `<p>${trimmed === '' ? '<br>' : line}</p>`;
    }).join('');
  }

  // 2. Ввод текста сообщения (безопасный DOM-метод Quill + EmojioneArea)
  try {
    if (mailData.message) {
      const formattedHtml = formatMessageToHtml(mailData.message);

      // 2a. Ищем Quill Editor
      const quillEl = document.getElementById('quill-editor') || document.querySelector('#quill-editor');
      console.log('[FastExclude Debug] Quill element:', quillEl);
      
      let quillSuccess = false;
      if (quillEl) {
        try {
          const Quill = window.Quill || (window.window && window.window.Quill);
          const quillInstance = Quill ? Quill.find(quillEl) : null;
          console.log('[FastExclude Debug] QuillInstance found:', !!quillInstance);
          
          if (quillInstance) {
            if (typeof quillInstance.clipboard?.dangerouslyPasteHTML === 'function') {
              quillInstance.clipboard.dangerouslyPasteHTML(0, formattedHtml);
              quillSuccess = true;
              console.log('[FastExclude] Успешно установлен форматированный текст через Quill clipboard API');
            } else if (quillInstance.root && typeof quillInstance.root === 'object') {
              quillInstance.root.innerHTML = formattedHtml;
              quillSuccess = true;
              console.log('[FastExclude] Успешно установлен форматированный текст через Quill root.innerHTML');
            } else if (typeof quillInstance.setText === 'function') {
              quillInstance.setText(mailData.message);
              quillSuccess = true;
            }
            if (typeof quillInstance.update === 'function') {
              quillInstance.update();
            }
          }
        } catch (e) {
          console.warn('[FastExclude] Ошибка Quill API:', e);
        }

        // Резервный DOM-метод для Quill
        try {
          const $qlEditor = $(quillEl).find('.ql-editor');
          if ($qlEditor.length) {
            $qlEditor.html(formattedHtml);
            $qlEditor.trigger('input').trigger('change').trigger('blur');
            console.log('[FastExclude] Резервная вставка форматированного текста в Quill DOM завершена.');
          }
        } catch (e) {
          console.warn('[FastExclude] Ошибка Quill DOM:', e);
        }
      }

      // Всегда заполняем скрытые инпуты/текстареа сообщения (для корректной отправки формы)
      const $formMsgFields = $('textarea, input[type="hidden"]').not('[name*="filter"], [id*="filter"], [class*="filter"], #main-header *, .header-new *, #sidebar *, .carrotquest *');
      let $msgField = $formMsgFields.filter('[name="message"], [name="text"]').first();
      if (!$msgField.length) {
        $msgField = $formMsgFields.filter('[name*="message"], [name*="text"]').first();
      }
      
      console.log('[FastExclude Debug] Скрытое поле сообщения:', $msgField.length, $msgField[0]);
      if ($msgField.length) {
        $msgField.val(formattedHtml);
        if (!$msgField.hasClass('emojionearea_2') && !$msgField.hasClass('emojionearea')) {
          $msgField.trigger('change');
        }
      }

      // 2b. На всякий случай заполняем EmojioneArea-редактор (если он используется вместо Quill)
      const $editor = $('.emojionearea-editor, .emojionearea .emojionearea-editor').not('[class*="filter"], #main-header *, .header-new *, #sidebar *, .carrotquest *');
      console.log('[FastExclude Debug] EmojioneArea-редактор:', $editor.length);
      if ($editor.length) {
        $editor.html(formattedHtml);
        $editor.closest('.emojionearea').removeClass('placeholder');
        $editor.trigger('input').trigger('keyup').trigger('blur');
      }
    }

    // 2c. Копирование вложений (фото/документы)
    try {
      if (mailData.attachments) {
        const $targetField = $('.js-messageField').first();
        if ($targetField.length) {
          if (mailData.attachments.dataItems) {
            $targetField.attr('data-items', mailData.attachments.dataItems);
          }
          if (mailData.attachments.html) {
            $targetField.html(mailData.attachments.html);
          }
          $targetField.trigger('change');
          console.log('[FastExclude] Вложения успешно скопированы из исходной вкладки.');
        }
      }
    } catch (errAttach) {
      console.warn('[FastExclude] Ошибка при копировании вложений:', errAttach);
    }
  } catch (errMsg) {
    console.warn('[FastExclude] Ошибка при установке Текста:', errMsg);
  }

  // 3. Установка даты и времени отправки (Формат DD.MM.YYYY HH:mm для Senler)
  try {
    if (mailData.datetime) {
      let ruDateStr = mailData.datetime;
      const dtParts = mailData.datetime.split('T');
      if (dtParts.length === 2) {
        const dParts = dtParts[0].split('-');
        if (dParts.length === 3) {
          ruDateStr = `${dParts[2]}.${dParts[1]}.${dParts[0]} ${dtParts[1]}`;
        }
      }

      // Исключаем инпуты фильтров даты
      const $formInputs = $('input').not('[name*="filter"], [id*="filter"], [class*="filter"], #main-header *, .header-new *, #sidebar *, .carrotquest *, .notifications-block *, .dropdown-menu *, #vk_api_transport *');
      let $dateInput = $formInputs.filter('[placeholder*="Дата отправления"], [placeholder*="дата отправления"], [placeholder*="отправления"], [placeholder*="Отправления"], [name="date"], [name="send_at"], [name*="date"], [name*="send"], [name*="time"], [type="datetime-local"], input.datetimepicker').first();

      if (!$dateInput.length) {
        $('label, span, div, td, th').each(function() {
          const txt = $(this).text().trim();
          if (txt.includes('Дата') || txt.includes('Время') || txt.includes('Отправить') || txt.includes('отправления') || txt.includes('рассылки')) {
            if ($(this).closest('[class*="filter"], [id*="filter"]').length === 0) {
              const $found = $(this).parent().closest('.form-group, .control-group, .row, .col, tr, td, div')
                .find('input')
                .not('[name*="filter"], [id*="filter"], [class*="filter"], #main-header *, .header-new *, #sidebar *, .carrotquest *');
              if ($found.length) {
                $dateInput = $found.first();
                return false;
              }
            }
          }
        });
      }

      console.log('[FastExclude Debug] Найдено поле даты:', $dateInput.length, $dateInput[0]);

      if ($dateInput.length) {
        $dateInput.val(ruDateStr);
        $dateInput.trigger('input').trigger('change').trigger('blur');
        if ($dateInput[0]) {
          $dateInput[0].dispatchEvent(new Event('input', { bubbles: true }));
          $dateInput[0].dispatchEvent(new Event('change', { bubbles: true }));
          $dateInput[0].dispatchEvent(new Event('blur', { bubbles: true }));
        }

        // Поддержка плагина Polymer Form для поля Даты
        if (typeof $.fn.polymerForm === 'function') {
          try {
            $dateInput.polymerForm('val', ruDateStr);
          } catch (e) {}
        }

        // Устанавливаем значение в плагине datetimepicker и принудительно скрываем календарь
        if (typeof $.fn.datetimepicker === 'function') {
          try {
            $dateInput.datetimepicker({ value: ruDateStr });
            $dateInput.datetimepicker('setValue', ruDateStr);
          } catch (e) {}
          try {
            $dateInput.datetimepicker('hide');
          } catch (e) {}
        }
        console.log('[FastExclude] Дата рассылки установлена:', ruDateStr);
      }
    }
  } catch (errDate) {
    console.warn('[FastExclude] Ошибка при установке Даты:', errDate);
  }

  // 4. Применение пресета исключений (если выбран пресет)
  let addedExclusions = 0;
  try {
    if (mailData.presetGroups && mailData.presetGroups.length > 0) {
      const res = await doExclusionInPage($, mailData.presetGroups, mailData.presetName);
      if (res && res.addedCount) {
        addedExclusions = res.addedCount;
      }
    }
  } catch (errEx) {
    console.warn('[FastExclude] Ошибка при установке Исключений:', errEx);
  }
  return { success: true, addedCount: addedExclusions };

  // Внутренний хелпер выбора групп-исключений для автономности функции
  async function doExclusionInPage($, targetGroupNames, presetName) {
    let $target = null;

    $('select').each(function() {
      const url = String($(this).attr('data-ajax--url') || $(this).data('ajax--url') || '');
      const name = String($(this).attr('name') || $(this).attr('id') || '');
      if ((url.includes('subscriptions') || url.includes('subscription')) && (name.includes('ignore') || name.includes('exclude'))) {
        $target = $(this);
        return false;
      }
    });

    if (!$target || !$target.length) {
      $('label, span, div, h4, h5, legend').each(function() {
        const text = $(this).text().trim();
        if (text.includes('За исключением') || text.includes('Исключить') || text.includes('Кроме')) {
          const $foundSelect = $(this).closest('.form-group, .control-group, .row, .col, .form-item, div, fieldset').find('select');
          if ($foundSelect.length > 0) {
            $target = $foundSelect.first();
            return false;
          }
        }
      });
    }

    if (!$target || !$target.length) {
      const $fallback = $('select[name="filterignore_subscription_id"], select[selectname="filterignore_subscription_id"], select[name="filterignore_subscription_id[]"]').first();
      if ($fallback.length > 0) $target = $fallback;
    }

    if (!$target || !$target.length) return { addedCount: 0 };

    const s2Instance = $target.data("select2");
    const ajaxConfig = s2Instance?.options?.get("ajax") || s2Instance?.options?.options?.ajax;
    let ajaxUrl = String(ajaxConfig?.url || $target.attr("data-ajax--url") || $target.data("ajax--url") || "").trim();

    if (ajaxUrl && ajaxUrl.startsWith('/')) ajaxUrl = window.location.origin + ajaxUrl;
    if (!ajaxUrl) return { addedCount: 0 };

    const clean = v => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();
    const simplify = v => clean(v)
      .replace(/ё/g, "е")
      .replace(/[«»"'`]/g, "")
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015-]/g, " ")
      .replace(/[(){}\[\],.;:+!?\\/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const allGroups = [];
    const fetchedIds = new Set();

    for (let page = 1; page <= 10; page++) {
      try {
        const response = await $.ajax({
          url: ajaxUrl,
          data: { page, q: '', term: '', _type: 'query' },
          dataType: 'json'
        });

        const items = response.results || response.items || response.data || [];
        if (!items || !items.length) break;

        let addedInPage = 0;
        for (const item of items) {
          const id = String(item.id || item.value || '');
          if (id && !fetchedIds.has(id)) {
            fetchedIds.add(id);
            allGroups.push(item);
            addedInPage++;
          }
        }
        if (addedInPage === 0) break;
      } catch (e) {
        break;
      }
    }

    $target.find('option').each(function() {
      const id = String(this.value || '');
      const text = String($(this).text() || '');
      if (id && !fetchedIds.has(id)) {
        fetchedIds.add(id);
        allGroups.push({ id, text });
      }
    });

    const selectedMap = new Map($target.find("option").map(function() { return [[String(this.value), this]]; }).get());
    let addedCount = 0;

    for (const name of targetGroupNames) {
      if (!name || !name.trim()) continue;

      const targetSimple = simplify(name);
      let match = allGroups.find(g => simplify(g.text || g.name || g.title) === targetSimple);

      if (!match) {
        match = allGroups.find(g => {
          const gSimple = simplify(g.text || g.name || g.title);
          return gSimple.includes(targetSimple) || targetSimple.includes(gSimple);
        });
      }

      if (match) {
        const id = String(match.id || match.value);
        const text = String(match.text || match.name || match.title);

        if (!selectedMap.has(id)) {
          const newOpt = new Option(text, id, true, true);
          $target.append(newOpt);
          selectedMap.set(id, newOpt);
          addedCount++;
        }
      }
    }

    $target.val(Array.from(selectedMap.keys()));
    $target.trigger('change').trigger('change.select2');
    if ($target[0]) {
      $target[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    return { addedCount };
  }
}
