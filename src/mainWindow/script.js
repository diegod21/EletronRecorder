document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("display");
  const record = document.getElementById("record");
  const micInput = document.getElementById("mic");
  let mediaRecorder = null;

  let isRecording = false;
  let selectorDeviceId = null;
  let chunks = [];
  let startTime = null;

  console.log("a");

  navigator.mediaDevices.enumerateDevices().then((devices) => {
    console.log(devices);
    devices.forEach((device) => {
      if (device.kind === "audioinput") {
        if (!selectorDeviceId) {
          selectorDeviceId = device.deviceId;
        }
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.text = device.label;
        micInput.appendChild(option);
      }
    });
  });

  micInput.addEventListener("change", (e) => {
    selectorDeviceId = e.target.value;
  });

  function updateButton(recording) {
    if (recording) {
      document.getElementById("record").classList.add("recording");
      document.getElementById("recording").classList.add("hide");
    } else {
      document.getElementById("record").classList.remove("recording");
      document.getElementById("recording").classList.remove("hide");
    }
  }

  record.addEventListener("click", () => {
    updateButton(!isRecording);
    handleRecording(isRecording);
  });

  function handleRecording(recording) {
    if (recording) {
      mediaRecorder.stop();
    } else {
      startTime = Date.now();
      UpdateTimer();
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            deviceId: selectorDeviceId,
          },
          video: false,
        })
        .then((stream) => {
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.start();
          mediaRecorder.ondataavailable = (e) => {
            chunks.push(e.data);
          };
          mediaRecorder.onstop = (e) => {
            saveRecord(e);
          };
        });
    }
  }

  function saveRecord(e) {
    const blob = new Blob(chunks, { type: "audio/webm", codecs: "opus" });
    blob.arrayBuffer().then((blobBuffer) => {
      const buffer = new Buffer(blobBuffer);
      window.electronAPI.sendToMain("save_buffer", buffer);
    });
    chunks = [];
  }

  function UpdateTimer() {
    display.innerHTML = DurationToTime(Date.now() - startTime);
    if (isRecording) {
      window.requestAnimationFrame(UpdateTimer);
    }
  }

  function DurationToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / 1000 / 60) % 60);
    let hours = Math.floor(duration / 1000 / 60 / 60);

    seconds = seconds < 10 ? "0" + seconds : seconds;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    hours = hours < 10 ? "0" + hours : hours;
    return hours + ":" + minutes + ":" + seconds;
  }
});
