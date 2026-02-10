class LogMessage {
  constructor(message, toolNames) {
    message = this.escapeHtml(message);
    const logLevel = this.determineLogLevel(message);
    const highlightedMessage = this.highlightToolNames(message, toolNames);
    this.$elem = $('<div>').addClass(`log-${logLevel}`).html(`${highlightedMessage}\n`);
  }

  determineLogLevel(message) {
    if (message.startsWith('DEBUG')) {
      return 'debug';
    } else if (message.startsWith('INFO')) {
      return 'info';
    } else if (message.startsWith('WARNING')) {
      return 'warning';
    } else if (message.startsWith('ERROR')) {
      return 'error';
    } else {
      return 'default';
    }
  }

  highlightToolNames(message, toolNames) {
    let highlightedMessage = message;
    toolNames.forEach((toolName) => {
      const regex = new RegExp(`\\b${toolName}\\b`, 'gi');
      highlightedMessage = highlightedMessage.replace(
        regex,
        `<span class="tool-name">${toolName}</span>`,
      );
    });
    return highlightedMessage;
  }

  escapeHtml(convertString) {
    if (typeof convertString !== 'string') return convertString;

    const patterns = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
      '`': '&#x60;',
    };

    return convertString.replace(/[<>&"'`]/g, (match) => patterns[match]);
  }
}

function updateThemeAwareImage($img, theme = null) {
  if (!theme) {
    const isDarkMode = $('html').data('theme') === 'dark';
    theme = isDarkMode ? 'dark' : 'light';
  }
  console.log('updating theme-aware image to theme:', theme);
  const newSrc = $img.data(`src-${theme}`);
  if (newSrc) {
    $img.attr('src', newSrc);
  }
}

class BannerRotation {
  constructor() {
    this.platinumIndex = 0;
    this.goldIndex = 0;
    this.platinumTimer = null;
    this.goldTimer = null;
    this.platinumInterval = 15000;
    this.goldInterval = 15000;

    this.init();
  }

  init() {
    this.loadBanners(() => {
      this.startPlatinumRotation();
      this.startGoldRotation();
    });
  }

  loadBanners(onSuccess) {
    $.ajax({
      url: 'https://oraios-software.de/serena-banners/manifest.php',
      type: 'GET',
      success: (response) => {
        console.log('Banners loaded:', response);

        function fillBanners($container, banners, className) {
          $.each(banners, (index, banner) => {
            const $img = $(`<img src="${banner.image}" alt="${banner.alt}" class="banner-image">`);
            if (banner.image_dark) {
              $img.addClass('theme-aware-img');
              $img.attr('data-src-dark', banner.image_dark);
              $img.attr('data-src-light', banner.image);
              updateThemeAwareImage($img);
            }
            const $anchor = $(`<a href="${banner.link}" target="_blank"></a>`);
            $anchor.append($img);
            const $banner = $(`<div class="${className}-slide" data-banner="${index + 1}"></div>`);
            $banner.append($anchor);
            if (index === 0) {
              $banner.addClass('active');
            }
            if (banner.border) {
              $img.addClass('banner-border');
            }
            $container.append($banner);
          });
        }

        fillBanners($('#gold-banners'), response.gold, 'gold-banner');
        fillBanners($('#platinum-banners'), response.platinum, 'platinum-banner');
        onSuccess();
      },
      error: (_xhr, _status, error) => {
        console.error('Error loading banners:', error);
      },
    });
  }

  startPlatinumRotation() {
    this.platinumTimer = setInterval(() => {
      this.rotatePlatinum('next');
    }, this.platinumInterval);
  }

  startGoldRotation() {
    this.goldTimer = setInterval(() => {
      this.rotateGold('next');
    }, this.goldInterval);
  }

  rotatePlatinum(direction) {
    const $slides = $('.platinum-banner-slide');
    const total = $slides.length;

    if (total === 0) return;

    // Remove active class from current slide
    $slides.eq(this.platinumIndex).removeClass('active');

    // Calculate next index
    if (direction === 'next') {
      this.platinumIndex = (this.platinumIndex + 1) % total;
    } else {
      this.platinumIndex = (this.platinumIndex - 1 + total) % total;
    }

    // Add active class to new slide
    $slides.eq(this.platinumIndex).addClass('active');

    // Reset timer
    clearInterval(this.platinumTimer);
    this.startPlatinumRotation();
  }

  rotateGold(direction) {
    const $groups = $('.gold-banner-slide');
    const total = $groups.length;

    if (total === 0) return;

    // Remove active class from current group
    $groups.eq(this.goldIndex).removeClass('active');

    // Calculate next index
    if (direction === 'next') {
      this.goldIndex = (this.goldIndex + 1) % total;
    } else {
      this.goldIndex = (this.goldIndex - 1 + total) % total;
    }

    // Add active class to new group
    $groups.eq(this.goldIndex).addClass('active');

    // Reset timer
    clearInterval(this.goldTimer);
    this.startGoldRotation();
  }
}

class Dashboard {
  constructor() {
    const self = this;

    // Page state
    this.currentPage = 'overview';
    this.configData = null;
    this.lastConfigDataJson = null; // Cache for comparison
    this.jetbrainsMode = false;
    this.activeProjectName = null;
    this.languageToRemove = null;
    this.currentMemoryName = null;
    this.originalMemoryContent = null;
    this.memoryContentDirty = false;
    this.memoryToDelete = null;
    this.isAddingLanguage = false;
    this.waitingForConfigPollingResult = false;
    this.waitingForExecutionsPollingResult = false;
    this.originalSerenaConfigContent = null;
    this.serenaConfigContentDirty = false;

    // Execution tracking
    this.cancelledExecutions = [];
    this.executionToCancel = null;

    // Tool names and stats
    this.toolNames = [];
    this.currentMaxIdx = -1;
    this.pollInterval = null;
    this.configPollInterval = null;
    this.executionsPollInterval = null;
    this.heartbeatFailureCount = 0;

    // jQuery elements
    this.$logContainer = $('#log-container');
    this.$errorContainer = $('#error-container');
    this.$copyLogsBtn = $('#copy-logs-btn');
    this.$menuToggle = $('#menu-toggle');
    this.$menuDropdown = $('#menu-dropdown');
    this.$menuShutdown = $('#menu-shutdown');
    this.$themeToggle = $('#theme-toggle');
    this.$themeIcon = $('#theme-icon');
    this.$themeText = $('#theme-text');
    this.$configDisplay = $('#config-display');
    this.$basicStatsDisplay = $('#basic-stats-display');
    this.$statsSection = $('#stats-section');
    this.$refreshStats = $('#refresh-stats');
    this.$clearStats = $('#clear-stats');
    this.$projectsDisplay = $('#projects-display');
    this.$projectsHeader = $('#projects-header');
    this.$availableToolsDisplay = $('#available-tools-display');
    this.$availableModesDisplay = $('#available-modes-display');
    this.$availableContextsDisplay = $('#available-contexts-display');
    this.$addLanguageModal = $('#add-language-modal');
    this.$modalLanguageSelect = $('#modal-language-select');
    this.$modalProjectName = $('#modal-project-name');
    this.$modalAddBtn = $('#modal-add-btn');
    this.$modalCancelBtn = $('#modal-cancel-btn');
    this.$modalClose = $('.modal-close');
    this.$removeLanguageModal = $('#remove-language-modal');
    this.$removeLanguageName = $('#remove-language-name');
    this.$removeModalOkBtn = $('#remove-modal-ok-btn');
    this.$removeModalCancelBtn = $('#remove-modal-cancel-btn');
    this.$modalCloseRemove = $('.modal-close-remove');
    this.$editMemoryModal = $('#edit-memory-modal');
    this.$editMemoryName = $('#edit-memory-name');
    this.$editMemoryContent = $('#edit-memory-content');
    this.$editMemorySaveBtn = $('#edit-memory-save-btn');
    this.$editMemoryCancelBtn = $('#edit-memory-cancel-btn');
    this.$modalCloseEditMemory = $('.modal-close-edit-memory');
    this.$deleteMemoryModal = $('#delete-memory-modal');
    this.$deleteMemoryName = $('#delete-memory-name');
    this.$deleteMemoryOkBtn = $('#delete-memory-ok-btn');
    this.$deleteMemoryCancelBtn = $('#delete-memory-cancel-btn');
    this.$modalCloseDeleteMemory = $('.modal-close-delete-memory');
    this.$createMemoryModal = $('#create-memory-modal');
    this.$createMemoryProjectName = $('#create-memory-project-name');
    this.$createMemoryNameInput = $('#create-memory-name-input');
    this.$createMemoryCreateBtn = $('#create-memory-create-btn');
    this.$createMemoryCancelBtn = $('#create-memory-cancel-btn');
    this.$modalCloseCreateMemory = $('.modal-close-create-memory');
    this.$activeExecutionQueueDisplay = $('#active-executions-display');
    this.$lastExecutionDisplay = $('#last-execution-display');
    this.$cancelledExecutionsDisplay = $('#cancelled-executions-display');
    this.$cancelExecutionModal = $('#cancel-execution-modal');
    this.$cancelExecutionOkBtn = $('#cancel-execution-ok-btn');
    this.$cancelExecutionCancelBtn = $('#cancel-execution-cancel-btn');
    this.$modalCloseCancelExecution = $('.modal-close-cancel-execution');
    this.$editSerenaConfigModal = $('#edit-serena-config-modal');
    this.$editSerenaConfigContent = $('#edit-serena-config-content');
    this.$editSerenaConfigSaveBtn = $('#edit-serena-config-save-btn');
    this.$editSerenaConfigCancelBtn = $('#edit-serena-config-cancel-btn');
    this.$modalCloseEditSerenaConfig = $('.modal-close-edit-serena-config');
    this.$newsSection = $('#news-section');
    this.$newsDisplay = $('#news-display');

    // Chart references
    this.countChart = null;
    this.tokensChart = null;
    this.inputChart = null;
    this.outputChart = null;

    // Register event handlers
    this.$copyLogsBtn.click(this.copyLogs.bind(this));
    this.$menuShutdown.click((e) => {
      e.preventDefault();
      self.shutdown();
    });
    this.$menuToggle.click(this.toggleMenu.bind(this));
    this.$themeToggle.click(this.toggleTheme.bind(this));
    this.$refreshStats.click(this.loadStats.bind(this));
    this.$clearStats.click(this.clearStats.bind(this));
    this.$modalAddBtn.click(this.addLanguageFromModal.bind(this));
    this.$modalCancelBtn.click(this.closeLanguageModal.bind(this));
    this.$modalClose.click(this.closeLanguageModal.bind(this));
    this.$removeModalOkBtn.click(this.confirmRemoveLanguageOk.bind(this));
    this.$removeModalCancelBtn.click(this.closeRemoveLanguageModal.bind(this));
    this.$modalCloseRemove.click(this.closeRemoveLanguageModal.bind(this));
    this.$editMemorySaveBtn.click(this.saveMemoryFromModal.bind(this));
    this.$editMemoryCancelBtn.click(this.closeEditMemoryModal.bind(this));
    this.$modalCloseEditMemory.click(this.closeEditMemoryModal.bind(this));
    this.$editMemoryContent.on('input', this.trackMemoryChanges.bind(this));
    this.$deleteMemoryOkBtn.click(this.confirmDeleteMemoryOk.bind(this));
    this.$deleteMemoryCancelBtn.click(this.closeDeleteMemoryModal.bind(this));
    this.$modalCloseDeleteMemory.click(this.closeDeleteMemoryModal.bind(this));
    this.$createMemoryCreateBtn.click(this.createMemoryFromModal.bind(this));
    this.$createMemoryCancelBtn.click(this.closeCreateMemoryModal.bind(this));
    this.$modalCloseCreateMemory.click(this.closeCreateMemoryModal.bind(this));
    this.$createMemoryNameInput.keypress((e) => {
      if (e.which === 13) {
        // Enter key
        e.preventDefault();
        self.createMemoryFromModal();
      }
    });
    this.$cancelExecutionOkBtn.click(this.confirmCancelExecutionOk.bind(this));
    this.$cancelExecutionCancelBtn.click(this.closeCancelExecutionModal.bind(this));
    this.$modalCloseCancelExecution.click(this.closeCancelExecutionModal.bind(this));
    this.$editSerenaConfigSaveBtn.click(this.saveSerenaConfigFromModal.bind(this));
    this.$editSerenaConfigCancelBtn.click(this.closeEditSerenaConfigModal.bind(this));
    this.$modalCloseEditSerenaConfig.click(this.closeEditSerenaConfigModal.bind(this));

    // Page navigation
    $('[data-page]').click(function (e) {
      e.preventDefault();
      const page = $(this).data('page');
      self.navigateToPage(page);
    });

    // Close menu when clicking outside
    $(document).click((e) => {
      if (!$(e.target).closest('.header-nav').length) {
        self.$menuDropdown.hide();
      }
    });

    // Close modals when clicking outside
    this.$addLanguageModal.click((e) => {
      if ($(e.target).hasClass('modal')) {
        self.closeLanguageModal();
      }
    });

    this.$removeLanguageModal.click((e) => {
      if ($(e.target).hasClass('modal')) {
        self.closeRemoveLanguageModal();
      }
    });

    this.$editMemoryModal.click((e) => {
      if ($(e.target).hasClass('modal')) {
        self.closeEditMemoryModal();
      }
    });

    this.$deleteMemoryModal.click((e) => {
      if ($(e.target).hasClass('modal')) {
        self.closeDeleteMemoryModal();
      }
    });

    this.$createMemoryModal.click((e) => {
      if ($(e.target).hasClass('modal')) {
        self.closeCreateMemoryModal();
      }
    });

    this.$editSerenaConfigModal.click((e) => {
      if ($(e.target).hasClass('modal')) {
        self.closeEditSerenaConfigModal();
      }
    });

    // Collapsible sections
    $('.collapsible-header').click(function () {
      const $header = $(this);
      const $content = $header.next('.collapsible-content');
      const $icon = $header.find('.toggle-icon');

      $content.slideToggle(300);
      $icon.toggleClass('expanded');
    });

    // Initialize theme
    this.initializeTheme();

    // Initialize banner rotation
    this.bannerRotation = new BannerRotation();

    // Add ESC key handler for closing modals
    $(document).keydown((e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (self.$addLanguageModal.is(':visible')) {
          self.closeLanguageModal();
        } else if (self.$removeLanguageModal.is(':visible')) {
          self.closeRemoveLanguageModal();
        } else if (self.$editMemoryModal.is(':visible')) {
          self.closeEditMemoryModal();
        } else if (self.$deleteMemoryModal.is(':visible')) {
          self.closeDeleteMemoryModal();
        } else if (self.$createMemoryModal.is(':visible')) {
          self.closeCreateMemoryModal();
        }
      }
    });

    // Initialize the application
    this.loadToolNames().then(() => {
      // Start on overview page
      self.loadNews();
      self.loadConfigOverview();
      self.startConfigPolling();
      self.startExecutionsPolling();
    });
    // Initialize heartbeat interval
    setInterval(this.heartbeat.bind(this), 250);
  }

  heartbeat() {
    $.ajax({
      url: '/heartbeat',
      type: 'GET',
      success: (_response) => {
        this.heartbeatFailureCount = 0;
      },
      error: (_xhr, _status, _error) => {
        this.heartbeatFailureCount++;
        console.error('Heartbeat failure; count = ', this.heartbeatFailureCount);
        if (this.heartbeatFailureCount >= 1) {
          console.log('Server appears to be down, closing tab');
          window.close();
        }
      },
    });
  }

  toggleMenu() {
    this.$menuDropdown.toggle();
  }

  navigateToPage(page) {
    // Hide menu
    this.$menuDropdown.hide();

    // Hide all pages
    $('.page-view').hide();

    // Show selected page
    $(`#page-${page}`).show();

    // Update menu active state
    $('[data-page]').removeClass('active');
    $(`[data-page="${page}"]`).addClass('active');

    // Update current page
    this.currentPage = page;

    // Stop all polling
    this.stopPolling();

    // Start appropriate polling for the page
    if (page === 'overview') {
      this.loadNews();
      this.loadConfigOverview();
      this.startConfigPolling();
      this.startExecutionsPolling();
    } else if (page === 'logs') {
      this.loadLogs();
    } else if (page === 'stats') {
      this.loadStats();
    }
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.configPollInterval) {
      clearInterval(this.configPollInterval);
      this.configPollInterval = null;
    }
    if (this.executionsPollInterval) {
      clearInterval(this.executionsPollInterval);
      this.executionsPollInterval = null;
    }
  }

  // ===== Config Overview Methods =====

  loadConfigOverview() {
    if (this.waitingForConfigPollingResult) {
      console.log('Still waiting for previous config poll result, skipping this poll');
      return;
    }
    this.waitingForConfigPollingResult = true;
    console.log('Polling for config overview...');
    $.ajax({
      url: '/get_config_overview',
      type: 'GET',
      success: (response) => {
        // Check if the config data has actually changed
        const currentConfigJson = JSON.stringify(response);
        const hasChanged = this.lastConfigDataJson !== currentConfigJson;

        if (hasChanged) {
          console.log('Config has changed, updating display');
          this.lastConfigDataJson = currentConfigJson;
          this.configData = response;
          this.jetbrainsMode = response.jetbrains_mode;
          this.activeProjectName = response.active_project.name;
          this.displayConfig(response);
          this.displayBasicStats(response.tool_stats_summary);
          this.displayProjects(response.registered_projects);
          this.displayAvailableTools(response.available_tools);
          this.displayAvailableModes(response.available_modes);
          this.displayAvailableContexts(response.available_contexts);
        } else {
          console.log('Config unchanged, skipping display update');
        }
      },
      error: (_xhr, _status, error) => {
        console.error('Error loading config overview:', error);
        this.$configDisplay.html('<div class="error-message">Error loading configuration</div>');
        this.$basicStatsDisplay.html('<div class="error-message">Error loading stats</div>');
        this.$projectsDisplay.html('<div class="error-message">Error loading projects</div>');
        this.$availableToolsDisplay.html('<div class="error-message">Error loading tools</div>');
        this.$availableModesDisplay.html('<div class="error-message">Error loading modes</div>');
        this.$availableContextsDisplay.html(
          '<div class="error-message">Error loading contexts</div>',
        );
      },
      complete: () => {
        this.waitingForConfigPollingResult = false;
      },
    });
  }

  startConfigPolling() {
    this.configPollInterval = setInterval(this.loadConfigOverview.bind(this), 1000);
  }

  startExecutionsPolling() {
    // Poll every 1 second for executions (independent of config polling)
    // This ensures stuck executions can still be cancelled even if config polling is blocked
    this.loadExecutions();
    this.executionsPollInterval = setInterval(() => {
      this.loadQueuedExecutions();
      this.loadLastExecution();
    }, 1000);
  }

  displayConfig(config) {
    try {
      // Check if tools and memories sections are currently expanded
      const $existingToolsContent = $('#tools-content');
      const $existingMemoriesContent = $('#memories-content');
      const wasToolsExpanded = $existingToolsContent.is(':visible');
      const wasMemoriesExpanded = $existingMemoriesContent.is(':visible');

      let html = '<div class="config-grid">';

      // Project info
      html += '<div class="config-label">Active Project:</div>';
      if (config.active_project.name && config.active_project.path) {
        const configPath = `${config.active_project.path}/.serena/project.yml`;
        html += `<div class="config-value"><span title="Project configuration in ${configPath}">${config.active_project.name}</span></div>`;
      } else {
        html += `<div class="config-value">${config.active_project.name || 'None'}</div>`;
      }

      html += '<div class="config-label">Languages:</div>';
      if (this.jetbrainsMode) {
        html += '<div class="config-value">Using JetBrains backend</div>';
      } else {
        html += '<div class="config-value">';
        if (config.languages && config.languages.length > 0) {
          html += '<div class="languages-container">';
          config.languages.forEach((language, _index) => {
            const isRemovable = config.languages.length > 1;
            html += `<div class="language-badge${isRemovable ? ' removable' : ''}">`;
            html += language;
            if (isRemovable) {
              html += `<span class="language-remove" data-language="${language}">&times;</span>`;
            }
            html += '</div>';
          });
          // Add the "Add Language" button inline with language badges (only if active project exists)
          if (config.active_project?.name) {
            // TODO: address after refactoring, it's not awesome to keep depending on state
            if (this.isAddingLanguage) {
              html += '<div id="add-language-spinner" class="language-spinner">';
            } else {
              html +=
                '<button id="add-language-btn" class="btn language-add-btn">+ Add Language</button>';
              html +=
                '<div id="add-language-spinner" class="language-spinner" style="display:none;">';
            }
            html += '<div class="spinner"></div>';
            html += '</div>';
          }
          html += '</div>';
        } else {
          html += 'N/A';
        }
        html += '</div>';
      }

      // Context info
      html += '<div class="config-label">Context:</div>';
      html += `<div class="config-value"><span title="${config.context.path}">${config.context.name}</span></div>`;

      // Modes info
      html += '<div class="config-label">Active Modes:</div>';
      html += '<div class="config-value">';
      if (config.modes.length > 0) {
        const modeSpans = config.modes.map(
          (mode) => `<span title="${mode.path}">${mode.name}</span>`,
        );
        html += modeSpans.join(', ');
      } else {
        html += 'None';
      }
      html += '</div>';

      // File Encoding info
      html += '<div class="config-label">File Encoding:</div>';
      html += `<div class="config-value">${config.encoding || 'N/A'}</div>`;

      // Current Client info
      html += '<div class="config-label">Current Client:</div>';
      html += `<div class="config-value">${config.current_client || 'None'}</div>`;

      html += '</div>';

      // Active tools - collapsible
      html += '<div style="margin-top: 20px;">';
      html +=
        '<h3 class="collapsible-header" id="tools-header" style="font-size: 16px; margin: 0;">';
      html += `<span>Active Tools (${config.active_tools.length})</span>`;
      html += `<span class="toggle-icon${wasToolsExpanded ? ' expanded' : ''}">▼</span>`;
      html += '</h3>';
      html += `<div class="collapsible-content tools-grid" id="tools-content" style="${wasToolsExpanded ? '' : 'display:none;'} margin-top: 10px;">`;
      config.active_tools.forEach((tool) => {
        html += `<div class="tool-item" title="${tool}">${tool}</div>`;
      });
      html += '</div>';
      html += '</div>';

      // Available memories - collapsible (show if memories exist or if project exists)
      if (config.active_project?.name) {
        html += '<div style="margin-top: 20px;">';
        html +=
          '<h3 class="collapsible-header" id="memories-header" style="font-size: 16px; margin: 0;">';
        const memoryCount = config.available_memories?.length || 0;
        html += `<span>Available Memories (${memoryCount})</span>`;
        html += `<span class="toggle-icon${wasMemoriesExpanded ? ' expanded' : ''}">▼</span>`;
        html += '</h3>';
        html += `<div class="collapsible-content memories-container" id="memories-content" style="${wasMemoriesExpanded ? '' : 'display:none;'} margin-top: 10px;">`;
        if (config.available_memories && config.available_memories.length > 0) {
          config.available_memories.forEach((memory) => {
            html += `<div class="memory-item removable" data-memory="${memory}">`;
            html += memory;
            html += `<span class="memory-remove" data-memory="${memory}">&times;</span>`;
            html += '</div>';
          });
        }
        // Add Create Memory button
        html += '<button id="create-memory-btn" class="memory-add-btn">+ Add Memory</button>';
        html += '</div>';
        html += '</div>';
      }

      // Configuration help link and edit config button
      html += '<div style="margin-top: 15px; display: flex; gap: 10px; align-items: center;">';
      html +=
        '<div style="flex: 1; padding: 10px; background: var(--bg-secondary); border-radius: 4px; font-size: 13px; border: 1px solid var(--border-color);">';
      html += '<span style="color: var(--text-muted);">📖</span> ';
      html +=
        '<a href="https://oraios.github.io/serena/02-usage/050_configuration.html" target="_blank" rel="noopener noreferrer" style="color: var(--btn-primary); text-decoration: none; font-weight: 500;">View Configuration Guide</a>';
      html += '</div>';
      html +=
        '<button id="edit-serena-config-btn" class="btn language-add-btn" style="white-space: nowrap; padding: 10px; ">Edit Global Serena Config</button>';
      html += '</div>';

      this.$configDisplay.html(html);

      // Attach event handlers for the dynamically created add language button
      $('#add-language-btn').click(this.openLanguageModal.bind(this));

      // Attach event handler for edit serena config button
      $('#edit-serena-config-btn').click(this.openEditSerenaConfigModal.bind(this));

      // Attach event handlers for language remove buttons
      const self = this;
      $('.language-remove').click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        const language = $(this).data('language');
        self.confirmRemoveLanguage(language);
      });

      // Attach event handlers for memory items
      $('.memory-item').click(function (e) {
        e.preventDefault();
        const memoryName = $(this).data('memory');
        self.openEditMemoryModal(memoryName);
      });

      // Attach event handlers for memory remove buttons
      $('.memory-remove').click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        const memoryName = $(this).data('memory');
        self.confirmDeleteMemory(memoryName);
      });

      // Attach event handler for create memory button
      $('#create-memory-btn').click(this.openCreateMemoryModal.bind(this));

      // Re-attach collapsible handler for the newly created tools header
      $('#tools-header').click(function () {
        const $header = $(this);
        const $content = $('#tools-content');
        const $icon = $header.find('.toggle-icon');

        $content.slideToggle(300);
        $icon.toggleClass('expanded');
      });

      // Re-attach collapsible handler for the newly created memories header
      $('#memories-header').click(function () {
        const $header = $(this);
        const $content = $('#memories-content');
        const $icon = $header.find('.toggle-icon');

        $content.slideToggle(300);
        $icon.toggleClass('expanded');
      });
    } catch (error) {
      console.error('Error in displayConfig:', error);
      this.$configDisplay.html(
        `<div class="error-message">Error displaying configuration: ${error.message}</div>`,
      );
    }
  }

  displayBasicStats(stats) {
    if (Object.keys(stats).length === 0) {
      this.$basicStatsDisplay.html(
        '<div class="no-stats-message">No tool usage stats collected yet.</div>',
      );
      return;
    }

    // Sort tools by call count (descending)
    const sortedTools = Object.keys(stats).sort((a, b) => {
      return stats[b].num_calls - stats[a].num_calls;
    });

    const maxCalls = Math.max(...sortedTools.map((tool) => stats[tool].num_calls));

    let html = '';
    sortedTools.forEach((toolName) => {
      const count = stats[toolName].num_calls;
      const percentage = maxCalls > 0 ? (count / maxCalls) * 100 : 0;

      html += '<div class="stat-bar-container">';
      html += `<div class="stat-tool-name" title="${toolName}">${toolName}</div>`;
      html += '<div class="bar-wrapper">';
      html += `<div class="bar" style="width: ${percentage}%"></div>`;
      html += '</div>';
      html += `<div class="stat-count">${count}</div>`;
      html += '</div>';
    });

    this.$basicStatsDisplay.html(html);
  }

  displayProjects(projects) {
    if (!projects || projects.length === 0) {
      this.$projectsDisplay.html('<div class="no-stats-message">No projects registered.</div>');
      return;
    }

    let html = '';
    projects.forEach((project) => {
      const activeClass = project.is_active ? ' active' : '';
      html += `<div class="project-item${activeClass}">`;
      html += `<div class="project-name" title="${project.name}">${project.name}</div>`;
      html += `<div class="project-path" title="${project.path}">${project.path}</div>`;
      html += '</div>';
    });

    this.$projectsDisplay.html(html);
  }

  displayAvailableTools(tools) {
    if (!tools || tools.length === 0) {
      this.$availableToolsDisplay.html('<div class="no-stats-message">All tools are active.</div>');
      return;
    }

    let html = '';
    tools.forEach((tool) => {
      html += `<div class="info-item" title="${tool.name}">${tool.name}</div>`;
    });

    this.$availableToolsDisplay.html(html);
  }

  displayAvailableModes(modes) {
    if (!modes || modes.length === 0) {
      this.$availableModesDisplay.html('<div class="no-stats-message">No modes available.</div>');
      return;
    }

    let html = '';
    modes.forEach((mode) => {
      const activeClass = mode.is_active ? ' active' : '';
      html += `<div class="info-item${activeClass}" title="${mode.path}">${mode.name}</div>`;
    });

    this.$availableModesDisplay.html(html);
  }

  displayAvailableContexts(contexts) {
    if (!contexts || contexts.length === 0) {
      this.$availableContextsDisplay.html(
        '<div class="no-stats-message">No contexts available.</div>',
      );
      return;
    }

    let html = '';
    contexts.forEach((context) => {
      const activeClass = context.is_active ? ' active' : '';
      html += `<div class="info-item${activeClass}" title="${context.path}">${context.name}</div>`;
    });

    this.$availableContextsDisplay.html(html);
  }

  // ===== Executions Methods =====

  loadQueuedExecutions() {
    $.ajax({
      url: '/queued_task_executions',
      type: 'GET',
      success: (response) => {
        if (response.status === 'success') {
          this.displayActiveExecutionsQueue(response.queued_executions || []);
        } else {
          console.error('Error loading executions:', response.message);
        }
      },
      error: (_xhr, _status, error) => {
        console.error('Error loading executions:', error);
        this.$activeExecutionQueueDisplay.html(
          '<div class="error-message">Error loading executions</div>',
        );
      },
    });
  }

  loadLastExecution() {
    $.ajax({
      url: '/last_execution',
      type: 'GET',
      success: (response) => {
        if (response.status === 'success') {
          if (response.last_execution?.logged) {
            this.displayLastExecution(response.last_execution);
          }
        } else {
          console.error('Error loading last execution:', response.message);
        }
      },
      error: (_xhr, _status, error) => {
        console.error('Error loading last execution:', error);
        this.$lastExecutionDisplay.html(
          '<div class="error-message">Error loading last execution</div>',
        );
      },
    });
  }

  loadExecutions() {
    if (this.waitingForExecutionsPollingResult) {
      console.log('Still waiting for previous executions poll result, skipping this poll');
    } else {
      this.waitingForExecutionsPollingResult = true;
      console.log('Polling for executions...');
      this.loadQueuedExecutions();
      this.loadLastExecution();
    }
  }

  displayActiveExecutionsQueue(executions) {
    if (!executions || executions.length === 0) {
      return;
    }

    let html = '<div class="execution-list">';
    const self = this;

    executions.forEach((execution) => {
      const isRunning = execution.is_running;
      const logged = execution.logged;

      if (!logged) {
        return; // Skip unlogged executions
      }

      let itemClass = 'execution-item';
      if (isRunning) {
        itemClass += ' running';
      }

      // Escape JSON for HTML attribute - replace single quotes and use HTML entities
      const executionJson = JSON.stringify(execution).replace(/'/g, '&#39;');

      html += `<div class="${itemClass}" data-task-id="${execution.task_id}" data-execution='${executionJson}'>`;

      if (isRunning) {
        html += '<div class="execution-spinner"></div>';
      }

      html += `<div class="execution-name">${self.escapeHtml(execution.name)}</div>`;

      if (isRunning) {
        html += `<div class="execution-meta">#${execution.task_id}</div>`;
      } else {
        html += `<div class="execution-meta">queued · #${execution.task_id}</div>`;
      }

      html += `<button class="execution-cancel-btn" data-task-id="${execution.task_id}" data-is-running="${isRunning}">✕</button>`;
      html += '</div>';
    });

    html += '</div>';
    this.$activeExecutionQueueDisplay.html(html);

    // Attach event handlers for cancel buttons
    $('.execution-cancel-btn').click(function (e) {
      e.preventDefault();
      console.log('Cancel button clicked');
      const $item = $(this).closest('.execution-item');
      console.log('Found item:', $item.length);
      const executionDataStr = $item.attr('data-execution');
      console.log('Execution data string:', executionDataStr);
      if (executionDataStr) {
        // Unescape HTML entities
        const unescapedStr = executionDataStr.replace(/&#39;/g, "'");
        const executionData = JSON.parse(unescapedStr);
        console.log('Parsed execution data:', executionData);
        self.confirmCancelExecution(executionData);
      } else {
        console.error('No execution data found on element');
      }
    });

    // Update cancelled executions display
    this.displayCancelledExecutions(executions);
  }

  displayLastExecution(execution) {
    if (!execution) {
      this.$lastExecutionDisplay.html('<div class="no-stats-message">No executions yet.</div>');
      return;
    }

    const isSuccess = execution.finished_successfully;
    let html = `<div class="last-execution-container${isSuccess ? '' : ' error'}">`;

    html += '<div class="last-execution-icon-container">';
    html += isSuccess ? '✓' : '✕';
    html += '</div>';

    html += '<div class="last-execution-body">';
    html += `<div class="last-execution-status">${isSuccess ? 'Succeeded' : 'Failed'}</div>`;
    html += `<div class="last-execution-name">${this.escapeHtml(execution.name)}</div>`;
    html += '</div>';

    html += `<div class="execution-meta">#${execution.task_id}</div>`;
    html += '</div>';

    this.$lastExecutionDisplay.html(html);
  }

  displayCancelledExecutions() {
    const cancelledExecs = this.cancelledExecutions;

    if (cancelledExecs.length === 0) {
      // Hide the cancelled executions section
      $('.executions-section').eq(2).hide();
      return;
    }

    // Show the cancelled executions section
    $('.executions-section').eq(2).show();

    let html = '<div class="execution-list">';

    cancelledExecs.forEach((execution) => {
      const isAbandoned = execution.is_running;

      html += `<div class="execution-item ${isAbandoned ? 'abandoned' : 'cancelled'}">`;
      html += `<div class="execution-icon ${isAbandoned ? 'abandoned' : 'cancelled'}">`;
      html += isAbandoned ? '!' : '✕';
      html += '</div>';
      html += `<div class="execution-name">${this.escapeHtml(execution.name)}</div>`;
      html += `<div class="execution-meta">${isAbandoned ? 'abandoned · ' : ''}#${execution.task_id}</div>`;
      html += '</div>';
    });

    html += '</div>';
    this.$cancelledExecutionsDisplay.html(html);
  }

  confirmCancelExecution(executionData) {
    console.log('confirmCancelExecution called with:', executionData);
    this.executionToCancel = executionData;

    if (executionData.is_running) {
      // Show modal for running executions
      console.log('Showing modal for running execution');
      this.$cancelExecutionModal.fadeIn(200);
    } else {
      // Directly cancel queued executions
      console.log('Directly cancelling queued execution');
      this.cancelExecution(executionData);
    }
  }

  confirmCancelExecutionOk() {
    if (this.executionToCancel) {
      this.cancelExecution(this.executionToCancel);
    }
    this.closeCancelExecutionModal();
  }

  cancelExecution(executionData) {
    console.log('cancelExecution called with full execution data:', executionData);
    console.log('Attempting to cancel task:', executionData.task_id);

    // Call backend API to cancel the task
    $.ajax({
      url: '/cancel_task_execution',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        task_id: executionData.task_id,
      }),
      success: (response) => {
        console.log('Cancel task response:', response);

        if (response.status === 'error') {
          console.error('Backend returned error status:', response.message);
          alert(`Error cancelling task: ${response.message}`);
          return;
        }

        if (response.status === 'success') {
          if (response.was_cancelled) {
            console.log(`Task ${executionData.task_id} was successfully cancelled`);
            // Add to cancelled list (only managed in JS, not persisted)
            const alreadyCancelled = this.cancelledExecutions.some(
              (exec) => exec.task_id === executionData.task_id,
            );
            if (!alreadyCancelled) {
              console.log('Adding execution to cancelled list:', executionData);
              this.cancelledExecutions.push(executionData);
              console.log('Cancelled executions array now contains:', this.cancelledExecutions);
            } else {
              console.log('Execution already in cancelled list');
            }
          } else {
            console.log(
              `Task ${executionData.task_id} could not be cancelled (may have already completed). ${response.message}`,
            );
          }
          // Refresh display regardless
          this.loadQueuedExecutions();
        } else {
          console.error('Unexpected response status:', response.status);
          alert('Unexpected response from server');
        }
      },
      error: (xhr, status, error) => {
        console.error('AJAX error cancelling task:');
        console.error('  Status:', status);
        console.error('  Error:', error);
        console.error('  XHR:', xhr);
        console.error('  Response:', xhr.responseText);

        let errorMessage = error;
        if (xhr.responseJSON?.message) {
          errorMessage = xhr.responseJSON.message;
        } else if (xhr.responseText) {
          errorMessage = xhr.responseText;
        }

        alert(`Error cancelling task: ${errorMessage}`);
      },
    });
  }

  closeCancelExecutionModal() {
    this.$cancelExecutionModal.fadeOut(200);
    this.executionToCancel = null;
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return text;

    const patterns = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
      '`': '&#x60;',
    };

    return text.replace(/[<>&"'`]/g, (match) => patterns[match]);
  }

  // ===== Logs Methods =====

  displayLogMessage(message) {
    this.$logContainer.append(new LogMessage(message, this.toolNames).$elem);
  }

  loadToolNames() {
    return $.ajax({
      url: '/get_tool_names',
      type: 'GET',
      success: (response) => {
        this.toolNames = response.tool_names || [];
        console.log('Loaded tool names:', this.toolNames);
      },
      error: (_xhr, _status, error) => {
        console.error('Error loading tool names:', error);
      },
    });
  }

  updateTitle(activeProject) {
    document.title = activeProject ? `${activeProject} – Serena Dashboard` : 'Serena Dashboard';
  }

  copyLogs() {
    const logText = this.$logContainer.text();

    if (!logText) {
      alert('No logs to copy');
      return;
    }

    // Use the Clipboard API to copy text
    navigator.clipboard
      .writeText(logText)
      .then(() => {
        // Visual feedback - temporarily change icon to grey checkmark
        const originalHtml = this.$copyLogsBtn.html();
        const checkmarkSvg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="copy-logs-text">copy logs</span>';
        this.$copyLogsBtn.html(checkmarkSvg);

        setTimeout(() => {
          this.$copyLogsBtn.html(originalHtml);
        }, 1500);
      })
      .catch((err) => {
        console.error('Failed to copy logs:', err);
        alert('Failed to copy logs to clipboard');
      });
  }

  loadLogs() {
    console.log('Loading logs');

    this.$errorContainer.empty();

    // Make API call
    $.ajax({
      url: '/get_log_messages',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        start_idx: 0,
      }),
      success: (response) => {
        // Clear existing logs
        this.$logContainer.empty();

        // Update max_idx
        this.currentMaxIdx = response.max_idx || -1;

        // Display each log message
        if (response.messages && response.messages.length > 0) {
          response.messages.forEach((message) => {
            this.displayLogMessage(message);
          });

          // Auto-scroll to bottom
          const logContainer = $('#log-container')[0];
          logContainer.scrollTop = logContainer.scrollHeight;
        } else {
          $('#log-container').html('<div class="loading">No log messages found.</div>');
        }

        this.updateTitle(response.active_project);

        // Start periodic polling for new logs
        this.startPeriodicPolling();
      },
      error: (xhr, _status, error) => {
        console.error('Error loading logs:', error);
        this.$errorContainer.html(
          `<div class="error-message">Error loading logs: ${xhr.responseJSON ? xhr.responseJSON.detail : error}</div>`,
        );
      },
    });
  }

  pollForNewLogs() {
    console.log('Polling logs', this.currentMaxIdx);
    $.ajax({
      url: '/get_log_messages',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        start_idx: this.currentMaxIdx + 1,
      }),
      success: (response) => {
        // Only append new messages if we have any
        if (response.messages && response.messages.length > 0) {
          let wasAtBottom = false;
          const logContainer = $('#log-container')[0];

          // Check if user was at the bottom before adding new logs
          if (logContainer.scrollHeight > 0) {
            wasAtBottom =
              logContainer.scrollTop + logContainer.clientHeight >= logContainer.scrollHeight - 10;
          }

          // Append new messages
          response.messages.forEach((message) => {
            this.displayLogMessage(message);
          });

          // Update max_idx
          this.currentMaxIdx = response.max_idx || this.currentMaxIdx;

          // Auto-scroll to bottom if user was already at bottom
          if (wasAtBottom) {
            logContainer.scrollTop = logContainer.scrollHeight;
          }
        } else {
          // Update max_idx even if no new messages
          this.currentMaxIdx = response.max_idx || this.currentMaxIdx;
        }

        // Update window title with active project
        this.updateTitle(response.active_project);
      },
    });
  }

  startPeriodicPolling() {
    // Clear any existing interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    // Start polling every second (1000ms)
    this.pollInterval = setInterval(this.pollForNewLogs.bind(this), 1000);
  }

  // ===== Stats Methods =====

  loadStats() {
    $.when(
      $.ajax({ url: '/get_tool_stats', type: 'GET' }),
      $.ajax({
        url: '/get_token_count_estimator_name',
        type: 'GET',
      }),
    )
      .done((statsResp, estimatorResp) => {
        const stats = statsResp[0].stats;
        const tokenCountEstimatorName = estimatorResp[0].token_count_estimator_name;
        this.displayStats(stats, tokenCountEstimatorName);
      })
      .fail(() => {
        console.error('Error loading stats or estimator name');
      });
  }

  clearStats() {
    $.ajax({
      url: '/clear_tool_stats',
      type: 'POST',
      success: () => {
        this.loadStats();
      },
      error: (_xhr, _status, error) => {
        console.error('Error clearing stats:', error);
      },
    });
  }

  displayStats(stats, tokenCountEstimatorName) {
    const names = Object.keys(stats);
    // If no stats collected
    if (names.length === 0) {
      // hide summary, charts, estimator name
      $('#stats-summary').hide();
      $('#estimator-name').hide();
      $('.charts-container').hide();
      // show no-stats message
      $('#no-stats-message').show();
      return;
    } else {
      // Ensure everything is visible
      $('#estimator-name').show();
      $('#stats-summary').show();
      $('.charts-container').show();
      $('#no-stats-message').hide();
    }

    $('#estimator-name').html(`<strong>Token count estimator:</strong> ${tokenCountEstimatorName}`);

    const counts = names.map((n) => stats[n].num_times_called);
    const inputTokens = names.map((n) => stats[n].input_tokens);
    const outputTokens = names.map((n) => stats[n].output_tokens);
    const _totalTokens = names.map((n) => stats[n].input_tokens + stats[n].output_tokens);

    // Calculate totals for summary table
    const totalCalls = counts.reduce((sum, count) => sum + count, 0);
    const totalInputTokens = inputTokens.reduce((sum, tokens) => sum + tokens, 0);
    const totalOutputTokens = outputTokens.reduce((sum, tokens) => sum + tokens, 0);

    // Generate consistent colors for tools
    const colors = this.generateColors(names.length);

    const countCtx = document.getElementById('count-chart');
    const tokensCtx = document.getElementById('tokens-chart');
    const inputCtx = document.getElementById('input-chart');
    const outputCtx = document.getElementById('output-chart');

    if (this.countChart) this.countChart.destroy();
    if (this.tokensChart) this.tokensChart.destroy();
    if (this.inputChart) this.inputChart.destroy();
    if (this.outputChart) this.outputChart.destroy();

    // Update summary table
    this.updateSummaryTable(totalCalls, totalInputTokens, totalOutputTokens);

    // Register datalabels plugin
    Chart.register(ChartDataLabels);

    // Get theme-aware colors
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? '#444' : '#ddd';

    // Tool calls pie chart
    this.countChart = new Chart(countCtx, {
      type: 'pie',
      data: {
        labels: names,
        datasets: [
          {
            data: counts,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            labels: {
              color: textColor,
            },
          },
          datalabels: {
            display: true,
            color: 'white',
            font: { weight: 'bold' },
            formatter: (value) => value,
          },
        },
      },
    });

    // Input tokens pie chart
    this.inputChart = new Chart(inputCtx, {
      type: 'pie',
      data: {
        labels: names,
        datasets: [
          {
            data: inputTokens,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            labels: {
              color: textColor,
            },
          },
          datalabels: {
            display: true,
            color: 'white',
            font: { weight: 'bold' },
            formatter: (value) => value,
          },
        },
      },
    });

    // Output tokens pie chart
    this.outputChart = new Chart(outputCtx, {
      type: 'pie',
      data: {
        labels: names,
        datasets: [
          {
            data: outputTokens,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            labels: {
              color: textColor,
            },
          },
          datalabels: {
            display: true,
            color: 'white',
            font: { weight: 'bold' },
            formatter: (value) => value,
          },
        },
      },
    });

    // Combined input/output tokens bar chart
    this.tokensChart = new Chart(tokensCtx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [
          {
            label: 'Input Tokens',
            data: inputTokens,
            backgroundColor: colors.map((color) => `${color}80`), // Semi-transparent
            borderColor: colors,
            borderWidth: 2,
            borderSkipped: false,
            yAxisID: 'y',
          },
          {
            label: 'Output Tokens',
            data: outputTokens,
            backgroundColor: colors,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: textColor,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
            },
            grid: {
              color: gridColor,
            },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Input Tokens',
              color: textColor,
            },
            ticks: {
              color: textColor,
            },
            grid: {
              color: gridColor,
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Output Tokens',
              color: textColor,
            },
            ticks: {
              color: textColor,
            },
            grid: {
              drawOnChartArea: false,
              color: gridColor,
            },
          },
        },
      },
    });
  }

  generateColors(count) {
    const colors = [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#FF6384',
      '#C9CBCF',
      '#4BC0C0',
      '#FF6384',
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  }

  updateSummaryTable(totalCalls, totalInputTokens, totalOutputTokens) {
    const tableHtml = `
            <table class="stats-summary">
                <tr><th>Metric</th><th>Total</th></tr>
                <tr><td>Tool Calls</td><td>${totalCalls}</td></tr>
                <tr><td>Input Tokens</td><td>${totalInputTokens}</td></tr>
                <tr><td>Output Tokens</td><td>${totalOutputTokens}</td></tr>
                <tr><td>Total Tokens</td><td>${totalInputTokens + totalOutputTokens}</td></tr>
            </table>
        `;
    $('#stats-summary').html(tableHtml);
  }

  // ===== Theme Methods =====

  initializeTheme() {
    // Check if user has manually set a theme preference
    const savedTheme = localStorage.getItem('serena-theme');

    if (savedTheme) {
      // User has manually set a preference, use it
      this.setTheme(savedTheme);
    } else {
      // No manual preference, detect system color scheme
      this.detectSystemTheme();
    }

    // Listen for system theme changes
    this.setupSystemThemeListener();
  }

  detectSystemTheme() {
    // Check if system prefers dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'dark' : 'light';
    this.setTheme(theme);
  }

  setupSystemThemeListener() {
    // Listen for changes in system color scheme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('serena-theme');
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.setTheme(newTheme);
      }
    };

    // Add listener for system theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    // When user manually toggles, save their preference
    localStorage.setItem('serena-theme', newTheme);
    this.setTheme(newTheme);
  }

  /**
   * @param theme {'light' | 'dark'}
   */
  setTheme(theme) {
    // Set the theme on the document element
    document.documentElement.setAttribute('data-theme', theme);

    // Update the theme toggle button
    if (theme === 'dark') {
      this.$themeIcon.text('☀️');
      this.$themeText.text('Light');
    } else {
      this.$themeIcon.text('🌙');
      this.$themeText.text('Dark');
    }

    // Update theme-aware images
    $('.theme-aware-img').each(function () {
      const $img = $(this);
      updateThemeAwareImage($img, theme);
    });

    // Save to localStorage
    localStorage.setItem('serena-theme', theme);

    // Update charts if they exist
    this.updateChartsTheme();
  }

  updateChartsTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? '#444' : '#ddd';

    // Update existing charts if they exist and have the scales property
    if (this.countChart?.options.plugins) {
      if (this.countChart.options.plugins.legend) {
        this.countChart.options.plugins.legend.labels.color = textColor;
      }
      this.countChart.update();
    }

    if (this.inputChart?.options.plugins) {
      if (this.inputChart.options.plugins.legend) {
        this.inputChart.options.plugins.legend.labels.color = textColor;
      }
      this.inputChart.update();
    }

    if (this.outputChart?.options.plugins) {
      if (this.outputChart.options.plugins.legend) {
        this.outputChart.options.plugins.legend.labels.color = textColor;
      }
      this.outputChart.update();
    }

    if (this.tokensChart?.options.scales) {
      this.tokensChart.options.scales.x.ticks.color = textColor;
      this.tokensChart.options.scales.y.ticks.color = textColor;
      this.tokensChart.options.scales.y1.ticks.color = textColor;
      this.tokensChart.options.scales.x.grid.color = gridColor;
      this.tokensChart.options.scales.y.grid.color = gridColor;
      this.tokensChart.options.scales.y1.grid.color = gridColor;
      this.tokensChart.options.scales.y.title.color = textColor;
      this.tokensChart.options.scales.y1.title.color = textColor;
      if (this.tokensChart.options.plugins?.legend) {
        this.tokensChart.options.plugins.legend.labels.color = textColor;
      }
      this.tokensChart.update();
    }
  }

  // ===== Language Management Methods =====

  confirmRemoveLanguage(language) {
    // Store the language to remove
    this.languageToRemove = language;

    // Set language name in modal
    this.$removeLanguageName.text(language);

    // Show modal
    this.$removeLanguageModal.fadeIn(200);
  }

  closeRemoveLanguageModal() {
    this.$removeLanguageModal.fadeOut(200);
    this.languageToRemove = null;
  }

  confirmRemoveLanguageOk() {
    if (this.languageToRemove) {
      this.removeLanguage(this.languageToRemove);
      this.closeRemoveLanguageModal();
    }
  }

  removeLanguage(language) {
    $.ajax({
      url: '/remove_language',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        language: language,
      }),
      success: (response) => {
        if (response.status === 'success') {
          // Reload config to show updated language list
          this.loadConfigOverview();
        } else {
          alert(`Error removing language ${language}: ${response.message}`);
        }
      },
      error: (xhr, _status, error) => {
        console.error('Error removing language:', error);
        alert(`Error removing language: ${xhr.responseJSON ? xhr.responseJSON.message : error}`);
      },
    });
  }

  openLanguageModal() {
    // Set project name in modal
    this.$modalProjectName.text(this.activeProjectName || 'Unknown');

    // Load available languages into modal dropdown
    this.loadAvailableLanguages();

    // Show modal
    this.$addLanguageModal.fadeIn(200);
  }

  closeLanguageModal() {
    this.$addLanguageModal.fadeOut(200);
    this.$modalLanguageSelect.empty();
    this.$modalAddBtn.prop('disabled', false).text('Add Language');
  }

  loadAvailableLanguages() {
    $.ajax({
      url: '/get_available_languages',
      type: 'GET',
      success: (response) => {
        const languages = response.languages || [];
        // Clear all existing options
        this.$modalLanguageSelect.empty();

        if (languages.length === 0) {
          // Show message if no languages available
          this.$modalLanguageSelect.append(
            $('<option>').val('').text('No languages available to add'),
          );
          this.$modalAddBtn.prop('disabled', true);
        } else {
          // Add language options
          languages.forEach((language) => {
            this.$modalLanguageSelect.append($('<option>').val(language).text(language));
          });
          this.$modalAddBtn.prop('disabled', false);
        }
      },
      error: (_xhr, _status, error) => {
        console.error('Error loading available languages:', error);
      },
    });
  }

  addLanguageFromModal() {
    const selectedLanguage = this.$modalLanguageSelect.val();
    if (!selectedLanguage) {
      alert('No language selected or no languages available to add');
      return;
    }

    // Close modal immediately
    this.closeLanguageModal();

    // Hide the inline add language button and show spinner
    $('#add-language-btn').hide();
    $('#add-language-spinner').show();
    this.isAddingLanguage = true;

    $.ajax({
      url: '/add_language',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        language: selectedLanguage,
      }),
      success: (response) => {
        if (response.status === 'success') {
          console.log('Language added successfully');
        } else {
          alert(`Error adding language ${selectedLanguage}: ${response.message}`);
          // Restore button visibility on error
          $('#add-language-btn').show();
          $('#add-language-spinner').hide();
        }
      },
      error: (xhr, _status, error) => {
        console.error('Error adding language:', error);
        alert(`Error adding language: ${xhr.responseJSON ? xhr.responseJSON.message : error}`);
        // Restore button visibility on error
        $('#add-language-btn').show();
        $('#add-language-spinner').hide();
      },
      complete: () => {
        this.isAddingLanguage = false;
        this.loadConfigOverview();
      },
    });
  }

  // ===== Memory Editing Methods =====

  openEditMemoryModal(memoryName) {
    this.currentMemoryName = memoryName;
    this.memoryContentDirty = false;

    // Set memory name in modal
    this.$editMemoryName.text(memoryName);

    // Load memory content
    $.ajax({
      url: '/get_memory',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        memory_name: memoryName,
      }),
      success: (response) => {
        if (response.status === 'error') {
          alert(`Error: ${response.message}`);
          return;
        }
        this.originalMemoryContent = response.content;
        this.$editMemoryContent.val(response.content);
        this.memoryContentDirty = false;
        this.$editMemoryModal.fadeIn(200);
      },
      error: (xhr, _status, error) => {
        console.error('Error loading memory:', error);
        alert(`Error loading memory: ${xhr.responseJSON ? xhr.responseJSON.message : error}`);
      },
    });
  }

  closeEditMemoryModal() {
    // Check if there are unsaved changes
    if (this.memoryContentDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }

    this.$editMemoryModal.fadeOut(200);
    this.currentMemoryName = null;
    this.originalMemoryContent = null;
    this.memoryContentDirty = false;
  }

  trackMemoryChanges() {
    const currentContent = this.$editMemoryContent.val();
    this.memoryContentDirty = currentContent !== this.originalMemoryContent;
  }

  saveMemoryFromModal() {
    const memoryName = this.currentMemoryName;
    const content = this.$editMemoryContent.val();

    if (!memoryName) {
      alert('No memory selected');
      return;
    }

    // Disable button during request
    this.$editMemorySaveBtn.prop('disabled', true).text('Saving...');

    $.ajax({
      url: '/save_memory',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        memory_name: memoryName,
        content: content,
      }),
      success: (response) => {
        if (response.status === 'success') {
          // Update original content and reset dirty flag
          this.originalMemoryContent = content;
          this.memoryContentDirty = false;
          // Close modal
          this.$editMemoryModal.fadeOut(200);
          this.currentMemoryName = null;
        } else {
          alert(`Error: ${response.message}`);
        }
      },
      error: (xhr, _status, error) => {
        console.error('Error saving memory:', error);
        alert(`Error saving memory: ${xhr.responseJSON ? xhr.responseJSON.message : error}`);
      },
      complete: () => {
        // Re-enable button
        this.$editMemorySaveBtn.prop('disabled', false).text('Save');
      },
    });
  }

  confirmDeleteMemory(memoryName) {
    // Set memory name to delete
    this.memoryToDelete = memoryName;

    // Set memory name in modal
    this.$deleteMemoryName.text(memoryName);

    // Show modal
    this.$deleteMemoryModal.fadeIn(200);
  }

  closeDeleteMemoryModal() {
    this.$deleteMemoryModal.fadeOut(200);
    this.memoryToDelete = null;
  }

  confirmDeleteMemoryOk() {
    if (this.memoryToDelete) {
      this.deleteMemory(this.memoryToDelete);
      this.closeDeleteMemoryModal();
    }
  }

  deleteMemory(memoryName) {
    $.ajax({
      url: '/delete_memory',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        memory_name: memoryName,
      }),
      success: (response) => {
        if (response.status === 'success') {
          // Reload config to show updated memory list
          this.loadConfigOverview();
        } else {
          alert(`Error: ${response.message}`);
        }
      },
      error: (xhr, _status, error) => {
        console.error('Error deleting memory:', error);
        alert(`Error deleting memory: ${xhr.responseJSON ? xhr.responseJSON.message : error}`);
      },
    });
  }

  openCreateMemoryModal() {
    // Set project name in modal
    this.$createMemoryProjectName.text(this.activeProjectName || 'Unknown');

    // Clear the input field
    this.$createMemoryNameInput.val('');

    // Show modal
    this.$createMemoryModal.fadeIn(200);

    // Focus on the input field
    setTimeout(() => {
      this.$createMemoryNameInput.focus();
    }, 250);
  }

  closeCreateMemoryModal() {
    this.$createMemoryModal.fadeOut(200);
    this.$createMemoryNameInput.val('');
    this.$createMemoryCreateBtn.prop('disabled', false).text('Create');
  }

  createMemoryFromModal() {
    const memoryName = this.$createMemoryNameInput.val().trim();

    if (!memoryName) {
      alert('Please enter a memory name');
      return;
    }

    // Validate memory name (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(memoryName)) {
      alert('Memory name can only contain letters, numbers, and underscores');
      return;
    }

    // Disable button during request
    this.$createMemoryCreateBtn.prop('disabled', true).text('Creating...');

    $.ajax({
      url: '/save_memory',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        memory_name: memoryName,
        content: '',
      }),
      success: (response) => {
        if (response.status === 'success') {
          // Close the create modal
          this.closeCreateMemoryModal();
          // Reload config to show the new memory
          this.loadConfigOverview();
          // Open the edit modal for the newly created memory
          setTimeout(() => {
            this.openEditMemoryModal(memoryName);
          }, 500);
        } else {
          alert(`Error: ${response.message}`);
          this.$createMemoryCreateBtn.prop('disabled', false).text('Create');
        }
      },
      error: (xhr, _status, error) => {
        console.error('Error creating memory:', error);
        alert(`Error creating memory: ${xhr.responseJSON ? xhr.responseJSON.message : error}`);
        this.$createMemoryCreateBtn.prop('disabled', false).text('Create');
      },
    });
  }

  // ===== News Methods =====

  loadNews() {
    console.log('Loading news...');
    $.ajax({
      url: '/news_snippet_ids',
      type: 'GET',
      success: (response) => {
        console.log('News snippet IDs response:', response);
        if (
          response.status === 'success' &&
          response.news_snippet_ids &&
          response.news_snippet_ids.length > 0
        ) {
          console.log('Displaying news with IDs:', response.news_snippet_ids);
          this.displayNews(response.news_snippet_ids);
        } else {
          console.log('No unread news, hiding section');
          this.$newsSection.hide();
        }
      },
      error: (_xhr, _status, error) => {
        console.error('Error loading news snippet IDs:', error);
        this.$newsSection.hide();
      },
    });
  }

  displayNews(newsIds) {
    const self = this;
    console.log('displayNews called with:', newsIds);
    // Sort newest first (descending order)
    newsIds.sort((a, b) => b - a);

    if (newsIds.length === 0) {
      console.log('No news items to display.');
      self.$newsSection.hide();
      return;
    }
    self.$newsSection.show();
    self.$newsDisplay.empty();
    console.log(`Displaying ${newsIds.length} news items.`);
    // Load each news snippet HTML
    let _loadedCount = 0;
    newsIds.forEach((newsId) => {
      $.ajax({
        url: `/dashboard/news/${newsId}.html`,
        type: 'GET',
        success: (html) => {
          // Wrap the HTML in a container with a button
          const $newsContainer = $('<div class="news-container">').attr('data-news-id', newsId);
          const $newsContent = $(html);

          // Add button for marking as read
          const $markRead = $('<div class="news-mark-read">');
          const $button = $('<button class="news-mark-read-btn">')
            .attr('data-news-id', newsId)
            .text('Mark as read');

          $markRead.append($button);
          $newsContent.append($markRead);

          $newsContainer.append($newsContent);
          self.$newsDisplay.append($newsContainer);

          // Bind button click event
          $button.on('click', function () {
            const btn = $(this);
            btn.prop('disabled', true).text('Marking...');
            self.markNewsAsRead(newsId);
          });

          _loadedCount++;
        },
        error: (_xhr, _status, error) => {
          console.error(`Error loading news snippet ${newsId}:`, error);
          _loadedCount++;
        },
      });
    });
  }

  markNewsAsRead(newsId) {
    $.ajax({
      url: '/mark_news_snippet_as_read',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ news_snippet_id: newsId }),
      success: (response) => {
        if (response.status === 'success') {
          // Reload news to show updated list
          this.loadNews();
        } else {
          console.error('Error marking news as read:', response.message);
        }
      },
      error: (_xhr, _status, error) => {
        console.error('Error marking news as read:', error);
      },
    });
  }

  // ===== Serena Config Editing Methods =====

  openEditSerenaConfigModal() {
    this.serenaConfigContentDirty = false;

    // Load serena config content
    $.ajax({
      url: '/get_serena_config',
      type: 'GET',
      success: (response) => {
        if (response.status === 'error') {
          alert(`Error: ${response.message}`);
          return;
        }
        this.originalSerenaConfigContent = response.content;
        this.$editSerenaConfigContent.val(response.content);
        this.serenaConfigContentDirty = false;
        this.$editSerenaConfigModal.fadeIn(200);
      },
      error: (xhr, _status, error) => {
        console.error('Error loading serena config:', error);
        alert(
          `Error loading serena config: ${xhr.responseJSON ? xhr.responseJSON.message : error}`,
        );
      },
    });

    // Track changes to config content
    this.$editSerenaConfigContent.off('input').on('input', () => {
      const currentContent = this.$editSerenaConfigContent.val();
      this.serenaConfigContentDirty = currentContent !== this.originalSerenaConfigContent;
    });
  }

  closeEditSerenaConfigModal() {
    // Check if there are unsaved changes
    if (this.serenaConfigContentDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }

    this.$editSerenaConfigModal.fadeOut(200);
    this.originalSerenaConfigContent = null;
    this.serenaConfigContentDirty = false;
  }

  saveSerenaConfigFromModal() {
    const content = this.$editSerenaConfigContent.val();

    // Disable button during request
    this.$editSerenaConfigSaveBtn.prop('disabled', true).text('Saving...');

    $.ajax({
      url: '/save_serena_config',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        content: content,
      }),
      success: (response) => {
        if (response.status === 'success') {
          // Update original content and reset dirty flag
          this.originalSerenaConfigContent = content;
          this.serenaConfigContentDirty = false;
          // Close modal
          this.$editSerenaConfigModal.fadeOut(200);
          alert(
            'Configuration saved successfully. Please restart Serena for changes to take effect.',
          );
        } else {
          alert(`Error: ${response.message}`);
        }
      },
      error: (xhr, _status, error) => {
        console.error('Error saving serena config:', error);
        alert(`Error saving serena config: ${xhr.responseJSON ? xhr.responseJSON.message : error}`);
      },
      complete: () => {
        // Re-enable button
        this.$editSerenaConfigSaveBtn.prop('disabled', false).text('Save');
      },
    });
  }

  // ===== Shutdown Method =====

  shutdown() {
    const _shutdown = () => {
      console.log('Triggering shutdown');
      $.ajax({
        url: '/shutdown',
        type: 'PUT',
        contentType: 'application/json',
      });
      this.$errorContainer.html('<div class="error-message">Shutting down ...</div>');
      setTimeout(() => {
        window.close();
      }, 1000);
    };

    // ask for confirmation using a dialog
    if (confirm('This will fully terminate the Serena server.')) {
      _shutdown();
    } else {
      console.log('Shutdown cancelled');
    }

    // Close menu
    this.$menuDropdown.hide();
  }
}
