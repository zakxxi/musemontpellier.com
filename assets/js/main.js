/* MUSE · interactions (menu mobile, onglets de la carte, curseurs, visionneuse). Sans dépendance. */
(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');

  /* ---------- Menu mobile ---------- */
  const burger = document.querySelector('.burger');
  const mobileNav = document.getElementById('menu-mobile');
  if (burger && mobileNav) {
    const setOpen = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      mobileNav.hidden = !open;
    };
    burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
    mobileNav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setOpen(false); burger.focus(); }
    });
  }

  /* ---------- Curseurs horizontaux (galerie, pages de carte) ---------- */
  // Flèches grisées en début/fin de course, masquées quand tout tient à l'écran.
  const updateSlider = (slider) => {
    const track = slider.querySelector('.slider__track');
    const nav = slider.querySelector('.slider__nav');
    if (!track || !nav || !track.clientWidth) return; // panneau masqué : on attend qu'il s'affiche
    const max = track.scrollWidth - track.clientWidth;
    const scrollable = max > 2;
    nav.hidden = !scrollable;
    nav.querySelector('[data-slide="prev"]').disabled = track.scrollLeft <= 2;
    nav.querySelector('[data-slide="next"]').disabled = track.scrollLeft >= max - 2;
    const hint = slider.querySelector('[data-hint]');
    if (hint) hint.textContent = scrollable ? 'Faites défiler, touchez une page pour l’agrandir.' : 'Touchez une page pour l’agrandir.';
  };
  const sliders = [...document.querySelectorAll('[data-slider]')];
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver((entries) => entries.forEach((en) => updateSlider(en.target.closest('[data-slider]')))) : null;
  sliders.forEach((slider) => {
    const track = slider.querySelector('.slider__track');
    if (!track) return;
    track.addEventListener('scroll', () => updateSlider(slider), { passive: true });
    if (resizeObserver) resizeObserver.observe(track);
    updateSlider(slider);
  });
  window.addEventListener('load', () => sliders.forEach(updateSlider));

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-slide]');
    if (!btn) return;
    const track = btn.closest('[data-slider]')?.querySelector('.slider__track');
    if (!track) return;
    const dir = btn.dataset.slide === 'prev' ? -1 : 1;
    track.scrollBy({ left: dir * Math.max(240, track.clientWidth * 0.8), behavior: 'smooth' });
  });

  /* ---------- Onglets de la carte ---------- */
  const tabs = [...document.querySelectorAll('.tab')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const selectTab = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    const track = panels[index].querySelector('.slider__track');
    if (track) track.scrollLeft = 0;
    const slider = panels[index].querySelector('[data-slider]');
    if (slider) updateSlider(slider);
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      selectTab((keys[e.key] + tabs.length) % tabs.length, true);
    });
  });
  if (tabs.length) selectTab(0);

  /* ---------- Visionneuse des pages ---------- */
  const dialog = document.getElementById('visionneuse');
  if (dialog && typeof dialog.showModal === 'function') {
    const img = dialog.querySelector('img');
    const label = dialog.querySelector('.lightbox__label');
    let items = [];
    let current = 0;

    const show = (i) => {
      current = (i + items.length) % items.length;
      const el = items[current];
      img.src = el.dataset.zoom;
      img.alt = el.dataset.title;
      label.textContent = `${current + 1} / ${items.length} · ${el.dataset.title}`;
      dialog.querySelector('.lightbox__body').scrollTop = 0;
    };

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-zoom]');
      if (!trigger) return;
      e.preventDefault();
      items = [...trigger.closest('.slider__track').querySelectorAll('[data-zoom]')];
      show(items.indexOf(trigger));
      dialog.showModal();
    });
    dialog.querySelector('[data-lightbox="prev"]').addEventListener('click', () => show(current - 1));
    dialog.querySelector('[data-lightbox="next"]').addEventListener('click', () => show(current + 1));
    dialog.querySelector('[data-lightbox="close"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(current + 1);
      if (e.key === 'ArrowLeft') show(current - 1);
    });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }
})();
