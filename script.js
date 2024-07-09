const pathSegments = window.location.pathname.split('/');
const tmdbId = pathSegments[3];
const season = pathSegments[4];
const episode = pathSegments[5];
const tmdbApiKey = '5622cafbfe8f8cfe358a29c53e19bba0';

// Menentukan URL API berdasarkan segmen URL
let apiUrl = '';
if (season && episode) {
  apiUrl = `https://embedd-wheat.vercel.app/embed/tv/${tmdbId}/${season}/${episode}`;
} else {
  apiUrl = `https://embedd-wheat.vercel.app/embed/movie/${tmdbId}`;
}

// Fetch data dari API
fetch(apiUrl)
  .then(response => response.json())
  .then(data => {
    if (data.status && data.status === 500) {
      document.body.innerHTML = '<h1>404 Not Found</h1><p>Movie or Series not available</p>';
      return;
    }

    const sources = data.data.sources.map(source => ({
      file: source.url,
      label: source.quality,
      default: source.isM3U8
    }));

    const subtitles = data.data.subtitles.map(sub => ({
      file: sub.url,
      label: sub.lang,
      kind: "captions"
    }));

    let tmdbApiUrl = '';
    if (season && episode) {
      tmdbApiUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${tmdbApiKey}`;
    } else {
      tmdbApiUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}`;
    }

    fetch(tmdbApiUrl)
      .then(response => response.json())
      .then(tmdbData => {
        const imageUrl = `https://image.tmdb.org/t/p/w500${tmdbData.still_path || tmdbData.poster_path}`;

        jwplayer("player").setup({
          controls: true,
          displaytitle: true,
          displaydescription: true,
          abouttext: "JWplayer",
          aboutlink: "https://www.jwplayer.com/",
          skin: { name: "netflix" },
          logo: {
            file: "https://www.jwplayer.com/logo.png",
            link: "https://www.jwplayer.com/"
          },
          captions: {
            color: "#FFF",
            fontSize: 14,
            backgroundOpacity: 0,
            edgeStyle: "raised"
          },
          playlist: [
            {
              title: data.title,
              description: `You're Watching ${data.title}`,
              image: imageUrl,
              sources: sources,
              captions: subtitles,
              tracks: subtitles
            }
          ],
          advertising: {
            client: "vast",
            schedule: [
              {
                offset: "pre",
                tag: ""
              }
            ]
          }
        });

        const playerInstance = jwplayer("player");

        playerInstance.on("ready", function () {
          const buttonId = "download-video-button";
          const iconPath = "";
          const tooltipText = "Download Video";

          playerInstance.addButton(iconPath, tooltipText, buttonClickAction, buttonId);

          function buttonClickAction() {
            const playlistItem = playerInstance.getPlaylistItem();
            const fileUrl = playlistItem.file;
            const anchor = document.createElement('a');
            anchor.href = fileUrl;
            anchor.download = `${data.title}.mp4`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
          }

          const playerContainer = playerInstance.getContainer();
          const buttonContainer = playerContainer.querySelector(".jw-button-container");
          const spacer = buttonContainer.querySelector(".jw-spacer");
          const timeSlider = playerContainer.querySelector(".jw-slider-time");
          buttonContainer.replaceChild(timeSlider, spacer);

          playerInstance.on("adBlock", () => {
            const modal = document.querySelector("div.modal");
            modal.style.display = "flex";
            document.getElementById("close").addEventListener("click", () => location.reload());
          });

          const rewindContainer = playerContainer.querySelector(".jw-display-icon-rewind");
          const forwardContainer = rewindContainer.cloneNode(true);
          const forwardDisplayButton = forwardContainer.querySelector(".jw-icon-rewind");
          forwardDisplayButton.style.transform = "scaleX(-1)";
          forwardDisplayButton.ariaLabel = "Forward 10 Seconds";
          const nextContainer = playerContainer.querySelector(".jw-display-icon-next");
          nextContainer.parentNode.insertBefore(forwardContainer, nextContainer);

          playerContainer.querySelector(".jw-display-icon-next").style.display = "none";
          const rewindControlBarButton = buttonContainer.querySelector(".jw-icon-rewind");
          const forwardControlBarButton = rewindControlBarButton.cloneNode(true);
          forwardControlBarButton.style.transform = "scaleX(-1)";
          forwardControlBarButton.ariaLabel = "Forward 10 Seconds";
          rewindControlBarButton.parentNode.insertBefore(forwardControlBarButton, rewindControlBarButton.nextElementSibling);

          [forwardDisplayButton, forwardControlBarButton].forEach(button => {
            button.onclick = () => {
              playerInstance.seek(playerInstance.getPosition() + 10);
            };
          });
        });
      });
  });
