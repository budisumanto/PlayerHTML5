document.addEventListener("DOMContentLoaded", function () {
  const playerInstance = jwplayer("video-container").setup({
    controls: true,
    sharing: false,
    displaytitle: true,
    displaydescription: true,
    skin: {
      name: "netflix"
    },
    playlist: [
      {
        title: "Sora yori mo Tooi Basho - Sample Video",
        description: "You're Watching",
        image: "",
        sources: [
          {
            file: "sample.mp4",
            label: "1080p HD",
            default: true
          }
        ]
      }
    ]
  });

  playerInstance.on("ready", function () {
    const playerContainer = playerInstance.getContainer();

    // Move time slider in-line with control bar items if present
    const buttonContainer = playerContainer.querySelector(".jw-button-container");
    if (buttonContainer) {
      const spacer = buttonContainer.querySelector(".jw-spacer");
      const timeSlider = playerContainer.querySelector(".jw-slider-time");
      if (spacer && timeSlider) {
        buttonContainer.replaceChild(timeSlider, spacer);
      }

      // Add forward 10s button to control bar
      const rewindControlBarButton = buttonContainer.querySelector(".jw-icon-rewind");
      if (rewindControlBarButton) {
        const forwardControlBarButton = rewindControlBarButton.cloneNode(true);
        forwardControlBarButton.style.transform = "scaleX(-1)";
        forwardControlBarButton.ariaLabel = "Forward 10 Seconds";
        rewindControlBarButton.parentNode.insertBefore(
          forwardControlBarButton,
          rewindControlBarButton.nextElementSibling
        );

        forwardControlBarButton.onclick = function (e) {
          e.stopPropagation();
          playerInstance.seek(playerInstance.getPosition() + 10);
        };
      }
    }

    // Forward 10 seconds overlay display button
    const rewindContainer = playerContainer.querySelector(".jw-display-icon-rewind");
    if (rewindContainer) {
      const forwardContainer = rewindContainer.cloneNode(true);
      const forwardDisplayButton = forwardContainer.querySelector(".jw-icon-rewind");
      if (forwardDisplayButton) {
        forwardDisplayButton.style.transform = "scaleX(-1)";
        forwardDisplayButton.ariaLabel = "Forward 10 Seconds";
        forwardDisplayButton.onclick = function (e) {
          e.stopPropagation();
          playerInstance.seek(playerInstance.getPosition() + 10);
        };
      }

      const nextContainer = playerContainer.querySelector(".jw-display-icon-next");
      if (nextContainer && nextContainer.parentNode) {
        nextContainer.parentNode.insertBefore(forwardContainer, nextContainer);
      }
    }

    // Hide next display icon if present
    const nextDisplayIcon = playerContainer.querySelector(".jw-display-icon-next");
    if (nextDisplayIcon) {
      nextDisplayIcon.style.display = "none";
    }
  });
});
