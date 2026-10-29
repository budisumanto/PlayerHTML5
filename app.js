/**
 * Aura Player - Apple Liquid Glass Custom HTML5 Video Player Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const container = document.getElementById('video-container');
  const video = document.getElementById('video-element');
  const controlsBar = document.getElementById('controls-bar');
  const centerOverlay = document.getElementById('center-overlay');

  // Buttons
  const playPauseBtn = document.getElementById('play-pause-btn');
  const centralPlayBtn = document.getElementById('central-play-btn');
  const muteBtn = document.getElementById('mute-btn');
  const speedBtn = document.getElementById('speed-btn');
  const speedMenu = document.getElementById('speed-menu');
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

  // --- LocalStorage Keys ---
  const STORAGE_KEY_VOLUME = 'aura_player_volume';
  const STORAGE_KEY_MUTED = 'aura_player_muted';
  const STORAGE_KEY_SPEED = 'aura_player_speed';

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

  // Pointer tracking & gesture state
  let lastPointerType = 'mouse';
  let pointerDownX = 0;
  let pointerDownY = 0;
  let wasHiddenBeforeTap = false;

  // Track hover/focus states to prevent controls hiding on desktop
  let isPointerOverControls = false;
  let isSpeedMenuOpen = false;

  // Loading state debounce timer
  let loadingDebounceTimeout = null;

  // --- BUG 1: ResizeObserver Observing Container and Controls Bar ---
  const updateCenterSize = () => {
    if (!container || !controlsBar) return;

    const containerH = container.clientHeight;
    const containerW = container.clientWidth || container.offsetWidth;
    const controlsH = controlsBar.offsetHeight;

    // Compute bottomInset from computed styles or fallback based on container width
    const computedBottom = parseFloat(window.getComputedStyle(controlsBar).bottom) || (containerW <= 520 ? 8 : 12);
    const pillTop = containerH - controlsH - computedBottom;
    const maxSize = 2 * (pillTop - containerH / 2 - 8);

    let defaultSize = 64;
    if (containerW <= 340) defaultSize = 40;
    else if (containerW <= 520) defaultSize = 48;

    if (maxSize < 36) {
      container.classList.add('center-too-small');
    } else {
      container.classList.remove('center-too-small');
    }

    const clampedSize = Math.max(36, Math.min(defaultSize, maxSize));
    container.style.setProperty('--center-size', `${Math.round(clampedSize)}px`);
    container.style.setProperty('--controls-h', `${Math.round(controlsH + computedBottom + 12)}px`);
  };

  if (window.ResizeObserver && container && controlsBar) {
    const ro = new ResizeObserver(() => {
      updateCenterSize();
    });
    ro.observe(container);
    ro.observe(controlsBar);
  }

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
      if (isSpeedMenuOpen) return;
      if (isScrubbing) return;
      if (controlsBar.contains(document.activeElement) && document.activeElement.matches(':focus-visible')) return;
    }

    if (visible) {
      container.classList.remove('controls-hidden');
    } else {
      container.classList.add('controls-hidden');
    }
  };

  const scheduleControlsHide = (delayMs = 1500) => {
    clearTimeout(controlsHideTimeout);
    if (video.paused || video.ended) return;
    if (isSpeedMenuOpen || isScrubbing) return;
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
      scheduleControlsHide(1500);
    }
  };

  // --- BUG 2: Debounced updateLoading() ---
  const updateLoading = () => {
    const isError = !errorState.classList.contains('hidden');
    const isPausedOrEnded = video.paused || video.ended || isError;

    if (isPausedOrEnded) {
      clearTimeout(loadingDebounceTimeout);
      loadingDebounceTimeout = null;
      container.classList.remove('is-loading');
      return;
    }

    const needsLoading = video.seeking || video.readyState < 3;

    if (needsLoading) {
      if (!loadingDebounceTimeout && !container.classList.contains('is-loading')) {
        loadingDebounceTimeout = setTimeout(() => {
          if (!video.paused && !video.ended && (video.seeking || video.readyState < 3)) {
            container.classList.add('is-loading');
          }
          loadingDebounceTimeout = null;
        }, 200);
      }
    } else {
      clearTimeout(loadingDebounceTimeout);
      loadingDebounceTimeout = null;
      container.classList.remove('is-loading');
    }
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
    volumeSlider.style.background = `linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) ${pct}%, rgba(255,255,255,0.2) ${pct}%, rgba(255,255,255,0.2) 100%)`;
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
    updateLoading();
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
    updateLoading();
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
    updateCenterSize();
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

  // --- BUG 3: Compact Speed Menu Toggle & Overflow Handling ---
  const toggleSpeedMenu = (open) => {
    isSpeedMenuOpen = typeof open === 'boolean' ? open : speedMenu.classList.contains('hidden');

    if (isSpeedMenuOpen) {
      speedMenu.classList.remove('two-col');
      speedMenu.classList.remove('hidden');
      speedBtn.setAttribute('aria-expanded', 'true');
      setControlsVisible(true);

      // Check for vertical overflow
      if (speedMenu.scrollHeight > speedMenu.clientHeight) {
        speedMenu.classList.add('two-col');
      }

      // Scroll active item into view
      const activeOption = speedMenu.querySelector('.speed-option.active');
      if (activeOption) {
        activeOption.scrollIntoView({ block: 'nearest' });
      }
    } else {
      speedMenu.classList.add('hidden');
      speedMenu.classList.remove('two-col');
      speedBtn.setAttribute('aria-expanded', 'false');
    }
  };

  const setPlaybackSpeed = (speed, persist = true, showToast = true) => {
    video.playbackRate = speed;
    speedBtn.textContent = speed === 1.0 ? '1x' : `${speed}x`;

    document.querySelectorAll('.speed-option').forEach(opt => {
      const match = parseFloat(opt.dataset.speed) === speed;
      opt.classList.toggle('active', match);
      opt.setAttribute('aria-checked', match ? 'true' : 'false');
    });

    toggleSpeedMenu(false);
    if (showToast) {
      showActionFeedback(`${speed}x Speed`);
    }

    if (persist) {
      localStorage.setItem(STORAGE_KEY_SPEED, speed.toString());
    }
  };

  // --- Video Event Listeners ---
  const handleVideoStateChange = () => {
    updatePlayPauseState();
    updateLoading();
  };

  video.addEventListener('play', handleVideoStateChange);
  video.addEventListener('pause', handleVideoStateChange);
  video.addEventListener('playing', () => {
    errorState.classList.add('hidden');
    handleVideoStateChange();
  });
  video.addEventListener('ended', handleVideoStateChange);
  video.addEventListener('seeking', updateLoading);
  video.addEventListener('seeked', handleVideoStateChange);
  video.addEventListener('canplay', handleVideoStateChange);
  video.addEventListener('waiting', updateLoading);
  video.addEventListener('loadeddata', handleVideoStateChange);

  video.addEventListener('error', () => {
    errorState.classList.remove('hidden');
    handleVideoStateChange();
    setControlsVisible(true);
  });

  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('progress', updateBuffered);

  const initMetadata = () => {
    durationTimeEl.textContent = formatTime(video.duration);
    timelineContainer.setAttribute('aria-valuemax', '100');

    const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
    const savedMute = localStorage.getItem(STORAGE_KEY_MUTED);
    const savedSpeed = localStorage.getItem(STORAGE_KEY_SPEED);

    if (savedVol !== null) video.volume = parseFloat(savedVol);
    if (savedMute !== null) video.muted = savedMute === 'true';
    if (savedSpeed !== null) setPlaybackSpeed(parseFloat(savedSpeed), false, false);

    updateVolumeUI();
    updateProgress();
    updateCenterSize();
  };

  video.addEventListener('loadedmetadata', initMetadata);
  video.addEventListener('durationchange', initMetadata);

  if (video.readyState >= 1) {
    initMetadata();
  }

  // --- Event Listeners ---

  centralPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  playPauseBtn.addEventListener('click', togglePlay);
  muteBtn.addEventListener('click', toggleMute);
  volumeSlider.addEventListener('input', (e) => {
    handleVolumeChange(parseFloat(e.target.value));
  });

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
    scheduleControlsHide(1500);
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
    scheduleControlsHide(1500);
  });

  container.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;

    const moveDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
    if (moveDist > 10) return;

    if (controlsBar.contains(e.target) || speedMenu.contains(e.target) || centralPlayBtn.contains(e.target)) {
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

  container.addEventListener('click', (e) => {
    if (lastPointerType !== 'mouse') return;
    if (controlsBar.contains(e.target) || speedMenu.contains(e.target) || centralPlayBtn.contains(e.target)) return;

    togglePlay();
    showActionFeedback(video.paused ? 'Paused' : 'Playing');
  });

  container.addEventListener('touchend', (e) => {
    if (controlsBar.contains(e.target) || speedMenu.contains(e.target) || centralPlayBtn.contains(e.target)) return;

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
        video.currentTime = Math.max(0, video.currentTime - 10);
        triggerSeekRipple('left');
        showActionFeedback('-10s');
      } else {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        triggerSeekRipple('right');
        showActionFeedback('+10s');
      }
    }
    lastTapTime = currentTime;
    lastTapX = tapX;
  });

  container.addEventListener('dblclick', (e) => {
    if (lastPointerType !== 'mouse') return;
    if (controlsBar.contains(e.target) || speedMenu.contains(e.target) || centralPlayBtn.contains(e.target)) return;
    toggleFullscreen();
  });

  timelineContainer.addEventListener('pointerdown', handlePointerDownTimeline);
  timelineContainer.addEventListener('pointermove', handlePointerMoveTimeline);
  timelineContainer.addEventListener('pointerup', handlePointerUpTimeline);
  timelineContainer.addEventListener('pointercancel', handlePointerUpTimeline);

  timelineContainer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    }
  });

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenUI);
  document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
  pipBtn.addEventListener('click', togglePiP);
  checkPiPSupport();

  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSpeedMenu();
  });

  document.querySelectorAll('.speed-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      setPlaybackSpeed(parseFloat(option.dataset.speed));
    });
  });

  document.addEventListener('click', (e) => {
    if (!speedMenu.contains(e.target) && e.target !== speedBtn) {
      toggleSpeedMenu(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSpeedMenuOpen) {
      toggleSpeedMenu(false);
    }
  });

  // --- Keyboard Shortcuts ---
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
        video.currentTime = Math.max(0, video.currentTime - 10);
        showActionFeedback('-10s');
        break;
      case 'l':
        e.preventDefault();
        video.currentTime = Math.min(duration, video.currentTime + 10);
        showActionFeedback('+10s');
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
      case '<':
      case ',':
        if (e.shiftKey || e.key === '<') {
          e.preventDefault();
          const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
          const currIdx = speeds.indexOf(video.playbackRate);
          const newIdx = Math.max(0, currIdx - 1);
          setPlaybackSpeed(speeds[newIdx]);
        }
        break;
      case '>':
      case '.':
        if (e.shiftKey || e.key === '>') {
          e.preventDefault();
          const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
          const currIdx = speeds.indexOf(video.playbackRate);
          const newIdx = Math.min(speeds.length - 1, currIdx + 1);
          setPlaybackSpeed(speeds[newIdx]);
        }
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
  updateCenterSize();
});
