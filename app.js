let monitoring = false;
let watchId = null;

const permissionStatus = document.getElementById("permissionStatus");
const monitoringStatus = document.getElementById("monitoringStatus");
const lastUpdate = document.getElementById("lastUpdate");
const locationText = document.getElementById("locationText");

const permissionBtn = document.getElementById("permissionBtn");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

function setMonitoring(active) {
  monitoring = active;
  monitoringStatus.textContent = active ? "Monitorando" : "Parado";
  startBtn.disabled = active;
  stopBtn.disabled = !active;
}

function updateLocation(position) {
  const { latitude, longitude } = position.coords;
  locationText.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  lastUpdate.textContent = new Date().toLocaleTimeString("pt-BR");
}

function handleLocationError(error) {
  permissionStatus.textContent = "Negada ou indisponível";
  locationText.textContent = `Erro: ${error.message}`;
  setMonitoring(false);
}

permissionBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationText.textContent = "Geolocalização não suportada neste navegador.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      permissionStatus.textContent = "Concedida";
      updateLocation(position);
    },
    handleLocationError
  );
});

startBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationText.textContent = "Geolocalização não suportada neste navegador.";
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      permissionStatus.textContent = "Concedida";
      updateLocation(position);
      setMonitoring(true);
    },
    handleLocationError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000
    }
  );
});

stopBtn.addEventListener("click", () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  lastUpdate.textContent = "Monitoramento parado";
  setMonitoring(false);
});
