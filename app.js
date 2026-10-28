/**
 * Aura Player - Custom HTML5 Video Player Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const container = document.getElementById('video-container');
  const video = document.getElementById('video-element');
  const controlsBar = document.getElementById('controls-bar');

  // Buttons
  const playPauseBtn = document.getElementById('play-pause-btn');
  const centralPlayBtn = document.getElementById('central-play-btn');
  const muteBtn = document.getElementById('mute-btn');
  const speedBtn = document.getElementById('speed-btn');
  const speedMenu = document.getElementById('speed-menu');
  const pipBtn = document.getElementById('pip-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  // Icons
  const playIcons = document.querySelectorAll('.play-icon');
  const pauseIcons = document.querySelectorAll('.pause-icon');
  const volumeHighIcon = document.querySelector('.volume-high-icon');
  const volumeMutedIcon = document.querySelector('.volume-muted-icon');
  const fullscreenOpenIcon = document.querySelector('.fullscreen-open');
  const fullscreenExitIcon = document.querySelector('.fullscreen-exit');

  // Sliders and Displays
  const volumeSlider = document.getElementById('volume-slider');
  const timelineContainer = document.getElementById('timeline-container');
  const progressBar = document.getElementById('progress-bar');
  const bufferedBar = document.getElementById('buffered-bar');
  const timelineTooltip = document.getElementById('timeline-tooltip');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');
  const actionFeedback = document.getElementById('action-feedback');

  // State
  let isScrubbing = false;
  let wasPaused = false;
  let inactivityTimer = null;
  let feedbackTimeout = null;

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
    }, 800);
  };

  const initMetadata = () => {
    if (video.duration) {
      durationTimeEl.textContent = formatTime(video.duration);
      if (timelineContainer) {
        timelineContainer.setAttribute('aria-valuemax', Math.floor(video.duration));
      }
    }
    updateVolumeUI();
  };

  // --- Play / Pause Logic ---
  const togglePlay = () => {
    if (video.paused) {
      video.play().catch(err => console.log('Playback interrupted:', err));
    } else {
      video.pause();
    }
  };

  const updatePlayPauseUI = () => {
    const isPaused = video.paused;
    container.classList.toggle('paused', isPaused);

    playIcons.forEach(icon => icon.classList.toggle('hidden', !isPaused));
    pauseIcons.forEach(icon => icon.classList.toggle('hidden', isPaused));
  };

  // --- Volume Logic ---
  const handleVolumeChange = (newVolume) => {
    video.volume = Math.max(0, Math.min(1, newVolume));
    video.muted = video.volume === 0;
    updateVolumeUI();
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
  };

  const updateVolumeUI = () => {
    const isMuted = video.muted || video.volume === 0;
    volumeHighIcon.classList.toggle('hidden', isMuted);
    volumeMutedIcon.classList.toggle('hidden', !isMuted);
    if (!isMuted) {
      volumeSlider.value = video.volume;
    } else {
      volumeSlider.value = 0;
    }

    const percentage = (volumeSlider.value / 1) * 100;
    volumeSlider.style.background = `linear-gradient(to right, #ffffff 0%, #ffffff ${percentage}%, rgba(255,255,255,0.25) ${percentage}%, rgba(255,255,255,0.25) 100%)`;
  };

  // --- Timeline & Progress Logic ---
  const updateProgress = () => {
    if (!isScrubbing) {
      const percentage = (video.currentTime / video.duration) * 100 || 0;
      progressBar.style.width = `${percentage}%`;
      currentTimeEl.textContent = formatTime(video.currentTime);
    }
    updateBuffered();
  };

  const updateBuffered = () => {
    if (video.buffered.length > 0 && video.duration) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const bufferedPercentage = (bufferedEnd / video.duration) * 100;
      bufferedBar.style.width = `${bufferedPercentage}%`;
    }
  };

  const handleTimelineScrub = (e) => {
    const rect = timelineContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    progressBar.style.width = `${pos * 100}%`;
    currentTimeEl.textContent = formatTime(pos * video.duration);
    if (isScrubbing) {
      video.currentTime = pos * video.duration;
    }
    return pos;
  };

  const updateTooltip = (e) => {
    const rect = timelineContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * video.duration;
    timelineTooltip.textContent = formatTime(targetTime);
    timelineTooltip.style.left = `${e.clientX - rect.left}px`;
  };

  // --- Fullscreen Logic ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
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
    const isFullscreen = !!document.fullscreenElement;
    fullscreenOpenIcon.classList.toggle('hidden', isFullscreen);
    fullscreenExitIcon.classList.toggle('hidden', !isFullscreen);
  };

  // --- Picture-in-Picture Logic ---
  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && video !== document.pictureInPictureElement) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP Error:', err);
    }
  };

  // --- Auto Hide Controls Logic ---
  const resetInactivityTimer = () => {
    container.classList.remove('user-inactive');
    clearTimeout(inactivityTimer);
    if (!video.paused) {
      inactivityTimer = setTimeout(() => {
        container.classList.add('user-inactive');
        speedMenu.classList.add('hidden');
      }, 3000);
    }
  };

  // --- Playback Speed Logic ---
  const setPlaybackSpeed = (speed) => {
    video.playbackRate = speed;
    speedBtn.textContent = `${speed}x`;
    document.querySelectorAll('.speed-option').forEach(opt => {
      opt.classList.toggle('active', parseFloat(opt.dataset.speed) === speed);
    });
    speedMenu.classList.add('hidden');
    showActionFeedback(`${speed}x Speed`);
  };

  // --- Event Listeners ---

  // Video Events
  video.addEventListener('play', () => {
    updatePlayPauseUI();
    resetInactivityTimer();
  });

  video.addEventListener('pause', () => {
    updatePlayPauseUI();
    container.classList.remove('user-inactive');
    clearTimeout(inactivityTimer);
  });

  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('progress', updateBuffered);

  video.addEventListener('loadedmetadata', initMetadata);
  video.addEventListener('durationchange', initMetadata);

  if (video.readyState >= 1) {
    initMetadata();
  }

  video.addEventListener('click', () => {
    togglePlay();
    showActionFeedback(video.paused ? 'Paused' : 'Playing');
  });

  // Central Play Button
  centralPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // Play/Pause Button
  playPauseBtn.addEventListener('click', togglePlay);

  // Volume Slider & Mute
  muteBtn.addEventListener('click', toggleMute);
  volumeSlider.addEventListener('input', (e) => {
    handleVolumeChange(parseFloat(e.target.value));
  });

  // Timeline Interactions (Mouse & Touch)
  timelineContainer.addEventListener('mousemove', updateTooltip);

  timelineContainer.addEventListener('mousedown', (e) => {
    isScrubbing = true;
    wasPaused = video.paused;
    video.pause();
    handleTimelineScrub(e);

    const onMouseMove = (moveEvent) => {
      if (isScrubbing) handleTimelineScrub(moveEvent);
    };

    const onMouseUp = (upEvent) => {
      if (isScrubbing) {
        isScrubbing = false;
        handleTimelineScrub(upEvent);
        if (!wasPaused) video.play();
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // Touch support for timeline
  timelineContainer.addEventListener('touchstart', (e) => {
    isScrubbing = true;
    wasPaused = video.paused;
    video.pause();
    const touch = e.touches[0];
    handleTimelineScrub(touch);

    const onTouchMove = (moveEvent) => {
      if (isScrubbing) handleTimelineScrub(moveEvent.touches[0]);
    };

    const onTouchEnd = () => {
      if (isScrubbing) {
        isScrubbing = false;
        if (!wasPaused) video.play();
      }
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  });

  // Fullscreen & PiP
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenUI);
  pipBtn.addEventListener('click', togglePiP);

  // Speed Menu Toggle
  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu.classList.toggle('hidden');
  });

  document.querySelectorAll('.speed-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      setPlaybackSpeed(parseFloat(option.dataset.speed));
    });
  });

  document.addEventListener('click', (e) => {
    if (!speedMenu.contains(e.target) && e.target !== speedBtn) {
      speedMenu.classList.add('hidden');
    }
  });

  // Inactivity / Auto-hide controls
  container.addEventListener('mousemove', resetInactivityTimer);
  container.addEventListener('mouseleave', () => {
    if (!video.paused) {
      container.classList.add('user-inactive');
    }
  });
  container.addEventListener('touchstart', resetInactivityTimer);

  // Keyboard Shortcuts
  container.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

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
      case 'arrowleft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        showActionFeedback('-5s');
        break;
      case 'arrowright':
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
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
    }
  });

  // Initial setup
  updatePlayPauseUI();
  updateVolumeUI();
});
