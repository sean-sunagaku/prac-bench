/**
 * Wires up the minimalist Japanese glassmorphic HUD controls.
 */
export function setupUI({ onCameraPreset, onMoodPreset, onToggleSnow, onToggleSteam, onToggleRotate }) {
  const hudToggle = document.getElementById('hud-toggle');
  const panel = document.getElementById('control-panel');
  const titleBadge = document.getElementById('title-badge');
  const camButtons = Array.from(document.querySelectorAll('#camera-buttons .chip-btn'));
  const moodButtons = Array.from(document.querySelectorAll('#mood-buttons .chip-btn'));
  const snowToggle = document.getElementById('toggle-snow');
  const steamToggle = document.getElementById('toggle-steam');
  const rotateToggle = document.getElementById('toggle-rotate');

  hudToggle?.addEventListener('click', () => {
    panel?.classList.toggle('collapsed');
  });

  function setActiveCamButton(camName) {
    for (const btn of camButtons) {
      btn.classList.toggle('active', btn.dataset.cam === camName);
    }
  }

  function setActiveMoodButton(moodName) {
    for (const btn of moodButtons) {
      btn.classList.toggle('active', btn.dataset.mood === moodName);
    }
  }

  for (const btn of camButtons) {
    btn.addEventListener('click', () => {
      const cam = btn.dataset.cam;
      setActiveCamButton(cam);
      onCameraPreset(cam);
    });
  }

  for (const btn of moodButtons) {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      setActiveMoodButton(mood);
      onMoodPreset(mood);
    });
  }

  snowToggle?.addEventListener('change', (e) => onToggleSnow(e.target.checked));
  steamToggle?.addEventListener('change', (e) => onToggleSteam(e.target.checked));
  rotateToggle?.addEventListener('change', (e) => onToggleRotate(e.target.checked));

  return {
    setActiveCamButton,
    setActiveMoodButton,
    setHudVisible(visible) {
      if (panel) panel.style.display = visible ? '' : 'none';
      if (titleBadge) titleBadge.style.display = visible ? '' : 'none';
      if (hudToggle) hudToggle.style.display = visible ? '' : 'none';
    },
  };
}
