/**
 * JW Player - Video Player Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const container = document.getElementById('video-container');
  const video = document.getElementById('video-element');
  const controlsBar = document.getElementById('controls-bar');
  const topTitleBar = document.getElementById('top-title-bar');

  // Buttons
  const playPauseBtn = document.getElementById('play-pause-btn');
  const centralPlayBtn = document.getElementById('central-play-btn');
  const rewindBtn = document.getElementById('rewind-btn');
  const forwardBtn = document.getElementById('forward-btn');
  const muteBtn = document.getElementById('mute-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsMenu = document.getElementById('settings-menu');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const pipBtn = document.getElementById('pip-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  // Icons & Indicators
  const playIcons = document.querySelectorAll('.play-icon');
  const pauseIcons = document.querySelectorAll('.pause-icon');
  const replayIcons = document.querySelectorAll('.replay-icon');
  const volumeHighIcon = document.querySelector('.volume-high-icon');
  const volumeMutedIcon = document.querySelector('.volume-muted-icon');
  const fullscreenOpenIcon = document.querySelector('.fullscreen-open');
  const fullscreenExitIcon = document.querySelector('.fullscreen-exit');
  const loadingSpinner = document.getElementById('loading-spinner');
  const errorState = document.getElementById('error-state');
  const rippleLeft = document.getElementById('seek-ripple-left');
  const rippleRight = document.getElementById('seek-ripple-right');

  // Sliders and Displays
  const volumeSlider = document.getElementById('volume-slider');
  const timelineContainer = document.getElementById('timeline-container');
  const progressBar = document.getElementById('progress-bar');
  const bufferedBar = document.getElementById('buffered-bar');
  const timelineTooltip = document.getElementById('timeline-tooltip');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');
  const actionFeedback = document.getElementById('action-feedback');

  // Settings Tabs and Options
  const tabSpeed = document.getElementById('tab-speed');
  const tabQuality = document.getElementById('tab-quality');
  const speedOptions = document.getElementById('speed-options');
  const qualityOptions = document.getElementById('quality-options');

  // --- LocalStorage Keys ---
  const STORAGE_KEY_VOLUME = 'jw_player_volume';
  const STORAGE_KEY_MUTED = 'jw_player_muted';
  const STORAGE_KEY_SPEED = 'jw_player_speed';
  const STORAGE_KEY_QUALITY = 'jw_player_quality';

  // --- State Variables ---
  let isScrubbing = false;
  let wasPaused = false;
  let controlsHideTimeout = null;
  let feedbackTimeout = null;
  let rippleLeftTimeout = null;
  let rippleRightTimeout = null;
  let lastTapTime = 0;
  let lastTapX = 0;
  let seekAnimationFrame = null;

  // Pointer tracking
  let lastPointerType = 'mouse';
  let pointerDownX = 0;
  let pointerDownY = 0;
  let wasHiddenBeforeTap = false;

  let isPointerOverControls = false;
  let isSettingsMenuOpen = false;

  // --- Utility Functions ---
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
    const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;
    return `${formattedMins}:${formattedSecs}`;
  };

  const showActionFeedback = (text) => {
    if (!actionFeedback) return;
    actionFeedback.textContent = text;
    actionFeedback.classList.add('show');
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
      actionFeedback.classList.remove('show');
    }, 1200);
  };

  const triggerSeekRipple = (side) => {
    const el = side === 'left' ? rippleLeft : rippleRight;
    if (!el) return;
    el.classList.add('active');
    if (side === 'left') {
      clearTimeout(rippleLeftTimeout);
      rippleLeftTimeout = setTimeout(() => el.classList.remove('active'), 500);
    } else {
      clearTimeout(rippleRightTimeout);
      rippleRightTimeout = setTimeout(() => el.classList.remove('active'), 500);
    }
  };

  // --- Controls Visibility Logic ---
  const setControlsVisible = (visible) => {
    clearTimeout(controlsHideTimeout);

    if (!visible) {
      if (video.paused || video.ended) return;
      if (isPointerOverControls) return;
      if (isSettingsMenuOpen) return;
      if (isScrubbing) return;
      if (controlsBar.contains(document.activeElement) && document.activeElement.matches(':focus-visible')) return;
    }

    if (visible) {
      container.classList.remove('controls-hidden');
    } else {
      container.classList.add('controls-hidden');
    }
  };

  const scheduleControlsHide = (delayMs = 2500) => {
    clearTimeout(controlsHideTimeout);
    if (video.paused || video.ended) return;
    if (isSettingsMenuOpen || isScrubbing) return;
    controlsHideTimeout = setTimeout(() => {
      setControlsVisible(false);
    }, delayMs);
  };

  // --- Play / Pause Logic ---
  const togglePlay = () => {
    if (video.ended) {
      video.currentTime = 0;
      video.play().catch(err => console.log('Playback prevented:', err));
    } else if (video.paused) {
      video.play().catch(err => console.log('Playback prevented:', err));
    } else {
      video.pause();
    }
    updatePlayPauseState();
  };

  const updatePlayPauseState = () => {
    if (isScrubbing) return;

    const isEnded = video.ended;
    const isPaused = video.paused;
    const isPlaying = !isPaused && !isEnded;

    container.classList.toggle('paused', isPaused && !isEnded);
    container.classList.toggle('ended', isEnded);
    container.classList.toggle('is-playing', isPlaying);

    playIcons.forEach(icon => icon.classList.toggle('hidden', !isPaused || isEnded));
    pauseIcons.forEach(icon => icon.classList.toggle('hidden', !isPlaying));
    replayIcons.forEach(icon => icon.classList.toggle('hidden', !isEnded));

    let stateLabel = 'Play';
    if (isEnded) stateLabel = 'Replay';
    else if (isPlaying) stateLabel = 'Pause';

    playPauseBtn.setAttribute('aria-label', stateLabel);
    playPauseBtn.setAttribute('title', `${stateLabel} (Space / K)`);
    centralPlayBtn.setAttribute('aria-label', stateLabel);

    if (isPaused || isEnded) {
      setControlsVisible(true);
    } else {
      scheduleControlsHide(2500);
    }
  };

  // --- Rewind / Forward Quick Jump Logic ---
  const rewindTime = (seconds = 10) => {
    video.currentTime = Math.max(0, video.currentTime - seconds);
    showActionFeedback(`-${seconds}s`);
    triggerSeekRipple('left');
  };

  const forwardTime = (seconds = 10) => {
    video.currentTime = Math.min(video.duration || 0, video.currentTime + seconds);
    showActionFeedback(`+${seconds}s`);
    triggerSeekRipple('right');
  };

  // --- Volume Logic ---
  const handleVolumeChange = (newVol, persist = true) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    video.muted = clamped === 0;
    updateVolumeUI();
    if (persist) {
      localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
      localStorage.setItem(STORAGE_KEY_MUTED, video.muted ? 'true' : 'false');
    }
  };

  const toggleMute = () => {
    video.muted = !video.muted;
    if (video.muted) {
      volumeSlider.value = 0;
    } else {
      if (video.volume === 0) video.volume = 0.5;
      volumeSlider.value = video.volume;
    }
    updateVolumeUI();
    localStorage.setItem(STORAGE_KEY_MUTED, video.muted ? 'true' : 'false');
  };

  const updateVolumeUI = () => {
    const isMuted = video.muted || video.volume === 0;
    volumeHighIcon.classList.toggle('hidden', isMuted);
    volumeMutedIcon.classList.toggle('hidden', !isMuted);
    muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');

    const displayVal = isMuted ? 0 : video.volume;
    volumeSlider.value = displayVal;

    const pct = displayVal * 100;
    volumeSlider.style.background = `linear-gradient(to right, #ff2147 0%, #ff2147 ${pct}%, rgba(255,255,255,0.3) ${pct}%, rgba(255,255,255,0.3) 100%)`;
  };

  // --- Timeline & Progress Logic ---
  const updateProgress = () => {
    if (!isScrubbing) {
      const current = video.currentTime || 0;
      const duration = video.duration || 0;
      const pct = duration > 0 ? (current / duration) * 100 : 0;

      progressBar.style.width = `${pct}%`;
      currentTimeEl.textContent = formatTime(current);

      timelineContainer.setAttribute('aria-valuenow', Math.round(pct).toString());
      timelineContainer.setAttribute('aria-valuetext', `${formatTime(current)} of ${formatTime(duration)}`);
    }
    updateBuffered();
  };

  const updateBuffered = () => {
    if (video.buffered.length > 0 && video.duration) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const pct = (bufferedEnd / video.duration) * 100;
      bufferedBar.style.width = `${pct}%`;
    }
  };

  const calculateTimelinePos = (clientX) => {
    const rect = timelineContainer.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const updateTooltip = (clientX) => {
    const rect = timelineContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * (video.duration || 0);

    timelineTooltip.textContent = formatTime(targetTime);

    const tooltipWidth = timelineTooltip.offsetWidth || 40;
    const halfWidth = tooltipWidth / 2;
    const rawX = clientX - rect.left;
    const clampedX = Math.max(halfWidth, Math.min(rect.width - halfWidth, rawX));

    timelineTooltip.style.left = `${clampedX}px`;
  };

  const handlePointerDownTimeline = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    isScrubbing = true;
    wasPaused = video.paused;
    video.pause();

    timelineContainer.classList.add('dragging');
    timelineContainer.setPointerCapture(e.pointerId);

    const pos = calculateTimelinePos(e.clientX);
    progressBar.style.width = `${pos * 100}%`;
    currentTimeEl.textContent = formatTime(pos * (video.duration || 0));
    updateTooltip(e.clientX);

    if (video.duration) {
      video.currentTime = pos * video.duration;
    }
  };

  const handlePointerMoveTimeline = (e) => {
    if (e.pointerType === 'mouse' || isScrubbing) {
      updateTooltip(e.clientX);
    }

    if (!isScrubbing) return;

    if (seekAnimationFrame) cancelAnimationFrame(seekAnimationFrame);
    seekAnimationFrame = requestAnimationFrame(() => {
      const pos = calculateTimelinePos(e.clientX);
      progressBar.style.width = `${pos * 100}%`;
      currentTimeEl.textContent = formatTime(pos * (video.duration || 0));
      if (video.duration) {
        video.currentTime = pos * video.duration;
      }
    });
  };

  const handlePointerUpTimeline = (e) => {
    if (!isScrubbing) return;
    isScrubbing = false;
    timelineContainer.classList.remove('dragging');

    if (timelineContainer.hasPointerCapture(e.pointerId)) {
      timelineContainer.releasePointerCapture(e.pointerId);
    }

    const pos = calculateTimelinePos(e.clientX);
    if (video.duration) {
      video.currentTime = pos * video.duration;
    }

    if (!wasPaused) {
      video.play().catch(err => console.log('Resume playback failed:', err));
    }
    updatePlayPauseState();
  };

  // --- Fullscreen Logic ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const updateFullscreenUI = () => {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    fullscreenOpenIcon.classList.toggle('hidden', isFullscreen);
    fullscreenExitIcon.classList.toggle('hidden', !isFullscreen);
    fullscreenBtn.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
  };

  // --- Picture-in-Picture Logic ---
  const checkPiPSupport = () => {
    if (!document.pictureInPictureEnabled) {
      pipBtn.style.display = 'none';
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && video !== document.pictureInPictureElement) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP Toggle Error:', err);
    }
  };

  // --- Settings Menu Logic ---
  const toggleSettingsMenu = (open) => {
    isSettingsMenuOpen = typeof open === 'boolean' ? open : settingsMenu.classList.contains('hidden');
    settingsMenu.classList.toggle('hidden', !isSettingsMenuOpen);
    settingsBtn.setAttribute('aria-expanded', isSettingsMenuOpen ? 'true' : 'false');

    if (isSettingsMenuOpen) {
      setControlsVisible(true);
    }
  };

  const switchSettingsTab = (targetId) => {
    if (targetId === 'speed-options') {
      tabSpeed.classList.add('active');
      tabQuality.classList.remove('active');
      speedOptions.classList.remove('hidden');
      qualityOptions.classList.add('hidden');
    } else {
      tabQuality.classList.add('active');
      tabSpeed.classList.remove('active');
      qualityOptions.classList.remove('hidden');
      speedOptions.classList.add('hidden');
    }
  };

  const setPlaybackSpeed = (speed, persist = true, showToast = true) => {
    video.playbackRate = speed;

    document.querySelectorAll('#speed-options .menu-option').forEach(opt => {
      const match = parseFloat(opt.dataset.speed) === speed;
      opt.classList.toggle('active', match);
      opt.setAttribute('aria-checked', match ? 'true' : 'false');
    });

    if (showToast) {
      showActionFeedback(`Speed ${speed}x`);
    }

    if (persist) {
      localStorage.setItem(STORAGE_KEY_SPEED, speed.toString());
    }
  };

  const setQuality = (quality, persist = true) => {
    document.querySelectorAll('#quality-options .menu-option').forEach(opt => {
      const match = opt.dataset.quality === quality;
      opt.classList.toggle('active', match);
      opt.setAttribute('aria-checked', match ? 'true' : 'false');
    });

    showActionFeedback(`Quality: ${quality.toUpperCase()}`);

    if (persist) {
      localStorage.setItem(STORAGE_KEY_QUALITY, quality);
    }
  };

  // --- Video Event Listeners ---
  const handleVideoStateChange = () => {
    updatePlayPauseState();
  };

  video.addEventListener('play', handleVideoStateChange);
  video.addEventListener('pause', handleVideoStateChange);
  video.addEventListener('playing', () => {
    loadingSpinner.classList.add('hidden');
    errorState.classList.add('hidden');
    centralPlayBtn.classList.remove('hidden');
    handleVideoStateChange();
  });
  video.addEventListener('ended', handleVideoStateChange);
  video.addEventListener('seeked', () => {
    loadingSpinner.classList.add('hidden');
    handleVideoStateChange();
  });
  video.addEventListener('canplay', () => {
    loadingSpinner.classList.add('hidden');
    handleVideoStateChange();
  });
  video.addEventListener('loadeddata', handleVideoStateChange);

  video.addEventListener('waiting', () => {
    loadingSpinner.classList.remove('hidden');
  });

  video.addEventListener('stalled', () => {
    if (video.paused) loadingSpinner.classList.add('hidden');
  });

  video.addEventListener('error', () => {
    loadingSpinner.classList.add('hidden');
    centralPlayBtn.classList.add('hidden');
    errorState.classList.remove('hidden');
    setControlsVisible(true);
  });

  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('progress', updateBuffered);

  video.addEventListener('loadedmetadata', () => {
    durationTimeEl.textContent = formatTime(video.duration);

    const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
    const savedMute = localStorage.getItem(STORAGE_KEY_MUTED);
    const savedSpeed = localStorage.getItem(STORAGE_KEY_SPEED);
    const savedQuality = localStorage.getItem(STORAGE_KEY_QUALITY);

    if (savedVol !== null) video.volume = parseFloat(savedVol);
    if (savedMute !== null) video.muted = savedMute === 'true';
    if (savedSpeed !== null) setPlaybackSpeed(parseFloat(savedSpeed), false, false);
    if (savedQuality !== null) setQuality(savedQuality, false);

    updateVolumeUI();
    updateProgress();
  });

  // --- Event Listeners ---

  // Central Overlay Click
  centralPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // Controls Row Buttons
  playPauseBtn.addEventListener('click', togglePlay);
  rewindBtn.addEventListener('click', () => rewindTime(10));
  forwardBtn.addEventListener('click', () => forwardTime(10));
  muteBtn.addEventListener('click', toggleMute);
  volumeSlider.addEventListener('input', (e) => {
    handleVolumeChange(parseFloat(e.target.value));
  });

  // Pointer tracking for desktop and touch
  container.addEventListener('pointerdown', (e) => {
    lastPointerType = e.pointerType;
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
    wasHiddenBeforeTap = container.classList.contains('controls-hidden');

    if (e.pointerType === 'touch' && controlsBar.contains(e.target)) {
      scheduleControlsHide(3000);
    }
  });

  container.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    setControlsVisible(true);
    scheduleControlsHide(2500);
  });

  container.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    isPointerOverControls = false;
    if (!video.paused && !video.ended) {
      setControlsVisible(false);
    }
  });

  controlsBar.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    isPointerOverControls = true;
    setControlsVisible(true);
  });

  controlsBar.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    isPointerOverControls = false;
    scheduleControlsHide(2500);
  });

  // Touch tap handling
  container.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;

    const moveDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
    if (moveDist > 10) return;

    if (controlsBar.contains(e.target) || settingsMenu.contains(e.target) || centralPlayBtn.contains(e.target)) {
      return;
    }

    const isCurrentlyHidden = container.classList.contains('controls-hidden');
    if (isCurrentlyHidden) {
      setControlsVisible(true);
      scheduleControlsHide(3000);
    } else {
      setControlsVisible(false);
    }
  });

  // Desktop Click Video Area
  container.addEventListener('click', (e) => {
    if (lastPointerType !== 'mouse') return;
    if (controlsBar.contains(e.target) || settingsMenu.contains(e.target) || centralPlayBtn.contains(e.target)) return;

    togglePlay();
    showActionFeedback(video.paused ? 'Paused' : 'Playing');
  });

  // Touch Double-Tap to Seek
  container.addEventListener('touchend', (e) => {
    if (controlsBar.contains(e.target) || settingsMenu.contains(e.target) || centralPlayBtn.contains(e.target)) return;

    const currentTime = Date.now();
    const tapX = e.changedTouches[0].clientX;
    const containerRect = container.getBoundingClientRect();
    const relativeX = tapX - containerRect.left;

    if (currentTime - lastTapTime < 300 && Math.abs(tapX - lastTapX) < 40) {
      if (wasHiddenBeforeTap) {
        setControlsVisible(false);
      } else {
        setControlsVisible(true);
        scheduleControlsHide(3000);
      }

      if (relativeX < containerRect.width / 2) {
        rewindTime(10);
      } else {
        forwardTime(10);
      }
    }
    lastTapTime = currentTime;
    lastTapX = tapX;
  });

  // Double Click Fullscreen
  container.addEventListener('dblclick', (e) => {
    if (lastPointerType !== 'mouse') return;
    if (controlsBar.contains(e.target) || settingsMenu.contains(e.target) || centralPlayBtn.contains(e.target)) return;
    toggleFullscreen();
  });

  // Timeline Pointer Events
  timelineContainer.addEventListener('pointerdown', handlePointerDownTimeline);
  timelineContainer.addEventListener('pointermove', handlePointerMoveTimeline);
  timelineContainer.addEventListener('pointerup', handlePointerUpTimeline);
  timelineContainer.addEventListener('pointercancel', handlePointerUpTimeline);

  // Keyboard Navigation for Timeline
  timelineContainer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    }
  });

  // Fullscreen & PiP Events
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenUI);
  document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
  pipBtn.addEventListener('click', togglePiP);
  checkPiPSupport();

  // Settings Menu Handlers
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsMenu();
  });

  settingsCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsMenu(false);
  });

  tabSpeed.addEventListener('click', () => switchSettingsTab('speed-options'));
  tabQuality.addEventListener('click', () => switchSettingsTab('quality-options'));

  document.querySelectorAll('#speed-options .menu-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      setPlaybackSpeed(parseFloat(option.dataset.speed));
    });
  });

  document.querySelectorAll('#quality-options .menu-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      setQuality(option.dataset.quality);
    });
  });

  // Close Settings on Click Outside or Escape
  document.addEventListener('click', (e) => {
    if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
      toggleSettingsMenu(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSettingsMenuOpen) {
      toggleSettingsMenu(false);
    }
  });

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return;
    }

    const isHovered = container.matches(':hover');
    const isFocused = container.contains(active);

    if (!isHovered && !isFocused) return;

    if ((e.key === ' ' || e.key === 'Enter') && active && active.tagName === 'BUTTON') {
      return;
    }

    const duration = video.duration || 0;

    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        showActionFeedback(video.paused ? 'Paused' : 'Playing');
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        showActionFeedback(video.muted ? 'Muted' : 'Unmuted');
        break;
      case 'p':
        e.preventDefault();
        togglePiP();
        break;
      case 'j':
        e.preventDefault();
        rewindTime(10);
        break;
      case 'l':
        e.preventDefault();
        forwardTime(10);
        break;
      case 'arrowleft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        showActionFeedback('-5s');
        break;
      case 'arrowright':
        e.preventDefault();
        video.currentTime = Math.min(duration, video.currentTime + 5);
        showActionFeedback('+5s');
        break;
      case 'arrowup':
        e.preventDefault();
        handleVolumeChange(video.volume + 0.1);
        showActionFeedback(`Volume ${Math.round(video.volume * 100)}%`);
        break;
      case 'arrowdown':
        e.preventDefault();
        handleVolumeChange(video.volume - 0.1);
        showActionFeedback(`Volume ${Math.round(video.volume * 100)}%`);
        break;
      case 'home':
        e.preventDefault();
        video.currentTime = 0;
        showActionFeedback('Start');
        break;
      case 'end':
        e.preventDefault();
        video.currentTime = duration;
        showActionFeedback('End');
        break;
      default:
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          const pct = parseInt(e.key, 10) * 10;
          video.currentTime = (pct / 100) * duration;
          showActionFeedback(`${pct}%`);
        }
        break;
    }
  });

  // --- Initial Setup ---
  updatePlayPauseState();
  updateVolumeUI();
});
