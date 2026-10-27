/**
 * Murottal Al-Qur'an Player - Core Application Logic & State Management
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. DATA DATABASE (SURAH LIST & RECITERS)
  // ==========================================================================

  const SURAH_LIST = [
    {
      id: 1,
      name: "Al-Fatihah",
      arabic: "الفاتحة",
      meaning: "Pembukaan",
      verses: 7,
      type: "Makkiyah",
      duration: "00:42",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3"
    },
    {
      id: 2,
      name: "Al-Baqarah",
      arabic: "البقرة",
      meaning: "Sapi Betina",
      verses: 286,
      type: "Madaniyah",
      duration: "02:25:30",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/2.mp3"
    },
    {
      id: 3,
      name: "Ali 'Imran",
      arabic: "آل عمران",
      meaning: "Keluarga Imran",
      verses: 200,
      type: "Madaniyah",
      duration: "01:30:15",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/3.mp3"
    },
    {
      id: 4,
      name: "An-Nisa'",
      arabic: "النساء",
      meaning: "Wanita",
      verses: 176,
      type: "Madaniyah",
      duration: "01:25:40",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/4.mp3"
    },
    {
      id: 5,
      name: "Al-Ma'idah",
      arabic: "المائدة",
      meaning: "Hidangan",
      verses: 120,
      type: "Madaniyah",
      duration: "01:10:20",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/5.mp3"
    },
    {
      id: 6,
      name: "Al-An'am",
      arabic: "الأنعام",
      meaning: "Binatang Ternak",
      verses: 165,
      type: "Makkiyah",
      duration: "01:15:10",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/6.mp3"
    },
    {
      id: 36,
      name: "Ya-Sin",
      arabic: "يس",
      meaning: "Ya Sin",
      verses: 83,
      type: "Makkiyah",
      duration: "14:20",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/36.mp3"
    },
    {
      id: 55,
      name: "Ar-Rahman",
      arabic: "الرحمن",
      meaning: "Yang Maha Pemurah",
      verses: 78,
      type: "Madaniyah",
      duration: "09:45",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/55.mp3"
    },
    {
      id: 56,
      name: "Al-Waqi'ah",
      arabic: "الواقعة",
      meaning: "Hari Kiamat",
      verses: 96,
      type: "Makkiyah",
      duration: "08:30",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/56.mp3"
    },
    {
      id: 67,
      name: "Al-Mulk",
      arabic: "الملك",
      meaning: "Kerajaan",
      verses: 30,
      type: "Makkiyah",
      duration: "06:15",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/67.mp3"
    },
    {
      id: 112,
      name: "Al-Ikhlas",
      arabic: "الإخلاص",
      meaning: "Memurnikan Keesaan Allah",
      verses: 4,
      type: "Makkiyah",
      duration: "00:20",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/112.mp3"
    },
    {
      id: 113,
      name: "Al-Falaq",
      arabic: "الفلق",
      meaning: "Waktu Subuh",
      verses: 5,
      type: "Makkiyah",
      duration: "00:25",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/113.mp3"
    },
    {
      id: 114,
      name: "An-Nas",
      arabic: "الناس",
      meaning: "Manusia",
      verses: 6,
      type: "Makkiyah",
      duration: "00:30",
      audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/114.mp3"
    }
  ];

  const RECITERS_LIST = [
    {
      id: "alafasy",
      name: "Mishary Rashid Alafasy",
      style: "Murottal • Kuwait",
      subfolder: "ar.alafasy"
    },
    {
      id: "sudais",
      name: "Abdul Rahman Al-Sudais",
      style: "Murottal • Arab Saudi",
      subfolder: "ar.abdulrahmansudais"
    },
    {
      id: "muaiqly",
      name: "Maher Al-Muaiqly",
      style: "Murottal • Arab Saudi",
      subfolder: "ar.mahermuaiqly"
    },
    {
      id: "shuraym",
      name: "Sa'ud al-Shuraym",
      style: "Murottal • Arab Saudi",
      subfolder: "ar.saoodshuraym"
    },
    {
      id: "ghamadi",
      name: "Saad Al-Ghamadi",
      style: "Murottal • Arab Saudi",
      subfolder: "ar.saadghamdi"
    }
  ];

  // ==========================================================================
  // 2. STATE MANAGEMENT
  // ==========================================================================

  let currentSurahIndex = 0;
  let currentReciterIndex = 0;
  let currentPlaybackSpeed = 1.0;
  let repeatMode = 0; // 0: Off, 1: Repeat All, 2: Repeat One
  let isScrubbing = false;

  // DOM Elements
  const audio = document.getElementById('audio-element');

  // Headers & Info
  const headerSurahTitle = document.getElementById('header-surah-title');
  const pillReciterName = document.getElementById('pill-reciter-name');
  const trackSurahName = document.getElementById('track-surah-name');
  const trackArabicName = document.getElementById('track-arabic-name');
  const trackDetails = document.getElementById('track-details');

  // Timeline
  const timelineContainer = document.getElementById('timeline-container');
  const progressBar = document.getElementById('progress-bar');
  const bufferedBar = document.getElementById('buffered-bar');
  const currentTimeLabel = document.getElementById('current-time');
  const durationTimeLabel = document.getElementById('duration-time');

  // Controls
  const mainPlayBtn = document.getElementById('main-play-btn');
  const playIcons = document.querySelectorAll('.play-icon');
  const pauseIcons = document.querySelectorAll('.pause-icon');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const skipBackBtn = document.getElementById('skip-back-btn');
  const skipForwardBtn = document.getElementById('skip-forward-btn');
  const repeatBtn = document.getElementById('repeat-btn');
  const repeatOneBadge = document.getElementById('repeat-one-badge');
  const speedTriggerBtn = document.getElementById('speed-trigger-btn');
  const currentSpeedLabel = document.getElementById('current-speed-label');

  // Triggers for Bottom Sheets
  const reciterPillBtn = document.getElementById('reciter-pill-btn');
  const playlistSheetBtn = document.getElementById('playlist-sheet-btn');

  // Bottom Sheets & Overlays
  const sheetOverlay = document.getElementById('sheet-overlay');
  const surahSheet = document.getElementById('surah-sheet');
  const reciterSheet = document.getElementById('reciter-sheet');
  const speedSheet = document.getElementById('speed-sheet');

  const surahListContainer = document.getElementById('surah-list-container');
  const reciterListContainer = document.getElementById('reciter-list-container');
  const surahSearchInput = document.getElementById('surah-search-input');
  const reciterSearchInput = document.getElementById('reciter-search-input');

  // ==========================================================================
  // 3. UTILITY FUNCTIONS
  // ==========================================================================

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
    const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;

    if (hrs > 0) {
      const formattedHrs = hrs < 10 ? `0${hrs}` : `${hrs}`;
      return `${formattedHrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
  };

  const buildAudioUrl = (surahId, reciterSubfolder) => {
    return `https://cdn.islamic.network/quran/audio/128/${reciterSubfolder}/${surahId}.mp3`;
  };

  // ==========================================================================
  // 4. UI RENDERERS & DATA BINDING
  // ==========================================================================

  const renderSurahList = (filterText = '') => {
    surahListContainer.innerHTML = '';
    const query = filterText.toLowerCase().trim();

    const filtered = SURAH_LIST.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.meaning.toLowerCase().includes(query) ||
      s.id.toString() === query
    );

    if (filtered.length === 0) {
      surahListContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">Surah tidak ditemukan</div>`;
      return;
    }

    filtered.forEach((surah) => {
      const indexInMain = SURAH_LIST.findIndex(s => s.id === surah.id);
      const isActive = indexInMain === currentSurahIndex;

      const item = document.createElement('div');
      item.className = `surah-item ${isActive ? 'active' : ''}`;
      item.innerHTML = `
        <div class="surah-item-left">
          <div class="surah-num-badge">${surah.id}</div>
          <div class="surah-info-meta">
            <span class="surah-item-title">${surah.name}</span>
            <span class="surah-item-subtitle">${surah.meaning} • ${surah.verses} Ayat</span>
          </div>
        </div>
        <div class="surah-item-right">
          <span class="surah-item-arabic">${surah.arabic}</span>
          ${isActive && !audio.paused ? `
            <div class="playing-eq-icon">
              <div class="eq-bar"></div>
              <div class="eq-bar"></div>
              <div class="eq-bar"></div>
            </div>
          ` : ''}
        </div>
      `;

      item.addEventListener('click', () => {
        loadSurah(indexInMain, true);
        closeAllSheets();
      });

      surahListContainer.appendChild(item);
    });
  };

  const renderReciterList = (filterText = '') => {
    reciterListContainer.innerHTML = '';
    const query = filterText.toLowerCase().trim();

    const filtered = RECITERS_LIST.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.style.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      reciterListContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">Qori tidak ditemukan</div>`;
      return;
    }

    filtered.forEach((reciter) => {
      const indexInMain = RECITERS_LIST.findIndex(r => r.id === reciter.id);
      const isActive = indexInMain === currentReciterIndex;

      const initials = reciter.name.split(' ').map(n => n[0]).join('').slice(0, 2);

      const item = document.createElement('div');
      item.className = `reciter-item ${isActive ? 'active' : ''}`;
      item.innerHTML = `
        <div class="reciter-item-left">
          <div class="reciter-avatar-icon">${initials}</div>
          <div class="reciter-info-meta">
            <span class="reciter-item-name">${reciter.name}</span>
            <span class="reciter-item-desc">${reciter.style}</span>
          </div>
        </div>
        <div class="radio-check-icon">
          ${isActive ? `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ` : ''}
        </div>
      `;

      item.addEventListener('click', () => {
        selectReciter(indexInMain);
        closeAllSheets();
      });

      reciterListContainer.appendChild(item);
    });
  };

  const updateTrackDisplay = () => {
    const surah = SURAH_LIST[currentSurahIndex];
    const reciter = RECITERS_LIST[currentReciterIndex];

    headerSurahTitle.textContent = surah.name;
    pillReciterName.textContent = reciter.name.split(' ')[0] + ' ' + (reciter.name.split(' ')[1] || '');
    trackSurahName.textContent = surah.name;
    trackArabicName.textContent = surah.arabic;
    trackDetails.textContent = `${surah.meaning} • ${surah.verses} Ayat • ${reciter.name}`;

    // Refresh list views active states
    renderSurahList(surahSearchInput.value);
    renderReciterList(reciterSearchInput.value);
  };

  // ==========================================================================
  // 5. PLAYER PLAYBACK CONTROLS
  // ==========================================================================

  const loadSurah = (index, autoPlay = false) => {
    if (index < 0) index = SURAH_LIST.length - 1;
    if (index >= SURAH_LIST.length) index = 0;

    currentSurahIndex = index;
    const surah = SURAH_LIST[currentSurahIndex];
    const reciter = RECITERS_LIST[currentReciterIndex];

    audio.src = buildAudioUrl(surah.id, reciter.subfolder);
    audio.playbackRate = currentPlaybackSpeed;

    updateTrackDisplay();

    if (autoPlay) {
      audio.play().catch(err => console.log('Playback error:', err));
    } else {
      updatePlayPauseUI();
    }
  };

  const selectReciter = (index) => {
    currentReciterIndex = index;
    const currentTime = audio.currentTime;
    const wasPlaying = !audio.paused;

    const surah = SURAH_LIST[currentSurahIndex];
    const reciter = RECITERS_LIST[currentReciterIndex];

    audio.src = buildAudioUrl(surah.id, reciter.subfolder);
    audio.currentTime = currentTime;
    audio.playbackRate = currentPlaybackSpeed;

    updateTrackDisplay();

    if (wasPlaying) {
      audio.play().catch(err => console.log('Playback error:', err));
    }
  };

  const togglePlay = () => {
    if (audio.paused) {
      audio.play().catch(err => console.log('Playback interrupted:', err));
    } else {
      audio.pause();
    }
  };

  const updatePlayPauseUI = () => {
    const isPlaying = !audio.paused;
    playIcons.forEach(icon => icon.classList.toggle('hidden', isPlaying));
    pauseIcons.forEach(icon => icon.classList.toggle('hidden', !isPlaying));
    renderSurahList(surahSearchInput.value);
  };

  const updateProgress = () => {
    if (!isScrubbing && audio.duration) {
      const percentage = (audio.currentTime / audio.duration) * 100 || 0;
      progressBar.style.width = `${percentage}%`;
      currentTimeLabel.textContent = formatTime(audio.currentTime);
      durationTimeLabel.textContent = formatTime(audio.duration);
    }
    updateBuffered();
  };

  const updateBuffered = () => {
    if (audio.buffered.length > 0 && audio.duration) {
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      const bufferedPercentage = (bufferedEnd / audio.duration) * 100;
      bufferedBar.style.width = `${bufferedPercentage}%`;
    }
  };

  const handleSeek = (e) => {
    const rect = timelineContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    progressBar.style.width = `${pos * 100}%`;
    if (audio.duration) {
      currentTimeLabel.textContent = formatTime(pos * audio.duration);
      if (isScrubbing) {
        audio.currentTime = pos * audio.duration;
      }
    }
  };

  const cycleRepeatMode = () => {
    repeatMode = (repeatMode + 1) % 3;
    if (repeatMode === 0) {
      // Repeat Off
      repeatBtn.classList.remove('active');
      repeatOneBadge.classList.add('hidden');
    } else if (repeatMode === 1) {
      // Repeat All
      repeatBtn.classList.add('active');
      repeatOneBadge.classList.add('hidden');
    } else if (repeatMode === 2) {
      // Repeat One
      repeatBtn.classList.add('active');
      repeatOneBadge.classList.remove('hidden');
    }
  };

  const setPlaybackSpeed = (speed) => {
    currentPlaybackSpeed = speed;
    audio.playbackRate = speed;
    currentSpeedLabel.textContent = `${speed}x`;

    document.querySelectorAll('.speed-item').forEach(btn => {
      const itemSpeed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', itemSpeed === speed);
    });

    closeAllSheets();
  };

  // ==========================================================================
  // 6. BOTTOM SHEET DRAWER HANDLERS
  // ==========================================================================

  const openSheet = (sheetElement) => {
    closeAllSheets();
    sheetOverlay.classList.add('active');
    sheetElement.classList.add('active');
  };

  const closeAllSheets = () => {
    sheetOverlay.classList.remove('active');
    surahSheet.classList.remove('active');
    reciterSheet.classList.remove('active');
    speedSheet.classList.remove('active');
  };

  // ==========================================================================
  // 7. EVENT LISTENERS
  // ==========================================================================

  // Audio Native Events
  audio.addEventListener('play', updatePlayPauseUI);
  audio.addEventListener('pause', updatePlayPauseUI);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('progress', updateBuffered);

  audio.addEventListener('loadedmetadata', () => {
    durationTimeLabel.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', () => {
    if (repeatMode === 2) {
      // Repeat One
      audio.currentTime = 0;
      audio.play();
    } else if (repeatMode === 1 || currentSurahIndex < SURAH_LIST.length - 1) {
      // Next Surah or Loop All Playlist
      loadSurah(currentSurahIndex + 1, true);
    } else {
      updatePlayPauseUI();
    }
  });

  // Buttons Playback Event Listeners
  mainPlayBtn.addEventListener('click', togglePlay);

  prevBtn.addEventListener('click', () => {
    loadSurah(currentSurahIndex - 1, true);
  });

  nextBtn.addEventListener('click', () => {
    loadSurah(currentSurahIndex + 1, true);
  });

  skipBackBtn.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  });

  skipForwardBtn.addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
  });

  repeatBtn.addEventListener('click', cycleRepeatMode);

  // Timeline Scrubbing Mouse Events
  timelineContainer.addEventListener('mousedown', (e) => {
    isScrubbing = true;
    handleSeek(e);

    const onMouseMove = (moveEvent) => handleSeek(moveEvent);
    const onMouseUp = (upEvent) => {
      if (isScrubbing) {
        isScrubbing = false;
        handleSeek(upEvent);
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // Touch Events for Timeline
  timelineContainer.addEventListener('touchstart', (e) => {
    isScrubbing = true;
    const touch = e.touches[0];
    handleSeek(touch);

    const onTouchMove = (moveEvent) => handleSeek(moveEvent.touches[0]);
    const onTouchEnd = () => {
      isScrubbing = false;
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  });

  // Drawer Trigger Triggers
  playlistSheetBtn.addEventListener('click', () => openSheet(surahSheet));
  reciterPillBtn.addEventListener('click', () => openSheet(reciterSheet));
  speedTriggerBtn.addEventListener('click', () => openSheet(speedSheet));

  sheetOverlay.addEventListener('click', closeAllSheets);

  document.querySelectorAll('.sheet-close-btn').forEach(btn => {
    btn.addEventListener('click', closeAllSheets);
  });

  // Speed selection listeners
  document.querySelectorAll('.speed-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      setPlaybackSpeed(speed);
    });
  });

  // Search input listeners
  surahSearchInput.addEventListener('input', (e) => renderSurahList(e.target.value));
  reciterSearchInput.addEventListener('input', (e) => renderReciterList(e.target.value));

  // Initialize Data & Displays
  renderSurahList();
  renderReciterList();
  updateTrackDisplay();
});
